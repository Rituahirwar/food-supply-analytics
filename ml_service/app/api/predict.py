from flask import Flask, jsonify, request
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load model + data once at startup ─────────────────────
model = load_model(os.path.join(BASE_DIR, '../../models/lstm_model.h5'), compile=False)

df = pd.read_csv(os.path.join(BASE_DIR, '../data/clean_food_price_indices.csv'))
scaler = MinMaxScaler()
scaler.fit_transform(df[['Food Price Index']].values)

# ── Route 1 — Health check ─────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "lstm_loaded"})

# ── Route 2 — Predict next 6 months ───────────────────────
@app.route('/predict', methods=['GET'])
def predict():
    # Take last 12 months from dataset
    last_12 = df['Food Price Index'].values[-12:]
    last_12_scaled = scaler.transform(last_12.reshape(-1, 1))

    predictions = []
    input_seq = last_12_scaled.copy()

    for _ in range(6):
        X = input_seq.reshape(1, 12, 1)
        pred = model.predict(X, verbose=0)
        predictions.append(pred[0][0])
        input_seq = np.append(input_seq[1:], pred, axis=0)

    # Convert back to actual values
    predictions_actual = scaler.inverse_transform(
        np.array(predictions).reshape(-1, 1)
    ).flatten().tolist()

    # Build response
    last_date = pd.to_datetime(df['Date'].iloc[-1])
    future_months = pd.date_range(
        start=last_date, periods=7, freq='MS'
    )[1:]

    result = [
        {"month": str(d.date()), "predicted_price": round(p, 2)}
        for d, p in zip(future_months, predictions_actual)
    ]

    return jsonify({
        "status": "success",
        "predictions": result,
        "current_price": round(df['Food Price Index'].iloc[-1], 2)
    })

# ── Route 3 — Risk alert per country ──────────────────────
@app.route('/risk', methods=['GET'])
def risk():
    cpi = pd.read_csv(
        os.path.join(BASE_DIR, '../data/clean_consumer_price_indices.csv'),
        encoding='latin-1'
    )

    # Get latest date per country
    latest = cpi.sort_values('Date').groupby('Area').last().reset_index()
    latest = latest[latest['Value'] > 0]  # Filter out negative CPI values

    def get_risk(val):
        if val > 300:   return "CRITICAL"
        elif val > 150: return "HIGH"
        elif val > 110: return "MEDIUM"
        else:           return "LOW"

    latest['risk_level'] = latest['Value'].apply(get_risk)

    result = latest[['Area', 'Value', 'risk_level']].rename(
        columns={'Area': 'country', 'Value': 'cpi_value'}
    ).to_dict(orient='records')

    return jsonify({
        "status": "success",
        "total_countries": len(result),
        "risk_data": result
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
