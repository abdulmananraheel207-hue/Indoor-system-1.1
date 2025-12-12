// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { verifyOwner, verifyAdmin } = require('../middleware/authMiddleware');
const pool = require('../db');

// Owner revenue report
router.get('/owner/revenue-report', verifyOwner, async (req, res) => {
    try {
        const ownerId = req.owner.owner_id;
        const { start_date, end_date, group_by = 'daily' } = req.query;

        let dateFormat = '%Y-%m-%d'; // daily
        if (group_by === 'weekly') dateFormat = '%Y-%u';
        if (group_by === 'monthly') dateFormat = '%Y-%m';
        if (group_by === 'yearly') dateFormat = '%Y';

        let query = `
      SELECT 
        DATE_FORMAT(b.booking_date, ?) as period,
        COUNT(*) as total_bookings,
        SUM(b.total_amount) as total_revenue,
        SUM(b.commission_amount) as total_commission,
        SUM(b.total_amount - b.commission_amount) as net_revenue,
        AVG(b.total_amount) as avg_booking_value,
        SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END) as completed_revenue,
        SUM(CASE WHEN b.status = 'cancelled' THEN b.cancellation_fee ELSE 0 END) as cancellation_fees
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE a.owner_id = ?
    `;

        const params = [dateFormat, ownerId];

        if (start_date) {
            query += ' AND DATE(b.booking_date) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND DATE(b.booking_date) <= ?';
            params.push(end_date);
        }

        query += ' GROUP BY period ORDER BY period DESC LIMIT 30';

        const [report] = await pool.query(query, params);

        // Get summary
        const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(total_amount) as total_revenue,
        SUM(commission_amount) as total_commission,
        AVG(total_amount) as avg_booking_value,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE a.owner_id = ?
        ${start_date ? 'AND DATE(b.booking_date) >= ?' : ''}
        ${end_date ? 'AND DATE(b.booking_date) <= ?' : ''}
    `, start_date && end_date ? [ownerId, start_date, end_date] :
            start_date ? [ownerId, start_date] :
                end_date ? [ownerId, end_date] : [ownerId]);

        res.json({
            success: true,
            report: report || [],
            summary: summary[0] || {},
            date_range: { start_date, end_date },
            group_by
        });

    } catch (error) {
        console.error('Revenue report error:', error);
        res.status(500).json({ error: 'Failed to generate revenue report' });
    }
});

// Owner booking trends
router.get('/owner/booking-trends', verifyOwner, async (req, res) => {
    try {
        const ownerId = req.owner.owner_id;
        const { days = 30 } = req.query;

        const [trends] = await pool.query(`
      SELECT 
        DAYNAME(ts.date) as day_of_week,
        HOUR(ts.start_time) as hour_of_day,
        COUNT(*) as booking_count,
        AVG(b.total_amount) as avg_amount
      FROM bookings b
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE a.owner_id = ?
        AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND b.status = 'completed'
      GROUP BY DAYOFWEEK(ts.date), HOUR(ts.start_time)
      ORDER BY DAYOFWEEK(ts.date), HOUR(ts.start_time)
    `, [ownerId, parseInt(days)]);

        // Get popular sports
        const [sports] = await pool.query(`
      SELECT 
        st.name as sport,
        COUNT(*) as booking_count,
        SUM(b.total_amount) as total_revenue
      FROM bookings b
      JOIN sports_types st ON b.sport_id = st.sport_id
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE a.owner_id = ?
        AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY b.sport_id
      ORDER BY booking_count DESC
      LIMIT 5
    `, [ownerId, parseInt(days)]);

        // Get court utilization
        const [courts] = await pool.query(`
      SELECT 
        cd.court_name,
        COUNT(*) as booking_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings b2 
              JOIN arenas a2 ON b2.arena_id = a2.arena_id 
              WHERE a2.owner_id = ? 
              AND b2.booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)), 2) as utilization_rate
      FROM bookings b
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      JOIN court_details cd ON ts.court_id = cd.court_id
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE a.owner_id = ?
        AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND b.status = 'completed'
      GROUP BY cd.court_id
      ORDER BY booking_count DESC
    `, [ownerId, parseInt(days), ownerId, parseInt(days)]);

        res.json({
            success: true,
            trends: trends || [],
            popular_sports: sports || [],
            court_utilization: courts || [],
            period_days: parseInt(days)
        });

    } catch (error) {
        console.error('Booking trends error:', error);
        res.status(500).json({ error: 'Failed to generate booking trends' });
    }
});

// Admin system report
router.get('/admin/system-report', verifyAdmin, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        // System overview
        const [overview] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM arena_owners) as total_owners,
        (SELECT COUNT(*) FROM arenas WHERE is_active = TRUE) as active_arenas,
        (SELECT COUNT(*) FROM arenas WHERE is_blocked = TRUE) as blocked_arenas,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT SUM(total_amount) FROM bookings WHERE status = 'completed') as total_revenue,
        (SELECT SUM(commission_amount) FROM bookings WHERE status = 'completed') as total_commission,
        (SELECT COUNT(*) FROM bookings WHERE DATE(booking_date) = CURDATE()) as today_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings
    `);

        // Recent activity
        const [activity] = await pool.query(`
      (SELECT 'user_registered' as type, name as title, created_at as timestamp 
       FROM users ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'owner_registered' as type, arena_name as title, created_at as timestamp 
       FROM arena_owners ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'booking_created' as type, CONCAT('Booking #', booking_id) as title, booking_date as timestamp 
       FROM bookings ORDER BY booking_date DESC LIMIT 5)
      ORDER BY timestamp DESC
      LIMIT 10
    `);

        // Revenue trend (last 7 days)
        const [revenueTrend] = await pool.query(`
      SELECT 
        DATE(booking_date) as date,
        COUNT(*) as bookings,
        SUM(total_amount) as revenue,
        SUM(commission_amount) as commission
      FROM bookings
      WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND status = 'completed'
      GROUP BY DATE(booking_date)
      ORDER BY date
    `);

        res.json({
            success: true,
            overview: overview[0] || {},
            recent_activity: activity || [],
            revenue_trend: revenueTrend || [],
            report_date: new Date().toISOString()
        });

    } catch (error) {
        console.error('System report error:', error);
        res.status(500).json({ error: 'Failed to generate system report' });
    }
});

// Export booking data (CSV)
router.get('/export/bookings', verifyOwner, async (req, res) => {
    try {
        const ownerId = req.owner.owner_id;
        const { start_date, end_date } = req.query;

        const [bookings] = await pool.query(`
      SELECT 
        b.booking_id,
        b.booking_date,
        u.name as customer_name,
        u.email as customer_email,
        u.phone_number as customer_phone,
        a.name as arena_name,
        cd.court_name,
        st.name as sport,
        ts.date,
        ts.start_time,
        ts.end_time,
        b.total_amount,
        b.commission_amount,
        b.status,
        b.payment_method,
        b.payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN arenas a ON b.arena_id = a.arena_id
      JOIN sports_types st ON b.sport_id = st.sport_id
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      WHERE a.owner_id = ?
        ${start_date ? 'AND DATE(b.booking_date) >= ?' : ''}
        ${end_date ? 'AND DATE(b.booking_date) <= ?' : ''}
      ORDER BY b.booking_date DESC
    `, start_date && end_date ? [ownerId, start_date, end_date] :
            start_date ? [ownerId, start_date] :
                end_date ? [ownerId, end_date] : [ownerId]);

        // Convert to CSV
        if (bookings.length === 0) {
            return res.json({
                success: true,
                message: 'No data to export',
                csv: ''
            });
        }

        const headers = Object.keys(bookings[0]);
        const csvRows = [
            headers.join(','), // Header row
            ...bookings.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = String(value || '').replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                }).join(',')
            )
        ];

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=bookings-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

module.exports = router;