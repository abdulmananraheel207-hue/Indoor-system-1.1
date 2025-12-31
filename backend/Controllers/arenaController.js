// File: arenaController.js - COMPLETE FIXED VERSION
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

  // Get available time slots for an arena - FIXED VERSION
  // File: arenaController.js - UPDATED getAvailableSlots function
  getAvailableSlots: async (req, res) => {
    try {
      const arena_id = parseInt(req.params.arena_id);
      let { date, sport_id } = req.query;

      console.log(
        "Fetching slots for arena:",
        arena_id,
        "date:",
        date,
        "sport:",
        sport_id
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
        b.booking_id,
        b.status as booking_status,
        CASE
          WHEN b.booking_id IS NOT NULL AND b.status IN ('pending', 'accepted', 'completed') THEN FALSE
          WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
          WHEN ts.is_holiday = TRUE THEN FALSE
          WHEN ts.locked_until > NOW() AND ts.locked_by_user_id IS NOT NULL THEN FALSE
          ELSE TRUE
        END as actually_available
      FROM time_slots ts
      LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
      LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
        AND b.status IN ('pending', 'accepted', 'completed')
      WHERE ts.arena_id = ?
        AND ts.date = ?
    `;

      const params = [arena_id, date];

      if (sport_id) {
        query += " AND ts.sport_id = ?";
        params.push(sport_id);
      }

      query += " ORDER BY ts.start_time";

      console.log("Executing query:", query, "with params:", params);

      const [slots] = await pool.execute(query, params);

      console.log("Found", slots.length, "slots");

      // Filter to show only actually available slots
      const availableSlots = slots.filter(
        (slot) =>
          slot.actually_available === 1 || slot.actually_available === true
      );

      // Format the response
      const formattedSlots = availableSlots.map((slot) => ({
        slot_id: slot.slot_id,
        arena_id: slot.arena_id,
        sport_id: slot.sport_id,
        sport_name: slot.sport_name,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.price,
        is_available: true, // Since we filtered for available slots
        actually_available: true,
        is_blocked_by_owner: slot.is_blocked_by_owner || false,
        is_holiday: slot.is_holiday || false,
      }));

      console.log("Returning", formattedSlots.length, "available slots");

      res.json(formattedSlots);
    } catch (error) {
      console.error("Error in getAvailableSlots:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  // Lock a time slot temporarily (10 minutes) - FIXED VERSION
  lockTimeSlot: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { slot_id } = req.params;
      const lockDuration = 10 * 60 * 1000; // 10 minutes in milliseconds

      await connection.beginTransaction();

      // Check if slot exists and is available for TODAY only
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
      const currentDate = new Date().toISOString().split("T")[0];
      const slotDate = new Date(slot.date).toISOString().split("T")[0];

      // Ensure we're only locking slots for today or future dates
      if (slotDate < currentDate) {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot lock past time slots",
        });
      }

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

  // Release a locked time slot - FIXED VERSION
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

  // Get arena reviews
  getArenaReviews: async (req, res) => {
    try {
      const arena_id = parseInt(req.params.arena_id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [reviews] = await pool.execute(
        `SELECT ar.*, u.name as user_name, u.profile_picture_url
         FROM arena_reviews ar
         JOIN users u ON ar.user_id = u.user_id
         WHERE ar.arena_id = ?
         ORDER BY ar.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [arena_id]
      );

      // Get total count
      const [countResult] = await pool.execute(
        "SELECT COUNT(*) as total FROM arena_reviews WHERE arena_id = ?",
        [arena_id]
      );

      res.json({
        reviews,
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  addReview: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { booking_id, rating, comment } = req.body;

      // Check if user has completed booking for this arena
      const [bookings] = await pool.execute(
        `SELECT 1 FROM bookings 
         WHERE user_id = ? AND arena_id = ? AND booking_id = ? 
         AND status IN ('completed', 'accepted')`,
        [req.user.id, arena_id, booking_id]
      );

      if (bookings.length === 0) {
        return res.status(400).json({
          message: "Cannot review. Booking not found or not completed.",
        });
      }

      // Check if user already reviewed this booking
      const [existingReview] = await pool.execute(
        "SELECT 1 FROM arena_reviews WHERE user_id = ? AND booking_id = ?",
        [req.user.id, booking_id]
      );

      if (existingReview.length > 0) {
        return res
          .status(400)
          .json({ message: "You have already reviewed this booking" });
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

      // Update arenas table if it has rating columns
      try {
        await pool.execute(
          `UPDATE arenas 
         SET rating = ?, total_reviews = ?
         WHERE arena_id = ?`,
          [
            avgRating[0].avg_rating || 0,
            avgRating[0].total_reviews || 0,
            arena_id,
          ]
        );
      } catch (updateError) {
        console.warn(
          "Could not update arena rating, columns might not exist:",
          updateError.message
        );
      }

      res.status(201).json({ message: "Review added successfully" });
    } catch (error) {
      console.error("Error in addReview:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
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

  // Get arena details by ID
  getArenaDetails: async (req, res) => {
    try {
      const { arena_id } = req.params;

      const [arenas] = await pool.execute(
        "SELECT * FROM arenas WHERE arena_id = ? AND is_active = 1 AND is_blocked = 0",
        [arena_id]
      );

      if (arenas.length === 0) {
        return res.status(404).json({ message: "Arena not found" });
      }

      const arena = arenas[0];

      // Fetch courts with their sports and primary image
      const [courts] = await pool.execute(
        `SELECT cd.*, 
                GROUP_CONCAT(DISTINCT st.sport_id) as sport_ids,
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

      // Normalize sports list for arena: distinct sports from courts and time_slots
      const [sportsFromCourts] = await pool.execute(
        `SELECT DISTINCT st.sport_id, st.name
         FROM sports_types st
         JOIN court_sports cs ON st.sport_id = cs.sport_id
         JOIN court_details cd ON cs.court_id = cd.court_id
         WHERE cd.arena_id = ?`,
        [arena_id]
      );

      // Fallback: if no court sports, look for sports in time_slots
      let sports = sportsFromCourts;
      if (!sports || sports.length === 0) {
        const [sportsFromSlots] = await pool.execute(
          `SELECT DISTINCT st.sport_id, st.name
           FROM sports_types st
           JOIN time_slots ts ON st.sport_id = ts.sport_id
           WHERE ts.arena_id = ?`,
          [arena_id]
        );
        sports = sportsFromSlots;
      }

      res.json({ ...arena, courts, sports });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Search arenas
  searchArenas: async (req, res) => {
    try {
      const { query, lat, lng, radius_km, skip_location } = req.query;

      const baseRadius = parseFloat(radius_km) || 8;
      const latitude = lat ? parseFloat(lat) : null;
      const longitude = lng ? parseFloat(lng) : null;
      const locationProvided =
        !skip_location && !Number.isNaN(latitude) && !Number.isNaN(longitude);

      const runSearch = async (radius) => {
        const distanceExpr = locationProvided
          ? ` (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(a.location_lat)) *
                COS(RADIANS(a.location_lng) - RADIANS(?)) +
                SIN(RADIANS(?)) * SIN(RADIANS(a.location_lat))
              ))`
          : "NULL";

        let sqlQuery = `
          SELECT a.*, ${distanceExpr} AS distance_km
          FROM arenas a
        `;
        const whereConditions = ["a.is_active = 1", "a.is_blocked = 0"];
        const params = [];

        if (locationProvided) {
          params.push(latitude, longitude, latitude);
        }

        if (query) {
          const searchTerm = `%${query}%`;
          whereConditions.push(
            "(a.name LIKE ? OR a.address LIKE ? OR a.description LIKE ?)"
          );
          params.push(searchTerm, searchTerm, searchTerm);
        }

        if (whereConditions.length > 0) {
          sqlQuery += ` WHERE ${whereConditions.join(" AND ")}`;
        }

        if (locationProvided) {
          sqlQuery += " HAVING distance_km <= ?";
          params.push(radius);
        }
        sqlQuery +=
          " ORDER BY distance_km IS NULL, distance_km ASC, rating DESC, name ASC";
        const [arenas] = await pool.execute(sqlQuery, params);
        return arenas;
      };

      let arenas = await runSearch(baseRadius);

      // Expand radius if none found and location provided
      if (locationProvided && arenas.length === 0) {
        arenas = await runSearch(baseRadius * 2);
      }

      res.json(arenas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = arenaController;
