const pool = require("../db");
const arenaController = {
  // Get all sports categories
  getSportsCategories: async (req, res) => {
    try {
      const [sports] = await pool.execute(
        "SELECT * FROM sports_types ORDER BY name"
      );
      res.json(sports);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get available time slots for an arena - FIXED VERSION with multi-slot support
  // File: arenaController.js - UPDATED getAvailableSlots function
  getAvailableSlots: async (req, res) => {
    try {
      const arena_id = parseInt(req.params.arena_id);
      let { date, sport_id, court_id } = req.query;

      console.log(
        "Fetching slots for arena:",
        arena_id,
        "date:",
        date,
        "sport:",
        sport_id,
        "court:",
        court_id
      );

      if (date && typeof date === "object") {
        date = date.date;
      }

      // If no date provided, default to today
      if (!date) {
        date = new Date().toISOString().split("T")[0];
        console.log("No date provided, using today:", date);
      }

      // Validate arena exists and is active
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id, is_active, is_blocked FROM arenas WHERE arena_id = ?",
        [arena_id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({ message: "Arena not found" });
      }

      if (!arenaCheck[0].is_active || arenaCheck[0].is_blocked) {
        return res.status(400).json({ message: "Arena is not available" });
      }

      // Get available slots for the specific date
      let query = `
      SELECT 
        ts.*, 
        st.name as sport_name,
        cd.court_name,
        cd.court_number,
        b.booking_id,
        b.status as booking_status,
        b.is_multi_slot as existing_multi_slot,
        b.slot_ids as existing_slot_ids,
        CASE
          WHEN b.booking_id IS NOT NULL AND b.status IN ('pending', 'accepted', 'completed') THEN FALSE
          WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
          WHEN ts.is_holiday = TRUE THEN FALSE
          WHEN ts.locked_until > NOW() AND ts.locked_by_user_id IS NOT NULL AND ts.locked_by_user_id != ? THEN FALSE
          ELSE TRUE
        END as actually_available,
        CASE
          WHEN ts.locked_until > NOW() AND ts.locked_by_user_id = ? THEN TRUE
          ELSE FALSE
        END as locked_by_me
      FROM time_slots ts
      LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
        AND b.status IN ('pending', 'accepted', 'completed')
      WHERE ts.arena_id = ?
        AND ts.date = ?
    `;

      const params = [req.user?.id || null, req.user?.id || null, arena_id, date];

      // Add court_id filter if provided
      if (court_id) {
        query += " AND ts.court_id = ?";
        params.push(court_id);
      }

      // Keep existing sport_id filter
      if (sport_id) {
        query += " AND ts.sport_id = ?";
        params.push(sport_id);
      }

      query += " ORDER BY cd.court_number, ts.start_time";

      console.log("Executing query:", query, "with params:", params);

      const [slots] = await pool.execute(query, params);

      console.log("Found", slots.length, "slots");

      // Group slots by court for multi-slot grouping
      const slotsByCourt = {};
      slots.forEach(slot => {
        if (!slotsByCourt[slot.court_id]) {
          slotsByCourt[slot.court_id] = [];
        }
        slotsByCourt[slot.court_id].push(slot);
      });

      // Process each court's slots to identify consecutive relationships
      Object.keys(slotsByCourt).forEach(courtId => {
        const courtSlots = slotsByCourt[courtId].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        );

        // Mark consecutive slots
        for (let i = 0; i < courtSlots.length; i++) {
          const slot = courtSlots[i];
          const nextSlot = i < courtSlots.length - 1 ? courtSlots[i + 1] : null;
          const prevSlot = i > 0 ? courtSlots[i - 1] : null;

          slot.can_group_with_next = nextSlot ? slot.end_time === nextSlot.start_time : false;
          slot.can_group_with_prev = prevSlot ? prevSlot.end_time === slot.start_time : false;
          slot.is_available_for_booking = slot.actually_available === 1 || slot.actually_available === true;

          // Add group ID for consecutive slots
          if (slot.is_available_for_booking) {
            if (!prevSlot || !prevSlot.is_available_for_booking || prevSlot.end_time !== slot.start_time) {
              slot.is_group_start = true;
            }
            if (!nextSlot || !nextSlot.is_available_for_booking || slot.end_time !== nextSlot.start_time) {
              slot.is_group_end = true;
            }
          }
        }
      });

      // Format the response with multi-slot metadata
      const formattedSlots = slots.map((slot) => ({
        slot_id: slot.slot_id,
        arena_id: slot.arena_id,
        court_id: slot.court_id,
        court_name: slot.court_name,
        court_number: slot.court_number,
        sport_id: slot.sport_id,
        sport_name: slot.sport_name,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.price,
        is_available: slot.actually_available === 1 || slot.actually_available === true,
        actually_available: slot.actually_available === 1 || slot.actually_available === true,
        locked_by_me: slot.locked_by_me === 1 || slot.locked_by_me === true,
        is_blocked_by_owner: slot.is_blocked_by_owner || false,
        is_holiday: slot.is_holiday || false,
        // Multi-slot specific fields
        can_group_with_next: slot.can_group_with_next || false,
        can_group_with_prev: slot.can_group_with_prev || false,
        is_group_start: slot.is_group_start || false,
        is_group_end: slot.is_group_end || false,
      }));

      // Calculate consecutive slot groups for each court
      const consecutiveGroups = {};
      Object.keys(slotsByCourt).forEach(courtId => {
        const courtSlots = formattedSlots.filter(s => s.court_id == courtId && s.is_available);
        const groups = [];
        let currentGroup = [];

        courtSlots.forEach((slot, index) => {
          if (currentGroup.length === 0) {
            currentGroup.push(slot);
          } else {
            const lastSlot = currentGroup[currentGroup.length - 1];
            if (lastSlot.end_time === slot.start_time) {
              currentGroup.push(slot);
            } else {
              if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
              }
              currentGroup = [slot];
            }
          }
        });

        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }

        consecutiveGroups[courtId] = groups.map(group => ({
          slot_ids: group.map(s => s.slot_id),
          start_time: group[0].start_time,
          end_time: group[group.length - 1].end_time,
          total_price: group.reduce((sum, s) => sum + s.price, 0),
          slot_count: group.length
        }));
      });

      console.log("Returning", formattedSlots.filter(s => s.is_available).length, "available slots");

      res.json({
        slots: formattedSlots,
        meta: {
          total_slots: formattedSlots.length,
          available_slots: formattedSlots.filter(s => s.is_available).length,
          consecutive_groups: consecutiveGroups,
          supports_multi_slot: true,
          max_consecutive_slots: 4
        }
      });
    } catch (error) {
      console.error("Error in getAvailableSlots:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  // Lock multiple time slots for multi-slot booking - NEW FUNCTION
  lockMultipleTimeSlots: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { slot_ids } = req.body; // Array of slot IDs
      const lockDuration = 10 * 60 * 1000; // 10 minutes

      if (!slot_ids || !Array.isArray(slot_ids) || slot_ids.length === 0) {
        return res.status(400).json({ message: "Slot IDs array is required" });
      }

      await connection.beginTransaction();

      // Check if slots are consecutive
      const placeholders = slot_ids.map(() => '?').join(',');
      const [slots] = await connection.execute(
        `SELECT ts.*, 
              b.booking_id,
              b.status as booking_status
       FROM time_slots ts
       LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
         AND b.status IN ('pending', 'accepted', 'completed')
       WHERE ts.slot_id IN (${placeholders})
         AND ts.is_blocked_by_owner = FALSE
         AND ts.is_holiday = FALSE
         AND (b.booking_id IS NULL OR b.status NOT IN ('pending', 'accepted', 'completed'))
         AND (ts.locked_until IS NULL OR ts.locked_until <= NOW())`,
        slot_ids
      );

      if (slots.length !== slot_ids.length) {
        await connection.rollback();
        return res.status(400).json({
          message: "One or more slots are not available",
          unavailable_slots: slot_ids.filter(id => !slots.find(s => s.slot_id === id))
        });
      }

      // Check if slots are consecutive and on same court
      const sortedSlots = slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      const firstCourt = sortedSlots[0].court_id;
      const firstDate = sortedSlots[0].date;

      for (let i = 0; i < sortedSlots.length; i++) {
        const slot = sortedSlots[i];

        // Check court consistency
        if (slot.court_id !== firstCourt) {
          await connection.rollback();
          return res.status(400).json({
            message: "All slots must be from the same court"
          });
        }

        // Check date consistency
        if (slot.date !== firstDate) {
          await connection.rollback();
          return res.status(400).json({
            message: "All slots must be on the same date"
          });
        }

        // Check if any slot is in the past
        const slotDateTimeStr = `${slot.date}T${slot.start_time}:00Z`;
        const slotStart = new Date(slotDateTimeStr);
        if (slotStart.getTime() < new Date().getTime()) {
          await connection.rollback();
          return res.status(400).json({
            message: `Cannot lock past time slots: ${slot.start_time}`,
            slot_id: slot.slot_id
          });
        }

        // Check consecutiveness
        if (i > 0) {
          const prevSlot = sortedSlots[i - 1];
          if (prevSlot.end_time !== slot.start_time) {
            await connection.rollback();
            return res.status(400).json({
              message: "Slots must be consecutive",
              gap_between: `${prevSlot.end_time} and ${slot.start_time}`
            });
          }
        }

        // Check if locked by someone else
        if (slot.locked_until &&
          slot.locked_until > new Date() &&
          slot.locked_by_user_id !== req.user.id) {
          await connection.rollback();
          return res.status(400).json({
            message: `Slot ${slot.start_time} is locked by another user`,
            slot_id: slot.slot_id,
            locked_until: slot.locked_until
          });
        }
      }

      // Lock all slots
      for (const slot of sortedSlots) {
        await connection.execute(
          `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
             locked_by_user_id = ?
         WHERE slot_id = ?`,
          [req.user.id, slot.slot_id]
        );
      }

      await connection.commit();

      res.json({
        message: `${sortedSlots.length} slots locked for 10 minutes`,
        locked_until: new Date(Date.now() + lockDuration),
        slots: sortedSlots.map(s => ({
          slot_id: s.slot_id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          price: s.price
        })),
        total_price: sortedSlots.reduce((sum, s) => sum + s.price, 0),
        time_range: `${sortedSlots[0].start_time} - ${sortedSlots[sortedSlots.length - 1].end_time}`
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error locking multiple slots:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      connection.release();
    }
  },

  // Release multiple locked time slots - NEW FUNCTION
  releaseMultipleTimeSlots: async (req, res) => {
    try {
      const { slot_ids } = req.body; // Array of slot IDs

      if (!slot_ids || !Array.isArray(slot_ids) || slot_ids.length === 0) {
        return res.status(400).json({ message: "Slot IDs array is required" });
      }

      const placeholders = slot_ids.map(() => '?').join(',');
      const [result] = await pool.execute(
        `UPDATE time_slots 
       SET locked_until = NULL,
           locked_by_user_id = NULL
       WHERE slot_id IN (${placeholders}) AND locked_by_user_id = ?`,
        [...slot_ids, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "No slots found or not locked by you",
        });
      }

      res.json({
        message: `${result.affectedRows} slots released successfully`,
        released_count: result.affectedRows,
        slot_ids: slot_ids
      });
    } catch (error) {
      console.error("Error releasing multiple slots:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Keep original lockTimeSlot for backward compatibility
  lockTimeSlot: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { slot_id } = req.params;
      const lockDuration = 10 * 60 * 1000; // 10 minutes in milliseconds

      await connection.beginTransaction();

      const [slots] = await connection.execute(
        `SELECT ts.*, 
            b.booking_id,
            b.status as booking_status
     FROM time_slots ts
     LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
       AND b.status IN ('pending', 'accepted', 'completed')
     WHERE ts.slot_id = ?
       AND ts.is_blocked_by_owner = FALSE
       AND ts.is_holiday = FALSE
       AND (b.booking_id IS NULL OR b.status NOT IN ('pending', 'accepted', 'completed'))
       AND (ts.locked_until IS NULL OR ts.locked_until <= NOW())`,
        [slot_id]
      );

      if (slots.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Slot not available or already booked",
        });
      }

      const slot = slots[0];
      const now = new Date();

      // Fix: Add seconds and ensure proper ISO format
      const slotDateTimeStr = `${slot.date}T${slot.start_time}:00Z`;
      const slotStart = new Date(slotDateTimeStr);

      console.log("=== LOCK VALIDATION ===");
      console.log("Slot date/time string:", slotDateTimeStr);
      console.log("Parsed slot start:", slotStart);
      console.log("Current time (now):", now);
      console.log("Slot timestamp:", slotStart.getTime());
      console.log("Now timestamp:", now.getTime());
      console.log("Is slot in past?", slotStart.getTime() < now.getTime());

      // SIMPLE CHECK: If slot start time is before current time, block it
      if (slotStart.getTime() < now.getTime()) {
        console.log("BLOCKING: Slot is in the past!");
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot lock past time slots",
        });
      }

      console.log("ALLOWING: Slot is in the future");
      console.log("=== END VALIDATION ===");

      // Check if someone else locked it recently
      if (
        slot.locked_until &&
        slot.locked_until > new Date() &&
        slot.locked_by_user_id !== req.user.id
      ) {
        await connection.rollback();
        return res.status(400).json({
          message: "Slot is currently being booked by another user",
          locked_until: slot.locked_until,
        });
      }

      // Lock the slot for current user
      await connection.execute(
        `UPDATE time_slots 
     SET locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
         locked_by_user_id = ?
     WHERE slot_id = ?`,
        [req.user.id, slot_id]
      );

      await connection.commit();

      res.json({
        message: "Slot locked for 10 minutes",
        locked_until: new Date(Date.now() + lockDuration),
        slot_date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.price,
      });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      connection.release();
    }
  },

  // Keep original releaseTimeSlot for backward compatibility
  releaseTimeSlot: async (req, res) => {
    try {
      const { slot_id } = req.params;

      // Only release if locked by current user
      const [result] = await pool.execute(
        `UPDATE time_slots 
       SET locked_until = NULL,
           locked_by_user_id = NULL
       WHERE slot_id = ? AND locked_by_user_id = ?`,
        [slot_id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Slot not found or not locked by you",
        });
      }

      res.json({
        message: "Slot released successfully",
        slot_id: slot_id,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // Clean up expired locks - NEW FUNCTION (call this periodically)
  cleanupExpiredLocks: async () => {
    try {
      const [result] = await pool.execute(
        `UPDATE time_slots 
         SET locked_until = NULL,
             locked_by_user_id = NULL
         WHERE locked_until IS NOT NULL 
           AND locked_until <= NOW()`
      );

      if (result.affectedRows > 0) {
        console.log(`Cleaned up ${result.affectedRows} expired locks`);
      }

      return result.affectedRows;
    } catch (error) {
      console.error("Error cleaning up expired locks:", error);
      return 0;
    }
  },


  getPendingReviews: async (req, res) => {
    try {
      const userId = req.user.id;

      console.log(`🔍 Fetching pending reviews for user ID: ${userId}`);

      // Find ALL COMPLETED bookings that don't have a review yet
      // Remove the check for existing reviews on the same arena
      const [pendingReviews] = await pool.execute(`
      SELECT 
        b.booking_id,
        b.arena_id,
        b.court_id,
        ts.date,
        ts.start_time,
        ts.end_time,
        a.name as arena_name,
        a.address as arena_address,
        cd.court_name,
        cd.court_number
      FROM bookings b
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      JOIN arenas a ON b.arena_id = a.arena_id
      JOIN court_details cd ON b.court_id = cd.court_id
      WHERE b.user_id = ?
        AND b.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 
          FROM arena_reviews ar 
          WHERE ar.booking_id = b.booking_id  -- Only check for review on this specific booking
        )
        AND (b.review_reminder_shown = 0 OR b.review_reminder_shown IS NULL)
      ORDER BY b.booking_date DESC
      LIMIT 10
    `, [userId]);

      console.log(`📦 Found ${pendingReviews.length} pending reviews for user ${userId}`);

      res.json({
        pending_reviews: pendingReviews,
        count: pendingReviews.length
      });
    } catch (error) {
      console.error("Error in getPendingReviews:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        pending_reviews: [],
        count: 0
      });
    }
  },

  // Mark review reminder as dismissed
  dismissReviewReminder: async (req, res) => {
    try {
      const { booking_id } = req.body;
      const userId = req.user.id;

      console.log("Dismissing reminder for booking:", booking_id, "user:", userId);

      const [result] = await pool.execute(
        "UPDATE bookings SET review_reminder_shown = TRUE WHERE booking_id = ? AND user_id = ?",
        [booking_id, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Booking not found or not owned by user"
        });
      }

      res.json({
        message: "Review reminder dismissed",
        booking_id: booking_id
      });
    } catch (error) {
      console.error("Error dismissing review reminder:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  // Skip all review reminders for now
  skipAllReviewReminders: async (req, res) => {
    try {
      const userId = req.user.id;

      console.log("Skipping all reminders for user:", userId);

      const [result] = await pool.execute(
        "UPDATE bookings SET review_reminder_shown = TRUE WHERE user_id = ? AND status = 'completed'",
        [userId]
      );

      console.log("Updated", result.affectedRows, "bookings");

      res.json({
        message: "All review reminders skipped",
        skipped_count: result.affectedRows
      });
    } catch (error) {
      console.error("Error skipping all reminders:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  addReview: async (req, res) => {
    try {
      console.log("=".repeat(50));
      console.log("📝 ADD REVIEW CALLED");
      const { arena_id } = req.params;
      const { rating, comment, booking_id } = req.body;
      const userId = req.user.id;

      console.log("Request params:", { arena_id });
      console.log("Request body:", { rating, comment, booking_id, userId });

      // Validate inputs
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating is required and must be between 1 and 5",
        });
      }

      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({
          message: "Comment is required",
        });
      }

      if (!booking_id) {
        return res.status(400).json({
          message: "Booking ID is required to submit a review",
        });
      }

      // CRITICAL: Check if this specific booking belongs to the user and is completed
      const [bookings] = await pool.execute(`
      SELECT b.*, a.name as arena_name
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE b.booking_id = ? 
        AND b.user_id = ? 
        AND b.arena_id = ?
    `, [booking_id, userId, arena_id]);

      console.log("Booking check result:", bookings);

      if (bookings.length === 0) {
        return res.status(400).json({
          message: "Booking not found or does not belong to you"
        });
      }

      const booking = bookings[0];

      // Check if booking is completed
      if (booking.status !== 'completed') {
        return res.status(400).json({
          message: "You can only review completed bookings. This booking is " + booking.status
        });
      }

      // IMPORTANT CHANGE: Check if this SPECIFIC booking already has a review
      const [existingReview] = await pool.execute(`
      SELECT review_id FROM arena_reviews 
      WHERE booking_id = ?
    `, [booking_id]);

      console.log("Existing review check:", existingReview);

      if (existingReview.length > 0) {
        return res.status(400).json({
          message: "You have already submitted a review for this booking",
        });
      }

      // Use connection for transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Insert review with booking_id reference
        const [result] = await connection.execute(
          `INSERT INTO arena_reviews (user_id, arena_id, booking_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
          [userId, arena_id, booking_id, rating, comment.trim()]
        );

        console.log("✅ Review inserted with ID:", result.insertId);

        // Update booking to mark reminder as shown
        await connection.execute(
          `UPDATE bookings SET review_reminder_shown = TRUE 
         WHERE booking_id = ?`,
          [booking_id]
        );

        // Update arena rating (average of all reviews for this arena)
        const [avgRating] = await connection.execute(
          `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
         FROM arena_reviews WHERE arena_id = ?`,
          [arena_id]
        );

        await connection.execute(
          `UPDATE arenas 
         SET rating = ROUND(?, 1), 
             total_reviews = ?
         WHERE arena_id = ?`,
          [
            avgRating[0].avg_rating || 0,
            avgRating[0].total_reviews || 0,
            arena_id,
          ]
        );

        await connection.commit();

        // Get the newly created review
        const [newReview] = await pool.execute(
          `SELECT ar.*, u.name as user_name, u.profile_picture_url
         FROM arena_reviews ar
         JOIN users u ON ar.user_id = u.user_id
         WHERE ar.review_id = ?`,
          [result.insertId]
        );

        res.status(201).json({
          message: "Review added successfully",
          review: newReview[0],
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error("❌ Error in addReview:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },

  // Get arena reviews - FIXED
  getArenaReviews: async (req, res) => {
    try {
      const arena_id = parseInt(req.params.arena_id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get reviews with user info
      const [reviews] = await pool.execute(
        `SELECT ar.*, u.name as user_name, u.profile_picture_url,
              DATE_FORMAT(ar.created_at, '%M %d, %Y') as formatted_date
       FROM arena_reviews ar
       JOIN users u ON ar.user_id = u.user_id
       WHERE ar.arena_id = ?
       ORDER BY ar.created_at DESC
       LIMIT ? OFFSET ?`,
        [arena_id, limit, offset]
      );

      // Get total count
      const [countResult] = await pool.execute(
        "SELECT COUNT(*) as total FROM arena_reviews WHERE arena_id = ?",
        [arena_id]
      );

      // Get average rating
      const [ratingResult] = await pool.execute(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
       FROM arena_reviews WHERE arena_id = ?`,
        [arena_id]
      );

      res.json({
        reviews,
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        avg_rating: ratingResult[0].avg_rating ? parseFloat(ratingResult[0].avg_rating).toFixed(1) : 0,
        total_reviews: ratingResult[0].total_reviews
      });
    } catch (error) {
      console.error("Error in getArenaReviews:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        reviews: [],
        avg_rating: 0,
        total_reviews: 0
      });
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
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all arenas
  getAllArenas: async (req, res) => {
    try {
      const { sport_id } = req.query;
      let query = "SELECT * FROM arenas WHERE is_active = 1 AND is_blocked = 0";
      const params = [];

      query += " ORDER BY rating DESC, name ASC";

      const [arenas] = await pool.execute(query, params);
      res.json(arenas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  getArenaDetails: async (req, res) => {
    try {
      const { arena_id } = req.params;

      console.log("Fetching details for arena:", arena_id);

      // Get basic arena info WITH google_maps_location from owners table
      const [arenas] = await pool.execute(`
      SELECT a.*, ao.google_maps_location, ao.owner_name, ao.phone_number as owner_phone 
      FROM arenas a
      LEFT JOIN arena_owners ao ON a.owner_id = ao.owner_id
      WHERE a.arena_id = ? AND a.is_active = 1 AND a.is_blocked = 0
    `, [arena_id]);

      if (arenas.length === 0) {
        return res.status(404).json({ message: "Arena not found" });
      }

      const arena = arenas[0];

      console.log("Arena details fetched with google_maps_location:", arena.google_maps_location);

      const [courts] = await pool.execute(
        `SELECT 
        cd.*,
        GROUP_CONCAT(DISTINCT st.sport_id) as sport_ids,
        GROUP_CONCAT(DISTINCT st.name) as sports_names,
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

      // Format courts data
      const formattedCourts = courts.map((court) => ({
        ...court,
        sport_ids: court.sport_ids
          ? court.sport_ids.split(",").map(Number)
          : [],
        sports: court.sports_names ? court.sports_names.split(",") : [],
        sports_names: court.sports_names ? court.sports_names.split(",") : [],
      }));

      // 2. Get sports available at this arena (from arena_sports table)
      const [arenaSports] = await pool.execute(
        `SELECT DISTINCT st.* 
       FROM sports_types st
       JOIN arena_sports ars ON st.sport_id = ars.sport_id
       WHERE ars.arena_id = ?
       ORDER BY st.name`,
        [arena_id]
      );

      // 3. Get sports from all courts in this arena
      const [courtSports] = await pool.execute(
        `SELECT DISTINCT st.* 
       FROM sports_types st
       JOIN court_sports cs ON st.sport_id = cs.sport_id
       JOIN court_details cd ON cs.court_id = cd.court_id
       WHERE cd.arena_id = ?
       ORDER BY st.name`,
        [arena_id]
      );

      // 4. Combine and deduplicate sports
      const allSports = [...arenaSports, ...courtSports];
      const sportsMap = new Map();

      allSports.forEach((sport) => {
        const key = sport.sport_id || sport.id;
        if (!sportsMap.has(key)) {
          sportsMap.set(key, {
            sport_id: sport.sport_id || sport.id,
            name: sport.name || sport.sport_name,
            icon_url: sport.icon_url,
          });
        }
      });

      const uniqueSports = Array.from(sportsMap.values());
      const sportsList = uniqueSports.map((sport) => sport.name);

      // 5. Get arena images
      const [images] = await pool.execute(
        "SELECT * FROM arena_images WHERE arena_id = ? ORDER BY is_primary DESC",
        [arena_id]
      );

      // 6. Get reviews count and average rating
      const [reviewStats] = await pool.execute(
        `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating
       FROM arena_reviews 
       WHERE arena_id = ?`,
        [arena_id]
      );

      console.log("Arena details fetched:", {
        arenaId: arena_id,
        courtsCount: formattedCourts.length,
        sportsCount: uniqueSports.length,
        imagesCount: images.length,
        hasGoogleMapsLink: !!arena.google_maps_location
      });

      res.json({
        ...arena,
        courts: formattedCourts,
        sports: uniqueSports, // Array of sport objects with id and name
        sports_list: sportsList, // Simple array of sport names for easy display
        images: images,
        total_reviews: reviewStats[0]?.total_reviews || 0,
        avg_rating: reviewStats[0]?.avg_rating || 0,
        rating: reviewStats[0]?.avg_rating || arena.rating || 0,
      });
    } catch (error) {
      console.error("Error in getArenaDetails:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  // Get sports for a specific arena
  getArenaSports: async (req, res) => {
    try {
      const { arena_id } = req.params;

      console.log("Fetching sports for arena:", arena_id);

      // Query to get sports for this arena from arena_sports table
      const [sports] = await pool.execute(
        `
      SELECT DISTINCT st.* 
      FROM sports_types st
      JOIN arena_sports ars ON st.sport_id = ars.sport_id
      WHERE ars.arena_id = ?
      ORDER BY st.name
    `,
        [arena_id]
      );

      console.log("Found sports:", sports.length);

      // If no sports in arena_sports, check court_sports
      if (sports.length === 0) {
        const [courtSports] = await pool.execute(
          `
        SELECT DISTINCT st.* 
        FROM sports_types st
        JOIN court_sports cs ON st.sport_id = cs.sport_id
        JOIN court_details cd ON cs.court_id = cd.court_id
        WHERE cd.arena_id = ?
        ORDER BY st.name
      `,
          [arena_id]
        );

        res.json({ sports: courtSports });
      } else {
        res.json({ sports });
      }
    } catch (error) {
      console.error("Error fetching arena sports:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  // Get sports available for a specific arena
  getAvailableSportsForArena: async (req, res) => {
    try {
      const { arena_id } = req.params;

      // Get sports from arena_sports
      const [arenaSports] = await pool.execute(
        `
      SELECT st.* 
      FROM sports_types st
      JOIN arena_sports ars ON st.sport_id = ars.sport_id
      WHERE ars.arena_id = ?
    `,
        [arena_id]
      );

      // Get sports from court_sports
      const [courtSports] = await pool.execute(
        `
      SELECT DISTINCT st.* 
      FROM sports_types st
      JOIN court_sports cs ON st.sport_id = cs.sport_id
      JOIN court_details cd ON cs.court_id = cd.court_id
      WHERE cd.arena_id = ?
    `,
        [arena_id]
      );

      // Combine and deduplicate
      const allSports = [...arenaSports, ...courtSports];
      const uniqueSports = allSports.filter(
        (sport, index, self) =>
          index ===
          self.findIndex(
            (s) => s.sport_id === sport.sport_id || s.name === sport.name
          )
      );

      res.json({ sports: uniqueSports });
    } catch (error) {
      console.error("Error fetching available sports:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // Search arenas
  // searchArenas: async (req, res) => {
  //   try {
  //     const { query, lat, lng, radius_km, skip_location } = req.query;

  //     const baseRadius = parseFloat(radius_km) || 8;
  //     const latitude = lat ? parseFloat(lat) : null;
  //     const longitude = lng ? parseFloat(lng) : null;
  //     const locationProvided =
  //       !skip_location && !Number.isNaN(latitude) && !Number.isNaN(longitude);

  //     const runSearch = async (radius) => {
  //       const distanceExpr = locationProvided
  //         ? ` (6371 * ACOS(
  //               COS(RADIANS(?)) * COS(RADIANS(a.location_lat)) *
  //               COS(RADIANS(a.location_lng) - RADIANS(?)) +
  //               SIN(RADIANS(?)) * SIN(RADIANS(a.location_lat))
  //             ))`
  //         : "NULL";

  //       let sqlQuery = `
  //         SELECT a.*, ${distanceExpr} AS distance_km
  //         FROM arenas a
  //       `;
  //       const whereConditions = ["a.is_active = 1", "a.is_blocked = 0"];
  //       const params = [];

  //       if (locationProvided) {
  //         params.push(latitude, longitude, latitude);
  //       }

  //       if (query) {
  //         const searchTerm = `%${query}%`;
  //         whereConditions.push(
  //           "(a.name LIKE ? OR a.address LIKE ? OR a.description LIKE ?)"
  //         );
  //         params.push(searchTerm, searchTerm, searchTerm);
  //       }

  //       if (whereConditions.length > 0) {
  //         sqlQuery += ` WHERE ${whereConditions.join(" AND ")}`;
  //       }

  //       if (locationProvided) {
  //         sqlQuery += " HAVING distance_km <= ?";
  //         params.push(radius);
  //       }
  //       sqlQuery +=
  //         " ORDER BY distance_km IS NULL, distance_km ASC, rating DESC, name ASC";
  //       const [arenas] = await pool.execute(sqlQuery, params);
  //       return arenas;
  //     };

  //     let arenas = await runSearch(baseRadius);

  //     // Expand radius if none found and location provided
  //     if (locationProvided && arenas.length === 0) {
  //       arenas = await runSearch(baseRadius * 2);
  //     }

  //     res.json(arenas);
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: "Server error", error: error.message });
  //   }
  // },
};

module.exports = arenaController;