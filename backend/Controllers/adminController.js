// controllers/adminController.js - SIMPLIFIED WORKING VERSION
const pool = require('../db');

const adminController = {
    // Admin Login - Hardcoded (single admin)
    // In adminController.js
    loginAdmin: async (req, res) => {
        try {
            console.log("🔐 Admin login attempt received");
            console.log("Request body:", req.body);

            const { username, password } = req.body;

            // Debug: Log exactly what we received
            console.log("Received - Username:", username, "Type:", typeof username);
            console.log("Received - Password:", password, "Type:", typeof password);

            // Simple string comparison - no trimming, no case conversion
            if (username === 'admin' && password === 'admin123') {
                console.log("✅ Credentials are CORRECT!");

                const jwt = require('jsonwebtoken');
                const token = jwt.sign(
                    {
                        id: 1,
                        username: 'admin',
                        role: 'admin'
                    },
                    process.env.JWT_SECRET || 'admin_secret_key',
                    { expiresIn: '24h' }
                );

                console.log("✅ Token generated:", token.substring(0, 20) + "...");

                res.json({
                    success: true,
                    message: "Admin login successful",
                    token: token,
                    user: {
                        id: 1,
                        name: 'System Administrator',
                        email: 'admin@arenafinder.com',
                        role: 'admin',
                        username: 'admin'
                    }
                });
            } else {
                console.log("❌ Credentials are WRONG!");
                console.log("Expected: admin / admin123");
                console.log("Got:", username, "/", password);

                res.status(401).json({
                    success: false,
                    message: "Invalid admin credentials. Use: admin / admin123"
                });
            }
        } catch (error) {
            console.error("❌ Login error:", error);
            res.status(500).json({
                success: false,
                message: "Server error during login",
                error: error.message
            });
        }
    },

    // Get Admin Dashboard
    getDashboard: async (req, res) => {
        try {
            console.log("📊 Fetching admin dashboard data...");

            // 1. Overall statistics
            const [overallStats] = await pool.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM arena_owners) as total_owners,
                    (SELECT COUNT(*) FROM arenas WHERE is_active = TRUE AND is_blocked = FALSE) as total_arenas,
                    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'completed') as total_revenue,
                    (SELECT COALESCE(SUM(commission_amount), 0) FROM bookings WHERE status = 'completed') as total_commission,
                    (SELECT COALESCE(SUM(total_commission_due), 0) FROM arenas) as pending_commission
            `);

            // 2. Monthly commission
            const [monthlyCommission] = await pool.execute(`
                SELECT COALESCE(SUM(commission_amount), 0) as monthly_commission
                FROM bookings 
                WHERE MONTH(booking_date) = MONTH(CURRENT_DATE())
                AND YEAR(booking_date) = YEAR(CURRENT_DATE())
                AND status = 'completed'
            `);

            // 3. Pending commissions
            const [pendingCommissions] = await pool.execute(`
                SELECT a.*, 
                       ao.arena_name as owner_name, 
                       ao.email as owner_email,
                       ao.phone_number as owner_phone,
                       a.total_commission_due as amount_due,
                       COALESCE(DATEDIFF(CURDATE(), a.last_payment_date), 30) as days_overdue
                FROM arenas a
                LEFT JOIN arena_owners ao ON a.owner_id = ao.owner_id
                WHERE a.total_commission_due > 0
                ORDER BY days_overdue DESC
                LIMIT 10
            `);

            // 4. Recent bookings
            const [recentBookings] = await pool.execute(`
                SELECT b.*, 
                       u.name as user_name, 
                       a.name as arena_name,
                       st.name as sport_name
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.user_id
                LEFT JOIN arenas a ON b.arena_id = a.arena_id
                LEFT JOIN sports_types st ON b.sport_id = st.sport_id
                WHERE b.status IN ('completed', 'accepted')
                ORDER BY b.booking_date DESC
                LIMIT 10
            `);

            console.log("✅ Dashboard data fetched successfully");

            res.json({
                success: true,
                dashboard: {
                    monthly_commission: monthlyCommission[0]?.monthly_commission || 0,
                    active_arenas: overallStats[0]?.total_arenas || 0,
                    pending_commissions_count: pendingCommissions.length
                },
                pending_commissions: pendingCommissions || [],
                recent_bookings: recentBookings || [],
                overall_stats: overallStats[0] || {
                    total_users: 0,
                    total_owners: 0,
                    total_arenas: 0,
                    completed_bookings: 0,
                    total_revenue: 0,
                    total_commission: 0,
                    pending_commission: 0
                }
            });
        } catch (error) {
            console.error("❌ Error fetching admin dashboard:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Get all arenas
    getAllArenas: async (req, res) => {
        try {
            const { search, page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT a.*, 
                       ao.arena_name as owner_name, 
                       ao.email as owner_email,
                       ao.phone_number as owner_phone,
                       (SELECT COUNT(*) FROM bookings WHERE arena_id = a.arena_id AND status = 'completed') as total_bookings,
                       (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE arena_id = a.arena_id AND status = 'completed') as total_revenue
                FROM arenas a
                LEFT JOIN arena_owners ao ON a.owner_id = ao.owner_id
            `;

            const params = [];

            if (search) {
                query += ' WHERE a.name LIKE ? OR ao.arena_name LIKE ? OR ao.email LIKE ?';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [arenas] = await pool.execute(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM arenas a LEFT JOIN arena_owners ao ON a.owner_id = ao.owner_id`;
            if (search) {
                countQuery += ' WHERE a.name LIKE ? OR ao.arena_name LIKE ? OR ao.email LIKE ?';
            }
            const [countResult] = await pool.execute(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);

            res.json({
                success: true,
                arenas,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0]?.total || 0,
                    totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
                }
            });
        } catch (error) {
            console.error("❌ Error fetching arenas:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Get all users
    getAllUsers: async (req, res) => {
        try {
            const { search, page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT u.*,
                       (SELECT COUNT(*) FROM bookings WHERE user_id = u.user_id AND status = 'completed') as total_bookings,
                       (SELECT COUNT(*) FROM favorite_arenas WHERE user_id = u.user_id) as favorite_arenas_count
                FROM users u
            `;

            const params = [];

            if (search) {
                query += ' WHERE u.name LIKE ? OR u.email LIKE ?';
                params.push(`%${search}%`, `%${search}%`);
            }

            query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [users] = await pool.execute(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM users u`;
            if (search) {
                countQuery += ' WHERE u.name LIKE ? OR u.email LIKE ?';
            }
            const [countResult] = await pool.execute(countQuery, search ? [`%${search}%`, `%${search}%`] : []);

            res.json({
                success: true,
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0]?.total || 0,
                    totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
                }
            });
        } catch (error) {
            console.error("❌ Error fetching users:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Get all owners
    getAllOwners: async (req, res) => {
        try {
            const { search, page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT ao.*,
                       (SELECT COUNT(*) FROM arenas WHERE owner_id = ao.owner_id) as total_arenas,
                       (SELECT COUNT(*) FROM bookings b 
                        JOIN arenas a ON b.arena_id = a.arena_id 
                        WHERE a.owner_id = ao.owner_id AND b.status = 'completed') as total_bookings,
                       (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b 
                        JOIN arenas a ON b.arena_id = a.arena_id 
                        WHERE a.owner_id = ao.owner_id AND b.status = 'completed') as total_revenue,
                       (SELECT COALESCE(SUM(a.total_commission_due), 0) FROM arenas a 
                        WHERE a.owner_id = ao.owner_id) as total_commission_due
                FROM arena_owners ao
            `;

            const params = [];

            if (search) {
                query += ' WHERE ao.arena_name LIKE ? OR ao.email LIKE ? OR ao.phone_number LIKE ?';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            query += ' ORDER BY ao.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [owners] = await pool.execute(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM arena_owners ao`;
            if (search) {
                countQuery += ' WHERE ao.arena_name LIKE ? OR ao.email LIKE ? OR ao.phone_number LIKE ?';
            }
            const [countResult] = await pool.execute(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);

            res.json({
                success: true,
                owners,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0]?.total || 0,
                    totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
                }
            });
        } catch (error) {
            console.error("❌ Error fetching owners:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Block/Unblock arena
    toggleArenaBlock: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { is_blocked } = req.body;

            console.log(`🔄 Toggling arena block: arena_id=${arena_id}, is_blocked=${is_blocked}`);

            // Update block status
            await pool.execute(
                'UPDATE arenas SET is_blocked = ? WHERE arena_id = ?',
                [is_blocked, arena_id]
            );

            // Get updated arena info
            const [arenas] = await pool.execute(
                'SELECT a.*, ao.arena_name as owner_name FROM arenas a LEFT JOIN arena_owners ao ON a.owner_id = ao.owner_id WHERE a.arena_id = ?',
                [arena_id]
            );

            res.json({
                success: true,
                message: `Arena ${is_blocked ? 'blocked' : 'unblocked'} successfully`,
                arena: arenas[0]
            });
        } catch (error) {
            console.error("❌ Error toggling arena block:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Get financial reports
    getFinancialReports: async (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            let query = `
                SELECT 
                    DATE(b.booking_date) as date,
                    COUNT(b.booking_id) as total_bookings,
                    COALESCE(SUM(b.total_amount), 0) as total_revenue,
                    COALESCE(SUM(b.commission_amount), 0) as total_commission
                FROM bookings b
                WHERE b.status = 'completed'
            `;

            const params = [];

            if (start_date) {
                query += ' AND DATE(b.booking_date) >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND DATE(b.booking_date) <= ?';
                params.push(end_date);
            }

            query += ' GROUP BY DATE(b.booking_date) ORDER BY date DESC';

            const [dailyReports] = await pool.execute(query, params);

            // Get arena-wise commission report
            const [arenaCommissionReport] = await pool.execute(`
                SELECT 
                    a.arena_id,
                    a.name as arena_name,
                    ao.arena_name as owner_name,
                    a.total_commission_due as pending_commission,
                    (SELECT COUNT(*) FROM bookings WHERE arena_id = a.arena_id AND status = 'completed') as total_bookings,
                    (SELECT COALESCE(SUM(commission_amount), 0) FROM bookings WHERE arena_id = a.arena_id AND status = 'completed') as total_commission_paid,
                    a.last_payment_date
                FROM arenas a
                LEFT JOIN arena_owners ao ON a.owner_id = ao.owner_id
                ORDER BY a.total_commission_due DESC
            `);

            res.json({
                success: true,
                daily_reports: dailyReports,
                arena_commission_report: arenaCommissionReport,
                summary: {
                    total_days: dailyReports.length,
                    total_bookings: dailyReports.reduce((sum, r) => sum + (r.total_bookings || 0), 0),
                    total_revenue: dailyReports.reduce((sum, r) => sum + (r.total_revenue || 0), 0),
                    total_commission: dailyReports.reduce((sum, r) => sum + (r.total_commission || 0), 0),
                    total_pending_commission: arenaCommissionReport.reduce((sum, a) => sum + (a.pending_commission || 0), 0)
                }
            });
        } catch (error) {
            console.error("❌ Error fetching financial reports:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Mark arena commission as paid
    markCommissionPaid: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { amount_paid } = req.body;
            const payment_date = new Date().toISOString().split('T')[0];

            console.log(`💰 Marking commission paid: arena_id=${arena_id}, amount=${amount_paid}`);

            // Update arena commission
            await pool.execute(
                `UPDATE arenas 
                 SET total_commission_due = GREATEST(0, total_commission_due - ?),
                     last_payment_date = ?
                 WHERE arena_id = ?`,
                [amount_paid, payment_date, arena_id]
            );

            // Get updated arena info
            const [arenas] = await pool.execute(
                'SELECT * FROM arenas WHERE arena_id = ?',
                [arena_id]
            );

            res.json({
                success: true,
                message: "Commission marked as paid successfully",
                arena: arenas[0]
            });
        } catch (error) {
            console.error("❌ Error marking commission as paid:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },

    // Test endpoint
    testEndpoint: async (req, res) => {
        try {
            const [testResult] = await pool.execute('SELECT 1 as connection_test');

            res.json({
                success: true,
                message: "Admin API is working!",
                database: {
                    connection: "OK",
                    test: testResult[0]
                },
                user: req.user,
                timestamp: new Date()
            });
        } catch (error) {
            console.error("❌ Test endpoint error:", error);
            res.status(500).json({
                success: false,
                message: "Database connection error",
                error: error.message
            });
        }
    },

    // Get system stats
    getSystemStats: async (req, res) => {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM arena_owners) as total_owners,
                    (SELECT COUNT(*) FROM arenas WHERE is_active = TRUE AND is_blocked = FALSE) as total_arenas,
                    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'completed') as total_revenue,
                    (SELECT COALESCE(SUM(commission_amount), 0) FROM bookings WHERE status = 'completed') as total_commission,
                    (SELECT COALESCE(SUM(total_commission_due), 0) FROM arenas) as pending_commission
            `);

            res.json({
                success: true,
                stats: stats[0]
            });
        } catch (error) {
            console.error("❌ Error fetching system stats:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    }
};

module.exports = adminController;