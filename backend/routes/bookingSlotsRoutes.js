const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { lockSlot, releaseSlot } = require('../utils/slotLockService');

// Lock a time slot
router.post('/slots/:slotId/lock', verifyToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { slotId } = req.params;
        const userId = req.user.id;

        await connection.beginTransaction();

        // Check if slot exists and is available
        const [slots] = await connection.execute(
            `SELECT ts.*, 
              b.booking_id as existing_booking,
              b.status as existing_status
       FROM time_slots ts
       LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
         AND b.status IN ('pending', 'accepted', 'completed')
       WHERE ts.slot_id = ?`,
            [slotId]
        );

        if (slots.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Time slot not found' });
        }

        const slot = slots[0];

        // Check if slot is already booked
        if (slot.existing_booking) {
            await connection.rollback();
            return res.status(400).json({ message: 'Slot is already booked' });
        }

        // Check if slot is blocked by owner or holiday
        if (slot.is_blocked_by_owner || slot.is_holiday) {
            await connection.rollback();
            return res.status(400).json({ message: 'Slot is not available' });
        }

        // Check if slot is already locked by another user
        if (slot.locked_until &&
            slot.locked_until > new Date() &&
            slot.locked_by_user_id !== userId) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Slot is currently locked by another user',
                locked_until: slot.locked_until
            });
        }

        // Check if slot time is in the past
        const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
        if (slotDateTime < new Date()) {
            await connection.rollback();
            return res.status(400).json({ message: 'Cannot lock past time slots' });
        }

        // Use the lockSlot utility function
        await lockSlot(slotId, userId, 10, connection);

        await connection.commit();

        res.json({
            message: 'Slot locked successfully',
            slot_id: slotId,
            locked_until: new Date(Date.now() + 10 * 60 * 1000)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error locking slot:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
});

// Release a locked time slot
router.post('/slots/:slotId/release', verifyToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { slotId } = req.params;
        const userId = req.user.id;

        await connection.beginTransaction();

        // Check if slot exists and is locked by this user
        const [slots] = await connection.execute(
            `SELECT * FROM time_slots 
       WHERE slot_id = ? 
         AND locked_by_user_id = ?
         AND locked_until > NOW()`,
            [slotId, userId]
        );

        if (slots.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Slot not found or not locked by you' });
        }

        // Use the releaseSlot utility function
        await releaseSlot(slotId, connection);

        await connection.commit();

        res.json({
            message: 'Slot released successfully',
            slot_id: slotId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error releasing slot:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
});

// Get available slots for a court
router.get('/courts/:courtId/slots', verifyToken, async (req, res) => {
    try {
        const { courtId } = req.params;
        const { date, sport_id } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        let query = `
      SELECT ts.*, 
             CASE 
               WHEN b.booking_id IS NOT NULL THEN FALSE
               WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
               WHEN ts.is_holiday = TRUE THEN FALSE
               WHEN ts.locked_until > NOW() AND ts.locked_by_user_id IS NOT NULL THEN FALSE
               ELSE ts.is_available 
             END as actually_available
      FROM time_slots ts
      LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
        AND b.status IN ('pending', 'accepted', 'completed')
      WHERE ts.court_id = ? 
        AND ts.date = ?
        AND (b.booking_id IS NULL OR b.status NOT IN ('pending', 'accepted', 'completed'))
    `;

        const params = [courtId, date];

        if (sport_id) {
            query += " AND ts.sport_id = ?";
            params.push(sport_id);
        }

        query += " ORDER BY ts.start_time";

        const [slots] = await pool.execute(query, params);

        res.json(slots);
    } catch (error) {
        console.error('Error fetching slots:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Check slot availability
router.get('/slots/:slotId/availability', verifyToken, async (req, res) => {
    try {
        const { slotId } = req.params;

        const [slots] = await pool.execute(
            `SELECT ts.*, 
              b.booking_id as existing_booking,
              b.status as existing_status
       FROM time_slots ts
       LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
         AND b.status IN ('pending', 'accepted', 'completed')
       WHERE ts.slot_id = ?`,
            [slotId]
        );

        if (slots.length === 0) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        const slot = slots[0];

        const isAvailable = !slot.existing_booking &&
            !slot.is_blocked_by_owner &&
            !slot.is_holiday &&
            (!slot.locked_until || slot.locked_until <= new Date());

        res.json({
            slot_id: slot.slot_id,
            is_available: isAvailable,
            is_locked: slot.locked_until && slot.locked_until > new Date(),
            locked_by: slot.locked_by_user_id,
            locked_until: slot.locked_until
        });

    } catch (error) {
        console.error('Error checking slot availability:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;