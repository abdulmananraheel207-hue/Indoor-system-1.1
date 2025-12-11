// server.js - FIXED CORS (remove duplicate)
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const adminRoutes = require("./routes/adminRoutes");

const config = require("./config");
const pool = require("./db");

const app = express();

// Middleware - FIXED (only one CORS)
app.use(
  cors({
    origin: config.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ... rest of server.js remains the same

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database");
  connection.release();
});

// Make pool available to routes
app.locals.db = pool;

// Simple test endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend is running!",
    database: "Connected",
    timestamp: new Date().toISOString(),
  });
});

// Import routes
const userAuthRoutes = require("./routes/userAuth");
const ownerAuthRoutes = require("./routes/ownerAuth");
const adminAuthRoutes = require("./routes/adminAuth");
const managerAuthRoutes = require("./routes/managerAuth");

// Use routes
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth/owner", ownerAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/auth/manager", managerAuthRoutes);
app.use("/api/admin", adminRoutes);

// Start server
const PORT = config.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
