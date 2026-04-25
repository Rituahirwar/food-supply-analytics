const axios = require('axios');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');
const { PredictionLog, QueryLog, RiskAlertLog } = require('../models/SupplyData');

const cache = new NodeCache({ stdTTL: 300 });
const staleCache = new NodeCache({ stdTTL: 60 * 60 });
const limiter = new Bottleneck({ maxConcurrent: 5 });
const inFlightRequests = new Map();

const ML_URL = process.env.ML_SERVICE_URL || 'https://food-supply-analytics-1.onrender.com';
const ML_WARMUP_URL = `${ML_URL}/warmup`;

// Keep upstream requests generous enough for Render cold starts.
const mlAxios = axios.create({ timeout: 60000, headers: { Accept: 'application/json' } });
const warmupAxios = axios.create({ timeout: 20000, headers: { Accept: 'application/json' } });

const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ERR_BAD_RESPONSE',
]);

const warnLogFailure = (label, err) => {
  console.warn(`${label} log skipped: ${err.message}`);
};

const getErrorMessage = (err, fallback = 'Request failed') =>
  err.response?.data?.message ||
  err.response?.data?.detail ||
  err.message ||
  fallback;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withSingleFlight = async (key, factory) => {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
};

const isTransientMlError = (err) => {
  const statusCode = err.response?.status;
  if (statusCode && TRANSIENT_STATUS_CODES.has(statusCode)) {
    return true;
  }
  return TRANSIENT_ERROR_CODES.has(err.code);
};

const warmUpMlService = () =>
  withSingleFlight('__ml_warmup__', async () => {
    try {
      await warmupAxios.get(ML_WARMUP_URL);
      console.log('[ML warmup] completed');
    } catch (err) {
      console.warn('[ML warmup failed]', getErrorMessage(err, 'Warmup request failed'));
    }
  });

const fetchMlJson = async (url, { requestKey = url, attempts = 3 } = {}) =>
  withSingleFlight(`ml:${requestKey}`, async () => {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await limiter.schedule(() => mlAxios.get(url));
        return response.data;
      } catch (err) {
        lastError = err;
        console.warn(
          `[ML fetch failed] ${url} attempt ${attempt}/${attempts}:`,
          getErrorMessage(err, 'ML request failed')
        );

        if (!isTransientMlError(err) || attempt === attempts) {
          throw err;
        }

        if (attempt === 1) {
          await warmUpMlService();
        }

        await delay(attempt * 1500);
      }
    }

    throw lastError;
  });

const getCachedMlData = async (cacheKey, url) => {
  const fresh = cache.get(cacheKey);
  if (fresh) {
    return { data: fresh, stale: false, source: 'fresh-cache' };
  }

  try {
    const data = await fetchMlJson(url, { requestKey: cacheKey });
    cache.set(cacheKey, data);
    staleCache.set(cacheKey, data);
    return { data, stale: false, source: 'ml-service' };
  } catch (err) {
    const stale = staleCache.get(cacheKey);
    if (!stale) {
      throw err;
    }

    console.warn(`[ML fallback] Serving stale cache for ${cacheKey}:`, getErrorMessage(err));
    cache.set(cacheKey, stale, 60);
    return { data: stale, stale: true, source: 'stale-cache' };
  }
};

const sendMlError = (res, err) => {
  res.status(502).json({
    message: 'ML service unreachable or returned an error.',
    detail: getErrorMessage(err, 'ML request failed'),
    ml_url: ML_URL,
    upstream_status: err.response?.status || null,
  });
};

const applyResponseMeta = (res, meta) => {
  res.set('X-Data-Source', meta.source);
  res.set('X-ML-Fallback', meta.stale ? 'stale-cache' : 'none');
};

const getPrediction = async (req, res) => {
  try {
    const result = await getCachedMlData('prediction', `${ML_URL}/predict`);
    applyResponseMeta(res, result);
    const data = result.data;

    try {
      // Save history for whoever requested it, regardless of cache hit.
      await PredictionLog.create({
        user_id: req.user.id,
        current_price: data.current_prices?.food_price_index,
        current_prices: data.current_prices,
        predictions: data.predictions,
      });
      console.log('[MongoDB] PredictionLog saved for user', req.user.id);
    } catch (err) {
      console.error('[MongoDB Save FAILED]', err.message);
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('[getPrediction ERROR]', err.message, err.code || '');
    sendMlError(res, err);
  }
};

const getPredictionHistory = async (req, res) => {
  try {
    const logs = await PredictionLog.find({ user_id: req.user.id })
      .sort({ requested_at: -1 })
      .limit(10);
    res.status(200).json(logs);
  } catch (err) {
    console.error('[getPredictionHistory ERROR]', err.message);
    res.status(200).json([]);
  }
};

const getRisk = async (req, res) => {
  try {
    const { country, commodity, year } = req.query;

    if (country || commodity) {
      try {
        await QueryLog.create({
          user_id: req.user.id,
          country: country || null,
          commodity: commodity || null,
        });
      } catch (err) {
        warnLogFailure('Query', err);
      }
    }

    const cacheKey = `risk_${year || 'latest'}`;
    const mlUrl = year ? `${ML_URL}/risk?year=${year}` : `${ML_URL}/risk`;
    const result = await getCachedMlData(cacheKey, mlUrl);
    applyResponseMeta(res, result);
    const data = result.data;

    if (!year && data.risk_data && !result.stale) {
      const logsToSave = data.risk_data.map((item) => ({
        country: item.country,
        cpi_value: item.cpi_value,
        risk_level: item.risk_level,
      }));
      try {
        await RiskAlertLog.insertMany(logsToSave);
      } catch (err) {
        warnLogFailure('Risk alert', err);
      }
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('[getRisk ERROR]', err.message, err.code || '');
    sendMlError(res, err);
  }
};

const getRiskHistory = async (req, res) => {
  try {
    const { country } = req.query;
    const filter = country ? { country } : {};
    const logs = await RiskAlertLog.find(filter)
      .sort({ recorded_at: -1 })
      .limit(50);
    res.status(200).json(logs);
  } catch (err) {
    warnLogFailure('Risk history', err);
    res.status(200).json([]);
  }
};

const getFoodPrices = async (req, res) => {
  try {
    const commodity = req.query.commodity || 'Cereals';
    const cacheKey = `food_prices_${commodity}`;
    const mlUrl = `${ML_URL}/food-prices?commodity=${encodeURIComponent(commodity)}`;
    const result = await getCachedMlData(cacheKey, mlUrl);
    applyResponseMeta(res, result);
    res.status(200).json(result.data);
  } catch (err) {
    console.error('[getFoodPrices ERROR]', err.message, err.code || '');
    sendMlError(res, err);
  }
};

const getTradeData = async (req, res) => {
  try {
    const { country, commodity = 'Cereals' } = req.query;
    if (!country) {
      return res.status(400).json({ message: 'country is required' });
    }

    const cacheKey = `trade_${country}_${commodity}`;
    const mlUrl = `${ML_URL}/trade?country=${encodeURIComponent(country)}&commodity=${encodeURIComponent(commodity)}`;
    const result = await getCachedMlData(cacheKey, mlUrl);
    applyResponseMeta(res, result);
    res.status(200).json(result.data);
  } catch (err) {
    console.error('[getTradeData ERROR]', err.message, err.code || '');
    sendMlError(res, err);
  }
};

module.exports = {
  getPrediction,
  getPredictionHistory,
  getRisk,
  getRiskHistory,
  getFoodPrices,
  getTradeData,
};
