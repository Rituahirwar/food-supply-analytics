const express = require('express');
const {
  getPrediction,
  getPredictionHistory,
  getRisk,
  getRiskHistory,
  getFoodPrices,
  getTradeData,
} = require('../controllers/dataController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/predict', authMiddleware, getPrediction);
router.get('/predict/history', authMiddleware, getPredictionHistory);
router.get('/risk', authMiddleware, getRisk);
router.get('/risk/history', authMiddleware, getRiskHistory);
router.get('/food-prices', authMiddleware, getFoodPrices);
router.get('/trade', authMiddleware, getTradeData);

router.post('/thresholds', authMiddleware, async (req, res) => {
  try {
    const { critical, high, medium } = req.body;
    global.riskThresholds = { critical, high, medium };
    res.status(200).json({ message: 'Thresholds updated', thresholds: global.riskThresholds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
