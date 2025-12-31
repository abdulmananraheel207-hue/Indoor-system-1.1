// File: bookingController.js - COMPLETE FIXED VERSION
const pool = require("../db");
const { sendNotification } = require("../utils/notificationService");

const bookingController = {
  // Create a new booking - FIXED VERSION
  createBooking: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const body = req.body || {};
      const arena_id = body.arena_id || body.arenaId || body.arena || null;
      const slot_id = body.slot_id || body.slotId || null;
      const slotIdsRaw = body.slot_ids || body.slotIds || [];
      const sport_id = body.sport_id || body.sportId || body.sport || null;
      const court_id = body.court_id || body.courtId || null;
      const date = body.date || body.bookingDate || null;
      const start_time = body.start_time || body.startTime || null;
      const end_time = body.end_time || body.endTime || null;
      const total_amount =
        body.total_amount || body.totalAmount || body.totalPrice || null;
      const payment_method = body.payment_method || body.paymentMethod || null;

      const arenaIdNum = arena_id ? Number(arena_id) : null;
      const slotIdNum = slot_id ? Number(slot_id) : null;
      const sportIdNum = sport_id ? Number(sport_id) : null;
      const courtIdNum = court_id ? Number(court_id) : null;
      const totalAmountNum = total_amount ? Number(total_amount) : null;
      const slotIds = Array.isArray(slotIdsRaw)
        ? [...new Set(slotIdsRaw.map(Number).filter((id) => Number(id) > 0))]
        : [];

      // Validate required fields
      if (!arenaIdNum) {
        return res.status(400).json({ message: "Arena ID is required" });
      }

      if (
        slotIds.length === 0 &&
        !slotIdNum &&
        (!date || !start_time || !end_time)
      ) {
        return res.status(400).json({
          message:
            "Either slot_id, slot_ids[], or date+start_time+end_time is required",
        });
      }

      await connection.beginTransaction();

      // Check arena status
      const [arenaStatus] = await connection.execute(
        "SELECT owner_id, is_blocked FROM arenas WHERE arena_id = ?",
        [arenaIdNum]
      );

      if (!arenaStatus || arenaStatus.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Arena not found" });
      }

      if (arenaStatus[0].is_blocked) {
        await connection.rollback();
        return res.status(403).json({ message: "Arena is blocked" });
      }
      // === ADD THIS VALIDATION BLOCK HERE ===
      // Function to check if a slot is in the past
      const isSlotInPast = (slotDate, slotTime) => {
        const slotDateTimeStr = `${slotDate}T${slotTime}:00`;
        const slotStart = new Date(slotDateTimeStr);
        const now = new Date();
        return slotStart.getTime() < now.getTime();
      };

      const commission_percentage = 5.0;
      let bookingIds = [];
      let totalCommission = 0;
      let createdBookings = [];

      if (slotIds.length > 0) {
        // Multiple slots booking
        const placeholders = slotIds.map(() => "?").join(",");

        // Check all slots are available and belong to the same arena
        const [slots] = await connection.execute(
          `SELECT ts.*, 
                  b.booking_id as existing_booking,
                  b.status as existing_status
           FROM time_slots ts
           LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
             AND b.status IN ('pending', 'accepted', 'completed')
           WHERE ts.slot_id IN (${placeholders})
             AND ts.arena_id = ?`,
          [...slotIds, arenaIdNum]
        );

        if (slots.length !== slotIds.length) {
          await connection.rollback();
          return res.status(400).json({
            message: "One or more selected slots were not found for this arena",
          });
        }

        // Check availability
        const unavailableSlots = slots.filter(
          (s) => s.is_blocked_by_owner || s.is_holiday || s.existing_booking
        );

        if (unavailableSlots.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            message: "One or more selected slots are not available",
            slots: unavailableSlots.map((s) => ({
              slot_id: s.slot_id,
              date: s.date,
              start_time: s.start_time,
              end_time: s.end_time,
              reason: s.existing_booking
                ? "Already booked"
                : s.is_blocked_by_owner
                ? "Blocked by owner"
                : "Holiday",
            })),
          });
        }
        // === ADD THIS CHECK HERE ===
        // Check for past time slots
        const pastSlots = slots.filter((s) =>
          isSlotInPast(s.date, s.start_time)
        );
        if (pastSlots.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            message: "Cannot book past time slots",
            slots: pastSlots.map((s) => ({
              slot_id: s.slot_id,
              date: s.date,
              start_time: s.start_time,
              reason: "Time has already passed",
            })),
          });
        }
        // Check for expired locks
        const lockedSlots = slots.filter(
          (s) =>
            s.locked_until &&
            s.locked_until > new Date() &&
            s.locked_by_user_id !== req.user.id
        );

        if (lockedSlots.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            message: "One or more slots are currently locked by another user",
            slots: lockedSlots.map((s) => ({
              slot_id: s.slot_id,
              date: s.date,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          });
        }

        // Create bookings for each slot
        for (const slot of slots) {
          const priceForSlot = slot.price || totalAmountNum || 500;
          const commission_amount =
            priceForSlot * (commission_percentage / 100);

          const [bookingResult] = await connection.execute(
            `INSERT INTO bookings 
             (user_id, arena_id, slot_id, sport_id, total_amount, 
              commission_percentage, commission_amount, payment_method, status, booking_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
              req.user.id,
              arenaIdNum,
              slot.slot_id,
              sportIdNum || slot.sport_id,
              priceForSlot,
              commission_percentage,
              commission_amount,
              payment_method || "pay_after",
            ]
          );

          const bookingId = bookingResult.insertId;
          bookingIds.push(bookingId);
          totalCommission += commission_amount;
          createdBookings.push({
            booking_id: bookingId,
            slot_id: slot.slot_id,
            date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            price: priceForSlot,
          });

          // Mark slot as unavailable and clear any locks
          await connection.execute(
            `UPDATE time_slots 
             SET is_available = FALSE,
                 locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE slot_id = ?`,
            [slot.slot_id]
          );
        }
      } else if (slotIdNum) {
        // Single slot booking
        const [slots] = await connection.execute(
          `SELECT ts.*, 
                  b.booking_id as existing_booking,
                  b.status as existing_status
           FROM time_slots ts
           LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
             AND b.status IN ('pending', 'accepted', 'completed')
           WHERE ts.slot_id = ? 
             AND ts.arena_id = ?`,
          [slotIdNum, arenaIdNum]
        );

        if (slots.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: "Time slot not available" });
        }

        const slot = slots[0];

        if (
          slot.is_blocked_by_owner ||
          slot.is_holiday ||
          slot.existing_booking
        ) {
          await connection.rollback();
          return res.status(400).json({
            message: "Time slot is not available",
            slot_date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            reason: slot.existing_booking
              ? "Already booked"
              : slot.is_blocked_by_owner
              ? "Blocked by owner"
              : "Holiday",
          });
        }

        // === ADD THIS CHECK FOR PAST SLOT ===
        // Check for past time slot
        if (isSlotInPast(slot.date, slot.start_time)) {
          await connection.rollback();
          return res.status(400).json({
            message: "Cannot book past time slots",
            slot_date: slot.date,
            start_time: slot.start_time,
            reason: "Time has already passed",
          });
        }
        // === END CHECK ===

        // Check if locked by another user
        if (
          slot.locked_until &&
          slot.locked_until > new Date() &&
          slot.locked_by_user_id !== req.user.id
        ) {
          await connection.rollback();
          return res.status(400).json({
            message: "Time slot is currently locked by another user",
            locked_until: slot.locked_until,
          });
        }

        const priceForSlot = slot.price || totalAmountNum || 500;
        const commission_amount = priceForSlot * (commission_percentage / 100);

        const [bookingResult] = await connection.execute(
          `INSERT INTO bookings 
           (user_id, arena_id, slot_id, sport_id, total_amount, 
            commission_percentage, commission_amount, payment_method, status, booking_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            req.user.id,
            arenaIdNum,
            slot.slot_id,
            sportIdNum || slot.sport_id,
            priceForSlot,
            commission_percentage,
            commission_amount,
            payment_method || "pay_after",
          ]
        );

        const bookingId = bookingResult.insertId;
        bookingIds.push(bookingId);
        totalCommission = commission_amount;
        createdBookings.push({
          booking_id: bookingId,
          slot_id: slot.slot_id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          price: priceForSlot,
        });

        // Mark slot as unavailable and clear locks
        await connection.execute(
          `UPDATE time_slots 
           SET is_available = FALSE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
          [slot.slot_id]
        );
      }

      // Update arena commission
      if (totalCommission > 0) {
        await connection.execute(
          `UPDATE arenas 
           SET total_commission_due = total_commission_due + ?
           WHERE arena_id = ?`,
          [totalCommission, arenaIdNum]
        );
      }

      await connection.commit();

      // Fetch created bookings with details
      if (bookingIds.length > 0) {
        const placeholders = bookingIds.map(() => "?").join(",");
        const [bookings] = await pool.execute(
          `SELECT b.*, a.name as arena_name, st.name as sport_name,
                  ts.date, ts.start_time, ts.end_time, ao.arena_name as owner_name,
                  ao.owner_id, ao.email as owner_email
           FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           JOIN arena_owners ao ON a.owner_id = ao.owner_id
           JOIN sports_types st ON b.sport_id = st.sport_id
           JOIN time_slots ts ON b.slot_id = ts.slot_id
           WHERE b.booking_id IN (${placeholders})`,
          bookingIds
        );

        // Send notifications to owner
        for (const booking of bookings) {
          try {
            await sendNotification({
              ownerId: booking.owner_id,
              userId: req.user.id,
              bookingId: booking.booking_id,
              type: "booking.pending",
              title: "New booking request",
              message: `New booking request for ${booking.date} ${booking.start_time}-${booking.end_time}`,
            });
          } catch (notifError) {
            console.warn("Notification error:", notifError.message);
          }
        }

        return res.status(201).json({
          message:
            "Booking request created successfully. Waiting for owner approval.",
          bookings,
        });
      }

      res.status(400).json({ message: "No bookings were created" });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      connection.release();
    }
  },

  // Get user bookings - FIXED
  getUserBookings: async (req, res) => {
    try {
      const { status, limit = 10, page = 1 } = req.query;

      const limitInt = parseInt(limit);
      const pageInt = parseInt(page);
      const offset = (pageInt - 1) * limitInt;

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
        if (status.includes(",")) {
          const statusArray = status
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (statusArray.length > 0) {
            query += ` AND b.status IN (${statusArray
              .map(() => "?")
              .join(",")})`;
            params.push(...statusArray);
          }
        } else {
          query += " AND b.status = ?";
          params.push(status.trim());
        }
      }

      query += ` ORDER BY ts.date DESC, ts.start_time DESC LIMIT ${limitInt} OFFSET ${offset}`;

      const [bookings] = await pool.execute(query, params);

      // Get total count
      let countQuery =
        "SELECT COUNT(*) as total FROM bookings WHERE user_id = ?";
      const countParams = [req.user.id];

      if (status) {
        if (status.includes(",")) {
          const statusArray = status.split(",");
          countQuery += ` AND status IN (${statusArray
            .map(() => "?")
            .join(",")})`;
          countParams.push(...statusArray);
        } else {
          countQuery += " AND status = ?";
          countParams.push(status);
        }
      }

      const [countResult] = await pool.execute(countQuery, countParams);

      res.json({
        bookings,
        total: countResult[0].total,
        page: pageInt,
        limit: limitInt,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
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
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if user has access to this booking
      if (req.user.role === "user" && bookings[0].user_id !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (req.user.role === "owner" || req.user.role === "manager") {
        // For owners/managers, check if they own this arena
        const [arenaCheck] = await pool.execute(
          "SELECT owner_id FROM arenas WHERE arena_id = ?",
          [bookings[0].arena_id]
        );

        if (
          arenaCheck.length === 0 ||
          (req.user.role === "owner" &&
            arenaCheck[0].owner_id !== req.user.id) ||
          (req.user.role === "manager" &&
            arenaCheck[0].owner_id !== req.user.owner_id)
        ) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(bookings[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Cancel booking - SIMPLIFIED (no reason required)
  cancelBooking: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { booking_id } = req.params;

      await connection.beginTransaction();

      // Get booking details
      const [bookings] = await connection.execute(
        `SELECT b.*, ts.slot_id, ts.date, ts.start_time, a.owner_id
         FROM bookings b
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE b.booking_id = ?`,
        [booking_id]
      );

      if (bookings.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Booking not found" });
      }

      const booking = bookings[0];

      // Check permissions
      let canCancel = false;
      if (req.user.role === "user" && booking.user_id === req.user.id) {
        canCancel = true;
      } else if (
        req.user.role === "owner" &&
        booking.owner_id === req.user.id
      ) {
        canCancel = true;
      }

      if (!canCancel) {
        await connection.rollback();
        return res
          .status(403)
          .json({ message: "Not authorized to cancel this booking" });
      }

      // Check if booking can be cancelled
      const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
      const hoursUntilBooking = (slotDateTime - new Date()) / (1000 * 60 * 60);

      if (hoursUntilBooking < 24 && req.user.role === "user") {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot cancel within 24 hours of booking time",
        });
      }

      // Calculate cancellation fee
      let cancellation_fee = 0;
      let cancelled_by = req.user.role === "user" ? "user" : "owner";

      if (hoursUntilBooking < 24 && req.user.role === "user") {
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

      // Update lost revenue if cancelled by user with fee
      if (cancelled_by === "user" && cancellation_fee > 0) {
        await connection.execute(
          `UPDATE arena_owners 
           SET lost_revenue = lost_revenue + ?
           WHERE owner_id = ?`,
          [cancellation_fee, booking.owner_id]
        );
      }

      await connection.commit();

      res.json({
        message: "Booking cancelled successfully",
        cancellation_fee,
        refund_amount: booking.total_amount - cancellation_fee,
      });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      connection.release();
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
        return res.status(404).json({ message: "Booking not found" });
      }

      const booking = bookings[0];

      if (booking.status !== "pending" && booking.status !== "accepted") {
        return res
          .status(400)
          .json({ message: "Booking is not in pending or accepted status" });
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

      res.json({ message: "Payment details uploaded successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Complete booking - FIXED
  completeBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;

      // Only owners/managers can mark booking as completed
      const [bookingCheck] = await pool.execute(
        `SELECT b.* FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE b.booking_id = ? AND a.owner_id = ?`,
        [
          booking_id,
          req.user.role === "owner" ? req.user.id : req.user.owner_id,
        ]
      );

      if (bookingCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Booking not found or access denied" });
      }

      if (bookingCheck[0].status !== "accepted") {
        return res
          .status(400)
          .json({ message: "Booking must be accepted before completing" });
      }

      await pool.execute(
        'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
        [booking_id]
      );

      // Update arena owner revenue
      await pool.execute(
        `UPDATE arena_owners 
         SET total_revenue = total_revenue + ?
         WHERE owner_id = (SELECT owner_id FROM arenas WHERE arena_id = ?)`,
        [bookingCheck[0].total_amount, bookingCheck[0].arena_id]
      );

      res.json({ message: "Booking marked as completed" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
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
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get available time slots for booking
  getAvailableSlots: async (req, res) => {
    try {
      const { arena_id, date, sport_id } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      let query = `
        SELECT ts.*, st.name as sport_name,
               CASE 
                 WHEN b.booking_id IS NOT NULL THEN FALSE
                 WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
                 WHEN ts.is_holiday = TRUE THEN FALSE
                 WHEN ts.locked_until > NOW() AND ts.locked_by_user_id IS NOT NULL THEN FALSE
                 ELSE ts.is_available 
               END as actually_available
        FROM time_slots ts
        LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
        LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
          AND b.status IN ('pending', 'accepted', 'completed')
        WHERE ts.arena_id = ? 
          AND ts.date = ?
          AND (b.booking_id IS NULL OR b.status NOT IN ('pending', 'accepted', 'completed'))
      `;

      const params = [arena_id, date];

      if (sport_id) {
        query += " AND ts.sport_id = ?";
        params.push(sport_id);
      }

      query += " ORDER BY ts.start_time";

      const [slots] = await pool.execute(query, params);

      // Clean up expired locks
      const slotIds = slots.map((s) => s.slot_id);
      if (slotIds.length > 0) {
        const placeholders = slotIds.map(() => "?").join(",");
        await pool.execute(
          `UPDATE time_slots 
           SET locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id IN (${placeholders}) 
             AND locked_until IS NOT NULL 
             AND locked_until <= NOW()`,
          slotIds
        );
      }

      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = bookingController;
