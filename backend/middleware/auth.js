const jwt = require('jsonwebtoken');
const pool = require('../db');

const auth = {
    // Middleware to verify JWT token
    verifyToken: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Access denied. No token provided.' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    },

    // Check if user is a regular user
    isUser: (req, res, next) => {
        if (req.user.role === 'user') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. User role required.' });
        }
    },

    // Check if user is an arena owner
    isOwner: (req, res, next) => {
        if (req.user.role === 'owner') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Owner role required.' });
        }
    },

    // Check if user is an admin
    isAdmin: (req, res, next) => {
        if (req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
    },

    // Check if user is a manager
    isManager: (req, res, next) => {
        if (req.user.role === 'manager') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Manager role required.' });
        }
    },

    // Check if user is owner or manager
    isOwnerOrManager: (req, res, next) => {
        if (req.user.role === 'owner' || req.user.role === 'manager') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Owner or manager role required.' });
        }
    }
};

module.exports = auth;