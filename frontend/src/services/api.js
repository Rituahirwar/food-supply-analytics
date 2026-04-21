const API_BASE = "/api/data";

const MOCK_RISK_DATA = {
  risk_data: [
    { country: "United States", risk_level: "LOW", cpi_value: 312.4 },
    { country: "Canada", risk_level: "LOW", cpi_value: 289.2 },
    { country: "Mexico", risk_level: "MEDIUM", cpi_value: 267.8 },
    { country: "Brazil", risk_level: "HIGH", cpi_value: 445.3 },
    { country: "Argentina", risk_level: "CRITICAL", cpi_value: 598.2 },
    { country: "United Kingdom", risk_level: "LOW", cpi_value: 318.9 },
    { country: "France", risk_level: "LOW", cpi_value: 305.4 },
    { country: "Germany", risk_level: "LOW", cpi_value: 310.2 },
    { country: "Russia", risk_level: "HIGH", cpi_value: 421.5 },
    { country: "Saudi Arabia", risk_level: "MEDIUM", cpi_value: 278.1 },
    { country: "Nigeria", risk_level: "HIGH", cpi_value: 512.7 },
    { country: "South Africa", risk_level: "MEDIUM", cpi_value: 334.6 },
    { country: "India", risk_level: "MEDIUM", cpi_value: 289.5 },
    { country: "China", risk_level: "LOW", cpi_value: 298.3 },
    { country: "Japan", risk_level: "LOW", cpi_value: 301.8 },
    { country: "Australia", risk_level: "LOW", cpi_value: 315.9 },
  ],
};

const MOCK_PREDICTION_DATA = {
  current_price: 312.4,
  predictions: [
    { month: "2026-05-01", predicted_price: 318.2 },
    { month: "2026-06-01", predicted_price: 325.1 },
    { month: "2026-07-01", predicted_price: 328.7 },
    { month: "2026-08-01", predicted_price: 332.4 },
    { month: "2026-09-01", predicted_price: 335.9 },
    { month: "2026-10-01", predicted_price: 338.2 },
  ],
};

function buildHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchRiskData(token) {
  try {
    const response = await fetch(`${API_BASE}/risk`, {
      headers: buildHeaders(token),
    });

    if (!response.ok) {
      throw new Error("Backend unavailable");
    }

    return response.json();
  } catch (error) {
    console.log("Using mock risk data");
    return MOCK_RISK_DATA;
  }
}

export async function fetchPredictionData(token) {
  try {
    const response = await fetch(`${API_BASE}/predict`, {
      headers: buildHeaders(token),
    });

    if (!response.ok) {
      throw new Error("Backend unavailable");
    }

    return response.json();
  } catch (error) {
    console.log("Using mock prediction data");
    return MOCK_PREDICTION_DATA;
  }
}
