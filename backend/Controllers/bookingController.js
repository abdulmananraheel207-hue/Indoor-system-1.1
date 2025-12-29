const pool = require("../db");
const { lockSlot } = require("../utils/slotLockService");
const { sendNotification } = require("../utils/notificationService");

const bookingController = {
  // Create a new booking
  // Create a new booking - MODIFIED VERSION
  createBooking: async (req, res) => {
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
      const requires_advance =
        body.requires_advance || body.requiresAdvance || false;

      const arenaIdNum = arena_id ? Number(arena_id) : null;
      const slotIdNum = slot_id ? Number(slot_id) : null;
      const sportIdNum = sport_id ? Number(sport_id) : null;
      const courtIdNum = court_id ? Number(court_id) : null;
      const totalAmountNum = total_amount ? Number(total_amount) : null;
      const slotIds = Array.isArray(slotIdsRaw)
        ? [...new Set(slotIdsRaw.map(Number).filter((id) => Number(id) > 0))]
        : [];

      const hasMulti = slotIds.length > 0;
      const hasNew = courtIdNum && date && start_time && end_time;
      const hasLegacy = slotIdNum !== null;

      if (!hasMulti && !hasNew && !hasLegacy) {
        return res.status(400).json({
          message:
            "Missing booking parameters. Provide slot_id, slot_ids[], or court_id+date+start_time+end_time.",
        });
      }

      const validPaymentMethods = ["pay_now", "pay_after", "advance_payment"];
      const finalPaymentMethod = validPaymentMethods.includes(payment_method)
        ? payment_method
        : "pay_after";

      const [arenaStatus] = await pool.execute(
        "SELECT owner_id, is_blocked FROM arenas WHERE arena_id = ?",
        [arenaIdNum || arena_id]
      );

      if (!arenaStatus || arenaStatus.length === 0) {
        return res.status(404).json({ message: "Arena not found" });
      }

      if (arenaStatus[0].is_blocked) {
        return res.status(403).json({ message: "Arena is blocked" });
      }

      const commission_percentage = 5.0;

      if (hasMulti) {
        if (!arenaIdNum) {
          return res
            .status(400)
            .json({ message: "Arena is required for booking." });
        }

        const placeholders = slotIds.map(() => "?").join(",");
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          const [slots] = await connection.execute(
            `SELECT ts.*, a.base_price_per_hour, a.owner_id,
                    CASE 
                      WHEN ts.locked_until > NOW() AND ts.locked_by_user_id <> ? THEN 1 
                      ELSE 0 
                    END as locked_by_other
             FROM time_slots ts
             JOIN arenas a ON ts.arena_id = a.arena_id
             WHERE ts.slot_id IN (${placeholders})
               AND ts.arena_id = ?
               AND ts.is_blocked_by_owner = FALSE
               AND ts.is_holiday = FALSE`,
            [req.user.id, ...slotIds, arenaIdNum]
          );

          if (slots.length !== slotIds.length) {
            return res.status(400).json({
              message:
                "One or more selected slots were not found for this arena.",
            });
          }

          const unavailable = slots.filter(
            (s) => !s.is_available || s.locked_by_other
          );
          if (unavailable.length > 0) {
            return res.status(400).json({
              message: "One or more selected slots are not available.",
              slots: unavailable.map((s) => s.slot_id),
            });
          }

          const fallbackSportId = sportIdNum || null;
          const missingSport = slots.some(
            (s) => !s.sport_id && !fallbackSportId
          );
          if (missingSport) {
            return res.status(400).json({
              message: "Please choose a sport for the selected slots.",
            });
          }

          const createdBookingIds = [];
          let totalCommissionToAdd = 0;

          for (const slot of slots) {
            const priceForSlot = slot.price || slot.base_price_per_hour;
            const commission_amount =
              priceForSlot * (commission_percentage / 100);

            const [bookingResult] = await connection.execute(
              `INSERT INTO bookings 
               (user_id, arena_id, slot_id, sport_id, total_amount, 
                commission_percentage, commission_amount, payment_method, requires_advance, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
              [
                req.user.id,
                arenaIdNum,
                slot.slot_id,
                slot.sport_id || fallbackSportId,
                priceForSlot,
                commission_percentage,
                commission_amount,
                finalPaymentMethod,
                requires_advance || false,
              ]
            );

            createdBookingIds.push(bookingResult.insertId);
            totalCommissionToAdd += commission_amount;
          }

          await connection.execute(
            `UPDATE time_slots 
             SET is_available = FALSE,
                 locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE slot_id IN (${placeholders})`,
            slotIds
          );

          await connection.execute(
            `UPDATE arenas 
             SET total_commission_due = total_commission_due + ?
             WHERE arena_id = ?`,
            [totalCommissionToAdd, arenaIdNum]
          );

          await connection.commit();

          const [bookings] = await pool.execute(
            `SELECT b.*, a.name as arena_name, st.name as sport_name,
                    ts.date, ts.start_time, ts.end_time, ao.arena_name as owner_name,
                    ao.owner_id, ao.email as owner_email
             FROM bookings b
             JOIN arenas a ON b.arena_id = a.arena_id
             JOIN arena_owners ao ON a.owner_id = ao.owner_id
             JOIN sports_types st ON b.sport_id = st.sport_id
             JOIN time_slots ts ON b.slot_id = ts.slot_id
             WHERE b.booking_id IN (${createdBookingIds
               .map(() => "?")
               .join(",")})`,
            createdBookingIds
          );

          for (const booking of bookings) {
            await sendNotification({
              ownerId: booking.owner_id || booking.ownerId,
              userId: req.user.id,
              bookingId: booking.booking_id,
              type: "booking.pending",
              title: "New booking request",
              message: `New booking request for ${booking.date} ${booking.start_time}-${booking.end_time}`,
            });
          }

          return res.status(201).json({
            message:
              "Booking requests created successfully. Waiting for owner approval.",
            bookings,
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }

      let slot;
      let sportIdToUse = sportIdNum;

      if (hasNew) {
        const [existingSlots] = await pool.execute(
          `SELECT ts.*, a.base_price_per_hour, a.owner_id
           FROM time_slots ts
           JOIN arenas a ON ts.arena_id = a.arena_id
           WHERE ts.arena_id = ?
             AND ts.date = ?
             AND ts.start_time = ?
             AND ts.end_time = ?
             AND ts.is_available = TRUE
             AND ts.is_blocked_by_owner = FALSE
             AND ts.is_holiday = FALSE
             AND (ts.locked_until IS NULL OR ts.locked_until < NOW() OR ts.locked_by_user_id = ?)`,
          [arenaIdNum, date, start_time, end_time, req.user.id]
        );

        if (existingSlots.length === 0) {
          return res.status(400).json({
            message:
              "Time slot not found. Users may only book owner-created slots.",
          });
        }

        slot = existingSlots[0];
        if (!sportIdToUse) {
          sportIdToUse = slot.sport_id;
        }
      } else {
        let effectiveSportId = sportIdToUse;
        if (slotIdNum && !effectiveSportId) {
          const [slotInfo] = await pool.execute(
            `SELECT sport_id FROM time_slots WHERE slot_id = ? AND arena_id = ?`,
            [slotIdNum, arenaIdNum]
          );
          if (slotInfo.length > 0) {
            effectiveSportId = slotInfo[0].sport_id;
          }
        }

        const [slots] = await pool.execute(
          `SELECT ts.*, a.base_price_per_hour, a.owner_id
           FROM time_slots ts
           JOIN arenas a ON ts.arena_id = a.arena_id
           WHERE ts.slot_id = ? 
             AND ts.arena_id = ?
             AND ts.is_available = TRUE
             AND ts.is_blocked_by_owner = FALSE
             AND ts.is_holiday = FALSE
             AND (ts.locked_until IS NULL OR ts.locked_until < NOW() OR ts.locked_by_user_id = ?)`,
          [slotIdNum, arenaIdNum, req.user.id]
        );

        if (slots.length === 0) {
          return res.status(400).json({ message: "Time slot not available" });
        }

        slot = slots[0];
        sportIdToUse = effectiveSportId || slot.sport_id;
      }

      if (!sportIdToUse) {
        return res
          .status(400)
          .json({ message: "Sport is required for booking." });
      }

      const finalTotalAmount =
        totalAmountNum || slot.price || slot.base_price_per_hour;
      const commission_amount =
        finalTotalAmount * (commission_percentage / 100);

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const [bookingResult] = await connection.execute(
          `INSERT INTO bookings 
           (user_id, arena_id, slot_id, sport_id, total_amount, 
            commission_percentage, commission_amount, payment_method, requires_advance, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            req.user.id,
            arenaIdNum,
            slot.slot_id,
            sportIdToUse,
            finalTotalAmount,
            commission_percentage,
            commission_amount,
            finalPaymentMethod,
            requires_advance || false,
          ]
        );

        await connection.execute(
          `UPDATE time_slots 
           SET is_available = FALSE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
          [slot.slot_id]
        );

        await connection.execute(
          `UPDATE arenas 
           SET total_commission_due = total_commission_due + ?
           WHERE arena_id = ?`,
          [commission_amount, arenaIdNum]
        );

        await connection.commit();

        const [bookings] = await pool.execute(
          `SELECT b.*, a.name as arena_name, st.name as sport_name,
                  ts.date, ts.start_time, ts.end_time, ao.arena_name as owner_name,
                  ao.owner_id, ao.email as owner_email
           FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           JOIN arena_owners ao ON a.owner_id = ao.owner_id
           JOIN sports_types st ON b.sport_id = st.sport_id
           JOIN time_slots ts ON b.slot_id = ts.slot_id
           WHERE b.booking_id = ?`,
          [bookingResult.insertId]
        );

        const booking = bookings[0];
        await sendNotification({
          ownerId: booking.owner_id || booking.ownerId,
          userId: req.user.id,
          bookingId: booking.booking_id,
          type: "booking.pending",
          title: "New booking request",
          message: `New booking request for ${booking.date} ${booking.start_time}-${booking.end_time}`,
        });

        res.status(201).json({
          message:
            "Booking request created successfully. Waiting for owner approval.",
          bookings: [booking],
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
getUserBookings: async (req, res) => {
    try {
      const { status, limit = 10, page = 1 } = req.query;

      // FIX 1: Ensure pagination values are actual Integers
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

      // FIX 2: Handle status correctly
      if (status) {
        if (status.includes(",")) {
          // If multiple statuses (pending,accepted), use IN operator
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

      // FIX 3: Push pagination as Numbers
      // Inline LIMIT/OFFSET to avoid placeholder issues with some MySQL drivers
      query += ` ORDER BY b.booking_date DESC LIMIT ${limitInt} OFFSET ${offset}`;

      // This call at line 247 will now succeed
      const [bookings] = await pool.execute(query, params);

      // Get total count (apply same status logic)
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
        return res.status(404).json({ message: "Booking not found" });
      }

      const booking = bookings[0];

      // Check permissions
      let canCancel = false;
      if (req.user.role === "user" && booking.user_id === req.user.id) {
        canCancel = true;
      } else if (req.user.role === "owner" || req.user.role === "manager") {
        const [arenaCheck] = await pool.execute(
          "SELECT owner_id FROM arenas WHERE arena_id = ?",
          [booking.arena_id]
        );

        if (
          (arenaCheck.length > 0 &&
            req.user.role === "owner" &&
            arenaCheck[0].owner_id === req.user.id) ||
          (req.user.role === "manager" &&
            arenaCheck[0].owner_id === req.user.owner_id)
        ) {
          canCancel = true;
        }
      }

      if (!canCancel) {
        return res
          .status(403)
          .json({ message: "Not authorized to cancel this booking" });
      }

      // Check if booking can be cancelled (e.g., not too close to start time)
      const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
      const hoursUntilBooking = (slotDateTime - new Date()) / (1000 * 60 * 60);

      if (hoursUntilBooking < 24 && req.user.role === "user") {
        return res.status(400).json({
          message: "Cannot cancel within 24 hours of booking time",
        });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Calculate cancellation fee if applicable
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

        // Update arena lost revenue if cancelled by user with fee
        if (cancelled_by === "user" && cancellation_fee > 0) {
          await connection.execute(
            `UPDATE arena_owners 
             SET lost_revenue = lost_revenue + ?
             WHERE owner_id = (SELECT owner_id FROM arenas WHERE arena_id = ?)`,
            [cancellation_fee, booking.arena_id]
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
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
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

      if (booking.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Booking is not in pending status" });
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

  // In bookingController.js, fix the completeBooking function:
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

      // FIX: Change 'approved' to 'accepted' to match database enum
      if (bookingCheck[0].status !== "accepted") {
        return res
          .status(400)
          .json({ message: "Booking must be accepted before completing" });
      }

      await pool.execute(
        'UPDATE bookings SET status = "completed" WHERE booking_id = ?',
        [booking_id]
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
        query += " AND ts.date = ?";
        params.push(date);
      } else {
        query += " AND ts.date >= CURDATE()";
      }

      if (sport_id) {
        query += " AND ts.sport_id = ?";
        params.push(sport_id);
      }

      query += " ORDER BY ts.date, ts.start_time";

      const [slots] = await pool.execute(query, params);
      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = bookingController;

