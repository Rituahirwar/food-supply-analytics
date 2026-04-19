# Food Supply Chain Disruption Analyzer

This is our group project analyzing how instances of global disruption impact the food supply chain using AI and Full Stack Development. We meet Complex Engineering Problem (CEP) characteristics by routing through a Node.js/Express backend, a Python ML service, and a React frontend.

## Project Structure

* /backend: Node.js/Express backend (Setup DBs, JWTs, Swagger here)
* /frontend: React UI (Create visualizations and Dashboards here)
* /ml_service: Python Microservice (Runs our AI code and Pandas data-cleaning)
* /docs: Our formal reports and CEP diagrams

## Getting Started

### 1. Clone the repository.

### 2. ML Service:
* `cd ml_service`
* `python -m venv venv`
* `.\venv\Scripts\activate` (Windows)
* `pip install -r requirements.txt`

### 3. Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder with the following:

```
PORT=5000
JWT_SECRET=replace_with_strong_secret
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=fsd_mini_proj
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
MONGODB_URI=MONGODB_URI=<your_mongodb_connection_string>
ML_SERVICE_URL=http://127.0.0.1:8000
```

```bash
node server.js
```

Runs on http://localhost:5000

## Running the Full Project

You need two terminals running simultaneously.

Terminal 1 — ML Service:
```bash
uvicorn app.main:app --reload
```

Terminal 2 — Backend:
```bash
node server.js
```

## API Documentation

Once backend is running visit http://localhost:5000/api/docs
```