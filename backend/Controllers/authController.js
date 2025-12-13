const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const crypto = require('crypto');

const authController = {
    // User Registration
    registerUser: async (req, res) => {
        try {
            const { name, email, password, phone_number } = req.body;

            // Check if user exists
            const [existingUser] = await pool.execute(
                'SELECT user_id FROM users WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            const [result] = await pool.execute(
                `INSERT INTO users (name, email, password_hash, phone_number, is_logged_in, last_login) 
         VALUES (?, ?, ?, ?, TRUE, NOW())`,
                [name, email, hashedPassword, phone_number]
            );

            // Generate token
            const token = jwt.sign(
                { id: result.insertId, email, role: 'user' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: { id: result.insertId, name, email, phone_number, role: 'user' }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Arena Owner Registration
    registerOwner: async (req, res) => {
        try {
            const { arena_name, email, password, phone_number, business_address,
                google_maps_location, number_of_courts, agreed_to_terms } = req.body;

            // Check if owner exists
            const [existingOwner] = await pool.execute(
                'SELECT owner_id FROM arena_owners WHERE email = ?',
                [email]
            );

            if (existingOwner.length > 0) {
                return res.status(400).json({ message: 'Owner already exists' });
            }

            if (!agreed_to_terms) {
                return res.status(400).json({ message: 'Must agree to terms and conditions' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert owner
            const [result] = await pool.execute(
                `INSERT INTO arena_owners 
        (arena_name, email, password_hash, phone_number, business_address, 
         google_maps_location, number_of_courts, agreed_to_terms) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [arena_name, email, hashedPassword, phone_number, business_address,
                    google_maps_location, number_of_courts, agreed_to_terms]
            );

            // Generate token
            const token = jwt.sign(
                { id: result.insertId, email, role: 'owner' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'Arena owner registered successfully',
                token,
                owner: {
                    id: result.insertId,
                    arena_name,
                    email,
                    phone_number,
                    role: 'owner'
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Admin Registration (for super admin only)
    registerAdmin: async (req, res) => {
        try {
            const { username, email, password, full_name } = req.body;

            // Check if admin exists
            const [existingAdmin] = await pool.execute(
                'SELECT admin_id FROM admins WHERE email = ? OR username = ?',
                [email, username]
            );

            if (existingAdmin.length > 0) {
                return res.status(400).json({ message: 'Admin already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert admin
            const [result] = await pool.execute(
                `INSERT INTO admins (username, email, password_hash, full_name) 
         VALUES (?, ?, ?, ?)`,
                [username, email, hashedPassword, full_name]
            );

            // Generate token
            const token = jwt.sign(
                { id: result.insertId, email, role: 'admin' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'Admin registered successfully',
                token,
                admin: { id: result.insertId, username, email, full_name, role: 'admin' }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Manager Registration (by arena owner)
    registerManager: async (req, res) => {
        try {
            const { name, email, password, phone_number, permissions } = req.body;
            const owner_id = req.user.id;

            // Check if manager exists
            const [existingManager] = await pool.execute(
                'SELECT manager_id FROM arena_managers WHERE email = ? AND owner_id = ?',
                [email, owner_id]
            );

            if (existingManager.length > 0) {
                return res.status(400).json({ message: 'Manager already exists for this arena' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert manager
            const [result] = await pool.execute(
                `INSERT INTO arena_managers (owner_id, name, email, password_hash, phone_number, permissions) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [owner_id, name, email, hashedPassword, phone_number, JSON.stringify(permissions)]
            );

            res.status(201).json({
                message: 'Manager registered successfully',
                manager: {
                    id: result.insertId,
                    name,
                    email,
                    phone_number,
                    permissions,
                    owner_id
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Login for all user types
    login: async (req, res) => {
        try {
            const { email, password, userType } = req.body;
            let user, role, table;

            // Determine which table to query based on userType
            switch (userType) {
                case 'user':
                    table = 'users';
                    role = 'user';
                    break;
                case 'owner':
                    table = 'arena_owners';
                    role = 'owner';
                    break;
                case 'admin':
                    table = 'admins';
                    role = 'admin';
                    break;
                case 'manager':
                    table = 'arena_managers';
                    role = 'manager';
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid user type' });
            }

            // Find user
            let query;
            if (table === 'arena_managers') {
                query = `SELECT * FROM ${table} WHERE email = ? AND is_active = TRUE`;
            } else if (table === 'arena_owners') {
                query = `SELECT * FROM ${table} WHERE email = ? AND is_active = TRUE`;
            } else {
                query = `SELECT * FROM ${table} WHERE email = ?`;
            }

            const [users] = await pool.execute(query, [email]);

            if (users.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            user = users[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login for users
            if (table === 'users') {
                await pool.execute(
                    'UPDATE users SET is_logged_in = TRUE, last_login = NOW() WHERE user_id = ?',
                    [user.user_id]
                );
            }

            // Generate token
            const tokenPayload = {
                id: user.user_id || user.owner_id || user.admin_id || user.manager_id,
                email: user.email,
                role
            };

            // Add owner_id for managers
            if (role === 'manager') {
                tokenPayload.owner_id = user.owner_id;
            }

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            // Prepare response data
            let userData;
            if (role === 'user') {
                userData = {
                    id: user.user_id,
                    name: user.name,
                    email: user.email,
                    phone_number: user.phone_number,
                    profile_picture_url: user.profile_picture_url,
                    role
                };
            } else if (role === 'owner') {
                userData = {
                    id: user.owner_id,
                    arena_name: user.arena_name,
                    email: user.email,
                    phone_number: user.phone_number,
                    role
                };
            } else if (role === 'admin') {
                userData = {
                    id: user.admin_id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role
                };
            } else if (role === 'manager') {
                userData = {
                    id: user.manager_id,
                    name: user.name,
                    email: user.email,
                    phone_number: user.phone_number,
                    permissions: user.permissions,
                    owner_id: user.owner_id,
                    role
                };
            }

            res.json({
                message: 'Login successful',
                token,
                user: userData
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Guest session
    createGuestSession: async (req, res) => {
        try {
            const sessionId = crypto.randomUUID();

            await pool.execute(
                'INSERT INTO guest_sessions (session_id) VALUES (?)',
                [sessionId]
            );

            res.json({
                message: 'Guest session created',
                session_id: sessionId
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Logout
    logout: async (req, res) => {
        try {
            if (req.user.role === 'user') {
                await pool.execute(
                    'UPDATE users SET is_logged_in = FALSE WHERE user_id = ?',
                    [req.user.id]
                );
            }

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = authController;