// controllers/superAdminController.js
const pool = require('../db');
const ExcelJS = require('exceljs'); // Install: npm install exceljs

const superAdminController = {
    // 1. CENTRAL CONTROL: Get All System Data
    getSystemOverview: async (req, res) => {
        try {
            console.log('👑 Super Admin fetching system overview...');

            // Get all arenas with details - CORRECTED
            const [allArenas] = await pool.execute(`
            SELECT 
                a.*,
                ao.arena_name as owner_name,
                ao.email as owner_email,
                ao.phone_number as owner_phone,
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.commission_amount ELSE 0 END), 0) as total_commission,
                a.total_commission_due as pending_commission
            FROM arenas a
            JOIN arena_owners ao ON a.owner_id = ao.owner_id
            LEFT JOIN bookings b ON a.arena_id = b.arena_id
            GROUP BY a.arena_id
            ORDER BY a.arena_id DESC
        `);

            // Get all owners - CORRECTED (using arena_name instead of owner_name)
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
                COUNT(DISTINCT a.arena_id) as total_arenas,
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as revenue_from_bookings
            FROM arena_owners ao
            LEFT JOIN arenas a ON ao.owner_id = a.owner_id
            LEFT JOIN bookings b ON a.arena_id = b.arena_id
            GROUP BY ao.owner_id
            ORDER BY ao.owner_id DESC
        `);

            // Get all users - CORRECTED
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

            // Get all bookings - CORRECTED
            const [allBookings] = await pool.execute(`
            SELECT 
                b.*,
                u.name as user_name,
                u.email as user_email,
                a.name as arena_name,
                ao.arena_name as owner_arena_name,  -- Changed from owner_name
                st.name as sport_name
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN arenas a ON b.arena_id = a.arena_id
            JOIN arena_owners ao ON a.owner_id = ao.owner_id
            LEFT JOIN sports_types st ON b.sport_id = st.sport_id
            ORDER BY b.booking_date DESC
            LIMIT 1000
        `);

            // Get system stats - CORRECTED
            const [systemStats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM arena_owners) as total_owners,
                (SELECT COUNT(*) FROM arenas WHERE is_active = TRUE) as active_arenas,
                (SELECT COUNT(*) FROM arenas WHERE is_blocked = TRUE) as blocked_arenas,
                (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'completed') as total_revenue,
                (SELECT COALESCE(SUM(commission_amount), 0) FROM bookings WHERE status = 'completed') as total_commission,
                (SELECT COALESCE(SUM(total_commission_due), 0) FROM arenas) as pending_commission_due,
                (SELECT COALESCE(SUM(total_revenue), 0) FROM arena_owners) as owner_total_revenue
        `);

            console.log('📊 Stats fetched:', {
                users: systemStats[0]?.total_users || 0,
                owners: systemStats[0]?.total_owners || 0,
                arenas: allArenas.length,
                bookings: allBookings.length
            });

            res.json({
                success: true,
                data: {
                    overview: {
                        arenas: allArenas.length,
                        owners: allOwners.length,
                        users: allUsers.length,
                        bookings: allBookings.length
                    },
                    system_stats: systemStats[0] || {},
                    arenas: allArenas,
                    owners: allOwners,
                    users: allUsers,
                    recent_bookings: allBookings.slice(0, 50)
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

    // 3. FINANCIAL MANAGEMENT: Get Commission Reports
    getCommissionReports: async (req, res) => {
        try {
            const { arena_id, owner_id, status, start_date, end_date } = req.query;

            console.log('💰 Super Admin fetching commission reports...');

            let query = `
                SELECT 
                    a.arena_id,
                    a.name as arena_name,
                    ao.owner_id,
                    ao.arena_name as owner_name,
                    ao.email as owner_email,
                    ao.phone_number as owner_phone,
                    a.total_commission_due as pending_amount,
                    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.commission_amount ELSE 0 END), 0) as total_commission_paid,
                    COUNT(DISTINCT b.booking_id) as total_bookings,
                    MAX(b.booking_date) as last_booking_date,
                    a.last_payment_date,
                    CASE 
                        WHEN a.last_payment_date IS NULL THEN 'never'
                        WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 30 THEN 'overdue_30'
                        WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 15 THEN 'overdue_15'
                        WHEN DATEDIFF(CURDATE(), a.last_payment_date) > 7 THEN 'overdue_7'
                        ELSE 'on_time'
                    END as payment_status,
                    DATEDIFF(CURDATE(), COALESCE(a.last_payment_date, a.created_at)) as days_since_last_payment
                FROM arenas a
                JOIN arena_owners ao ON a.owner_id = ao.owner_id
                LEFT JOIN bookings b ON a.arena_id = b.arena_id AND b.status = 'completed'
            `;

            const conditions = [];
            const params = [];

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

            if (start_date) {
                conditions.push('b.booking_date >= ?');
                params.push(start_date);
            }

            if (end_date) {
                conditions.push('b.booking_date <= ?');
                params.push(end_date);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' GROUP BY a.arena_id ORDER BY a.total_commission_due DESC, days_since_last_payment DESC';

            const [commissionReports] = await pool.execute(query, params);

            // Summary statistics
            const summary = {
                total_arenas: commissionReports.length,
                total_pending: commissionReports.reduce((sum, report) => sum + (report.pending_amount || 0), 0),
                total_paid: commissionReports.reduce((sum, report) => sum + (report.total_commission_paid || 0), 0),
                overdue_count: commissionReports.filter(r => r.payment_status.includes('overdue')).length,
                never_paid_count: commissionReports.filter(r => r.payment_status === 'never').length
            };

            res.json({
                success: true,
                data: {
                    reports: commissionReports,
                    summary: summary,
                    currency: 'Rs'
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

    // 4. PAYMENT ENFORCEMENT: Block Arena for Non-Payment
    enforcePayment: async (req, res) => {
        console.log('\n\n🎬 ========== ENFORCE PAYMENT START ==========');
        console.log('🕐 Timestamp:', new Date().toISOString());

        try {
            // ========== DEBUG 1: Check incoming request ==========
            console.log('\n🔍 [DEBUG 1] INCOMING REQUEST:');
            console.log('📦 Params:', JSON.stringify(req.params, null, 2));
            console.log('📦 Body:', JSON.stringify(req.body, null, 2));
            console.log('👤 User:', JSON.stringify(req.user, null, 2));
            console.log('🌐 IP:', req.ip);
            console.log('📨 Method:', req.method);
            console.log('🔗 URL:', req.originalUrl);
            console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));

            const { arena_id } = req.params;
            const { action, amount_paid, reason, notify_owner = true } = req.body;

            // ========== DEBUG 2: Check parsed values ==========
            console.log('\n🔍 [DEBUG 2] PARSED VALUES:');
            console.log('🏟️ Arena ID:', arena_id, 'Type:', typeof arena_id);
            console.log('⚡ Action:', action, 'Type:', typeof action);
            console.log('💰 Amount Paid:', amount_paid, 'Type:', typeof amount_paid);
            console.log('📝 Reason:', reason, 'Type:', typeof reason);
            console.log('📧 Notify Owner:', notify_owner, 'Type:', typeof notify_owner);

            // Validate required fields
            if (!arena_id) {
                console.log('❌ ERROR: Arena ID is missing');
                return res.status(400).json({
                    success: false,
                    message: 'Arena ID is required'
                });
            }

            if (!action) {
                console.log('❌ ERROR: Action is missing');
                return res.status(400).json({
                    success: false,
                    message: 'Action is required'
                });
            }

            // ========== DEBUG 3: Check database connection ==========
            console.log('\n🔍 [DEBUG 3] DATABASE QUERY:');
            console.log('🔎 Looking for arena ID:', arena_id);

            const [arenas] = await pool.execute(
                `SELECT a.*, ao.email as owner_email, ao.arena_name as owner_name
             FROM arenas a
             JOIN arena_owners ao ON a.owner_id = ao.owner_id
             WHERE a.arena_id = ?`,
                [arena_id]
            );

            console.log('📊 Query result count:', arenas.length);

            if (arenas.length === 0) {
                console.log('❌ ERROR: Arena not found in database');
                return res.status(404).json({
                    success: false,
                    message: 'Arena not found'
                });
            }

            const arena = arenas[0];
            console.log('✅ Arena found:', {
                id: arena.arena_id,
                name: arena.name,
                owner_id: arena.owner_id,
                owner_name: arena.owner_name,
                is_blocked: arena.is_blocked,
                total_commission_due: arena.total_commission_due
            });

            // ========== DEBUG 4: Check action type ==========
            console.log('\n🔍 [DEBUG 4] ACTION PROCESSING:');
            console.log('🎯 Action to perform:', action);

            if (action === 'mark_paid') {
                console.log('💰 Processing mark_paid action');
                console.log('💸 Amount to pay:', amount_paid);
                console.log('📅 Arena commission due:', arena.total_commission_due);

                // TEMPORARY SUCCESS RESPONSE
                console.log('🧪 TEST: Would mark payment as paid');

            } else if (action === 'block_for_non_payment') {
                console.log('🔒 Processing block_for_non_payment action');
                console.log('📝 Block reason:', reason);
                console.log('🏟️ Current blocked status:', arena.is_blocked);

                // TEMPORARY: Just update the arena without transaction
                console.log('🧪 TEST: Would block arena');

            } else if (action === 'unblock') {
                console.log('🔓 Processing unblock action');
                console.log('🏟️ Current blocked status:', arena.is_blocked);

                // TEMPORARY: Just update the arena without transaction
                console.log('🧪 TEST: Would unblock arena');

            } else {
                console.log('❌ ERROR: Unknown action:', action);
                return res.status(400).json({
                    success: false,
                    message: `Unknown action: ${action}`
                });
            }

            // ========== DEBUG 5: Test database connection ==========
            console.log('\n🔍 [DEBUG 5] TESTING DATABASE OPERATION:');

            try {
                // Test a simple update without transaction
                if (action === 'block_for_non_payment') {
                    console.log('🧪 Testing simple UPDATE query...');

                    const [updateResult] = await pool.execute(
                        `UPDATE arenas 
                     SET is_blocked = TRUE, blocked_reason = ?, blocked_at = NOW()
                     WHERE arena_id = ?`,
                        [reason || 'Non-payment of commission', arena_id]
                    );

                    console.log('✅ Simple UPDATE successful:', {
                        affectedRows: updateResult.affectedRows,
                        changedRows: updateResult.changedRows
                    });
                }

            } catch (dbError) {
                console.error('❌ DATABASE ERROR:', {
                    code: dbError.code,
                    errno: dbError.errno,
                    sqlMessage: dbError.sqlMessage,
                    sql: dbError.sql,
                    stack: dbError.stack
                });

                // Check if it's the undefined error
                if (dbError.message.includes('undefined') || dbError.message.includes('To pass SQL NULL')) {
                    console.log('🔎 This is the UNDEFINED error we need to fix!');
                    console.log('🔎 The error mentions undefined being passed to SQL.');
                    console.log('🔎 Check which parameter is undefined in the SQL query.');
                }

                throw dbError;
            }

            // ========== DEBUG 6: Check what would go into admin_actions ==========
            console.log('\n🔍 [DEBUG 6] ADMIN ACTIONS LOG DATA:');
            const logData = {
                admin_id: req.user?.id || 'UNDEFINED',
                action_type: action,
                target_id: arena_id,
                target_type: 'arena',
                details: JSON.stringify({ action, reason: reason || null }),
                ip_address: req.ip || '127.0.0.1'
            };
            console.log('📝 Would log:', JSON.stringify(logData, null, 2));

            // Check for undefined values
            Object.entries(logData).forEach(([key, value]) => {
                if (value === undefined) {
                    console.log(`⚠️ WARNING: ${key} is undefined!`);
                }
            });

            // ========== SUCCESS RESPONSE ==========
            console.log('\n✅ [SUCCESS] Returning response');

            res.json({
                success: true,
                message: `Action "${action}" completed successfully`,
                arena_id,
                action,
                arena_name: arena.name,
                owner_name: arena.owner_name,
                debug: {
                    user_id: req.user?.id,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                }
            });

            console.log('\n🎬 ========== ENFORCE PAYMENT END ==========\n\n');

        } catch (error) {
            console.error('\n❌ [ERROR] enforcePayment failed:');
            console.error('📛 Error name:', error.name);
            console.error('📛 Error message:', error.message);
            console.error('📛 Error code:', error.code);
            console.error('📛 Error errno:', error.errno);
            console.error('📛 Error sqlMessage:', error.sqlMessage);
            console.error('📛 Error sql:', error.sql);
            console.error('📛 Stack trace:', error.stack);

            // Special check for undefined error
            if (error.message.includes('undefined')) {
                console.error('\n🔍 SPECIAL: This is the UNDEFINED error!');
                console.error('🔍 The MySQL driver received undefined instead of null.');
                console.error('🔍 Check all SQL parameters before passing them.');
            }

            res.status(500).json({
                success: false,
                message: 'Failed to enforce payment',
                error: error.message,
                errorCode: error.code,
                debug: {
                    arena_id: req.params.arena_id,
                    action: req.body.action,
                    user_id: req.user?.id,
                    timestamp: new Date().toISOString()
                }
            });

            console.log('\n🎬 ========== ENFORCE PAYMENT END WITH ERROR ==========\n\n');
        }
    },

    // 5. EXPORT REPORTS: Generate Excel/PDF Reports
    exportFinancialReport: async (req, res) => {
        try {
            const { report_type, start_date, end_date, format = 'excel' } = req.query;

            console.log(`📈 Super Admin exporting ${report_type} report in ${format} format`);

            // Fetch data for the report
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
                    CONCAT(DATE_FORMAT(b.start_time, '%H:%i'), ' - ', DATE_FORMAT(b.end_time, '%H:%i')) as time_slot
                FROM bookings b
                JOIN arenas a ON b.arena_id = a.arena_id
                JOIN arena_owners ao ON a.owner_id = ao.owner_id
                JOIN users u ON b.user_id = u.user_id
                JOIN sports_types st ON b.sport_id = st.sport_id
                WHERE b.status = 'completed'
                    AND b.booking_date >= ?
                    AND b.booking_date <= ?
                ORDER BY b.booking_date DESC, b.start_time
            `, [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]);

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
                    { header: 'Time Slot', key: 'time_slot', width: 15 },
                    { header: 'Total Amount (Rs)', key: 'total_amount', width: 18 },
                    { header: 'Commission (Rs)', key: 'commission_amount', width: 18 },
                    { header: 'Status', key: 'status', width: 12 }
                ];

                // Add data rows
                reportData.forEach(row => {
                    worksheet.addRow(row);
                });

                // Add summary row
                const totalRevenue = reportData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
                const totalCommission = reportData.reduce((sum, row) => sum + parseFloat(row.commission_amount || 0), 0);

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
                res.setHeader('Content-Disposition', `attachment; filename="financial_report_${Date.now()}.xlsx"`);

                // Send the Excel file
                await workbook.xlsx.write(res);
                res.end();

            } else if (format === 'json') {
                // Return JSON data
                const summary = {
                    total_bookings: reportData.length,
                    total_revenue: reportData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0),
                    total_commission: reportData.reduce((sum, row) => sum + parseFloat(row.commission_amount || 0), 0),
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
                    generated_by: req.user.name
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