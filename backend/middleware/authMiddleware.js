// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config');

// Generic token verification for all roles
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET || 'arena-booking-secret-key-2024');

    // Attach user info based on role
    switch (decoded.role) {
      case 'admin':
        req.admin = decoded;
        req.userType = 'admin';
        break;
      case 'owner':
        req.owner = decoded;
        req.userType = 'owner';
        break;
      case 'manager':
        req.manager = decoded;
        req.userType = 'manager';
        break;
      case 'user':
        req.user = decoded;
        req.userType = 'user';
        break;
      default:
        return res.status(403).json({
          success: false,
          error: 'Invalid user role',
        });
    }

    req.role = decoded.role;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
};

// Admin-only middleware
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }
    next();
  });
};

// Owner-only middleware
const verifyOwner = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Owner only.',
      });
    }
    next();
  });
};

// Manager-only middleware
const verifyManager = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Manager only.',
      });
    }
    next();
  });
};

// User-only middleware
const verifyUser = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.role !== 'user') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. User only.',
      });
    }
    next();
  });
};

// Owner or Manager middleware
const verifyOwnerOrManager = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.role !== 'owner' && req.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Owner or Manager only.',
      });
    }
    next();
  });
};

// Admin or Owner middleware
const verifyAdminOrOwner = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.role !== 'admin' && req.role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or Owner only.',
      });
    }
    next();
  });
};

// Check if user is authenticated (any role)
const isAuthenticated = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.isAuthenticated = false;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET || 'arena-booking-secret-key-2024');

    req.isAuthenticated = true;
    req.role = decoded.role;

    // Attach appropriate user object
    switch (decoded.role) {
      case 'admin':
        req.admin = decoded;
        break;
      case 'owner':
        req.owner = decoded;
        break;
      case 'manager':
        req.manager = decoded;
        break;
      case 'user':
        req.user = decoded;
        break;
    }

    next();
  } catch (error) {
    req.isAuthenticated = false;
    next();
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyOwner,
  verifyManager,
  verifyUser,
  verifyOwnerOrManager,
  verifyAdminOrOwner,
  isAuthenticated,
};