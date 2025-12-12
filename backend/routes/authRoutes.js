// routes/authRoutes.js - UPDATED VERSION
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working!', timestamp: new Date().toISOString() });
});

// User Registration - SIMPLIFIED FOR TESTING
router.post('/register', async (req, res) => {
    try {
        console.log('Registration attempt:', req.body);
        const { name, email, password, phone_number } = req.body;

        // Basic validation
        if (!name || !email || !password || !phone_number) {
            return res.status(400).json({
                error: 'Missing fields',
                required: ['name', 'email', 'password', 'phone_number']
            });
        }

        // Check if user exists (using email only for simplicity)
        const [existingUsers] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone_number, created_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [name, email, password_hash, phone_number]
        );

        // Create token
        const token = jwt.sign(
            {
                user_id: result.insertId,
                email: email,
                role: 'user'
            },
            process.env.JWT_SECRET || 'arena-booking-secret-key-2024',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token: token,
            user: {
                user_id: result.insertId,
                name: name,
                email: email,
                phone_number: phone_number
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: error.message
        });
    }
});

// User Login - SIMPLIFIED
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Find user by email
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'No user found with this email'
            });
        }

        const user = users[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password'
            });
        }

        // Create token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role: 'user'
            },
            process.env.JWT_SECRET || 'arena-booking-secret-key-2024',
            { expiresIn: '7d' }
        );

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE user_id = ?',
            [user.user_id]
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: error.message
        });
    }
});

// Test user creation (for development)
router.post('/test-create-user', async (req, res) => {
    try {
        const testUser = {
            name: 'Test User',
            email: 'test@user.com',
            phone_number: '1234567890',
            password: 'password123'
        };

        // Hash password
        const password_hash = await bcrypt.hash(testUser.password, 10);

        // Insert test user
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone_number, created_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [testUser.name, testUser.email, password_hash, testUser.phone_number]
        );

        res.json({
            success: true,
            message: 'Test user created',
            credentials: {
                email: testUser.email,
                password: testUser.password
            }
        });

    } catch (error) {
        console.error('Test user creation error:', error);
        res.status(500).json({
            error: 'Failed to create test user',
            details: error.message
        });
    }
});

module.exports = router;