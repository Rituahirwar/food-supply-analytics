const EXPRESS_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const getToken = () => localStorage.getItem('token');

// Diagnostic: warn if frontend is talking directly to ML service instead of Express backend
if (EXPRESS_URL.includes('food-supply-analytics-1.onrender.com') || EXPRESS_URL.includes(':8000')) {
  console.error(
    '[CONFIG ERROR] VITE_BACKEND_URL points to the ML service (%s). ' +
    'It should point to the Express backend (e.g. https://food-backend-xxx.onrender.com).',
    EXPRESS_URL
  );
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.detail || `Request failed (${res.status})`);
  }
  return data;
};

export const registerUser = async (name, email, password) => {
  const res = await fetch(`${EXPRESS_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
};

export const loginUser = async (email, password) => {
  const res = await fetch(`${EXPRESS_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
};

export const getMe = async () => {
  const res = await fetch(`${EXPRESS_URL}/api/auth/me`, { headers: authHeaders() });
  return handleResponse(res);
};

export const getPrediction = async () => {
  const res = await fetch(`${EXPRESS_URL}/api/data/predict`, { headers: authHeaders() });
  return handleResponse(res);
};

export const getPredictionHistory = async () => {
  const res = await fetch(`${EXPRESS_URL}/api/data/predict/history`, { headers: authHeaders() });
  return handleResponse(res);
};

export const getRisk = async (year = '') => {
  const url = year
    ? `${EXPRESS_URL}/api/data/risk?year=${encodeURIComponent(year)}`
    : `${EXPRESS_URL}/api/data/risk`;
  const res = await fetch(url, { headers: authHeaders() });
  return handleResponse(res);
};

export const getRiskHistory = async (country = '') => {
  const url = country
    ? `${EXPRESS_URL}/api/data/risk/history?country=${country}`
    : `${EXPRESS_URL}/api/data/risk/history`;
  const res = await fetch(url, { headers: authHeaders() });
  return handleResponse(res);
};

export const updateRiskThresholds = async (thresholds) => {
  const res = await fetch(`${EXPRESS_URL}/api/data/thresholds`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(thresholds),
  });
  return handleResponse(res);
};

export const getFoodPrices = async (commodity = 'Cereals') => {
  const res = await fetch(
    `${EXPRESS_URL}/api/data/food-prices?commodity=${encodeURIComponent(commodity)}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
};

export const getTradeData = async (country, commodity = 'Cereals') => {
  const res = await fetch(
    `${EXPRESS_URL}/api/data/trade?country=${encodeURIComponent(country)}&commodity=${encodeURIComponent(commodity)}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
};
