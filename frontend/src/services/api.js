const EXPRESS_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export const registerUser = async (name, email, password) => {
  const res = await fetch(`${EXPRESS_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
};

export const loginUser = async (email, password) => {
  const res = await fetch(`${EXPRESS_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

export const getMe = async () => {
  const res = await fetch(`${EXPRESS_URL}/api/auth/me`, { headers: authHeaders() });
  return res.json();
};

export const getPrediction = async () => {
  const res = await fetch(`${EXPRESS_URL}/api/data/predict`, { headers: authHeaders() });
  return res.json();
};

export const getPredictionHistory = async () => {
  const res = await fetch(`${EXPRESS_URL}/api/data/predict/history`, { headers: authHeaders() });
  return res.json();
};

export const getRisk = async (year = '') => {
  const url = year
    ? `${EXPRESS_URL}/api/data/risk?year=${encodeURIComponent(year)}`
    : `${EXPRESS_URL}/api/data/risk`;
  const res = await fetch(url, { headers: authHeaders() });
  return res.json();
};

export const getRiskHistory = async (country = '') => {
  const url = country
    ? `${EXPRESS_URL}/api/data/risk/history?country=${country}`
    : `${EXPRESS_URL}/api/data/risk/history`;
  const res = await fetch(url, { headers: authHeaders() });
  return res.json();
};

export const updateRiskThresholds = async (thresholds) => {
  const res = await fetch(`${EXPRESS_URL}/api/data/thresholds`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(thresholds),
  });
  return res.json();
};

// These call FastAPI directly — no auth needed
export const getFoodPrices = async (commodity = 'Cereals') => {
  const res = await fetch(`${ML_URL}/food-prices?commodity=${encodeURIComponent(commodity)}`);
  return res.json();
};

export const getTradeData = async (country, commodity = 'Cereals') => {
  const res = await fetch(
    `${ML_URL}/trade?country=${encodeURIComponent(country)}&commodity=${encodeURIComponent(commodity)}`
  );
  return res.json();
};