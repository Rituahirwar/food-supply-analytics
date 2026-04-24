# Food Supply Chain Disruption Analyzer

Full-stack application for analyzing global food supply disruption risk using:

- React frontend for dashboards, maps, alerts, and predictions
- Node.js/Express backend for auth, API orchestration, and logging
- FastAPI ML/data service for CPI risk, food-price forecasts, and trade endpoints

## Architecture

### Services

- `frontend` (Vite + React): `http://localhost:5173`
- `backend` (Express): `http://localhost:5000`
- `ml_service` (FastAPI): `http://127.0.0.1:8000`

### Request Flow

1. Frontend calls backend API routes under `/api/...`
2. Backend validates JWT (for protected routes) and proxies/aggregates data
3. Backend calls ML service endpoints (`/risk`, `/predict`, `/food-prices`, `/trade`)
4. Frontend renders transformed views (KPIs, map colors, alerts, tables, charts)

## Current UI Behavior (Updated)

### Topbar visibility

- Topbar (country search + commodity chips) is shown only on `Supply Chain Map` page (`/map`)
- Topbar is hidden on Dashboard, Alerts, Predictions, History, and Admin pages

### Map search behavior

- Searching a country in the map page topbar highlights/selects that country on the map panel

### Dataset year behavior

- Dashboard year dropdown is constrained to `2018` through `2025`
- Year selection updates risk-dependent dashboard values and map coloring using selected-year CPI risk data

### Data encoding cleanup

- ML risk API normalizes mojibake country names (for example, `TÃ¼rkiye` -> `Türkiye`) before returning data

## Data Fidelity Notes

For the risk workflow (`/risk`):

- Country CPI values are dataset-based for the selected year
- Risk level labels are computed from CPI thresholds:
	- `> 300`: `CRITICAL`
	- `> 150`: `HIGH`
	- `> 110`: `MEDIUM`
	- otherwise `LOW`
- Some UI metrics are derived from dataset values:
	- average CPI card
	- top-5 sorting
	- risk-level counts

Prediction widgets are model/service outputs and not raw CPI rows.

## Repository Structure

- `backend/`: Express app, auth, routing, logging, Swagger docs
- `frontend/`: React pages/components/context/hooks/services
- `ml_service/`: FastAPI app, model inference, risk and trade endpoints, cleaned datasets
- `docs/`: reports and diagrams

## Setup

## 1) Clone

```bash
git clone <repo-url>
cd food-supply-analytics
```

## 2) ML service

```bash
cd ml_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Run:

```bash
uvicorn app.main:app --reload
```

## 3) Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
JWT_SECRET=replace_with_strong_secret
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=fsd_mini_proj
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
MONGODB_URI=<your_mongodb_connection_string>
ML_SERVICE_URL=http://127.0.0.1:8000
```

Run:

```bash
node server.js
```

## 4) Frontend

The frontend now reads API endpoints from Vite environment variables. Create `frontend/.env.local` for local development:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_ML_URL=http://127.0.0.1:8000
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

## Run All Services Together

Use three terminals:

1. ML service

```bash
cd ml_service
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

2. Backend

```bash
cd backend
node server.js
```

3. Frontend

```bash
cd frontend
npm run dev
```

## Deployment

This repo is ready to deploy from GitHub. Use Render for the backend and ML service, and Vercel for the frontend.

### 1) Push the current repo

```bash
git add .
git commit -m "Deploy-ready config"
git push
```

### 2) Deploy ML service on Render

- Root Directory: `ml_service`
- Runtime: Python 3.11
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Test:

`https://<your-ml-service>.onrender.com/health`

### 3) Deploy backend on Render

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:

```env
PORT=10000
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
POSTGRES_HOST=<your-postgres-host>
POSTGRES_PORT=5432
POSTGRES_DB=<your-postgres-db>
POSTGRES_USER=<your-postgres-user>
POSTGRES_PASSWORD=<your-postgres-password>
MONGODB_URI=<your-mongodb-uri>
ML_SERVICE_URL=https://<your-ml-service>.onrender.com
```

Test:

`https://<your-backend>.onrender.com/api/data/predict`

### 4) Deploy frontend on Vercel

- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm install && npm run build`
- Output Directory: `dist`

Environment variables:

```env
VITE_BACKEND_URL=https://<your-backend>.onrender.com
VITE_ML_URL=https://<your-ml-service>.onrender.com
```

Test: open your Vercel URL and verify the app loads.

## End-to-End Workflow

### A) Dashboard workflow

1. Dashboard loads
2. Frontend requests risk baseline through backend
3. Available years are filtered to `2018-2025`
4. User chooses year
5. Frontend requests year-specific risk data
6. KPI cards, risk counts, top alerts, and world map refresh for that year

### B) Supply Chain Map workflow

1. User opens map page
2. Topbar is visible (search + commodity chips)
3. Country search selects/highlights map country panel
4. Commodity selection changes food-price and trade route views
5. Year setting updates map risk coloring and country risk values

### C) Prediction workflow

1. Frontend calls prediction API
2. Backend fetches ML `/predict`
3. Forecast data and historical series are returned
4. Prediction visualizations and anomaly flags render in UI

## API Docs

- Backend Swagger: `http://localhost:5000/api/docs`
- ML health: `http://127.0.0.1:8000/health`

## Troubleshooting

- If UI routes seem stale, restart frontend dev server from `frontend/`
- If backend data seems stale, restart backend from `backend/`
- If map/prediction data fails, verify ML service is running on `127.0.0.1:8000`
- If auth-protected calls return `401`, log in again and retry