const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    
    // Enable Row-Level Security on the Users table to fix Supabase security warnings
    // This blocks public Data API access but allows Sequelize to work normally using the connection string.
    try {
      await sequelize.query('ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;');
      console.log('Row-Level Security enabled on Users table');
    } catch (rlsErr) {
      console.error('Could not enable RLS on Users table:', rlsErr.message);
    }

    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL error:', err.message);
  }
};

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB error:', err.message);
  }
};

module.exports = { sequelize, connectPostgres, connectMongo };
