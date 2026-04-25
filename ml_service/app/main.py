from functools import lru_cache
import os
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sklearn.preprocessing import MinMaxScaler


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODEL_PATH = PROJECT_ROOT / "models" / "lstm_model.h5"
FOOD_PRICE_DATA_PATH = BASE_DIR / "data" / "clean_food_price_indices.csv"
CPI_DATA_PATH = BASE_DIR / "data" / "clean_consumer_price_indices.csv"
TRADE_MATRIX_PATH = BASE_DIR / "data" / "clean_trade_matrix.csv"
RUNNING_ON_RENDER = os.getenv("RENDER", "").lower() == "true"
ENABLE_LSTM_MODEL = os.getenv(
    "ENABLE_LSTM_MODEL",
    "false" if RUNNING_ON_RENDER else "true",
).lower() == "true"

app = FastAPI(title="Food Supply Chain Disruption Analyzer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COMMODITY_ITEM_MAP = {
    "Cereals": ["Breakfast cereals", "Rice, paddy (rice milled equivalent)", "Rice, milled", "Wheat and meslin flour", "Uncooked pasta, not stuffed or otherwise prepared"],
    "Oils": ["Other oil of vegetable origin, crude n.e.c.", "Essential oils n.e.c."],
    "Sugar": ["Refined sugar", "Sugar confectionery", "Sugar and syrups n.e.c."],
    "Dairy": ["Cheese from whole cow milk", "Yoghurt, with additives"],
    "Meat": ["Food preparations n.e.c.", "Dog or cat food, put up for retail sale"],
}

FOOD_PRICE_COLUMN_MAP = {
    "Cereals": "Cereals",
    "Oils": "Oils",
    "Sugar": "Sugar",
    "Dairy": "Dairy",
    "Meat": "Meat",
}


def normalize_country_name(value: str) -> str:
    if not isinstance(value, str):
        return value

    text = value.strip()

    # Fix common mojibake from latin-1/utf-8 double decoding.
    for _ in range(2):
        if "Ã" not in text and "Â" not in text:
            break
        try:
            fixed = text.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore")
            if not fixed or fixed == text:
                break
            text = fixed
        except UnicodeError:
            break

    return text


@lru_cache(maxsize=1)
def get_food_price_data():
    if not FOOD_PRICE_DATA_PATH.exists():
        return None
    # Memory-optimized read: parse dates early, use float32 for numeric columns
    return pd.read_csv(
        FOOD_PRICE_DATA_PATH,
        parse_dates=["Date"],
        dtype={
            "Food Price Index": "float32",
            "Cereals": "float32",
            "Oils": "float32",
            "Meat": "float32",
            "Dairy": "float32",
            "Sugar": "float32",
        }
    )


@lru_cache(maxsize=1)
def get_cpi_data():
    if not CPI_DATA_PATH.exists():
        return None
    return pd.read_csv(
        CPI_DATA_PATH, 
        encoding="latin-1",
        usecols=["Area", "Date", "Value"],
        dtype={"Area": "category"} # Let Value parse naturally
    )


TRADE_MATRIX_ZIP_PATH = BASE_DIR / "data" / "clean_trade_matrix.zip"

@lru_cache(maxsize=1)
def get_trade_data():
    if not TRADE_MATRIX_ZIP_PATH.exists():
        return None
    import zipfile
    with zipfile.ZipFile(TRADE_MATRIX_ZIP_PATH, 'r') as z:
        for filename in z.namelist():
            if filename.endswith('.csv'):
                with z.open(filename) as f:
                    # Flexible usecols to handle 'Reporter Country' or 'Reporter Countries'
                    valid_cols = {"Reporter Country", "Reporter Countries", "Partner Country", "Partner Countries", "Item", "Element", "Value"}
                    return pd.read_csv(
                        f, 
                        encoding='latin-1',
                        usecols=lambda x: x in valid_cols,
                        dtype={
                            "Reporter Country": "category",
                            "Reporter Countries": "category",
                            "Partner Country": "category",
                            "Partner Countries": "category",
                            "Item": "category",
                            "Element": "category"
                            # Let 'Value' parse naturally, we coerce it to float later
                        }
                    )
    return None


@lru_cache(maxsize=1)
def get_lstm_model():
    if not ENABLE_LSTM_MODEL or not MODEL_PATH.exists():
        return None
    try:
        # Import TensorFlow lazily so lightweight endpoints do not pay the memory cost.
        from tensorflow.keras.models import load_model

        return load_model(MODEL_PATH, compile=False)
    except Exception as exc:
        print(f"LSTM model load failed, using fallback forecast: {exc}")
        return None


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "ml_service",
        "lstm_model_enabled": ENABLE_LSTM_MODEL,
        "model_path_exists": MODEL_PATH.exists(),
        "food_data_available": FOOD_PRICE_DATA_PATH.exists(),
        "cpi_data_available": CPI_DATA_PATH.exists(),
        "trade_data_available": TRADE_MATRIX_ZIP_PATH.exists(),
    }


@app.head("/")
def root_head():
    return Response(status_code=200)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "lstm_model_enabled": ENABLE_LSTM_MODEL,
        "model_path_exists": MODEL_PATH.exists(),
        "food_data_available": FOOD_PRICE_DATA_PATH.exists(),
        "cpi_data_available": CPI_DATA_PATH.exists(),
        "trade_data_available": TRADE_MATRIX_ZIP_PATH.exists(),
    }


@app.head("/health")
def health_head():
    return Response(status_code=200)


@app.get("/predict")
def predict():
    food_price_df = get_food_price_data()
    model = get_lstm_model()

    if food_price_df is None:
        raise HTTPException(status_code=503, detail="Missing clean_food_price_indices.csv")

    required_columns = {"Date", "Food Price Index", "Cereals", "Oils", "Meat", "Dairy", "Sugar"}
    if not required_columns.issubset(food_price_df.columns):
        raise HTTPException(status_code=500, detail=f"Missing columns: {sorted(required_columns)}")

    # In-place operations avoid creating a full DataFrame copy
    data = food_price_df
    for col in ["Food Price Index", "Cereals", "Oils", "Meat", "Dairy", "Sugar"]:
        data[col] = pd.to_numeric(data[col], errors="coerce")
    data = data.dropna(subset=["Date", "Food Price Index"]).sort_values("Date")

    if len(data) < 12:
        raise HTTPException(status_code=503, detail="Need at least 12 rows.")

    # LSTM forecast on Food Price Index
    recent = data[["Food Price Index"]].tail(12).to_numpy(dtype=float)
    scaler = MinMaxScaler()
    recent_scaled = scaler.fit_transform(recent)
    predictions_scaled = []
    input_seq = recent_scaled.copy()

    if model is not None:
        for _ in range(6):
            x_input = input_seq.reshape(1, 12, 1)
            pred = model.predict(x_input, verbose=0)
            predictions_scaled.append(pred[0][0])
            input_seq = np.vstack([input_seq[1:], pred.reshape(1, 1)])
        predictions = scaler.inverse_transform(
            np.array(predictions_scaled).reshape(-1, 1)
        ).flatten()
    else:
        latest_value = float(data["Food Price Index"].iloc[-1])
        predictions = np.array([latest_value] * 6, dtype=float)

    last_date = data["Date"].iloc[-1]
    future_months = pd.date_range(start=last_date, periods=7, freq="MS")[1:]

    # Per-commodity simple linear trend forecast (last 12 months slope)
    def simple_forecast(col_name, n=6):
        col_data = data[col_name].dropna().tail(12).values.astype(float)
        if len(col_data) < 2:
            return [float(col_data[-1])] * n
        slope = (col_data[-1] - col_data[0]) / len(col_data)
        last_val = col_data[-1]
        return [round(last_val + slope * (i + 1), 2) for i in range(n)]

    cereals_pred = simple_forecast("Cereals")
    oils_pred = simple_forecast("Oils")
    meat_pred = simple_forecast("Meat")
    dairy_pred = simple_forecast("Dairy")
    sugar_pred = simple_forecast("Sugar")

    # Historical — full available series (frontend applies 1Y/3Y/5Y/All filters)
    # Convert to records once to avoid DataFrame copy overhead
    historical = []
    for row in data[["Date", "Food Price Index", "Cereals", "Oils", "Meat", "Dairy", "Sugar"]].to_dict("records"):
        historical.append({
            "date": str(row["Date"].date()),
            "food_price_index": round(float(row["Food Price Index"]), 2) if pd.notna(row["Food Price Index"]) else None,
            "cereals": round(float(row["Cereals"]), 2) if pd.notna(row["Cereals"]) else None,
            "oils": round(float(row["Oils"]), 2) if pd.notna(row["Oils"]) else None,
            "meat": round(float(row["Meat"]), 2) if pd.notna(row["Meat"]) else None,
            "dairy": round(float(row["Dairy"]), 2) if pd.notna(row["Dairy"]) else None,
            "sugar": round(float(row["Sugar"]), 2) if pd.notna(row["Sugar"]) else None,
        })

    return {
        "status": "success",
        "model_used": model is not None,
        "current_prices": {
            "food_price_index": round(float(data["Food Price Index"].iloc[-1]), 2),
            "cereals": round(float(data["Cereals"].iloc[-1]), 2),
            "oils": round(float(data["Oils"].iloc[-1]), 2),
            "meat": round(float(data["Meat"].iloc[-1]), 2),
            "dairy": round(float(data["Dairy"].iloc[-1]), 2),
            "sugar": round(float(data["Sugar"].iloc[-1]), 2),
        },
        "prev_prices": {
            "food_price_index": round(float(data["Food Price Index"].iloc[-2]), 2),
            "cereals": round(float(data["Cereals"].iloc[-2]), 2),
            "oils": round(float(data["Oils"].iloc[-2]), 2),
            "meat": round(float(data["Meat"].iloc[-2]), 2),
            "dairy": round(float(data["Dairy"].iloc[-2]), 2),
            "sugar": round(float(data["Sugar"].iloc[-2]), 2),
        },
        "predictions": [
            {
                "month": str(month.date()),
                "food_price_index": round(float(price), 2),
                "food_price_index_upper": round(float(price) * 1.05, 2),
                "food_price_index_lower": round(float(price) * 0.95, 2),
                "cereals": cereals_pred[i],
                "cereals_upper": round(cereals_pred[i] * 1.05, 2),
                "cereals_lower": round(cereals_pred[i] * 0.95, 2),
                "oils": oils_pred[i],
                "oils_upper": round(oils_pred[i] * 1.05, 2),
                "oils_lower": round(oils_pred[i] * 0.95, 2),
                "meat": meat_pred[i],
                "meat_upper": round(meat_pred[i] * 1.05, 2),
                "meat_lower": round(meat_pred[i] * 0.95, 2),
                "dairy": dairy_pred[i],
                "dairy_upper": round(dairy_pred[i] * 1.05, 2),
                "dairy_lower": round(dairy_pred[i] * 0.95, 2),
                "sugar": sugar_pred[i],
                "sugar_upper": round(sugar_pred[i] * 1.05, 2),
                "sugar_lower": round(sugar_pred[i] * 0.95, 2),
            }
            for i, (month, price) in enumerate(zip(future_months, predictions))
        ],
        "historical": historical,
    }


@app.get("/risk")
def risk(year: int = None):
    cpi_df = get_cpi_data()

    if cpi_df is None:
        raise HTTPException(status_code=503, detail="Missing clean_consumer_price_indices.csv")

    required_columns = {"Area", "Date", "Value"}
    if not required_columns.issubset(cpi_df.columns):
        raise HTTPException(status_code=500, detail=f"Missing columns: {sorted(required_columns)}")

    df = cpi_df.copy()
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["Value"] = pd.to_numeric(df["Value"], errors="coerce")
    df = df.dropna(subset=["Area", "Date", "Value"])
    df = df[df["Value"] > 0]

    if df.empty:
        raise HTTPException(status_code=503, detail="No usable rows.")

    available_years = sorted(df["Date"].dt.year.unique().tolist())

    if year and year in available_years:
        selected_year = year
    else:
        selected_year = available_years[-1]

    df_year = df[df["Date"].dt.year == selected_year]
    df_year = df_year.sort_values("Date").groupby("Area", as_index=False).last()

    def get_risk_level(value):
        if value > 300:
            return "CRITICAL"
        if value > 150:
            return "HIGH"
        if value > 110:
            return "MEDIUM"
        return "LOW"

    df_year["risk_level"] = df_year["Value"].apply(get_risk_level)

    result = df_year[["Area", "Value", "risk_level"]].rename(
        columns={"Area": "country", "Value": "cpi_value"}
    ).to_dict(orient="records")

    for row in result:
        row["country"] = normalize_country_name(row["country"])

    return {
        "status": "success",
        "total_countries": len(result),
        "selected_year": selected_year,
        "timeline_labels": available_years,
        "risk_data": result,
    }


@app.get("/food-prices")
def food_prices(commodity: str = "Cereals"):
    food_price_df = get_food_price_data()

    if food_price_df is None:
        raise HTTPException(status_code=503, detail="Missing clean_food_price_indices.csv")

    col = FOOD_PRICE_COLUMN_MAP.get(commodity, "Cereals")

    if col not in food_price_df.columns:
        available = [c for c in food_price_df.columns if c != "Date"]
        col = available[0] if available else None

    if not col:
        raise HTTPException(status_code=500, detail="No commodity columns found")

    df = food_price_df[["Date", col]].dropna().copy()
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"]).sort_values("Date")
    df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=[col])

    return {
        "status": "success",
        "commodity": commodity,
        "column_used": col,
        "data": [
            {"date": str(row["Date"].date()), "value": round(float(row[col]), 2)}
            for _, row in df.iterrows()
        ],
    }


@app.get("/trade")
def trade(country: str = Query(...), commodity: str = Query(default="Cereals")):
    trade_df = get_trade_data()

    if trade_df is None:
        raise HTTPException(status_code=503, detail="Missing clean_trade_matrix.csv")

    required_columns = {"Reporter Country", "Partner Country", "Item", "Element", "Value"}
    if not required_columns.issubset(trade_df.columns):
        raise HTTPException(status_code=500, detail=f"Missing columns: {sorted(required_columns)}")

    # 1. Robust Country Matching
    target_lower = country.strip().lower()
    
    def is_match(c):
        if pd.isna(c):
            return False
        c_lower = str(c).strip().lower()
        c_clean = c_lower.split("(")[0].strip()
        t_clean = target_lower.split("(")[0].strip()
        
        if c_clean == t_clean:
            return True
        
        mappings = {
            "russia": "russian federation",
            "tanzania": "united republic of tanzania",
            "syria": "syrian arab republic",
            "south korea": "republic of korea",
            "north korea": "democratic people's republic of korea",
            "moldova": "republic of moldova",
            "vietnam": "viet nam",
            "united states of america": "united states of america",
            "united kingdom": "united kingdom of great britain and northern ireland",
            "bolivia": "bolivia",
            "venezuela": "venezuela",
            "iran": "iran",
            "turkey": "türkiye",
            "brazil": "brazil"
        }
        
        if mappings.get(t_clean) == c_clean or mappings.get(c_clean) == t_clean:
            return True
            
        return False

    country_mask = trade_df["Reporter Country"].apply(is_match)
    country_df = trade_df[country_mask].copy()

    # If we couldn't find the country at all, return empty
    if country_df.empty:
        return {"status": "success", "country": country, "commodity": commodity, "imports": [], "exports": []}

    # 2. Robust Commodity Matching
    items = COMMODITY_ITEM_MAP.get(commodity, COMMODITY_ITEM_MAP["Cereals"])
    df = country_df[country_df["Item"].isin(items)].copy()
    
    # Fallback 1: fuzzy string match on commodity
    if df.empty:
        mask = country_df["Item"].str.contains(commodity, case=False, na=False)
        df = country_df[mask].copy()
        
    # Fallback 2: just take all commodities for this country so lines draw!
    if df.empty:
        df = country_df.copy()

    df["Value"] = pd.to_numeric(df["Value"], errors="coerce").fillna(0)

    imports_df = df[df["Element"].str.contains("Import", case=False, na=False)]
    imports = (
        imports_df.groupby("Partner Country")["Value"]
        .sum().reset_index()
        .sort_values("Value", ascending=False).head(5)
    )

    exports_df = df[df["Element"].str.contains("Export", case=False, na=False)]
    exports = (
        exports_df.groupby("Partner Country")["Value"]
        .sum().reset_index()
        .sort_values("Value", ascending=False).head(5)
    )

    return {
        "status": "success",
        "country": country,
        "commodity": commodity,
        "imports": imports.rename(columns={"Partner Country": "partner", "Value": "value"}).to_dict(orient="records"),
        "exports": exports.rename(columns={"Partner Country": "partner", "Value": "value"}).to_dict(orient="records"),
    }

