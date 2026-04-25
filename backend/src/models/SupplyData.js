const mongoose = require('mongoose');

const PredictionLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  requested_at: { type: Date, default: Date.now },
  current_price: { type: Number },
  current_prices: {
    food_price_index: Number,
    cereals: Number,
    oils: Number,
    meat: Number,
    dairy: Number,
    sugar: Number,
  },
  predictions: [
    {
      month: String,
      predicted_price: Number,
      food_price_index: Number,
      cereals: Number,
      oils: Number,
      meat: Number,
      dairy: Number,
      sugar: Number,
    },
  ],
});

const QueryLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  searched_at: { type: Date, default: Date.now },
  country: { type: String },
  commodity: { type: String },
});

const RiskAlertLogSchema = new mongoose.Schema({
  country: { type: String, required: true, index: true },
  cpi_value: { type: Number },
  risk_level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], index: true },
  recorded_at: { type: Date, default: Date.now, index: true },
});

const LoginLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  email: { type: String },
  logged_in_at: { type: Date, default: Date.now },
});

const PredictionLog = mongoose.model('PredictionLog', PredictionLogSchema);
const QueryLog = mongoose.model('QueryLog', QueryLogSchema);
const RiskAlertLog = mongoose.model('RiskAlertLog', RiskAlertLogSchema);
const LoginLog = mongoose.model('LoginLog', LoginLogSchema);

module.exports = { PredictionLog, QueryLog, RiskAlertLog, LoginLog };