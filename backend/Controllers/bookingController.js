const pool = require("../db");
const { sendNotification } = require("../utils/notificationService");
const bookingStatus = require('../constants/bookingStatus');

// ===== HELPER FUNCTIONS - DEFINED AT THE TOP =====

// Helper function to check if slots are consecutive
function areSlotsConsecutive(slots) {
  if (!slots || slots.length <= 1) return false;

  try {
    // Sort slots by date and start time
    const sorted = [...slots].sort((a, b) => {
      // Handle date comparison safely
      let dateCompare = 0;
      if (a.date && b.date) {
        const dateA = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
        const dateB = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date);
        dateCompare = dateA.localeCompare(dateB);
      }

      if (dateCompare !== 0) return dateCompare;

      // Then sort by start time
      const timeA = a.start_time ? String(a.start_time) : '';
      const timeB = b.start_time ? String(b.start_time) : '';
      return timeA.localeCompare(timeB);
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      // Check if they're on the same date
      const prevDate = sorted[i].date ? (sorted[i].date instanceof Date ? sorted[i].date.toISOString().split('T')[0] : String(sorted[i].date)) : '';
      const currentDate = sorted[i + 1].date ? (sorted[i + 1].date instanceof Date ? sorted[i + 1].date.toISOString().split('T')[0] : String(sorted[i + 1].date)) : '';

      // Check if they are consecutive (current end time equals next start time)
      const currentEnd = sorted[i].end_time ? String(sorted[i].end_time) : '';
      const nextStart = sorted[i + 1].start_time ? String(sorted[i + 1].start_time) : '';

      if (prevDate !== currentDate || currentEnd !== nextStart) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking consecutive slots:", error);
    return false;
  }
}

// Helper function to group consecutive slots
function groupConsecutiveSlots(slots) {
  console.log("groupConsecutiveSlots called with", slots?.length, "slots"); // ADD THIS DEBUG LINE

  if (!slots || slots.length === 0) {
    console.log("No slots provided");
    return [];
  }

  if (slots.length === 1) {
    console.log("Only one slot, returning as single group");
    return [slots];
  }

  try {
    // Sort slots by date and start time
    const sorted = [...slots].sort((a, b) => {
      // Handle date comparison safely
      let dateCompare = 0;
      if (a.date && b.date) {
        const dateA = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
        const dateB = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date);
        dateCompare = dateA.localeCompare(dateB);
      }

      if (dateCompare !== 0) return dateCompare;

      // Then sort by start time
      const timeA = a.start_time ? String(a.start_time) : '';
      const timeB = b.start_time ? String(b.start_time) : '';
      return timeA.localeCompare(timeB);
    });

    console.log("Sorted slots:", sorted.map(s => `${s.date} ${s.start_time}-${s.end_time}`));

    const groups = [];
    let currentGroup = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevSlot = sorted[i - 1];
      const currentSlot = sorted[i];

      // Safely get date strings
      const prevDate = prevSlot.date ? (prevSlot.date instanceof Date ? prevSlot.date.toISOString().split('T')[0] : String(prevSlot.date)) : '';
      const currentDate = currentSlot.date ? (currentSlot.date instanceof Date ? currentSlot.date.toISOString().split('T')[0] : String(currentSlot.date)) : '';

      // Safely get time strings
      const prevEnd = prevSlot.end_time ? String(prevSlot.end_time) : '';
      const currentStart = currentSlot.start_time ? String(currentSlot.start_time) : '';

      console.log(`Comparing: ${prevDate} ${prevEnd} with ${currentDate} ${currentStart}`);

      // Check if current slot is consecutive to previous (same date and end_time matches next start_time)
      if (prevDate === currentDate && prevEnd === currentStart) {
        console.log("Consecutive, adding to current group");
        currentGroup.push(currentSlot);
      } else {
        console.log("Not consecutive, starting new group");
        groups.push([...currentGroup]);
        currentGroup = [currentSlot];
      }
    }

    groups.push(currentGroup);
    console.log(`Created ${groups.length} groups`);
    return groups;
  } catch (error) {
    console.error("Error grouping consecutive slots:", error);
    // If grouping fails, treat each slot as separate group
    return slots.map(slot => [slot]);
  }
}

const bookingController = {

  createBooking: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      console.log("createBooking called with body:", req.body);

      const body = req.body || {};
      const arena_id = body.arena_id || body.arenaId || body.arena || null;
      const slot_id = body.slot_id || body.slotId || null;
      const slotIdsRaw = body.slot_ids || body.slotIds || [];
      const sport_id = body.sport_id || body.sportId || body.sport || null;
      const court_id = body.court_id || body.courtId || null;
      const date = body.date || body.bookingDate || null;
      const start_time = body.start_time || body.startTime || null;
      const end_time = body.end_time || body.endTime || null;

      // Process total_amount with multiple field name options
      const total_amount = body.total_amount || body.totalAmount || body.totalPrice || null;

      // Convert to number properly and validate
      const totalAmountNum = total_amount ? parseFloat(total_amount) : null;

      // Add validation for total_amount format
      if (totalAmountNum && isNaN(totalAmountNum)) {
        return res.status(400).json({
          message: "Invalid total_amount format"
        });
      }

      // Make sure totalAmountNum is a number with max 2 decimal places
      const validTotalAmount = totalAmountNum ?
        Number(parseFloat(totalAmountNum).toFixed(2)) : null;

      const payment_method = body.payment_method || body.paymentMethod || null;

      const arenaIdNum = arena_id ? Number(arena_id) : null;
      const slotIdNum = slot_id ? Number(slot_id) : null;
      const sportIdNum = sport_id ? Number(sport_id) : null;
      const courtIdNum = court_id ? Number(court_id) : null;
      const slotIds = Array.isArray(slotIdsRaw)
        ? [...new Set(slotIdsRaw.map(Number).filter((id) => Number(id) > 0))]
        : [];

      console.log("Processed slotIds:", slotIds);

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

      // Check if arena requires advance payment
      const [arenaSettings] = await connection.execute(
        `SELECT require_advance, advance_type, advance_percentage, advance_fixed_amount 
       FROM arenas WHERE arena_id = ?`,
        [arenaIdNum]
      );

      const arena = arenaSettings[0];
      const requiresAdvance = arena && arena.require_advance === 1;

      // Function to check if a slot is in the past
      const isSlotInPast = (slotDate, slotTime) => {
        const dateStr = slotDate instanceof Date
          ? slotDate.toISOString().split('T')[0]
          : String(slotDate);

        const slotDateTimeStr = `${dateStr}T${slotTime}:00`;
        const slotStart = new Date(slotDateTimeStr);
        const now = new Date();
        return slotStart.getTime() < now.getTime();
      };

      const commission_percentage = 5.0;
      let bookingIds = [];
      let totalCommission = 0;
      let createdBookings = [];
      let advanceAmount = null;

      if (slotIds.length > 0) {
        // ========== MULTIPLE SLOTS BOOKING ==========
        console.log("Processing multiple slots booking with IDs:", slotIds);

        const placeholders = slotIds.map(() => "?").join(",");

        // Check all slots are available and belong to the same arena and court
        const [slots] = await connection.execute(
          `SELECT ts.*, 
                b.booking_id as existing_booking,
                b.status as existing_status
         FROM time_slots ts
         LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
           AND b.status IN ('pending', 'accepted', 'completed')
         WHERE ts.slot_id IN (${placeholders})
           AND ts.arena_id = ?
           AND ts.court_id = ?`,
          [...slotIds, arenaIdNum, courtIdNum || null]
        );

        console.log("Found slots:", slots.length);

        if (slots.length !== slotIds.length) {
          await connection.rollback();
          return res.status(400).json({
            message: "One or more selected slots were not found for this arena and court",
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
              court_id: s.court_id,
              reason: s.existing_booking
                ? "Already booked"
                : s.is_blocked_by_owner
                  ? "Blocked by owner"
                  : "Holiday",
            })),
          });
        }

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
              court_id: s.court_id,
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
              court_id: s.court_id,
            })),
          });
        }

        // Group consecutive slots
        const slotGroups = groupConsecutiveSlots(slots);
        console.log("Slot groups created:", slotGroups.length);

        // Create bookings for each group
        for (const group of slotGroups) {
          // Calculate total price for the group
          const totalPriceForGroup = group.reduce((sum, slot) => {
            const price = slot.price ? parseFloat(slot.price) : 0;
            return sum + price;
          }, 0);

          // Format to 2 decimal places
          const finalTotalPrice = Number(totalPriceForGroup.toFixed(2));
          const commission_amount = finalTotalPrice * (commission_percentage / 100);

          // Calculate advance amount if required
          if (requiresAdvance) {
            if (arena.advance_type === 'percentage') {
              advanceAmount = (finalTotalPrice * (arena.advance_percentage / 100)).toFixed(2);
            } else {
              advanceAmount = arena.advance_fixed_amount;
            }
          }

          // Determine initial status and payment method
          let initialStatus = requiresAdvance ? 'pending_advance' : 'pending';
          let paymentMethod = body.payment_method || (requiresAdvance ? 'advance_payment' : 'pay_after');

          // Use the first slot's details for basic info
          const firstSlot = group[0];
          const lastSlot = group[group.length - 1];

          // Validate sport_id
          if (!sportIdNum && !firstSlot.sport_id) {
            await connection.rollback();
            return res.status(400).json({
              message: "Sport ID is required for booking",
              slot_ids: group.map(s => s.slot_id),
              date: firstSlot.date,
              start_time: firstSlot.start_time,
              end_time: lastSlot.end_time,
              court_id: firstSlot.court_id,
            });
          }

          // Ensure court_id is valid
          const finalCourtId = courtIdNum || firstSlot.court_id;
          if (!finalCourtId) {
            await connection.rollback();
            return res.status(400).json({
              message: "Court ID is required for booking",
              slot_ids: group.map(s => s.slot_id),
              date: firstSlot.date,
              start_time: firstSlot.start_time,
            });
          }

          // Ensure sport_id is valid
          const finalSportId = sportIdNum || firstSlot.sport_id;

          // Create ONE booking for the entire group of consecutive slots
          const [bookingResult] = await connection.execute(
            `INSERT INTO bookings 
           (user_id, arena_id, sport_id, court_id, total_amount, 
            commission_percentage, commission_amount, payment_method, status, booking_date,
            slot_id, start_time, end_time, date, is_multi_slot, slot_ids,
            requires_advance, advance_amount, payment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user.id,
              arenaIdNum,
              finalSportId,
              finalCourtId,
              finalTotalPrice,
              commission_percentage,
              commission_amount,
              paymentMethod,
              initialStatus,
              firstSlot.slot_id,
              firstSlot.start_time,
              lastSlot.end_time,
              firstSlot.date,
              group.length > 1 ? 1 : 0,
              JSON.stringify(group.map(s => s.slot_id)),
              requiresAdvance ? 1 : 0,
              advanceAmount,
              requiresAdvance ? 'pending' : 'completed'
            ]
          );

          const bookingId = bookingResult.insertId;
          bookingIds.push(bookingId);
          totalCommission += commission_amount;

          createdBookings.push({
            booking_id: bookingId,
            slot_ids: group.map(s => s.slot_id),
            date: firstSlot.date,
            start_time: firstSlot.start_time,
            end_time: lastSlot.end_time,
            court_id: firstSlot.court_id,
            total_price: finalTotalPrice,
            slot_count: group.length,
            is_multi_slot: group.length > 1,
            requires_advance: requiresAdvance,
            advance_amount: advanceAmount,
            status: initialStatus
          });

          // IMPORTANT: For advance bookings, DON'T lock slots yet
          // Only mark slots as unavailable for regular bookings
          if (!requiresAdvance) {
            for (const slot of group) {
              await connection.execute(
                `UPDATE time_slots 
               SET is_available = FALSE,
                   locked_until = NULL,
                   locked_by_user_id = NULL
               WHERE slot_id = ?`,
                [slot.slot_id]
              );
            }
          }
        }
      } else if (slotIdNum) {
        // ========== SINGLE SLOT BOOKING ==========
        console.log("Processing single slot booking with ID:", slotIdNum);

        const [slots] = await connection.execute(
          `SELECT ts.*, 
                b.booking_id as existing_booking,
                b.status as existing_status
         FROM time_slots ts
         LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
           AND b.status IN ('pending', 'accepted', 'completed')
         WHERE ts.slot_id = ? 
           AND ts.arena_id = ?
           AND ts.court_id = ?`,
          [slotIdNum, arenaIdNum, courtIdNum || null]
        );

        if (slots.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            message: "Time slot not available for this arena and court",
          });
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
            court_id: slot.court_id,
            reason: slot.existing_booking
              ? "Already booked"
              : slot.is_blocked_by_owner
                ? "Blocked by owner"
                : "Holiday",
          });
        }

        // Check for past time slot
        if (isSlotInPast(slot.date, slot.start_time)) {
          await connection.rollback();
          return res.status(400).json({
            message: "Cannot book past time slots",
            slot_date: slot.date,
            start_time: slot.start_time,
            court_id: slot.court_id,
            reason: "Time has already passed",
          });
        }

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
            court_id: slot.court_id,
          });
        }

        // Calculate price for slot
        const priceForSlot = slot.price || validTotalAmount || 500;
        const finalPriceForSlot = Number(parseFloat(priceForSlot).toFixed(2));
        const commission_amount = finalPriceForSlot * (commission_percentage / 100);

        // Calculate advance amount if required
        if (requiresAdvance) {
          if (arena.advance_type === 'percentage') {
            advanceAmount = (finalPriceForSlot * (arena.advance_percentage / 100)).toFixed(2);
          } else {
            advanceAmount = arena.advance_fixed_amount;
          }
        }

        // Determine initial status and payment method
        let initialStatus = requiresAdvance ? 'pending_advance' : 'pending';
        let paymentMethod = body.payment_method || (requiresAdvance ? 'advance_payment' : 'pay_after');

        // Validate sport_id
        if (!sportIdNum && !slot.sport_id) {
          await connection.rollback();
          return res.status(400).json({
            message: "Sport ID is required for booking",
            slot_id: slot.slot_id,
            date: slot.date,
            start_time: slot.start_time,
            court_id: slot.court_id,
          });
        }

        // Ensure court_id is valid
        const finalCourtId = courtIdNum || slot.court_id;
        if (!finalCourtId) {
          await connection.rollback();
          return res.status(400).json({
            message: "Court ID is required for booking",
            slot_id: slot.slot_id,
            date: slot.date,
            start_time: slot.start_time,
          });
        }

        // Ensure sport_id is valid
        const finalSportId = sportIdNum || slot.sport_id;

        const [bookingResult] = await connection.execute(
          `INSERT INTO bookings 
         (user_id, arena_id, slot_id, sport_id, court_id, total_amount, 
          commission_percentage, commission_amount, payment_method, status, booking_date,
          start_time, end_time, date, is_multi_slot, slot_ids,
          requires_advance, advance_amount, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, 0, ?, ?, ?, ?)`,
          [
            req.user.id,
            arenaIdNum,
            slot.slot_id,
            finalSportId,
            finalCourtId,
            finalPriceForSlot,
            commission_percentage,
            commission_amount,
            paymentMethod,
            initialStatus,
            slot.start_time,
            slot.end_time,
            slot.date,
            JSON.stringify([slot.slot_id]),
            requiresAdvance ? 1 : 0,
            advanceAmount,
            requiresAdvance ? 'pending' : 'completed'
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
          court_id: slot.court_id,
          price: finalPriceForSlot,
          is_multi_slot: false,
          requires_advance: requiresAdvance,
          advance_amount: advanceAmount,
          status: initialStatus
        });

        // IMPORTANT: For advance bookings, DON'T lock slots yet
        // Only mark slots as unavailable for regular bookings
        if (!requiresAdvance) {
          await connection.execute(
            `UPDATE time_slots 
           SET is_available = FALSE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
            [slot.slot_id]
          );
        }
      } else {
        await connection.rollback();
        return res.status(400).json({
          message: "Please provide slot_id or slot_ids for booking"
        });
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
                ts.date, ts.start_time, ts.end_time, ts.court_id, 
                ao.arena_name as owner_name,
                ao.owner_id, ao.email as owner_email, ao.phone_number as owner_phone
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN arena_owners ao ON a.owner_id = ao.owner_id
         JOIN sports_types st ON b.sport_id = st.sport_id
         LEFT JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE b.booking_id IN (${placeholders})`,
          bookingIds
        );

        // Send notifications to owner
        for (const booking of bookings) {
          try {
            if (requiresAdvance) {
              // Send notification about advance payment request
              await sendNotification({
                ownerId: booking.owner_id,
                userId: req.user.id,
                bookingId: booking.booking_id,
                type: "booking.advance_request",
                title: "Advance payment booking request",
                message: `New booking requiring advance payment of Rs. ${advanceAmount}`,
              });
            } else {
              // Regular booking notification
              await sendNotification({
                ownerId: booking.owner_id,
                userId: req.user.id,
                bookingId: booking.booking_id,
                type: "booking.pending",
                title: "New booking request",
                message: `New booking request for Court ${booking.court_id} on ${booking.date} ${booking.start_time}-${booking.end_time}`,
              });
            }
          } catch (notifError) {
            console.warn("Notification error:", notifError.message);
          }
        }

        return res.status(201).json({
          message: requiresAdvance
            ? "Booking request created successfully. Advance payment required to confirm slots."
            : "Booking request created successfully. Waiting for owner approval.",
          bookings,
          createdBookings,
          requires_advance: requiresAdvance,
          advance_amount: advanceAmount
        });
      }

      res.status(400).json({ message: "No bookings were created" });
    } catch (error) {
      await connection.rollback();
      console.error("Error in createBooking:", error);
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

      // Check ions
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

      // Only owners/s can mark booking as completed
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
