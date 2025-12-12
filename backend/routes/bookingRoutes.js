// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyOwner, verifyUser, verifyManager } = require('../middleware/authMiddleware');
const pool = require('../db');

// ==================== PUBLIC ROUTES ====================

// Get available time slots for an arena (public)
router.get('/arenas/:arenaId/slots', async (req, res) => {
    try {
        const { arenaId } = req.params;
        const { date, sport_id, court_id } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        let query = `
      SELECT 
        ts.*,
        st.name as sport_name,
        cd.court_name,
        cd.court_number,
        cd.price_per_hour,
        a.name as arena_name,
        a.base_price_per_hour
      FROM time_slots ts
      JOIN arenas a ON ts.arena_id = a.arena_id
      LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      WHERE ts.arena_id = ?
        AND ts.date = ?
        AND ts.is_available = TRUE
        AND ts.is_blocked_by_owner = FALSE
        AND ts.is_holiday = FALSE
        AND (ts.locked_until IS NULL OR ts.locked_until < NOW())
        AND a.is_active = TRUE
        AND a.is_blocked = FALSE
    `;

        const params = [arenaId, date];

        if (sport_id) {
            query += ' AND ts.sport_id = ?';
            params.push(sport_id);
        }

        if (court_id) {
            query += ' AND ts.court_id = ?';
            params.push(court_id);
        }

        query += ' ORDER BY ts.start_time';

        const [slots] = await pool.query(query, params);

        // Group by time for easier display
        const timeSlots = {};
        slots.forEach(slot => {
            const timeKey = `${slot.start_time}-${slot.end_time}`;
            if (!timeSlots[timeKey]) {
                timeSlots[timeKey] = {
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    courts: []
                };
            }
            timeSlots[timeKey].courts.push({
                slot_id: slot.slot_id,
                court_id: slot.court_id,
                court_name: slot.court_name,
                court_number: slot.court_number,
                sport_id: slot.sport_id,
                sport_name: slot.sport_name,
                price_per_hour: slot.price_per_hour || slot.base_price_per_hour,
                arena_name: slot.arena_name
            });
        });

        res.json({
            success: true,
            slots: Object.values(timeSlots),
            date
        });
    } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({ error: 'Failed to load time slots' });
    }
});

// ==================== USER ROUTES ====================

// Create booking (user only)
router.post('/bookings', verifyUser, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { slot_id, payment_method = 'pay_later', notes } = req.body;

        if (!slot_id) {
            return res.status(400).json({ error: 'Slot ID is required' });
        }

        // Get slot details with transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Lock and check slot availability
            const [slots] = await connection.query(
                `SELECT 
          ts.*,
          cd.price_per_hour,
          cd.court_name,
          cd.court_number,
          st.name as sport_name,
          a.arena_id,
          a.name as arena_name,
          a.owner_id,
          st.sport_id
         FROM time_slots ts
         JOIN court_details cd ON ts.court_id = cd.court_id
         JOIN sports_types st ON ts.sport_id = st.sport_id
         JOIN arenas a ON ts.arena_id = a.arena_id
         WHERE ts.slot_id = ?
           FOR UPDATE`,
                [slot_id]
            );

            if (slots.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Time slot not found' });
            }

            const slot = slots[0];

            // Check availability
            if (!slot.is_available || slot.is_blocked_by_owner || slot.is_holiday) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'This time slot is not available' });
            }

            // Check if already locked
            if (slot.locked_until && slot.locked_until > new Date()) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    error: 'This slot is currently being booked by another user'
                });
            }

            // Calculate amounts
            const commission_rate = 0.05; // 5%
            const total_amount = slot.price_per_hour;
            const commission_amount = total_amount * commission_rate;
            const owner_amount = total_amount - commission_amount;

            // Lock the slot
            await connection.query(
                `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE),
             locked_by_user_id = ?
         WHERE slot_id = ?`,
                [userId, slot_id]
            );

            // Create booking
            const [bookingResult] = await connection.query(
                `INSERT INTO bookings 
         (user_id, arena_id, slot_id, sport_id, total_amount, 
          commission_percentage, commission_amount, payment_method, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
                [userId, slot.arena_id, slot_id, slot.sport_id, total_amount,
                    commission_rate * 100, commission_amount, payment_method, notes]
            );

            const bookingId = bookingResult.insertId;

            // Create notification for arena owner
            await connection.query(
                `INSERT INTO notifications 
         (owner_id, notification_type, title, message)
         VALUES (?, 'new_booking', 'New Booking Request', 
                CONCAT('You have a new booking request for ', ?, ' at ', ?, ' - Booking #', ?))`,
                [slot.owner_id, slot.court_name, slot.start_time, bookingId]
            );

            // Create initial chat message
            if (notes) {
                await connection.query(
                    `INSERT INTO chats 
           (booking_id, sender_id, sender_type, message)
           VALUES (?, ?, 'user', ?)`,
                    [bookingId, userId, `Booking note: ${notes}`]
                );
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Booking request created successfully',
                booking_id: bookingId,
                booking: {
                    booking_id: bookingId,
                    status: 'pending',
                    total_amount,
                    commission_amount,
                    slot_details: {
                        court_name: slot.court_name,
                        court_number: slot.court_number,
                        sport_name: slot.sport_name,
                        date: slot.date,
                        start_time: slot.start_time,
                        end_time: slot.end_time,
                        arena_name: slot.arena_name
                    },
                    payment_method,
                    notes
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Get user's booking details
router.get('/bookings/:bookingId', verifyUser, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { bookingId } = req.params;

        const [bookings] = await pool.query(
            `SELECT 
        b.*,
        a.name as arena_name,
        a.address as arena_address,
        st.name as sport_name,
        ts.date,
        ts.start_time,
        ts.end_time,
        cd.court_name,
        cd.court_number,
        ao.arena_name as owner_business_name,
        ao.phone_number as owner_phone,
        u.name as user_name,
        u.phone_number as user_phone,
        (SELECT COUNT(*) FROM chats c WHERE c.booking_id = b.booking_id) as message_count
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN sports_types st ON b.sport_id = st.sport_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       LEFT JOIN court_details cd ON ts.court_id = cd.court_id
       JOIN arena_owners ao ON a.owner_id = ao.owner_id
       JOIN users u ON b.user_id = u.user_id
       WHERE b.booking_id = ? AND b.user_id = ?`,
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookings[0];

        // Get chat messages
        const [messages] = await pool.query(
            `SELECT 
        c.*,
        CASE 
          WHEN c.sender_type = 'user' THEN u.name
          WHEN c.sender_type = 'owner' THEN ao.arena_name
          WHEN c.sender_type = 'manager' THEN am.name
        END as sender_name,
        c.sender_type
       FROM chats c
       LEFT JOIN users u ON c.sender_id = u.user_id AND c.sender_type = 'user'
       LEFT JOIN arena_owners ao ON c.sender_id = ao.owner_id AND c.sender_type = 'owner'
       LEFT JOIN arena_managers am ON c.sender_id = am.manager_id AND c.sender_type = 'manager'
       WHERE c.booking_id = ?
       ORDER BY c.sent_at ASC`,
            [bookingId]
        );

        booking.messages = messages;

        res.json({ success: true, booking });
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ error: 'Failed to load booking' });
    }
});

// Send message in booking chat (user)
router.post('/bookings/:bookingId/chat', verifyUser, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { bookingId } = req.params;
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Check if booking exists and belongs to user
        const [bookings] = await pool.query(
            `SELECT b.*, a.owner_id 
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE b.booking_id = ? AND b.user_id = ?`,
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookings[0];

        // Check if contact info is being shared (basic detection)
        const containsContactInfo =
            /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(message) || // Phone
            /\S+@\S+\.\S+/.test(message) || // Email
            /(http|https):\/\/[^\s]+/.test(message); // URLs

        // Insert message
        const [result] = await pool.query(
            `INSERT INTO chats 
       (booking_id, sender_id, sender_type, message, contains_contact_info)
       VALUES (?, ?, 'user', ?, ?)`,
            [bookingId, userId, message.trim(), containsContactInfo]
        );

        // Notify owner
        await pool.query(
            `INSERT INTO notifications 
       (owner_id, notification_type, title, message)
       VALUES (?, 'new_message', 'New Message', 
              CONCAT('You have a new message for booking #', ?))`,
            [booking.owner_id, bookingId]
        );

        res.json({
            success: true,
            message: 'Message sent successfully',
            message_id: result.insertId,
            contains_contact_info: containsContactInfo,
            warning: containsContactInfo ?
                'Contact information detected. Please avoid sharing personal details.' : null
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Cancel booking (user)
router.post('/bookings/:bookingId/cancel', verifyUser, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { bookingId } = req.params;

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get booking details with lock
            const [bookings] = await connection.query(
                `SELECT 
          b.*,
          ts.date,
          ts.start_time,
          ts.slot_id,
          a.owner_id,
          cd.price_per_hour
         FROM bookings b
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         JOIN arenas a ON b.arena_id = a.arena_id
         LEFT JOIN court_details cd ON ts.court_id = cd.court_id
         WHERE b.booking_id = ? AND b.user_id = ?
         FOR UPDATE`,
                [bookingId, userId]
            );

            if (bookings.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Booking not found' });
            }

            const booking = bookings[0];

            // Check if booking can be cancelled
            if (booking.status === 'cancelled') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Booking is already cancelled' });
            }

            if (booking.status === 'completed') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });
            }

            // Calculate cancellation fee (50% if within 24 hours, 0% otherwise)
            const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
            const now = new Date();
            const hoursDiff = (slotDateTime - now) / (1000 * 60 * 60);

            let cancellation_fee = 0;
            let cancellation_reason = 'User cancelled';

            if (hoursDiff < 24) {
                cancellation_fee = booking.total_amount * 0.5; // 50% cancellation fee
                cancellation_reason = 'User cancelled within 24 hours (50% fee applies)';
            }

            // Update booking
            await connection.query(
                `UPDATE bookings 
         SET status = 'cancelled',
             cancelled_by = 'user',
             cancellation_fee = ?,
             cancellation_time = NOW()
         WHERE booking_id = ?`,
                [cancellation_fee, bookingId]
            );

            // Free up the time slot
            await connection.query(
                `UPDATE time_slots 
         SET is_available = TRUE,
             locked_until = NULL,
             locked_by_user_id = NULL
         WHERE slot_id = ?`,
                [booking.slot_id]
            );

            // Notify arena owner
            await connection.query(
                `INSERT INTO notifications 
         (owner_id, notification_type, title, message)
         VALUES (?, 'booking_cancelled', 'Booking Cancelled', 
                CONCAT('Booking #', ?, ' has been cancelled by the user. ', ?))`,
                [booking.owner_id, bookingId, cancellation_reason]
            );

            // Add cancellation note to chat
            await connection.query(
                `INSERT INTO chats 
         (booking_id, sender_id, sender_type, message)
         VALUES (?, ?, 'system', CONCAT('Booking cancelled by user. ', ?))`,
                [bookingId, userId, cancellation_reason]
            );

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Booking cancelled successfully',
                cancellation_fee,
                refund_amount: booking.total_amount - cancellation_fee,
                details: {
                    original_amount: booking.total_amount,
                    cancellation_percentage: cancellation_fee > 0 ? '50%' : '0%',
                    reason: cancellation_reason
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// ==================== OWNER/MANAGER ROUTES ====================

// Get bookings for owner's arena
router.get('/owner/bookings', verifyToken, async (req, res) => {
    try {
        let ownerId;

        // Determine if requester is owner or manager
        if (req.role === 'owner') {
            ownerId = req.owner.owner_id;
        } else if (req.role === 'manager') {
            // Get owner_id from manager record
            const [managers] = await pool.query(
                'SELECT owner_id FROM arena_managers WHERE manager_id = ?',
                [req.manager.manager_id]
            );
            if (managers.length === 0) {
                return res.status(403).json({ error: 'Manager not associated with any owner' });
            }
            ownerId = managers[0].owner_id;
        } else {
            return res.status(403).json({ error: 'Access denied. Owner or Manager only.' });
        }

        const {
            status,
            date_from,
            date_to,
            sport_id,
            search,
            page = 1,
            limit = 20
        } = req.query;

        let query = `
      SELECT 
        b.*,
        a.name as arena_name,
        st.name as sport_name,
        ts.date,
        ts.start_time,
        ts.end_time,
        cd.court_name,
        cd.court_number,
        u.name as user_name,
        u.phone_number as user_phone,
        u.email as user_email,
        (SELECT COUNT(*) FROM chats c WHERE c.booking_id = b.booking_id) as unread_messages,
        (SELECT MAX(sent_at) FROM chats c WHERE c.booking_id = b.booking_id) as last_message_time
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.arena_id
      JOIN sports_types st ON b.sport_id = st.sport_id
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      JOIN users u ON b.user_id = u.user_id
      WHERE a.owner_id = ?
    `;

        const params = [ownerId];

        // Apply filters
        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        if (date_from) {
            query += ' AND ts.date >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND ts.date <= ?';
            params.push(date_to);
        }

        if (sport_id) {
            query += ' AND b.sport_id = ?';
            params.push(sport_id);
        }

        if (search) {
            query += ' AND (u.name LIKE ? OR u.phone_number LIKE ? OR cd.court_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Count total for pagination
        const countQuery = query.replace(
            'SELECT b.*, a.name as arena_name, st.name as sport_name, ts.date, ts.start_time, ts.end_time, cd.court_name, cd.court_number, u.name as user_name, u.phone_number as user_phone, u.email as user_email, (SELECT COUNT(*) FROM chats c WHERE c.booking_id = b.booking_id) as unread_messages, (SELECT MAX(sent_at) FROM chats c WHERE c.booking_id = b.booking_id) as last_message_time',
            'SELECT COUNT(*) as total'
        );

        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        // Add ordering and pagination
        query += ' ORDER BY ts.date DESC, ts.start_time DESC LIMIT ? OFFSET ?';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const [bookings] = await pool.query(query, params);

        // Get statistics
        const [stats] = await pool.query(
            `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(total_amount) as total_revenue,
        SUM(commission_amount) as total_commission
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE a.owner_id = ?`,
            [ownerId]
        );

        res.json({
            success: true,
            bookings,
            statistics: stats[0] || {},
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get owner bookings error:', error);
        res.status(500).json({ error: 'Failed to load bookings' });
    }
});

// Update booking status (owner/manager)
router.put('/bookings/:bookingId/status', verifyToken, async (req, res) => {
    try {
        let ownerId;

        // Determine if requester is owner or manager
        if (req.role === 'owner') {
            ownerId = req.owner.owner_id;
        } else if (req.role === 'manager') {
            const [managers] = await pool.query(
                'SELECT owner_id FROM arena_managers WHERE manager_id = ?',
                [req.manager.manager_id]
            );
            if (managers.length === 0) {
                return res.status(403).json({ error: 'Manager not associated with any owner' });
            }
            ownerId = managers[0].owner_id;
        } else {
            return res.status(403).json({ error: 'Access denied. Owner or Manager only.' });
        }

        const { bookingId } = req.params;
        const { status, rejection_reason } = req.body;

        if (!['accepted', 'rejected', 'completed'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Allowed: accepted, rejected, completed'
            });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Verify booking belongs to owner
            const [bookings] = await connection.query(
                `SELECT b.*, ts.slot_id, u.user_id, u.name as user_name
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         JOIN users u ON b.user_id = u.user_id
         WHERE b.booking_id = ? AND a.owner_id = ?
         FOR UPDATE`,
                [bookingId, ownerId]
            );

            if (bookings.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Booking not found or access denied' });
            }

            const booking = bookings[0];

            // Check current status
            if (booking.status === 'cancelled') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Cannot update cancelled booking' });
            }

            if (booking.status === 'completed' && status !== 'completed') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Completed booking cannot be changed' });
            }

            // Update booking status
            await connection.query(
                `UPDATE bookings 
         SET status = ?, 
             updated_at = NOW()
         WHERE booking_id = ?`,
                [status, bookingId]
            );

            // Handle different statuses
            let chatMessage = '';
            let notificationMessage = '';

            if (status === 'accepted') {
                // Mark time slot as booked
                await connection.query(
                    `UPDATE time_slots 
           SET is_available = FALSE,
               locked_until = NULL
           WHERE slot_id = ?`,
                    [booking.slot_id]
                );
                chatMessage = 'Booking has been accepted by arena owner.';
                notificationMessage = `Your booking #${bookingId} has been accepted.`;

            } else if (status === 'rejected') {
                // Free up time slot
                await connection.query(
                    `UPDATE time_slots 
           SET is_available = TRUE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
                    [booking.slot_id]
                );
                chatMessage = `Booking has been rejected. ${rejection_reason || 'No reason provided.'}`;
                notificationMessage = `Your booking #${bookingId} has been rejected.`;

            } else if (status === 'completed') {
                chatMessage = 'Booking marked as completed.';
                notificationMessage = `Your booking #${bookingId} has been marked as completed.`;
            }

            // Add status update to chat
            await connection.query(
                `INSERT INTO chats 
         (booking_id, sender_id, sender_type, message)
         VALUES (?, ?, ?, ?)`,
                [bookingId, req.role === 'owner' ? ownerId : req.manager.manager_id,
                    req.role, chatMessage]
            );

            // Notify user
            await connection.query(
                `INSERT INTO notifications 
         (user_id, notification_type, title, message)
         VALUES (?, 'booking_update', 'Booking Status Updated', ?)`,
                [booking.user_id, notificationMessage]
            );

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: `Booking ${status} successfully`,
                status,
                chat_message: chatMessage
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});

// Send message as owner/manager
router.post('/bookings/:bookingId/owner-chat', verifyToken, async (req, res) => {
    try {
        let senderId;
        let senderType;

        // Determine sender
        if (req.role === 'owner') {
            senderId = req.owner.owner_id;
            senderType = 'owner';
        } else if (req.role === 'manager') {
            senderId = req.manager.manager_id;
            senderType = 'manager';
        } else {
            return res.status(403).json({ error: 'Access denied. Owner or Manager only.' });
        }

        const { bookingId } = req.params;
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Verify booking belongs to owner/manager
        let query = `
      SELECT b.user_id, a.owner_id 
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE b.booking_id = ?
    `;

        if (req.role === 'manager') {
            query += ' AND a.owner_id IN (SELECT owner_id FROM arena_managers WHERE manager_id = ?)';
        } else {
            query += ' AND a.owner_id = ?';
        }

        const params = [bookingId, senderId];
        const [bookings] = await pool.query(query, params);

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found or access denied' });
        }

        const booking = bookings[0];

        // Check for contact info
        const containsContactInfo =
            /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(message) ||
            /\S+@\S+\.\S+/.test(message) ||
            /(http|https):\/\/[^\s]+/.test(message);

        // Insert message
        const [result] = await pool.query(
            `INSERT INTO chats 
       (booking_id, sender_id, sender_type, message, contains_contact_info)
       VALUES (?, ?, ?, ?, ?)`,
            [bookingId, senderId, senderType, message.trim(), containsContactInfo]
        );

        // Notify user
        await pool.query(
            `INSERT INTO notifications 
       (user_id, notification_type, title, message)
       VALUES (?, 'new_message', 'New Message', 
              CONCAT('You have a new message regarding booking #', ?))`,
            [booking.user_id, bookingId]
        );

        res.json({
            success: true,
            message: 'Message sent successfully',
            message_id: result.insertId,
            contains_contact_info: containsContactInfo,
            warning: containsContactInfo ?
                'Contact information detected. Please avoid sharing personal details.' : null
        });
    } catch (error) {
        console.error('Send owner message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ==================== TIME SLOT MANAGEMENT ====================

// Block time slots (owner/manager)
router.post('/block-slots', verifyToken, async (req, res) => {
    try {
        let ownerId;

        if (req.role === 'owner') {
            ownerId = req.owner.owner_id;
        } else if (req.role === 'manager') {
            const [managers] = await pool.query(
                'SELECT owner_id FROM arena_managers WHERE manager_id = ?',
                [req.manager.manager_id]
            );
            if (managers.length === 0) {
                return res.status(403).json({ error: 'Manager not associated with any owner' });
            }
            ownerId = managers[0].owner_id;
        } else {
            return res.status(403).json({ error: 'Access denied. Owner or Manager only.' });
        }

        const {
            date,
            start_time,
            end_time,
            court_id,
            sport_id,
            reason,
            is_holiday = false,
            recurring = false,
            recurring_days = []
        } = req.body;

        // Basic validation
        if (!date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Date, start_time, and end_time are required'
            });
        }

        // Get owner's arenas
        const [arenas] = await pool.query(
            'SELECT arena_id FROM arenas WHERE owner_id = ?',
            [ownerId]
        );

        if (arenas.length === 0) {
            return res.status(400).json({ error: 'Owner has no arena' });
        }

        const arenaId = arenas[0].arena_id;

        // Create time slot entry for blocking
        const [result] = await pool.query(
            `INSERT INTO time_slots 
       (arena_id, court_id, sport_id, date, start_time, end_time, 
        is_available, is_blocked_by_owner, is_holiday, price_per_hour)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, TRUE, ?, 0)`,
            [arenaId, court_id, sport_id, date, start_time, end_time, is_holiday]
        );

        res.json({
            success: true,
            message: `Time slot ${is_holiday ? 'marked as holiday' : 'blocked'} successfully`,
            slot_id: result.insertId,
            details: {
                date,
                start_time,
                end_time,
                court_id,
                sport_id,
                reason,
                is_holiday
            }
        });
    } catch (error) {
        console.error('Block slot error:', error);
        res.status(500).json({ error: 'Failed to block time slot' });
    }
});

// Get blocked/holiday slots
router.get('/blocked-slots', verifyToken, async (req, res) => {
    try {
        let ownerId;

        if (req.role === 'owner') {
            ownerId = req.owner.owner_id;
        } else if (req.role === 'manager') {
            const [managers] = await pool.query(
                'SELECT owner_id FROM arena_managers WHERE manager_id = ?',
                [req.manager.manager_id]
            );
            if (managers.length === 0) {
                return res.status(403).json({ error: 'Manager not associated with any owner' });
            }
            ownerId = managers[0].owner_id;
        } else {
            return res.status(403).json({ error: 'Access denied. Owner or Manager only.' });
        }

        const { date_from, date_to, type = 'all' } = req.query;

        let query = `
      SELECT 
        ts.*,
        cd.court_name,
        st.name as sport_name,
        a.name as arena_name
      FROM time_slots ts
      JOIN arenas a ON ts.arena_id = a.arena_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
      WHERE a.owner_id = ?
        AND (ts.is_blocked_by_owner = TRUE OR ts.is_holiday = TRUE)
    `;

        const params = [ownerId];

        if (type === 'blocked') {
            query += ' AND ts.is_blocked_by_owner = TRUE AND ts.is_holiday = FALSE';
        } else if (type === 'holiday') {
            query += ' AND ts.is_holiday = TRUE';
        }

        if (date_from) {
            query += ' AND ts.date >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND ts.date <= ?';
            params.push(date_to);
        }

        query += ' ORDER BY ts.date DESC, ts.start_time DESC';

        const [slots] = await pool.query(query, params);

        res.json({ success: true, slots });
    } catch (error) {
        console.error('Get blocked slots error:', error);
        res.status(500).json({ error: 'Failed to load blocked slots' });
    }
});

// Unblock time slot
router.delete('/blocked-slots/:slotId', verifyToken, async (req, res) => {
    try {
        let ownerId;

        if (req.role === 'owner') {
            ownerId = req.owner.owner_id;
        } else if (req.role === 'manager') {
            const [managers] = await pool.query(
                'SELECT owner_id FROM arena_managers WHERE manager_id = ?',
                [req.manager.manager_id]
            );
            if (managers.length === 0) {
                return res.status(403).json({ error: 'Manager not associated with any owner' });
            }
            ownerId = managers[0].owner_id;
        } else {
            return res.status(403).json({ error: 'Access denied. Owner or Manager only.' });
        }

        const { slotId } = req.params;

        // Verify slot belongs to owner
        const [slots] = await pool.query(
            `SELECT ts.* 
       FROM time_slots ts
       JOIN arenas a ON ts.arena_id = a.arena_id
       WHERE ts.slot_id = ? AND a.owner_id = ?`,
            [slotId, ownerId]
        );

        if (slots.length === 0) {
            return res.status(404).json({ error: 'Slot not found or access denied' });
        }

        // Delete the blocked slot
        await pool.query(
            'DELETE FROM time_slots WHERE slot_id = ?',
            [slotId]
        );

        res.json({
            success: true,
            message: 'Time slot unblocked successfully'
        });
    } catch (error) {
        console.error('Unblock slot error:', error);
        res.status(500).json({ error: 'Failed to unblock time slot' });
    }
});

module.exports = router;