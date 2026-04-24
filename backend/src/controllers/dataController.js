const axios = require('axios');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');
const { PredictionLog, QueryLog, RiskAlertLog } = require('../models/SupplyData');

const cache = new NodeCache({ stdTTL: 300 });
const limiter = new Bottleneck({ maxConcurrent: 1 });

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

const getPrediction = async (req, res) => {
  try {
    const cached = cache.get('prediction');
    if (cached) {
      return res.status(200).json(cached);
    }

    const response = await limiter.schedule(() => axios.get(`${ML_URL}/predict`));
    const data = response.data;

    cache.set('prediction', data);

    await PredictionLog.create({
      user_id: req.user.id,
      current_price: data.current_prices?.food_price_index,
      current_prices: data.current_prices,
      predictions: data.predictions,
    });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPredictionHistory = async (req, res) => {
  try {
    const logs = await PredictionLog.find({ user_id: req.user.id })
      .sort({ requested_at: -1 })
      .limit(10);
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getRisk = async (req, res) => {
  try {
    const { country, commodity, year } = req.query;

    if (country || commodity) {
      await QueryLog.create({
        user_id: req.user.id,
        country: country || null,
        commodity: commodity || null,
      });
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
      await RiskAlertLog.insertMany(logsToSave);
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPrediction, getPredictionHistory, getRisk, getRiskHistory };