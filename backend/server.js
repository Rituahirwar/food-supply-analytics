require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');
const axios = require('axios');
const { connectPostgres, connectMongo } = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const dataRoutes = require('./src/routes/dataRoutes');

const app = express();

app.set('trust proxy', 1); // Trust Render's load balancer IP
app.use(helmet());
app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased limit from 100 to 500
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(cors());
app.use(express.json());
app.use('/api/', limiter);

connectPostgres();
connectMongo();

const ML_URL = process.env.ML_SERVICE_URL || 'https://food-supply-analytics-1.onrender.com';
console.log(`[STARTUP] ML_SERVICE_URL configured as: ${ML_URL}`);

// Health endpoint that checks ML connectivity too
app.get('/health', async (req, res) => {
  let mlStatus = 'unknown';
  try {
    const resp = await axios.get(`${ML_URL}/health`, { timeout: 5000 });
    mlStatus = resp.status === 200 ? 'ok' : `unexpected ${resp.status}`;
  } catch (err) {
    mlStatus = `error: ${err.code || err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'express_backend',
    ml_service_url: ML_URL,
    ml_status: mlStatus,
  });
});

const swaggerDoc = yaml.load(path.join(__dirname, './src/docs/swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

app.get('/', (req, res) => res.json({ status: 'ok', service: 'express_backend', ml_url: ML_URL }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
