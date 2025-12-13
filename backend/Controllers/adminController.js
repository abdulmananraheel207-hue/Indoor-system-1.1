const pool = require('../db');

const adminController = {
    // Get admin dashboard data
    getDashboard: async (req, res) => {
        try {
            // Total commission earned this month
            const [monthlyCommission] = await pool.execute(
                `SELECT COALESCE(SUM(commission_amount), 0) as total_commission
         FROM bookings 
         WHERE MONTH(booking_date) = MONTH(CURRENT_DATE())
           AND YEAR(booking_date) = YEAR(CURRENT_DATE())
           AND status = 'completed'`
            );

            // Number of active arenas
            const [activeArenas] = await pool.execute(
                'SELECT COUNT(*) as count FROM arenas WHERE is_active = TRUE AND is_blocked = FALSE'
            );

            // Pending commissions (arenas that need to pay)
            const [pendingCommissions] = await pool.execute(
                `SELECT a.*, ao.arena_name as owner_arena_name, ao.email as owner_email,
                ao.phone_number as owner_phone,
                a.total_commission_due as amount_due,
                DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at)) as days_overdue
         FROM arenas a
         JOIN arena_owners ao ON a.owner_id = ao.owner_id
         WHERE a.total_commission_due > 0
         ORDER BY days_overdue DESC`
            );

            // Recent bookings across all arenas
            const [recentBookings] = await pool.execute(
                `SELECT b.*, u.name as user_name, a.name as arena_name,
                ao.arena_name as owner_name, st.name as sport_name
         FROM bookings b
         JOIN users u ON b.user_id = u.user_id
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN arena_owners ao ON a.owner_id = ao.owner_id
         JOIN sports_types st ON b.sport_id = st.sport_id
         ORDER BY b.booking_date DESC
         LIMIT 10`
            );

            // Overall statistics
            const [overallStats] = await pool.execute(
                `SELECT 
           COUNT(DISTINCT u.user_id) as total_users,
           COUNT(DISTINCT ao.owner_id) as total_owners,
           COUNT(DISTINCT a.arena_id) as total_arenas,
           COUNT(DISTINCT b.booking_id) as total_bookings,
           COALESCE(SUM(b.total_amount), 0) as total_revenue,
           COALESCE(SUM(b.commission_amount), 0) as total_platform_commission
         FROM users u
         CROSS JOIN arena_owners ao
         CROSS JOIN arenas a
         CROSS JOIN bookings b
         WHERE b.status = 'completed'`
            );

            res.json({
                dashboard: {
                    monthly_commission: monthlyCommission[0].total_commission,
                    active_arenas: activeArenas[0].count,
                    pending_commissions_count: pendingCommissions.length
                },
                pending_commissions: pendingCommissions,
                recent_bookings: recentBookings,
                overall_stats: overallStats[0]
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all arenas
    getAllArenas: async (req, res) => {
        try {
            const { status, is_active, is_blocked } = req.query;

            let query = `
        SELECT a.*, ao.arena_name as owner_name, ao.email as owner_email,
               ao.phone_number as owner_phone,
               COUNT(DISTINCT b.booking_id) as total_bookings,
               COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
        FROM arenas a
        JOIN arena_owners ao ON a.owner_id = ao.owner_id
        LEFT JOIN bookings b ON a.arena_id = b.arena_id
      `;

            const whereConditions = [];
            const params = [];

            if (status) {
                whereConditions.push('a.is_active = ?');
                params.push(status === 'active' ? 1 : 0);
            }

            if (is_active !== undefined) {
                whereConditions.push('a.is_active = ?');
                params.push(is_active);
            }

            if (is_blocked !== undefined) {
                whereConditions.push('a.is_blocked = ?');
                params.push(is_blocked);
            }

            if (whereConditions.length > 0) {
                query += ' WHERE ' + whereConditions.join(' AND ');
            }

            query += ' GROUP BY a.arena_id ORDER BY a.created_at DESC';

            const [arenas] = await pool.execute(query, params);
            res.json(arenas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Block/Unblock arena
    toggleArenaBlock: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { is_blocked, reason } = req.body;

            // Get arena details
            const [arenas] = await pool.execute(
                'SELECT * FROM arenas WHERE arena_id = ?',
                [arena_id]
            );

            if (arenas.length === 0) {
                return res.status(404).json({ message: 'Arena not found' });
            }

            // Update block status
            await pool.execute(
                'UPDATE arenas SET is_blocked = ? WHERE arena_id = ?',
                [is_blocked, arena_id]
            );

            // Log the action
            await pool.execute(
                `INSERT INTO admin_actions 
         (admin_id, action_type, target_id, target_type, details)
         VALUES (?, ?, ?, ?, ?)`,
                [req.user.id, is_blocked ? 'block_arena' : 'unblock_arena',
                    arena_id, 'arena', JSON.stringify({ reason })]
            );

            res.json({
                message: `Arena ${is_blocked ? 'blocked' : 'unblocked'} successfully`,
                is_blocked
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Remove arena permanently
    removeArena: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { reason } = req.body;

            // Get arena details
            const [arenas] = await pool.execute(
                'SELECT * FROM arenas WHERE arena_id = ?',
                [arena_id]
            );

            if (arenas.length === 0) {
                return res.status(404).json({ message: 'Arena not found' });
            }

            // Start transaction
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Mark arena as inactive and blocked
                await connection.execute(
                    'UPDATE arenas SET is_active = FALSE, is_blocked = TRUE WHERE arena_id = ?',
                    [arena_id]
                );

                // Cancel all pending bookings for this arena
                await connection.execute(
                    `UPDATE bookings 
           SET status = 'cancelled', 
               cancelled_by = 'system',
               cancellation_time = NOW()
           WHERE arena_id = ? AND status IN ('pending', 'accepted')`,
                    [arena_id]
                );

                // Log the action
                await connection.execute(
                    `INSERT INTO admin_actions 
           (admin_id, action_type, target_id, target_type, details)
           VALUES (?, ?, ?, ?, ?)`,
                    [req.user.id, 'remove_arena', arena_id, 'arena', JSON.stringify({ reason })]
                );

                await connection.commit();

                res.json({ message: 'Arena removed successfully' });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all users
    getAllUsers: async (req, res) => {
        try {
            const { is_active } = req.query;

            let query = `
        SELECT u.*,
               COUNT(DISTINCT b.booking_id) as total_bookings,
               COUNT(DISTINCT fa.arena_id) as favorite_arenas_count
        FROM users u
        LEFT JOIN bookings b ON u.user_id = b.user_id
        LEFT JOIN favorite_arenas fa ON u.user_id = fa.user_id
      `;

            const params = [];

            if (is_active !== undefined) {
                query += ' WHERE u.is_logged_in = ?';
                params.push(is_active);
            }

            query += ' GROUP BY u.user_id ORDER BY u.created_at DESC';

            const [users] = await pool.execute(query, params);
            res.json(users);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all arena owners
    getAllOwners: async (req, res) => {
        try {
            const { is_active } = req.query;

            let query = `
        SELECT ao.*,
               COUNT(DISTINCT a.arena_id) as total_arenas,
               COUNT(DISTINCT b.booking_id) as total_bookings,
               COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
        FROM arena_owners ao
        LEFT JOIN arenas a ON ao.owner_id = a.owner_id
        LEFT JOIN bookings b ON a.arena_id = b.arena_id
      `;

            const params = [];

            if (is_active !== undefined) {
                query += ' WHERE ao.is_active = ?';
                params.push(is_active);
            }

            query += ' GROUP BY ao.owner_id ORDER BY ao.created_at DESC';

            const [owners] = await pool.execute(query, params);
            res.json(owners);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Mark commission payment as completed
    markPaymentCompleted: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { amount_paid, payment_date } = req.body;

            // Get arena details
            const [arenas] = await pool.execute(
                'SELECT * FROM arenas WHERE arena_id = ?',
                [arena_id]
            );

            if (arenas.length === 0) {
                return res.status(404).json({ message: 'Arena not found' });
            }

            const arena = arenas[0];

            // Calculate remaining amount
            const remaining_amount = Math.max(0, arena.total_commission_due - amount_paid);

            // Start transaction
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Update arena commission due
                await connection.execute(
                    `UPDATE arenas 
           SET total_commission_due = ?,
               last_payment_date = ?
           WHERE arena_id = ?`,
                    [remaining_amount, payment_date || new Date(), arena_id]
                );

                // Create commission payment record
                await connection.execute(
                    `INSERT INTO commission_payments 
           (arena_id, owner_id, amount_due, amount_paid, due_date, payment_date, status, marked_by_admin_id)
           VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)`,
                    [arena_id, arena.owner_id, arena.total_commission_due, amount_paid,
                        arena.last_payment_date || arena.created_at, payment_date || new Date(), req.user.id]
                );

                // Log the action
                await connection.execute(
                    `INSERT INTO admin_actions 
           (admin_id, action_type, target_id, target_type, details)
           VALUES (?, ?, ?, ?, ?)`,
                    [req.user.id, 'mark_payment_completed', arena_id, 'arena',
                    JSON.stringify({ amount_paid, previous_due: arena.total_commission_due })]
                );

                await connection.commit();

                res.json({
                    message: 'Payment marked as completed',
                    remaining_commission_due: remaining_amount
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
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
          COALESCE(SUM(b.commission_amount), 0) as total_commission,
          COUNT(DISTINCT b.user_id) as unique_customers,
          COUNT(DISTINCT b.arena_id) as active_arenas
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
            const [arenaCommissionReport] = await pool.execute(
                `SELECT 
           a.arena_id,
           a.name as arena_name,
           ao.arena_name as owner_name,
           a.total_commission_due as pending_commission,
           COUNT(b.booking_id) as total_bookings,
           COALESCE(SUM(b.commission_amount), 0) as total_commission_paid,
           MAX(cp.payment_date) as last_payment_date
         FROM arenas a
         JOIN arena_owners ao ON a.owner_id = ao.owner_id
         LEFT JOIN bookings b ON a.arena_id = b.arena_id AND b.status = 'completed'
         LEFT JOIN commission_payments cp ON a.arena_id = cp.arena_id AND cp.status = 'paid'
         GROUP BY a.arena_id
         ORDER BY a.total_commission_due DESC`
            );

            res.json({
                daily_reports: dailyReports,
                arena_commission_report: arenaCommissionReport,
                summary: {
                    total_days: dailyReports.length,
                    total_bookings: dailyReports.reduce((sum, r) => sum + r.total_bookings, 0),
                    total_revenue: dailyReports.reduce((sum, r) => sum + r.total_revenue, 0),
                    total_commission: dailyReports.reduce((sum, r) => sum + r.total_commission, 0),
                    total_pending_commission: arenaCommissionReport.reduce((sum, a) => sum + (a.pending_commission || 0), 0)
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = adminController;