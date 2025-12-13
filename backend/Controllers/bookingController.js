const pool = require('../db');

const bookingController = {
    // Create a new booking
    createBooking: async (req, res) => {
        try {
            const { arena_id, slot_id, sport_id, court_id, payment_method, requires_advance } = req.body;

            // Check if slot exists and is available
            const [slots] = await pool.execute(
                `SELECT ts.*, a.base_price_per_hour, a.owner_id
         FROM time_slots ts
         JOIN arenas a ON ts.arena_id = a.arena_id
         WHERE ts.slot_id = ? 
           AND ts.arena_id = ?
           AND ts.sport_id = ?
           AND ts.is_available = TRUE
           AND ts.is_blocked_by_owner = FALSE
           AND ts.is_holiday = FALSE
           AND (ts.locked_until IS NULL OR ts.locked_until < NOW() OR ts.locked_by_user_id = ?)`,
                [slot_id, arena_id, sport_id, req.user.id]
            );

            if (slots.length === 0) {
                return res.status(400).json({ message: 'Time slot not available' });
            }

            const slot = slots[0];
            const total_amount = slot.price || slot.base_price_per_hour;
            const commission_percentage = 5.00; // 5% commission
            const commission_amount = total_amount * (commission_percentage / 100);

            // Start transaction
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Create booking
                const [bookingResult] = await connection.execute(
                    `INSERT INTO bookings 
           (user_id, arena_id, slot_id, sport_id, total_amount, 
            commission_percentage, commission_amount, payment_method, requires_advance, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                    [req.user.id, arena_id, slot_id, sport_id, total_amount,
                        commission_percentage, commission_amount, payment_method, requires_advance || false]
                );

                const booking_id = bookingResult.insertId;

                // Mark slot as unavailable
                await connection.execute(
                    `UPDATE time_slots 
           SET is_available = FALSE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
                    [slot_id]
                );

                // Update arena commission due
                await connection.execute(
                    `UPDATE arenas 
           SET total_commission_due = total_commission_due + ?
           WHERE arena_id = ?`,
                    [commission_amount, arena_id]
                );

                await connection.commit();

                // Get booking details
                const [bookings] = await pool.execute(
                    `SELECT b.*, a.name as arena_name, st.name as sport_name,
                  ts.date, ts.start_time, ts.end_time, ao.arena_name as owner_name
           FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           JOIN arena_owners ao ON a.owner_id = ao.owner_id
           JOIN sports_types st ON b.sport_id = st.sport_id
           JOIN time_slots ts ON b.slot_id = ts.slot_id
           WHERE b.booking_id = ?`,
                    [booking_id]
                );

                res.status(201).json({
                    message: 'Booking created successfully',
                    booking: bookings[0]
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

    // Get user bookings
    getUserBookings: async (req, res) => {
        try {
            const { status, limit = 10, page = 1 } = req.query;
            const offset = (page - 1) * limit;

            let query = `
        SELECT b.*, a.name as arena_name, a.address as arena_address,
               st.name as sport_name, ts.date, ts.start_time, ts.end_time,
               ao.arena_name as owner_name
        FROM bookings b
        JOIN arenas a ON b.arena_id = a.arena_id
        JOIN arena_owners ao ON a.owner_id = ao.owner_id
        JOIN sports_types st ON b.sport_id = st.sport_id
        JOIN time_slots ts ON b.slot_id = ts.slot_id
        WHERE b.user_id = ?
      `;

            const params = [req.user.id];

            if (status) {
                query += ' AND b.status = ?';
                params.push(status);
            }

            query += ' ORDER BY b.booking_date DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const [bookings] = await pool.execute(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM bookings WHERE user_id = ?';
            const countParams = [req.user.id];

            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }

            const [countResult] = await pool.execute(countQuery, countParams);

            res.json({
                bookings,
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get booking details
    getBookingDetails: async (req, res) => {
        try {
            const { booking_id } = req.params;

            const [bookings] = await pool.execute(
                `SELECT b.*, a.name as arena_name, a.address as arena_address,
                a.location_lat, a.location_lng, ao.arena_name as owner_name,
                ao.phone_number as owner_phone, st.name as sport_name,
                ts.date, ts.start_time, ts.end_time, u.name as user_name,
                u.email as user_email, u.phone_number as user_phone
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN arena_owners ao ON a.owner_id = ao.owner_id
         JOIN sports_types st ON b.sport_id = st.sport_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         JOIN users u ON b.user_id = u.user_id
         WHERE b.booking_id = ?`,
                [booking_id]
            );

            if (bookings.length === 0) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            // Check if user has access to this booking
            if (req.user.role === 'user' && bookings[0].user_id !== req.user.id) {
                return res.status(403).json({ message: 'Access denied' });
            }

            if (req.user.role === 'owner' || req.user.role === 'manager') {
                // For owners/managers, check if they own this arena
                const [arenaCheck] = await pool.execute(
                    'SELECT owner_id FROM arenas WHERE arena_id = ?',
                    [bookings[0].arena_id]
                );

                if (arenaCheck.length === 0 ||
                    (req.user.role === 'owner' && arenaCheck[0].owner_id !== req.user.id) ||
                    (req.user.role === 'manager' && arenaCheck[0].owner_id !== req.user.owner_id)) {
                    return res.status(403).json({ message: 'Access denied' });
                }
            }

            res.json(bookings[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Cancel booking
    cancelBooking: async (req, res) => {
        try {
            const { booking_id } = req.params;
            const { reason } = req.body;

            // Get booking details
            const [bookings] = await pool.execute(
                `SELECT b.*, ts.slot_id, ts.date, ts.start_time
         FROM bookings b
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE b.booking_id = ?`,
                [booking_id]
            );

            if (bookings.length === 0) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            const booking = bookings[0];

            // Check permissions
            let canCancel = false;
            if (req.user.role === 'user' && booking.user_id === req.user.id) {
                canCancel = true;
            } else if (req.user.role === 'owner' || req.user.role === 'manager') {
                const [arenaCheck] = await pool.execute(
                    'SELECT owner_id FROM arenas WHERE arena_id = ?',
                    [booking.arena_id]
                );

                if (arenaCheck.length > 0 &&
                    (req.user.role === 'owner' && arenaCheck[0].owner_id === req.user.id) ||
                    (req.user.role === 'manager' && arenaCheck[0].owner_id === req.user.owner_id)) {
                    canCancel = true;
                }
            }

            if (!canCancel) {
                return res.status(403).json({ message: 'Not authorized to cancel this booking' });
            }

            // Check if booking can be cancelled (e.g., not too close to start time)
            const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
            const hoursUntilBooking = (slotDateTime - new Date()) / (1000 * 60 * 60);

            if (hoursUntilBooking < 24 && req.user.role === 'user') {
                return res.status(400).json({
                    message: 'Cannot cancel within 24 hours of booking time'
                });
            }

            // Start transaction
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Calculate cancellation fee if applicable
                let cancellation_fee = 0;
                let cancelled_by = req.user.role === 'user' ? 'user' : 'owner';

                if (hoursUntilBooking < 24 && req.user.role === 'user') {
                    cancellation_fee = booking.total_amount * 0.2; // 20% cancellation fee
                }

                // Update booking status
                await connection.execute(
                    `UPDATE bookings 
           SET status = 'cancelled',
               cancellation_fee = ?,
               cancelled_by = ?,
               cancellation_time = NOW()
           WHERE booking_id = ?`,
                    [cancellation_fee, cancelled_by, booking_id]
                );

                // Make slot available again
                await connection.execute(
                    `UPDATE time_slots 
           SET is_available = TRUE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
                    [booking.slot_id]
                );

                // Update arena lost revenue if cancelled by user with fee
                if (cancelled_by === 'user' && cancellation_fee > 0) {
                    await connection.execute(
                        `UPDATE arena_owners 
             SET lost_revenue = lost_revenue + ?
             WHERE owner_id = (SELECT owner_id FROM arenas WHERE arena_id = ?)`,
                        [cancellation_fee, booking.arena_id]
                    );
                }

                await connection.commit();

                res.json({
                    message: 'Booking cancelled successfully',
                    cancellation_fee,
                    refund_amount: booking.total_amount - cancellation_fee
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

    // Upload payment screenshot
    uploadPaymentScreenshot: async (req, res) => {
        try {
            const { booking_id } = req.params;
            const { payment_screenshot_url, bank_account_details } = req.body;

            // Check if booking exists and is pending payment
            const [bookings] = await pool.execute(
                `SELECT status, payment_method 
         FROM bookings 
         WHERE booking_id = ? AND user_id = ?`,
                [booking_id, req.user.id]
            );

            if (bookings.length === 0) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            const booking = bookings[0];

            if (booking.status !== 'pending') {
                return res.status(400).json({ message: 'Booking is not in pending status' });
            }

            // Update payment details
            await pool.execute(
                `UPDATE bookings 
         SET payment_screenshot_url = ?,
             bank_account_details = ?,
             payment_status = 'completed'
         WHERE booking_id = ?`,
                [payment_screenshot_url, bank_account_details, booking_id]
            );

            res.json({ message: 'Payment details uploaded successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Complete booking (mark as completed)
    completeBooking: async (req, res) => {
        try {
            const { booking_id } = req.params;

            // Only owners/managers can mark booking as completed
            const [bookingCheck] = await pool.execute(
                `SELECT b.* FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE b.booking_id = ? AND a.owner_id = ?`,
                [booking_id, req.user.role === 'owner' ? req.user.id : req.user.owner_id]
            );

            if (bookingCheck.length === 0) {
                return res.status(404).json({ message: 'Booking not found or access denied' });
            }

            if (bookingCheck[0].status !== 'accepted') {
                return res.status(400).json({ message: 'Booking must be accepted before completing' });
            }

            await pool.execute(
                'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
                [booking_id]
            );

            res.json({ message: 'Booking marked as completed' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get booking statistics for user
    getBookingStats: async (req, res) => {
        try {
            const [stats] = await pool.execute(
                `SELECT 
           COUNT(*) as total_bookings,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
           SUM(total_amount) as total_spent
         FROM bookings 
         WHERE user_id = ?`,
                [req.user.id]
            );

            res.json(stats[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get available time slots for booking
    getAvailableSlots: async (req, res) => {
        try {
            const { arena_id, date, sport_id } = req.query;

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
    }
};

module.exports = bookingController;