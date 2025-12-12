// server.js - UPDATE ONLY THE ROUTE REGISTRATION SECTION
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== DATABASE CONNECTION ==========
const mysql = require('mysql2');
const config = require('./config');

const pool = mysql.createPool({
  host: config.DB_HOST || 'localhost',
  user: config.DB_USER || 'root',
  password: config.DB_PASSWORD || 'password1144',
  database: config.DB_DATABASE || 'indoor_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to MySQL database');
    connection.release();
  }
});

// Make pool available to routes
app.locals.db = pool;

// ========== IMPORT ROUTES ==========
const authRoutes = require('./routes/authRoutes'); // ADD THIS
const adminAuth = require('./routes/adminAuth');
const managerAuth = require('./routes/managerAuth');
const ownerAuth = require('./routes/ownerAuth');
const userAuth = require('./routes/userAuth');
const bookingRoutes = require('./routes/bookingRoutes');
const searchRoutes = require('./routes/searchRoutes');

// ========== ROUTE REGISTRATION ==========

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Sports Arena Booking API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 2. Public Authentication Routes
app.use('/api/auth', authRoutes); // ADD THIS LINE
app.use('/api/auth/admin', adminAuth);
app.use('/api/auth/manager', managerAuth);

// 3. Owner Routes (uses verifyOwner middleware internally)
app.use('/api/owner', ownerAuth);

// 4. User Routes (uses verifyUser middleware internally)
app.use('/api/user', userAuth);

// 5. Booking Routes (mixed public/protected)
app.use('/api/bookings', bookingRoutes);

// 6. Search Routes (public)
app.use('/api/search', searchRoutes);

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// ========== START SERVER ==========
const PORT = config.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   Public:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/auth/register (user registration)`);
  console.log(`   - POST /api/auth/login (user login)`);
  console.log(`   - POST /api/auth/admin/login`);
  console.log(`   - POST /api/auth/manager/login`);
  console.log(`   - GET  /api/search/arenas`);
  console.log(`\n   Protected (need token):`);
  console.log(`   - /api/owner/* (owner dashboard)`);
  console.log(`   - /api/user/* (user dashboard)`);
  console.log(`   - /api/bookings/* (booking endpoints)`);
});