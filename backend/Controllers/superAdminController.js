// controllers/superAdminController.js
const pool = require('../db');
const ExcelJS = require('exceljs'); // Install: npm install exceljs

const superAdminController = {

    getSystemOverview: async (req, res) => {
        try {
            console.log('👑 Super Admin fetching system overview...');

            // Get all arenas with details
            const [allArenas] = await pool.execute(`
            SELECT 
                a.*,
                ao.arena_name as owner_name,
                ao.email as owner_email,
                ao.phone_number as owner_phone,
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.commission_amount ELSE 0 END), 0) as total_commission,
                a.total_commission_due as pending_commission,
                CASE 
                    WHEN a.last_payment_date IS NULL THEN 'never_paid'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 30 THEN 'overdue_30'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 15 THEN 'overdue_15'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 7 THEN 'overdue_7'
                    ELSE 'on_time'
                END as payment_status,
                DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at)) as days_since_payment
            FROM arenas a
            JOIN arena_owners ao ON a.owner_id = ao.owner_id
            LEFT JOIN bookings b ON a.arena_id = b.arena_id
            GROUP BY a.arena_id
            ORDER BY a.arena_id DESC
        `);

            // Get all owners
            // Get all owners - ADD the missing fields
            const [allOwners] = await pool.execute(`
    SELECT 
        ao.owner_id,
        ao.arena_name,
        ao.email,
        ao.phone_number,
        ao.business_address,
        ao.google_maps_location,
        ao.number_of_courts,
        ao.is_active,
        ao.total_revenue,
        ao.created_at,
        ao.is_blocked,          
        ao.blocked_reason,       
        ao.blocked_at,          
        COUNT(DISTINCT a.arena_id) as total_arenas,
        COUNT(DISTINCT b.booking_id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as revenue_from_bookings,
        COALESCE(SUM(a.total_commission_due), 0) as total_pending_commission,
        (
            SELECT GROUP_CONCAT(CONCAT(a2.name, ' (Rs ', a2.total_commission_due, ')') SEPARATOR ', ')
            FROM arenas a2 
            WHERE a2.owner_id = ao.owner_id 
            AND a2.total_commission_due > 0
        ) as pending_arenas
    FROM arena_owners ao
    LEFT JOIN arenas a ON ao.owner_id = a.owner_id
    LEFT JOIN bookings b ON a.arena_id = b.arena_id
    GROUP BY ao.owner_id
    ORDER BY ao.owner_id DESC
`);

            // Get all users
            const [allUsers] = await pool.execute(`
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.profile_picture_url,
                u.is_logged_in,
                u.last_login,
                u.created_at,
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COUNT(DISTINCT fa.arena_id) as favorite_arenas_count
            FROM users u
            LEFT JOIN bookings b ON u.user_id = b.user_id
            LEFT JOIN favorite_arenas fa ON u.user_id = fa.user_id
            GROUP BY u.user_id
            ORDER BY u.user_id DESC
        `);

            // Get all bookings
            const [allBookings] = await pool.execute(`
            SELECT 
                b.*,
                u.name as user_name,
                u.email as user_email,
                a.name as arena_name,
                ao.arena_name as owner_arena_name,
                st.name as sport_name
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN arenas a ON b.arena_id = a.arena_id
            JOIN arena_owners ao ON a.owner_id = ao.owner_id
            LEFT JOIN sports_types st ON b.sport_id = st.sport_id
            ORDER BY b.booking_date DESC
            LIMIT 1000
        `);

            // Get current month's commission
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            const [monthlyCommission] = await pool.execute(`
            SELECT 
                COALESCE(SUM(b.commission_amount), 0) as monthly_commission,
                COUNT(DISTINCT b.arena_id) as arenas_with_bookings,
                COUNT(DISTINCT b.booking_id) as monthly_bookings
            FROM bookings b
            WHERE b.status = 'completed'
                AND YEAR(b.booking_date) = ?
                AND MONTH(b.booking_date) = ?
        `, [currentYear, currentMonth]);

            // Get pending payments (overdue)
            const [pendingPayments] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT a.arena_id) as count,
                COALESCE(SUM(a.total_commission_due), 0) as total_amount,
                COUNT(DISTINCT CASE 
                    WHEN a.total_commission_due > 0 
                    AND (a.last_payment_date IS NULL OR DATEDIFF(CURDATE(), a.last_payment_date) > 30) 
                    THEN a.arena_id 
                END) as overdue_30_count,
                COUNT(DISTINCT CASE 
                    WHEN a.total_commission_due > 0 
                    AND (a.last_payment_date IS NULL OR DATEDIFF(CURDATE(), a.last_payment_date) > 15) 
                    THEN a.arena_id 
                END) as overdue_15_count,
                COUNT(DISTINCT CASE 
                    WHEN a.total_commission_due > 0 
                    AND (a.last_payment_date IS NULL OR DATEDIFF(CURDATE(), a.last_payment_date) > 7) 
                    THEN a.arena_id 
                END) as overdue_7_count
            FROM arenas a
            WHERE a.total_commission_due > 0
        `);

            // Get system stats
            const [systemStats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM arena_owners) as total_owners,
                (SELECT COUNT(*) FROM arenas WHERE is_active = TRUE) as active_arenas,
                (SELECT COUNT(*) FROM arenas WHERE is_blocked = TRUE) as blocked_arenas,
                (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') as cancelled_bookings,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'completed') as total_revenue,
                (SELECT COALESCE(SUM(commission_amount), 0) FROM bookings WHERE status = 'completed') as total_commission,
                (SELECT COALESCE(SUM(total_commission_due), 0) FROM arenas) as pending_commission_due,
                (SELECT COALESCE(SUM(total_revenue), 0) FROM arena_owners) as owner_total_revenue,
                (SELECT COUNT(*) FROM arenas WHERE total_commission_due > 0) as arenas_with_pending_payments
        `);

            // Get recent payments from commission_payments table
            const [recentPayments] = await pool.execute(`
            SELECT 
                cp.*,
                a.name as arena_name,
                ao.arena_name as owner_name,
                adm.name as admin_name
            FROM commission_payments cp
            JOIN arenas a ON cp.arena_id = a.arena_id
            JOIN arena_owners ao ON cp.owner_id = ao.owner_id
            LEFT JOIN admins adm ON cp.marked_by_admin_id = adm.admin_id
            ORDER BY cp.payment_date DESC
            LIMIT 20
        `);

            // Get owners with pending payments (for pending payments tab)
            const [ownersWithPendingPayments] = await pool.execute(`
            SELECT 
                ao.owner_id,
                ao.arena_name as owner_name,
                ao.email,
                ao.phone_number,
                COUNT(DISTINCT a.arena_id) as arenas_count,
                COALESCE(SUM(a.total_commission_due), 0) as total_pending,
                MAX(CASE 
                    WHEN a.last_payment_date IS NULL THEN 'Never Paid'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 30 THEN 'Over 30 days'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 15 THEN 'Over 15 days'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 7 THEN 'Over 7 days'
                    ELSE 'Recent'
                END) as worst_status,
                GROUP_CONCAT(DISTINCT CONCAT(a.name, ': Rs ', a.total_commission_due) SEPARATOR '; ') as arena_details,
                MAX(a.last_payment_date) as last_payment_date,
                MIN(DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at))) as min_days_overdue,
                MAX(DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at))) as max_days_overdue
            FROM arena_owners ao
            JOIN arenas a ON ao.owner_id = a.owner_id
            WHERE a.total_commission_due > 0
            GROUP BY ao.owner_id
            ORDER BY total_pending DESC
        `);

            console.log('📊 Stats fetched:', {
                users: systemStats[0]?.total_users || 0,
                owners: systemStats[0]?.total_owners || 0,
                arenas: allArenas.length,
                bookings: allBookings.length,
                pending_payments: pendingPayments[0]?.count || 0,
                monthly_commission: monthlyCommission[0]?.monthly_commission || 0
            });

            res.json({
                success: true,
                data: {
                    overview: {
                        arenas: allArenas.length,
                        owners: allOwners.length,
                        users: allUsers.length,
                        bookings: allBookings.length,
                        pending_payments: pendingPayments[0]?.count || 0,
                        pending_amount: pendingPayments[0]?.total_amount || 0,
                        monthly_commission: monthlyCommission[0]?.monthly_commission || 0,
                        monthly_bookings: monthlyCommission[0]?.monthly_bookings || 0,
                        overdue_30: pendingPayments[0]?.overdue_30_count || 0,
                        overdue_15: pendingPayments[0]?.overdue_15_count || 0,
                        overdue_7: pendingPayments[0]?.overdue_7_count || 0
                    },
                    system_stats: {
                        ...systemStats[0],
                        monthly_commission: monthlyCommission[0]?.monthly_commission || 0,
                        arenas_with_bookings: monthlyCommission[0]?.arenas_with_bookings || 0
                    },
                    arenas: allArenas,
                    owners: allOwners,
                    users: allUsers,
                    recent_bookings: allBookings.slice(0, 50),
                    pending_payments_summary: pendingPayments[0] || {},
                    recent_payments: recentPayments,
                    pending_commissions: ownersWithPendingPayments, // This is for the pending payments tab
                    monthly_summary: {
                        month: currentMonth,
                        year: currentYear,
                        month_name: currentDate.toLocaleString('default', { month: 'long' }),
                        commission: monthlyCommission[0]?.monthly_commission || 0,
                        bookings: monthlyCommission[0]?.monthly_bookings || 0
                    }
                }
            });

        } catch (error) {
            console.error('❌ Super Admin system overview error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch system overview',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    // 2. ACTIVITY MONITORING: Get Visual Analytics
    getAnalytics: async (req, res) => {
        try {
            const { period = 'month', start_date, end_date } = req.query;

            console.log(`📊 Super Admin fetching analytics for period: ${period}`);

            // Daily booking trends (last 30 days)
            const [dailyTrends] = await pool.execute(`
                SELECT 
                    DATE(booking_date) as date,
                    COUNT(*) as bookings_count,
                    COALESCE(SUM(total_amount), 0) as daily_revenue,
                    COALESCE(SUM(commission_amount), 0) as daily_commission,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT arena_id) as active_arenas
                FROM bookings
                WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    AND status = 'completed'
                GROUP BY DATE(booking_date)
                ORDER BY date DESC
            `);

            // Revenue by arena
            const [revenueByArena] = await pool.execute(`
                SELECT 
                    a.arena_id,
                    a.name as arena_name,
                    ao.arena_name as owner_name,
                    COUNT(b.booking_id) as total_bookings,
                    COALESCE(SUM(b.total_amount), 0) as total_revenue,
                    COALESCE(SUM(b.commission_amount), 0) as total_commission,
                    a.total_commission_due as pending_due
                FROM arenas a
                JOIN arena_owners ao ON a.owner_id = ao.owner_id
                LEFT JOIN bookings b ON a.arena_id = b.arena_id AND b.status = 'completed'
                GROUP BY a.arena_id
                ORDER BY total_revenue DESC
                LIMIT 20
            `);

            // Top sports
            const [sportsAnalytics] = await pool.execute(`
                SELECT 
                    st.sport_id,
                    st.name as sport_name,
                    COUNT(b.booking_id) as bookings_count,
                    COALESCE(SUM(b.total_amount), 0) as total_revenue,
                    AVG(b.total_amount) as avg_booking_value
                FROM sports_types st
                LEFT JOIN bookings b ON st.sport_id = b.sport_id AND b.status = 'completed'
                GROUP BY st.sport_id
                ORDER BY bookings_count DESC
            `);

            // User growth trend
            const [userGrowth] = await pool.execute(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as new_users,
                    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_users
                FROM users
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            `);

            // Peak hours analysis
            const [peakHours] = await pool.execute(`
                SELECT 
                    HOUR(start_time) as hour,
                    COUNT(*) as bookings_count,
                    COALESCE(SUM(total_amount), 0) as total_revenue
                FROM bookings
                WHERE status = 'completed'
                GROUP BY HOUR(start_time)
                ORDER BY hour
            `);

            res.json({
                success: true,
                data: {
                    daily_trends: dailyTrends,
                    revenue_by_arena: revenueByArena,
                    sports_analytics: sportsAnalytics,
                    user_growth: userGrowth,
                    peak_hours: peakHours,
                    summary: {
                        total_days: dailyTrends.length,
                        total_bookings: dailyTrends.reduce((sum, day) => sum + day.bookings_count, 0),
                        total_revenue: dailyTrends.reduce((sum, day) => sum + day.daily_revenue, 0),
                        avg_daily_bookings: Math.round(dailyTrends.reduce((sum, day) => sum + day.bookings_count, 0) / dailyTrends.length) || 0
                    }
                }
            });

        } catch (error) {
            console.error('❌ Super Admin analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // 3. COMMISSION MANAGEMENT: Get Commission Reports
    // 3. FINANCIAL MANAGEMENT: Get Commission Reports
    getCommissionReports: async (req, res) => {
        try {
            const { arena_id, owner_id, status, month, year } = req.query;

            const currentDate = new Date();
            const currentMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
            const currentYear = year ? parseInt(year) : currentDate.getFullYear();
            const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

            // Calculate month end date
            const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
            const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

            console.log(`💰 Super Admin fetching commission reports for: ${currentMonth}/${currentYear}`);

            let query = `
            SELECT 
                a.arena_id,
                a.name as arena_name,
                ao.owner_id,
                ao.arena_name as owner_name,
                ao.email as owner_email,
                ao.phone_number as owner_phone,
                a.total_commission_due as pending_amount,
                
                -- Monthly commission calculation (current month)
                COALESCE((
                    SELECT SUM(b.commission_amount)
                    FROM bookings b
                    WHERE b.arena_id = a.arena_id 
                    AND b.status = 'completed'
                    AND YEAR(b.booking_date) = ?
                    AND MONTH(b.booking_date) = ?
                ), 0) as monthly_commission,
                
                -- Total bookings this month
                COALESCE((
                    SELECT COUNT(b.booking_id)
                    FROM bookings b
                    WHERE b.arena_id = a.arena_id 
                    AND b.status = 'completed'
                    AND YEAR(b.booking_date) = ?
                    AND MONTH(b.booking_date) = ?
                ), 0) as monthly_bookings,
                
                -- Total revenue this month
                COALESCE((
                    SELECT SUM(b.total_amount)
                    FROM bookings b
                    WHERE b.arena_id = a.arena_id 
                    AND b.status = 'completed'
                    AND YEAR(b.booking_date) = ?
                    AND MONTH(b.booking_date) = ?
                ), 0) as monthly_revenue,
                
                -- Last payment info from commission_payments
                (
                    SELECT cp.payment_date 
                    FROM commission_payments cp
                    WHERE cp.arena_id = a.arena_id 
                    AND cp.status = 'paid'
                    ORDER BY cp.payment_date DESC 
                    LIMIT 1
                ) as last_payment_date,
                
                (
                    SELECT cp.amount_paid 
                    FROM commission_payments cp
                    WHERE cp.arena_id = a.arena_id 
                    AND cp.status = 'paid'
                    ORDER BY cp.payment_date DESC 
                    LIMIT 1
                ) as last_payment_amount,
                
                -- Total commission paid so far
                COALESCE((
                    SELECT SUM(cp.amount_paid)
                    FROM commission_payments cp
                    WHERE cp.arena_id = a.arena_id 
                    AND cp.status = 'paid'
                ), 0) as total_paid_commission,
                
                -- Payment status based on days since last payment
                CASE 
                    WHEN a.last_payment_date IS NULL THEN 'never_paid'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 30 THEN 'overdue_30'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 15 THEN 'overdue_15'
                    WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 7 THEN 'overdue_7'
                    ELSE 'on_time'
                END as payment_status,
                
                DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at)) as days_since_last_payment,
                
                -- Commission rate
                a.commission_rate,
                
                -- Total bookings count
                COUNT(DISTINCT b.booking_id) as total_bookings,
                
                -- Total commission from all bookings
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.commission_amount ELSE 0 END), 0) as total_commission_earned
                
            FROM arenas a
            JOIN arena_owners ao ON a.owner_id = ao.owner_id
            LEFT JOIN bookings b ON a.arena_id = b.arena_id
        `;

            const conditions = [];
            const params = [
                currentYear, currentMonth,  // For monthly_commission
                currentYear, currentMonth,  // For monthly_bookings
                currentYear, currentMonth   // For monthly_revenue
            ];

            if (arena_id) {
                conditions.push('a.arena_id = ?');
                params.push(arena_id);
            }

            if (owner_id) {
                conditions.push('ao.owner_id = ?');
                params.push(owner_id);
            }

            if (status === 'overdue') {
                conditions.push('a.total_commission_due > 0 AND (a.last_payment_date IS NULL OR DATEDIFF(CURDATE(), a.last_payment_date) > 7)');
            } else if (status === 'paid') {
                conditions.push('a.total_commission_due = 0');
            } else if (status === 'pending') {
                conditions.push('a.total_commission_due > 0');
            }

            query += ' GROUP BY a.arena_id ';

            if (conditions.length > 0) {
                query = query.replace('GROUP BY', 'WHERE ' + conditions.join(' AND ') + ' GROUP BY');
            }

            query += ' ORDER BY a.total_commission_due DESC, days_since_last_payment DESC';

            const [commissionReports] = await pool.execute(query, params);

            // Get payment history for each arena
            for (let report of commissionReports) {
                const [payments] = await pool.execute(
                    `SELECT cp.*, adm.name as admin_name 
                 FROM commission_payments cp
                 LEFT JOIN admins adm ON cp.marked_by_admin_id = adm.admin_id
                 WHERE cp.arena_id = ? 
                 ORDER BY cp.payment_date DESC 
                 LIMIT 5`,
                    [report.arena_id]
                );
                report.payment_history = payments;
            }

            // Get monthly summary
            const [monthlySummary] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT arena_id) as total_arenas_active,
                COALESCE(SUM(commission_amount), 0) as total_monthly_commission,
                COALESCE(SUM(total_amount), 0) as total_monthly_revenue,
                COUNT(DISTINCT booking_id) as total_monthly_bookings
            FROM bookings
            WHERE status = 'completed'
                AND YEAR(booking_date) = ?
                AND MONTH(booking_date) = ?
        `, [currentYear, currentMonth]);

            // Summary statistics
            const summary = {
                total_arenas: commissionReports.length,
                total_pending: commissionReports.reduce((sum, report) => sum + (report.pending_amount || 0), 0),
                monthly_commission: commissionReports.reduce((sum, report) => sum + (report.monthly_commission || 0), 0),
                monthly_revenue: commissionReports.reduce((sum, report) => sum + (report.monthly_revenue || 0), 0),
                total_paid: commissionReports.reduce((sum, report) => sum + (report.total_paid_commission || 0), 0),
                overdue_count: commissionReports.filter(r => r.payment_status.includes('overdue')).length,
                never_paid_count: commissionReports.filter(r => r.payment_status === 'never_paid').length,
                current_month: currentMonth,
                current_year: currentYear,
                month_name: currentDate.toLocaleString('default', { month: 'long' }),
                monthly_summary: monthlySummary[0] || {}
            };

            // Get monthly payment due dates (for display)
            const dueDate = new Date(currentYear, currentMonth, 0); // Last day of current month
            summary.due_date = dueDate.toISOString().split('T')[0];
            summary.days_until_due = Math.max(0, Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24)));

            res.json({
                success: true,
                data: {
                    reports: commissionReports,
                    summary: summary,
                    currency: 'Rs',
                    period: {
                        month: currentMonth,
                        year: currentYear,
                        month_name: currentDate.toLocaleString('default', { month: 'long' }),
                        start_date: monthStart,
                        end_date: monthEnd
                    }
                }
            });

        } catch (error) {
            console.error('❌ Super Admin commission reports error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch commission reports',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // Add to superAdminController.js

    // Block owner
    blockOwner: async (req, res) => {
        try {
            const { owner_id } = req.params;
            const { reason, notify_owner, block_arenas } = req.body;
            const admin_id = req.user?.id;

            console.log('🔒 Blocking owner:', { owner_id, reason, block_arenas, admin_id });

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Block reason is required'
                });
            }

            // Get a connection for transaction
            const connection = await pool.getConnection();

            try {
                await connection.query('START TRANSACTION');

                // 1. Block the owner account
                const [ownerResult] = await connection.execute(
                    `UPDATE arena_owners 
                 SET is_blocked = TRUE,
                     blocked_reason = ?,
                     blocked_at = NOW()
                 WHERE owner_id = ?`,
                    [reason, owner_id]
                );

                if (ownerResult.affectedRows === 0) {
                    await connection.query('ROLLBACK');
                    connection.release();
                    return res.status(404).json({
                        success: false,
                        message: 'Owner not found'
                    });
                }

                // 2. Block all arenas of this owner (if requested)
                if (block_arenas) {
                    await connection.execute(
                        `UPDATE arenas 
                     SET is_blocked = TRUE,
                         blocked_reason = ?,
                         blocked_at = NOW()
                     WHERE owner_id = ? AND is_blocked = FALSE`,
                        [reason, owner_id]
                    );
                }

                // 3. Log admin action
                await connection.execute(
                    `INSERT INTO admin_actions 
                 (admin_id, action_type, target_id, target_type, details, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        admin_id,
                        'owner_blocked',
                        owner_id,
                        'owner',
                        JSON.stringify({
                            reason,
                            block_arenas,
                            notify_owner,
                            timestamp: new Date().toISOString()
                        }),
                        req.ip || '127.0.0.1'
                    ]
                );

                await connection.query('COMMIT');
                connection.release();

                // Get updated owner data
                const [updatedOwner] = await pool.execute(
                    `SELECT owner_id, arena_name, email, is_blocked, blocked_reason, blocked_at
                 FROM arena_owners WHERE owner_id = ?`,
                    [owner_id]
                );

                res.json({
                    success: true,
                    message: 'Owner blocked successfully',
                    data: updatedOwner[0]
                });

            } catch (error) {
                await connection.query('ROLLBACK');
                connection.release();
                throw error;
            }

        } catch (error) {
            console.error('❌ Block owner error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to block owner',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // UNBLOCK OWNER - Complete function
    unblockOwner: async (req, res) => {
        try {
            const { owner_id } = req.params;
            const { notify_owner, unblock_arenas = true } = req.body;
            const admin_id = req.user?.id;

            console.log('🔓 Unblocking owner:', { owner_id, unblock_arenas, admin_id });

            // Get a connection for transaction
            const connection = await pool.getConnection();

            try {
                await connection.query('START TRANSACTION');

                // 1. Unblock the owner account
                const [ownerResult] = await connection.execute(
                    `UPDATE arena_owners 
                 SET is_blocked = FALSE,
                     blocked_reason = NULL,
                     blocked_at = NULL
                 WHERE owner_id = ?`,
                    [owner_id]
                );

                if (ownerResult.affectedRows === 0) {
                    await connection.query('ROLLBACK');
                    connection.release();
                    return res.status(404).json({
                        success: false,
                        message: 'Owner not found'
                    });
                }

                // 2. Unblock all arenas of this owner
                if (unblock_arenas) {
                    await connection.execute(
                        `UPDATE arenas 
                     SET is_blocked = FALSE,
                         blocked_reason = NULL,
                         blocked_at = NULL
                     WHERE owner_id = ?`,
                        [owner_id]
                    );
                }

                // 3. Log admin action
                await connection.execute(
                    `INSERT INTO admin_actions 
                 (admin_id, action_type, target_id, target_type, details, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        admin_id,
                        'owner_unblocked',
                        owner_id,
                        'owner',
                        JSON.stringify({
                            unblock_arenas,
                            notify_owner,
                            timestamp: new Date().toISOString()
                        }),
                        req.ip || '127.0.0.1'
                    ]
                );

                await connection.query('COMMIT');
                connection.release();

                // Get updated owner data
                const [updatedOwner] = await pool.execute(
                    `SELECT owner_id, arena_name, email, is_blocked
                 FROM arena_owners WHERE owner_id = ?`,
                    [owner_id]
                );

                res.json({
                    success: true,
                    message: 'Owner unblocked successfully',
                    data: updatedOwner[0]
                });

            } catch (error) {
                await connection.query('ROLLBACK');
                connection.release();
                throw error;
            }

        } catch (error) {
            console.error('❌ Unblock owner error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to unblock owner',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },


    // 4. PAYMENT ENFORCEMENT: Block Arena for Non-Payment
    enforcePayment: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { action, amount_paid, reason, notes, notify_owner = true } = req.body;
            const admin_id = req.user?.id;

            // Validate required fields
            if (!arena_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Arena ID is required'
                });
            }

            if (!action) {
                return res.status(400).json({
                    success: false,
                    message: 'Action is required'
                });
            }

            // Get a connection from the pool
            const connection = await pool.getConnection();

            try {
                // IMPORTANT: Use query() not execute() for transaction commands
                await connection.query('START TRANSACTION');

                // Get arena details - execute() is fine for parameterized queries
                const [arenas] = await connection.execute(
                    `SELECT a.*, ao.email as owner_email, ao.arena_name as owner_name,
                        a.total_commission_due as pending_amount
                 FROM arenas a
                 JOIN arena_owners ao ON a.owner_id = ao.owner_id
                 WHERE a.arena_id = ?`,
                    [arena_id]
                );

                if (arenas.length === 0) {
                    await connection.query('ROLLBACK');
                    connection.release();
                    return res.status(404).json({
                        success: false,
                        message: 'Arena not found'
                    });
                }

                const arena = arenas[0];
                const currentDate = new Date();
                const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

                if (action === 'mark_paid') {
                    // Convert to number
                    const paidAmount = parseFloat(amount_paid);

                    if (isNaN(paidAmount) || paidAmount <= 0) {
                        await connection.query('ROLLBACK');
                        connection.release();
                        return res.status(400).json({
                            success: false,
                            message: 'Valid amount_paid is required'
                        });
                    }

                    // Calculate due date (end of current month)
                    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

                    // 1. Update arena's commission due
                    await connection.execute(
                        `UPDATE arenas 
                     SET total_commission_due = GREATEST(0, total_commission_due - ?),
                         last_payment_date = NOW()
                     WHERE arena_id = ?`,
                        [paidAmount, arena_id]
                    );

                    // 2. Record payment in commission_payments table
                    await connection.execute(
                        `INSERT INTO commission_payments 
                     (arena_id, owner_id, amount_due, amount_paid, due_date, 
                      payment_date, status, marked_by_admin_id, notes)
                     VALUES (?, ?, ?, ?, ?, CURDATE(), 'paid', ?, ?)`,
                        [
                            arena_id,
                            arena.owner_id,
                            arena.total_commission_due,
                            paidAmount,
                            dueDate,
                            admin_id,
                            notes || `Monthly commission payment marked by admin`
                        ]
                    );

                    // 3. Log admin action
                    await connection.execute(
                        `INSERT INTO admin_actions 
                     (admin_id, action_type, target_id, target_type, details, ip_address)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            admin_id,
                            'payment_marked_paid',
                            arena_id,
                            'arena',
                            JSON.stringify({
                                amount_paid: paidAmount,
                                previous_due: arena.total_commission_due,
                                arena_name: arena.name,
                                owner_name: arena.owner_name,
                                payment_date: new Date().toISOString().split('T')[0]
                            }),
                            req.ip || '127.0.0.1'
                        ]
                    );

                } else if (action === 'block_for_non_payment') {
                    // Block arena
                    await connection.execute(
                        `UPDATE arenas 
                     SET is_blocked = TRUE, 
                         blocked_reason = ?, 
                         blocked_at = NOW()
                     WHERE arena_id = ?`,
                        [reason || 'Non-payment of commission', arena_id]
                    );

                    // Log admin action
                    await connection.execute(
                        `INSERT INTO admin_actions 
                     (admin_id, action_type, target_id, target_type, details, ip_address)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            admin_id,
                            'arena_blocked',
                            arena_id,
                            'arena',
                            JSON.stringify({
                                reason: reason || 'Non-payment of commission',
                                arena_name: arena.name,
                                owner_name: arena.owner_name,
                                pending_amount: arena.total_commission_due,
                                blocked_at: new Date().toISOString()
                            }),
                            req.ip || '127.0.0.1'
                        ]
                    );

                } else if (action === 'unblock') {
                    // Unblock arena
                    await connection.execute(
                        `UPDATE arenas 
                     SET is_blocked = FALSE, 
                         blocked_reason = NULL, 
                         blocked_at = NULL
                     WHERE arena_id = ?`,
                        [arena_id]
                    );

                    // Log admin action
                    await connection.execute(
                        `INSERT INTO admin_actions 
                     (admin_id, action_type, target_id, target_type, details, ip_address)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            admin_id,
                            'arena_unblocked',
                            arena_id,
                            'arena',
                            JSON.stringify({
                                arena_name: arena.name,
                                owner_name: arena.owner_name,
                                unblocked_at: new Date().toISOString()
                            }),
                            req.ip || '127.0.0.1'
                        ]
                    );

                } else {
                    await connection.query('ROLLBACK');
                    connection.release();
                    return res.status(400).json({
                        success: false,
                        message: `Unknown action: ${action}`
                    });
                }

                // Commit transaction - use query() not execute()
                await connection.query('COMMIT');
                connection.release();

                // Get updated arena info
                const [updatedArena] = await pool.execute(
                    `SELECT a.*, ao.arena_name as owner_name 
                 FROM arenas a
                 JOIN arena_owners ao ON a.owner_id = ao.owner_id
                 WHERE a.arena_id = ?`,
                    [arena_id]
                );

                res.json({
                    success: true,
                    message: `Action "${action}" completed successfully`,
                    data: {
                        arena_id,
                        action,
                        arena_name: updatedArena[0]?.name || arena.name,
                        owner_name: updatedArena[0]?.owner_name || arena.owner_name,
                        remaining_due: updatedArena[0]?.total_commission_due || 0,
                        is_blocked: updatedArena[0]?.is_blocked || false
                    }
                });

            } catch (error) {
                await connection.query('ROLLBACK');
                connection.release();
                console.error('❌ Transaction error:', error);
                throw error;
            }

        } catch (error) {
            console.error('❌ enforcePayment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to enforce payment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },


    exportFinancialReport: async (req, res) => {
        try {
            const { report_type, start_date, end_date, format = 'excel' } = req.query;

            console.log(`📈 Super Admin exporting ${report_type} report in ${format} format`);
            console.log(`📅 Date range: ${start_date} to ${end_date}`);

            // Fetch data for the report - FIXED with time_slots table
            const [reportData] = await pool.execute(`
            SELECT 
                DATE(b.booking_date) as date,
                a.name as arena_name,
                ao.arena_name as owner_name,
                u.name as customer_name,
                b.booking_id,
                b.total_amount,
                b.commission_amount,
                b.status,
                st.name as sport_name,
                ts.start_time,
                ts.end_time,
                CONCAT(TIME_FORMAT(ts.start_time, '%H:%i'), ' - ', TIME_FORMAT(ts.end_time, '%H:%i')) as time_slot
            FROM bookings b
            JOIN arenas a ON b.arena_id = a.arena_id
            JOIN arena_owners ao ON a.owner_id = ao.owner_id
            JOIN users u ON b.user_id = u.user_id
            JOIN sports_types st ON b.sport_id = st.sport_id
            LEFT JOIN time_slots ts ON b.slot_id = ts.slot_id
            WHERE b.status = 'completed'
                AND b.booking_date >= ?
                AND b.booking_date <= ?
            ORDER BY b.booking_date DESC
        `, [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]);

            console.log(`📊 Found ${reportData.length} bookings`);

            if (format === 'excel') {
                // Create Excel workbook
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Financial Report');

                // Add headers
                worksheet.columns = [
                    { header: 'Date', key: 'date', width: 12 },
                    { header: 'Arena', key: 'arena_name', width: 25 },
                    { header: 'Owner', key: 'owner_name', width: 25 },
                    { header: 'Customer', key: 'customer_name', width: 25 },
                    { header: 'Booking ID', key: 'booking_id', width: 15 },
                    { header: 'Sport', key: 'sport_name', width: 15 },
                    { header: 'Time Slot', key: 'time_slot', width: 20 },
                    { header: 'Total Amount (Rs)', key: 'total_amount', width: 18 },
                    { header: 'Commission (Rs)', key: 'commission_amount', width: 18 },
                    { header: 'Status', key: 'status', width: 12 }
                ];

                // Add data rows
                reportData.forEach(row => {
                    worksheet.addRow({
                        date: row.date,
                        arena_name: row.arena_name,
                        owner_name: row.owner_name,
                        customer_name: row.customer_name,
                        booking_id: row.booking_id,
                        sport_name: row.sport_name,
                        time_slot: row.time_slot || 'N/A',
                        total_amount: row.total_amount,
                        commission_amount: row.commission_amount,
                        status: row.status
                    });
                });

                // Add summary row
                const totalRevenue = reportData.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);
                const totalCommission = reportData.reduce((sum, row) => sum + (parseFloat(row.commission_amount) || 0), 0);

                worksheet.addRow([]);
                worksheet.addRow(['SUMMARY', '', '', '', '', '', '', '', '', '']);
                worksheet.addRow(['Total Bookings', reportData.length, '', '', '', '', '', '', '', '']);
                worksheet.addRow(['Total Revenue', '', '', '', '', '', '', `Rs ${totalRevenue.toFixed(2)}`, '', '']);
                worksheet.addRow(['Total Commission', '', '', '', '', '', '', '', `Rs ${totalCommission.toFixed(2)}`, '']);

                // Style the summary
                const summaryRows = [worksheet.rowCount - 3, worksheet.rowCount - 2, worksheet.rowCount - 1];
                summaryRows.forEach(rowIndex => {
                    const row = worksheet.getRow(rowIndex);
                    row.font = { bold: true };
                });

                // Set response headers for Excel download
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="financial_report_${start_date || 'start'}_to_${end_date || 'end'}.xlsx"`);

                // Send the Excel file
                await workbook.xlsx.write(res);
                res.end();

            } else if (format === 'json') {
                // Return JSON data
                const summary = {
                    total_bookings: reportData.length,
                    total_revenue: reportData.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0),
                    total_commission: reportData.reduce((sum, row) => sum + (parseFloat(row.commission_amount) || 0), 0),
                    period: {
                        start: start_date,
                        end: end_date
                    }
                };

                res.json({
                    success: true,
                    report_type,
                    format: 'json',
                    summary,
                    data: reportData,
                    generated_at: new Date().toISOString(),
                    generated_by: req.user?.name || 'Admin'
                });

            } else {
                throw new Error('Unsupported format. Use "excel" or "json"');
            }

        } catch (error) {
            console.error('❌ Super Admin export error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // 6. GET OVERDUE PAYMENTS (For Dashboard)
    getOverduePayments: async (req, res) => {
        try {
            console.log('⚠️ Super Admin fetching overdue payments...');

            const [overduePayments] = await pool.execute(`
                SELECT 
                    a.arena_id,
                    a.name as arena_name,
                    ao.arena_name as owner_name,
                    ao.email as owner_email,
                    ao.phone_number as owner_phone,
                    a.total_commission_due as overdue_amount,
                    DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at)) as days_overdue,
                    a.last_payment_date,
                    COUNT(DISTINCT b.booking_id) as recent_bookings_count,
                    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
                               THEN b.commission_amount ELSE 0 END), 0) as last_30_days_commission
                FROM arenas a
                JOIN arena_owners ao ON a.owner_id = ao.owner_id
                LEFT JOIN bookings b ON a.arena_id = b.arena_id
                WHERE a.total_commission_due > 0
                    AND (a.last_payment_date IS NULL OR DATEDIFF(CURDATE(), a.last_payment_date) > 7)
                    AND a.is_blocked = FALSE
                GROUP BY a.arena_id
                ORDER BY days_overdue DESC, overdue_amount DESC
                LIMIT 50
            `);

            res.json({
                success: true,
                data: {
                    overdue_payments: overduePayments,
                    total_overdue: overduePayments.reduce((sum, payment) => sum + (payment.overdue_amount || 0), 0),
                    total_arenas: overduePayments.length,
                    summary_by_days: {
                        '7-15': overduePayments.filter(p => p.days_overdue >= 7 && p.days_overdue <= 15).length,
                        '16-30': overduePayments.filter(p => p.days_overdue >= 16 && p.days_overdue <= 30).length,
                        '30+': overduePayments.filter(p => p.days_overdue > 30).length
                    }
                }
            });

        } catch (error) {
            console.error('❌ Super Admin overdue payments error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch overdue payments'
            });
        }
    },

    // 7. SYSTEM HEALTH CHECK
    getSystemHealth: async (req, res) => {
        try {
            console.log('🏥 Super Admin checking system health...');

            // Database health
            const [dbStats] = await pool.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM arena_owners) as owners_count,
                    (SELECT COUNT(*) FROM arenas) as arenas_count,
                    (SELECT COUNT(*) FROM bookings) as bookings_count,
                    (SELECT MAX(created_at) FROM bookings) as last_booking,
                    (SELECT MAX(created_at) FROM users) as last_user_signup
            `);

            // Server status
            const serverStatus = {
                database: 'connected',
                server_time: new Date(),
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                node_version: process.version
            };

            // Recent errors from admin_actions
            const [recentErrors] = await pool.execute(`
                SELECT action_type, COUNT(*) as error_count
                FROM admin_actions 
                WHERE action_type LIKE '%error%' OR details LIKE '%error%'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY action_type
                ORDER BY error_count DESC
            `);

            res.json({
                success: true,
                data: {
                    database: dbStats[0],
                    server: serverStatus,
                    recent_errors: recentErrors,
                    health_status: 'healthy', // You can add logic to determine this
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ System health check error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check system health'
            });
        }
    }
};

module.exports = superAdminController;