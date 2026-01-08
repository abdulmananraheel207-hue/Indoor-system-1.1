// config.js — update values before start
module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "ahmed.147",
  DB_DATABASE: process.env.DB_DATABASE || "indoor_system",
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "09631e3f99caf686f08d48965782fcdb751c691bb08d610e51d893c300b6e694e86a3645ef38a94a414fd11f8d077292057c0ca7e94a6fb3db33cc2197891e35",
};
