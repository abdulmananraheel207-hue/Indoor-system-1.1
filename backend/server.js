const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Import config and db
const config = require("./config");
const pool = require("./db"); // Use the pool instead of direct connection

const app = express();

// Middleware
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

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

// Start server
const PORT = config.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
