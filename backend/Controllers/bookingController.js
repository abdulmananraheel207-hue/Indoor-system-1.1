const pool = require("../db");
const { lockSlot } = require("../utils/slotLockService");
const { sendNotification } = require("../utils/notificationService");

const bookingController = {
  // Create a new booking
  // Create a new booking - MODIFIED VERSION
  createBooking: async (req, res) => {
    try {
      console.log(
        "createBooking called by user:",
        req.user?.id,
        "raw body:",
        req.body
      );

      // Normalize incoming fields (accept camelCase or snake_case)
      const body = req.body || {};
      const arena_id = body.arena_id || body.arenaId || body.arena || null;
      const slot_id = body.slot_id || body.slotId || null;
      const slot_ids_input = body.slot_ids || body.slotIds || [];
      const slot_ids = Array.isArray(slot_ids_input)
        ? slot_ids_input.map(Number).filter(Boolean)
        : [];
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

      // Basic validation: ensure either slot_id or new format (court_id + date + start_time + end_time) is present
      const hasLegacy = slot_id !== null && sport_id !== null;
      const hasNew = court_id !== null && date && start_time && end_time;
      const hasMultipleSlots = slot_ids.length > 0;
      // Support multiple existing slot bookings: `slot_ids` or `slotIds` array
      const slotIdsArray = Array.isArray(body.slot_ids)
        ? body.slot_ids
        : Array.isArray(body.slotIds)
        ? body.slotIds
        : null;
      if (!hasLegacy && !hasNew && !hasMultipleSlots) {
        console.warn("createBooking missing required fields", {
          arena_id,
          slot_id,
          sport_id,
          court_id,
          date,
          start_time,
          end_time,
          slot_ids,
        });
        return res.status(400).json({
          message:
            "Missing booking parameters. Provide slot_id+sport_id, slot_ids[], or court_id+date+start_time+end_time.",
        });
      }

      // Coerce numeric ids
      const arenaIdNum = arena_id ? Number(arena_id) : null;
      const slotIdNum = slot_id ? Number(slot_id) : null;
      const sportIdNum = sport_id ? Number(sport_id) : null;
      const courtIdNum = court_id ? Number(court_id) : null;
      const totalAmountNum = total_amount ? Number(total_amount) : null;

      const normalized = {
        arena_id: arenaIdNum,
        slot_id: slotIdNum,
        sport_id: sportIdNum,
        court_id: courtIdNum,
        date,
        start_time,
        end_time,
        total_amount: totalAmountNum,
        payment_method,
        requires_advance: !!requires_advance,
      };

      console.log("createBooking normalized payload:", normalized);

      let slot;
      let sportIdToUse = sport_id;
      let slotIdToUse = slot_id;

      // If multiple slot IDs provided, we'll process them later as array
      const creatingMultiple = slotIdsArray && slotIdsArray.length > 0;

      // Validate payment_method
      const validPaymentMethods = ["pay_now", "pay_after", "advance_payment"];
      const finalPaymentMethod = validPaymentMethods.includes(payment_method)
        ? payment_method
        : "pay_after";

      // Prevent booking on blocked arenas
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
      // --- Multi-slot booking flow (user selected multiple owner-created slots) ---
      if (hasMultipleSlots) {
        if (!arenaIdNum) {
          return res
            .status(400)
            .json({ message: "Arena is required for booking." });
        }

        const slotPlaceholders = slot_ids.map(() => "?").join(",");
        const [slots] = await pool.execute(
          `SELECT ts.*, a.base_price_per_hour, a.owner_id
           FROM time_slots ts
           JOIN arenas a ON ts.arena_id = a.arena_id
           WHERE ts.slot_id IN (${slotPlaceholders})
             AND ts.arena_id = ?
             AND ts.is_blocked_by_owner = FALSE
             AND ts.is_holiday = FALSE`,
          [...slot_ids, arenaIdNum]
        );

        if (slots.length !== slot_ids.length) {
          return res.status(400).json({
            message:
              "One or more selected slots were not found for this arena.",
          });
        }

        const unavailableSlot = slots.find((s) => !s.is_available);
        if (unavailableSlot) {
          return res.status(400).json({
            message: `Slot ${unavailableSlot.slot_id} is no longer available.`,
          });
        }

        // Align sport selection across all slots
        const slotSports = new Set(
          slots.map((s) => s.sport_id).filter(Boolean)
        );
        const sportIdForBooking =
          sportIdNum || (slotSports.size === 1 ? [...slotSports][0] : null);

        if (!sportIdForBooking) {
          return res
            .status(400)
            .json({ message: "Please choose a sport for these slots." });
        }

        // Start transaction for atomic multi-slot booking
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          const createdBookingIds = [];

          for (const slot of slots) {
            const priceForSlot =
              totalAmountNum || slot.price || slot.base_price_per_hour;
            const commission_percentage = 5.0;
            const commission_amount =
              priceForSlot * (commission_percentage / 100);

            const [bookingResult] = await connection.execute(
              `INSERT INTO bookings 
               (user_id, arena_id, slot_id, sport_id, total_amount, 
                commission_percentage, commission_amount, payment_method, requires_advance, status, owner_id, court_id, lock_expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
              [
                req.user.id,
                arenaIdNum,
                slot.slot_id,
                slot.sport_id || sportIdForBooking,
                priceForSlot,
                commission_percentage,
                commission_amount,
                finalPaymentMethod,
                requires_advance || false,
                slot.owner_id,
                slot.court_id || null,
              ]
            );

            createdBookingIds.push(bookingResult.insertId);

            await connection.execute(
              `UPDATE time_slots 
               SET is_available = FALSE,
                  locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
                   locked_by_user_id = ?
               WHERE slot_id = ?`,
              [req.user.id, slot.slot_id]
            );

            await connection.execute(
              `UPDATE arenas 
               SET total_commission_due = total_commission_due + ?
               WHERE arena_id = ?`,
              [commission_amount, arenaIdNum]
            );
          }

          await connection.commit();

          const detailPlaceholders = createdBookingIds.map(() => "?").join(",");
          const [createdBookings] = await pool.execute(
            `SELECT b.*, a.name as arena_name, st.name as sport_name,
                    ts.date, ts.start_time, ts.end_time, ao.arena_name as owner_name,
                    ao.owner_id, ao.email as owner_email
             FROM bookings b
             JOIN arenas a ON b.arena_id = a.arena_id
             JOIN arena_owners ao ON a.owner_id = ao.owner_id
             JOIN sports_types st ON b.sport_id = st.sport_id
             JOIN time_slots ts ON b.slot_id = ts.slot_id
             WHERE b.booking_id IN (${detailPlaceholders})`,
            createdBookingIds
          );

          return res.status(201).json({
            message:
              "Booking requests created successfully. Waiting for owner approval.",
            bookings: createdBookings,
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }
      // If using new format (court_id + time), find or create slot
      if (court_id && date && start_time && end_time) {
        // Get sport_id from court - FIX: Get first sport or use provided sport_id
        const [courtSports] = await pool.execute(
          `SELECT cs.sport_id FROM court_sports cs 
         WHERE cs.court_id = ? LIMIT 1`,
          [court_id]
        );

        if (courtSports.length === 0 && !sport_id) {
          return res.status(400).json({
            message: "Court has no sports assigned. Please select a sport.",
          });
        }

        // Use provided sport_id or get from court
        sportIdToUse = sport_id || courtSports[0]?.sport_id;

        // Find existing time slot or create one
        const [existingSlots] = await pool.execute(
          `SELECT ts.*, a.base_price_per_hour, a.owner_id
         FROM time_slots ts
         JOIN arenas a ON ts.arena_id = a.arena_id
         WHERE ts.arena_id = ?
           AND ts.date = ?
           AND ts.start_time = ?
           AND ts.end_time = ?
           AND ts.sport_id = ?
           AND ts.is_blocked_by_owner = FALSE
           AND ts.is_holiday = FALSE
           AND (ts.locked_until IS NULL OR ts.locked_until < NOW() OR ts.locked_by_user_id = ?)`,
          [arena_id, date, start_time, end_time, sportIdToUse, req.user.id]
        );

        if (existingSlots.length > 0) {
          // Use existing slot
          slot = existingSlots[0];
          slotIdToUse = slot.slot_id;

          // Check if available
          if (!slot.is_available) {
            return res.status(400).json({ message: "Time slot not available" });
          }
        } else {
          // Create new time slot
          const [arenaInfo] = await pool.execute(
            `SELECT base_price_per_hour, owner_id FROM arenas WHERE arena_id = ?`,
            [arena_id]
          );

          if (arenaInfo.length === 0) {
            return res.status(400).json({ message: "Arena not found" });
          }

          const slotPrice = total_amount || arenaInfo[0].base_price_per_hour;

          // Create new slot - MARK IT AS UNAVAILABLE from the start
          const [slotResult] = await pool.execute(
            `INSERT INTO time_slots 
           (arena_id, sport_id, date, start_time, end_time, price, is_available, created_at)
           VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
            [arena_id, sportIdToUse, date, start_time, end_time, slotPrice]
          );

          slotIdToUse = slotResult.insertId;

          // Get the newly created slot
          const [newSlots] = await pool.execute(
            `SELECT ts.*, a.base_price_per_hour, a.owner_id
           FROM time_slots ts
           JOIN arenas a ON ts.arena_id = a.arena_id
           WHERE ts.slot_id = ?`,
            [slotIdToUse]
          );

          slot = newSlots[0];
        }
      } else {
        // Use old format (slot_id, sport_id)
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
          return res.status(400).json({ message: "Time slot not available" });
        }

        slot = slots[0];
        slotIdToUse = slot_id;
        sportIdToUse = sport_id;
      }

      // Calculate amounts helper (per-slot)
      const commission_percentage = 5.0; // 5% commission

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const createdBookingIds = [];
        let totalCommissionToAdd = 0;

        if (creatingMultiple) {
          // Process each provided slot id
          for (let rawSlotId of slotIdsArray) {
            const sid = Number(rawSlotId);
            if (isNaN(sid)) {
              throw new Error("Invalid slot id in slotIds array");
            }

            // Fetch slot to ensure availability
            const [slotsCheck] = await connection.execute(
              `SELECT ts.*, a.base_price_per_hour, a.owner_id
               FROM time_slots ts
               JOIN arenas a ON ts.arena_id = a.arena_id
               WHERE ts.slot_id = ?
                 AND ts.is_blocked_by_owner = FALSE
                 AND ts.is_holiday = FALSE
                 AND (ts.locked_until IS NULL OR ts.locked_until < NOW() OR ts.locked_by_user_id = ?)`,
              [sid, req.user.id]
            );

            if (slotsCheck.length === 0) {
              throw new Error(`Time slot ${sid} not available`);
            }

            const thisSlot = slotsCheck[0];
            const finalTotalAmount =
              total_amount || thisSlot.price || thisSlot.base_price_per_hour;
            const commission_amount =
              finalTotalAmount * (commission_percentage / 100);

            const [bookingResult] = await connection.execute(
              `INSERT INTO bookings 
               (user_id, arena_id, slot_id, sport_id, total_amount, 
                commission_percentage, commission_amount, payment_method, requires_advance, status, owner_id, court_id, lock_expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
              [
                req.user.id,
                thisSlot.arena_id,
                sid,
                thisSlot.sport_id,
                finalTotalAmount,
                commission_percentage,
                commission_amount,
                finalPaymentMethod,
                requires_advance || false,
                thisSlot.owner_id,
                thisSlot.court_id || null,
              ]
            );

            createdBookingIds.push(bookingResult.insertId);

            // Mark slot unavailable
            await connection.execute(
              `UPDATE time_slots 
               SET is_available = FALSE,
   locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
                   locked_by_user_id = ?
               WHERE slot_id = ?`,
              [req.user.id, sid]
            );

            totalCommissionToAdd += commission_amount;
          }

          // Update arena commission due (use arena_id param)
          await connection.execute(
            `UPDATE arenas 
             SET total_commission_due = total_commission_due + ?
             WHERE arena_id = ?`,
            [totalCommissionToAdd, arena_id]
          );
        } else {
          // Single-slot flow (existing behavior)
          const finalTotalAmount =
            total_amount || slot.price || slot.base_price_per_hour;
          const commission_amount =
            finalTotalAmount * (commission_percentage / 100);

          const [bookingResult] = await connection.execute(
            `INSERT INTO bookings 
             (user_id, arena_id, slot_id, sport_id, total_amount, 
               commission_percentage, commission_amount, payment_method, requires_advance, status, owner_id, court_id, lock_expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [
              req.user.id,
              arena_id,
              slotIdToUse,
              sportIdToUse,
              finalTotalAmount,
              commission_percentage,
              commission_amount,
              finalPaymentMethod,
              requires_advance || false,
              slot.owner_id || arenaStatus[0].owner_id,
              slot.court_id || court_id || null,
            ]
          );

          const booking_id = bookingResult.insertId;
          createdBookingIds.push(booking_id);

          slot.owner_id || arenaStatus[0].owner_id,
            slot.court_id || court_id || null,
            await connection.execute(
              `UPDATE arenas 
             SET total_commission_due = total_commission_due + ?
             WHERE arena_id = ?`,
              [commission_amount, arena_id]
            );
        }

        await connection.commit();

        // Fetch created booking details
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
        // Seed chat threads and notify owners
        await Promise.all(
          bookings.map((booking) =>
            pool.execute(
              `INSERT INTO chats (booking_id, sender_id, sender_type, message, contains_contact_info)
               VALUES (?, ?, 'system', ?, FALSE)`,
              [
                booking.booking_id,
                req.user.id,
                "Booking chat opened. Please keep communication within the app.",
              ]
            )
          )
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

        res.status(201).json({
          message:
            "Booking request created successfully. Waiting for owner approval.",
          bookings,
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
