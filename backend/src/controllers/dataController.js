const axios = require('axios');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');
const { PredictionLog, QueryLog, RiskAlertLog } = require('../models/SupplyData');

const cache = new NodeCache({ stdTTL: 300 });
const limiter = new Bottleneck({ maxConcurrent: 15 });

const ML_URL = process.env.ML_SERVICE_URL || 'https://food-supply-analytics-1.onrender.com';

const warnLogFailure = (label, err) => {
  console.warn(`${label} log skipped: ${err.message}`);
};

const getErrorMessage = (err, fallback = 'Request failed') =>
  err.response?.data?.message ||
  err.response?.data?.detail ||
  err.message ||
  fallback;

const getPrediction = async (req, res) => {
  try {
    let data = cache.get('prediction');
    
    if (!data) {
      const response = await limiter.schedule(() => axios.get(`${ML_URL}/predict`));
      data = response.data;
      cache.set('prediction', data);
    }

    try {
      // Save history for whoever requested it, regardless of cache hit
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
    res.status(502).json({
      message: 'ML service unreachable or returned an error.',
      detail: err.message,
      ml_url: ML_URL,
    });
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
    // Return empty array so frontend doesn't crash trying to .map() a non-array
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
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const mlUrl = year
      ? `${ML_URL}/risk?year=${year}`
      : `${ML_URL}/risk`;

    const response = await limiter.schedule(() => axios.get(mlUrl));
    const data = response.data;

    cache.set(cacheKey, data);

    if (!year && data.risk_data) {
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
    res.status(502).json({
      message: 'ML service unreachable or returned an error.',
      detail: err.message,
      ml_url: ML_URL,
    });
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
    const response = await limiter.schedule(() =>
      axios.get(`${ML_URL}/food-prices?commodity=${encodeURIComponent(commodity)}`)
    );
    res.status(200).json(response.data);
  } catch (err) {
    console.error('[getFoodPrices ERROR]', err.message, err.code || '');
    res.status(502).json({
      message: 'ML service unreachable or returned an error.',
      detail: err.message,
      ml_url: ML_URL,
    });
  }
};

const getTradeData = async (req, res) => {
  try {
    const { country, commodity = 'Cereals' } = req.query;
    if (!country) {
      return res.status(400).json({ message: 'country is required' });
    }

    const response = await limiter.schedule(() =>
      axios.get(
        `${ML_URL}/trade?country=${encodeURIComponent(country)}&commodity=${encodeURIComponent(commodity)}`
      )
    );
    res.status(200).json(response.data);
  } catch (err) {
    console.error('[getTradeData ERROR]', err.message, err.code || '');
    res.status(502).json({
      message: 'ML service unreachable or returned an error.',
      detail: err.message,
      ml_url: ML_URL,
    });
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
