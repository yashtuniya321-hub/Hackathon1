import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'brightloop_jwt_secret_hackathon_2026_super_secure',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  RESET_TOKEN_EXPIRY_MINUTES: 60,
  DATA_DIR: process.env.DATA_DIR || './data/postgres'
};
