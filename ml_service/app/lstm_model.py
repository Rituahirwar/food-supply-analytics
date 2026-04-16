import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 1. Load data ──────────────────────────────────────────
df = pd.read_csv(os.path.join(BASE_DIR, 'data/clean_food_price_indices.csv'))
print("Loaded:", df.shape)

# ── 2. Use only Food Price Index column for prediction ────
data = df[['Food Price Index']].values

# ── 3. Normalize (LSTM works best with 0-1 range) ─────────
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(data)

# ── 4. Create sequences (use 12 months to predict next 1) ─
def create_sequences(data, steps=12):
    X, y = [], []
    for i in range(len(data) - steps):
        X.append(data[i:i+steps])
        y.append(data[i+steps])
    return np.array(X), np.array(y)

X, y = create_sequences(data_scaled, steps=12)
print("X shape:", X.shape, "| y shape:", y.shape)

# ── 5. Train/test split (80/20) ────────────────────────────
split = int(len(X) * 0.8)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

# ── 6. Build LSTM model ────────────────────────────────────
model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(12, 1)),
    Dropout(0.2),
    LSTM(32),
    Dropout(0.2),
    Dense(1)
])

model.compile(optimizer='adam', loss='mse')
model.summary()

# ── 7. Train ───────────────────────────────────────────────
history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=16,
    validation_data=(X_test, y_test),
    verbose=1
)

# ── 8. Predict ─────────────────────────────────────────────
predictions = model.predict(X_test)
predictions_actual = scaler.inverse_transform(predictions)
y_test_actual = scaler.inverse_transform(y_test)

mae = mean_absolute_error(y_test_actual, predictions_actual)
print(f"\nMAE: {mae:.2f} index points")

# ── 9. Plot prediction vs actual ───────────────────────────
plt.figure(figsize=(14,5))
plt.plot(y_test_actual, label='Actual')
plt.plot(predictions_actual, label='Predicted')
plt.title('LSTM — Actual vs Predicted Food Price Index')
plt.legend()
plt.savefig(os.path.join(BASE_DIR, 'data/plot3_lstm_prediction.png'))
plt.close()

# ── 10. Save model ─────────────────────────────────────────
# Ensure models directory exists
models_dir = os.path.join(BASE_DIR, '../models')
os.makedirs(models_dir, exist_ok=True)

model.save(os.path.join(models_dir, 'lstm_model.h5'))
print("Model saved to models/lstm_model.h5")
