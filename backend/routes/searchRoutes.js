// routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Advanced arena search with filters (public)
router.get('/search/arenas', async (req, res) => {
    try {
        const {
            query = '',
            sport,
            min_price,
            max_price,
            min_rating,
            location,
            date,
            time,
            sort_by = 'rating',
            page = 1,
            limit = 10
        } = req.query;

        let sql = `
      SELECT 
        a.*,
        ao.arena_name as owner_name,
        ao.phone_number as owner_phone,
        AVG(ar.rating) as avg_rating,
        COUNT(DISTINCT ar.review_id) as total_reviews,
        COUNT(DISTINCT cd.court_id) as total_courts,
        GROUP_CONCAT(DISTINCT st.name) as available_sports,
        MIN(cd.price_per_hour) as min_price,
        MAX(cd.price_per_hour) as max_price
      FROM arenas a
      JOIN arena_owners ao ON a.owner_id = ao.owner_id
      LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
      LEFT JOIN court_details cd ON a.arena_id = cd.arena_id
      LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
      LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
      WHERE a.is_active = TRUE AND a.is_blocked = FALSE
    `;

        const params = [];

        // Text search
        if (query) {
            sql += ` AND (
        a.name LIKE ? OR 
        a.description LIKE ? OR 
        a.address LIKE ? OR
        ao.arena_name LIKE ?
      )`;
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Sport filter
        if (sport) {
            sql += ` AND st.name = ?`;
            params.push(sport);
        }

        // Price range
        if (min_price) {
            sql += ` AND cd.price_per_hour >= ?`;
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            sql += ` AND cd.price_per_hour <= ?`;
            params.push(parseFloat(max_price));
        }

        // Rating filter
        if (min_rating) {
            sql += ` HAVING avg_rating >= ?`;
            params.push(parseFloat(min_rating));
        } else {
            sql += ` GROUP BY a.arena_id`;
        }

        // Sort options
        switch (sort_by) {
            case 'price_low':
                sql += ` ORDER BY min_price ASC`;
                break;
            case 'price_high':
                sql += ` ORDER BY min_price DESC`;
                break;
            case 'rating':
                sql += ` ORDER BY avg_rating DESC`;
                break;
            case 'name':
                sql += ` ORDER BY a.name ASC`;
                break;
            default:
                sql += ` ORDER BY avg_rating DESC`;
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [arenas] = await pool.query(sql, params);

        // Get total count
        let countSql = `
      SELECT COUNT(DISTINCT a.arena_id) as total
      FROM arenas a
      JOIN arena_owners ao ON a.owner_id = ao.owner_id
      LEFT JOIN court_details cd ON a.arena_id = cd.arena_id
      LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
      LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
      WHERE a.is_active = TRUE AND a.is_blocked = FALSE
    `;

        const countParams = [];
        if (query) {
            countSql += ` AND (
        a.name LIKE ? OR 
        a.description LIKE ? OR 
        a.address LIKE ? OR
        ao.arena_name LIKE ?
      )`;
            const searchTerm = `%${query}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (sport) {
            countSql += ` AND st.name = ?`;
            countParams.push(sport);
        }

        const [countResult] = await pool.query(countSql, countParams);
        const total = countResult[0]?.total || 0;

        // Get available sports for filters
        const [sports] = await pool.query(`
      SELECT DISTINCT st.name 
      FROM sports_types st
      JOIN court_sports cs ON st.sport_id = cs.sport_id
      JOIN court_details cd ON cs.court_id = cd.court_id
      JOIN arenas a ON cd.arena_id = a.arena_id
      WHERE a.is_active = TRUE
      ORDER BY st.name
    `);

        // Get price range for filters
        const [priceRange] = await pool.query(`
      SELECT 
        MIN(price_per_hour) as min_price,
        MAX(price_per_hour) as max_price
      FROM court_details cd
      JOIN arenas a ON cd.arena_id = a.arena_id
      WHERE a.is_active = TRUE
    `);

        res.json({
            success: true,
            arenas,
            filters: {
                available_sports: sports.map(s => s.name),
                price_range: priceRange[0] || { min_price: 0, max_price: 0 }
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search arenas' });
    }
});

// Check slot availability in real-time
router.get('/check-availability', async (req, res) => {
    try {
        const { arena_id, court_id, date, start_time, end_time } = req.query;

        if (!arena_id || !date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'arena_id, date, start_time, and end_time are required'
            });
        }

        const [available] = await pool.query(`
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN FALSE
          ELSE TRUE
        END as is_available,
        cd.court_name,
        cd.price_per_hour
      FROM time_slots ts
      JOIN court_details cd ON ts.court_id = cd.court_id
      WHERE ts.arena_id = ?
        AND ts.date = ?
        AND ts.start_time = ?
        AND ts.end_time = ?
        AND ts.is_available = TRUE
        AND ts.is_blocked_by_owner = FALSE
        AND ts.is_holiday = FALSE
        AND (ts.locked_until IS NULL OR ts.locked_until < NOW())
        ${court_id ? 'AND ts.court_id = ?' : ''}
      GROUP BY cd.court_id
    `, court_id ? [arena_id, date, start_time, end_time, court_id] :
            [arena_id, date, start_time, end_time]);

        res.json({
            success: true,
            availability: available[0] || { is_available: false }
        });

    } catch (error) {
        console.error('Availability check error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

module.exports = router;