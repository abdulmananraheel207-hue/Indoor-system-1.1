const pool = require('../db');

const arenaController = {
    // Get all sports categories
    getSportsCategories: async (req, res) => {
        try {
            const [sports] = await pool.execute(
                'SELECT * FROM sports_types ORDER BY name'
            );
            res.json(sports);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get available time slots for an arena
    getAvailableSlots: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { date, sport_id } = req.query;

            let query = `
        SELECT ts.*, st.name as sport_name, 
               CASE 
                 WHEN ts.locked_until > NOW() THEN FALSE 
                 ELSE ts.is_available 
               END as actually_available
        FROM time_slots ts
        LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
        WHERE ts.arena_id = ? 
          AND ts.is_blocked_by_owner = FALSE
          AND ts.is_holiday = FALSE
      `;

            const params = [arena_id];

            if (date) {
                query += ' AND ts.date = ?';
                params.push(date);
            } else {
                query += ' AND ts.date >= CURDATE()';
            }

            if (sport_id) {
                query += ' AND ts.sport_id = ?';
                params.push(sport_id);
            }

            query += ' ORDER BY ts.date, ts.start_time';

            const [slots] = await pool.execute(query, params);
            res.json(slots);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Lock a time slot temporarily (10 minutes)
    lockTimeSlot: async (req, res) => {
        try {
            const { slot_id } = req.params;
            const lockDuration = 10 * 60 * 1000; // 10 minutes in milliseconds

            // Check if slot is already locked
            const [slots] = await pool.execute(
                `SELECT * FROM time_slots 
         WHERE slot_id = ? 
         AND (is_available = TRUE OR (locked_until > NOW() AND locked_by_user_id IS NOT NULL))`,
                [slot_id]
            );

            if (slots.length === 0) {
                return res.status(400).json({ message: 'Slot not available or already locked by another user' });
            }

            // Lock the slot
            await pool.execute(
                `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
             locked_by_user_id = ?
         WHERE slot_id = ?`,
                [req.user.id, slot_id]
            );

            res.json({
                message: 'Slot locked for 10 minutes',
                locked_until: new Date(Date.now() + lockDuration)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Release a locked time slot
    releaseTimeSlot: async (req, res) => {
        try {
            const { slot_id } = req.params;

            await pool.execute(
                `UPDATE time_slots 
         SET locked_until = NULL,
             locked_by_user_id = NULL
         WHERE slot_id = ? AND locked_by_user_id = ?`,
                [slot_id, req.user.id]
            );

            res.json({ message: 'Slot released' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get arena reviews
    getArenaReviews: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const [reviews] = await pool.execute(
                `SELECT ar.*, u.name as user_name, u.profile_picture_url
         FROM arena_reviews ar
         JOIN users u ON ar.user_id = u.user_id
         WHERE ar.arena_id = ?
         ORDER BY ar.created_at DESC
         LIMIT ? OFFSET ?`,
                [arena_id, parseInt(limit), offset]
            );

            // Get total count
            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM arena_reviews WHERE arena_id = ?',
                [arena_id]
            );

            res.json({
                reviews,
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Add review for arena
    addReview: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { booking_id, rating, comment } = req.body;

            // Check if user has completed booking for this arena
            const [bookings] = await pool.execute(
                `SELECT 1 FROM bookings 
         WHERE user_id = ? AND arena_id = ? AND booking_id = ? 
         AND status = 'completed'`,
                [req.user.id, arena_id, booking_id]
            );

            if (bookings.length === 0) {
                return res.status(400).json({
                    message: 'Cannot review. Booking not found or not completed.'
                });
            }

            // Check if user already reviewed this booking
            const [existingReview] = await pool.execute(
                'SELECT 1 FROM arena_reviews WHERE user_id = ? AND booking_id = ?',
                [req.user.id, booking_id]
            );

            if (existingReview.length > 0) {
                return res.status(400).json({ message: 'You have already reviewed this booking' });
            }

            // Insert review
            await pool.execute(
                `INSERT INTO arena_reviews (user_id, arena_id, booking_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
                [req.user.id, arena_id, booking_id, rating, comment]
            );

            // Update arena rating
            const [avgRating] = await pool.execute(
                `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
         FROM arena_reviews WHERE arena_id = ?`,
                [arena_id]
            );

            await pool.execute(
                `UPDATE arenas 
         SET rating = ?, total_reviews = ?
         WHERE arena_id = ?`,
                [avgRating[0].avg_rating, avgRating[0].total_reviews, arena_id]
            );

            res.status(201).json({ message: 'Review added successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get court details for an arena
    getCourtDetails: async (req, res) => {
        try {
            const { arena_id } = req.params;

            const [courts] = await pool.execute(
                `SELECT cd.*, 
                GROUP_CONCAT(DISTINCT st.name) as sports,
                (SELECT image_url FROM court_images WHERE court_id = cd.court_id AND is_primary = TRUE LIMIT 1) as primary_image
         FROM court_details cd
         LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
         LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
         WHERE cd.arena_id = ?
         GROUP BY cd.court_id
         ORDER BY cd.court_number`,
                [arena_id]
            );

            res.json(courts);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = arenaController;