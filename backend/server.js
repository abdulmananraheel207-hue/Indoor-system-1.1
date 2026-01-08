const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// Import cleanup cron AFTER dotenv config
const { scheduleCleanupJobs } = require("./utils/cleanupCron");

// Import your config and db
const config = require("./config");
const db = require("./db");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const arenaRoutes = require("./routes/arenas");
const ownerRoutes = require("./routes/owners");
const adminRoutes = require("./routes/admin");
const bookingRoutes = require("./routes/bookings");
const chatRoutes = require("./routes/chats");
const managerRoutes = require("./routes/managers");
const ownerBookingsRoutes = require("./routes/ownerBookings");
const app = express();
const { applySchemaPatches } = require("./utils/schemaPatches");
const { startLockExpiryJob } = require("./utils/slotLockService");

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Test database connection on startup
db.getConnection()
  .then((connection) => {
    console.log("✅ Database connected to:", config.DB_DATABASE);
    connection.release();
    applySchemaPatches()
      .then(() => console.log("✅ Schema patches applied"))
      .catch((err) => console.warn("⚠️ Schema patch failed", err.message));

    // Start lock expiry job
    startLockExpiryJob();

    // Start cleanup cron jobs (only in production/staging)
    if (process.env.NODE_ENV !== 'development') {
      scheduleCleanupJobs();
    } else {
      console.log('⚠️  Cleanup jobs disabled in development mode');
    }
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    service: "Indoor Booking System API",
    version: "1.0.0",
    environment: config.NODE_ENV,
    database: config.DB_DATABASE,
    cleanup_jobs: process.env.NODE_ENV !== 'development' ? 'active' : 'disabled'
  });
});

// Database connection test
app.get("/api/db-check", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.execute("SELECT 1 as connection_test");
    connection.release();
    res.json({
      success: true,
      message: "Database connected successfully",
      database: config.DB_DATABASE,
      test: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// API documentation
app.get("/api", (req, res) => {
  res.json({
    name: "Indoor Booking System API",
    version: "1.0.0",
    description: "API for booking indoor sports arenas",
    base_url: "/api",
    endpoints: {
      auth: "/auth",
      users: "/users",
      arenas: "/arenas",
      owners: "/owners",
      admin: "/admin",
      bookings: "/bookings",
      chats: "/chats",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/arenas", arenaRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/managers", managerRoutes);
app.use("/api/owners", ownerBookingsRoutes);

// 404 handler
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(config.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = config.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
    🚀 Server is running!
    🌐 Environment: ${config.NODE_ENV}
    🔗 Base URL: http://localhost:${PORT}
    📊 API Health: http://localhost:${PORT}/api/health
    🗄️  Database: ${config.DB_DATABASE} @ ${config.DB_HOST}
    🎯 CORS Origin: ${config.CORS_ORIGIN}
    🧹 Cleanup Jobs: ${process.env.NODE_ENV !== 'development' ? '✅ Active' : '⚠️ Disabled'}
    
    ⏰ Started at: ${new Date().toLocaleString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;