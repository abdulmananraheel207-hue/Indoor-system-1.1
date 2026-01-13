const bcrypt = require("bcryptjs");
const pool = require("../db");

const userController = {
  // In userController.js - uploadProfilePicture function
  uploadProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const user_id = req.user.id;

      // Cloudinary returns secure_url in req.file
      const profilePictureUrl = req.file.path; // This is the Cloudinary URL

      console.log('Uploaded to Cloudinary:', profilePictureUrl);

      // Update user profile picture in database
      await pool.execute(
        'UPDATE users SET profile_picture_url = ? WHERE user_id = ?',
        [profilePictureUrl, user_id]
      );

      res.json({
        message: 'Profile picture uploaded successfully',
        image_url: profilePictureUrl
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const [users] = await pool.execute(
        `SELECT user_id, name, email, phone_number, profile_picture_url, 
                location_lat, location_lng, created_at 
         FROM users WHERE user_id = ?`,
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's favorite arenas
      const [favorites] = await pool.execute(
        `SELECT a.arena_id, a.name, a.address, a.rating, a.base_price_per_hour
         FROM favorite_arenas fa
         JOIN arenas a ON fa.arena_id = a.arena_id
         WHERE fa.user_id = ?`,
        [req.user.id]
      );

      // Get user's teams
      const [teams] = await pool.execute(
        `SELECT t.team_id, t.team_name, t.sport_id, st.name as sport_name
         FROM teams t
         JOIN sports_types st ON t.sport_id = st.sport_id
         JOIN team_members tm ON t.team_id = tm.team_id
         WHERE tm.user_id = ?`,
        [req.user.id]
      );

      res.json({
        ...users[0],
        favorite_arenas: favorites,
        teams: teams,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { name, phone_number, location_lat, location_lng } = req.body;
      const updateFields = [];
      const values = [];

      if (name) {
        updateFields.push("name = ?");
        values.push(name);
      }
      if (phone_number) {
        updateFields.push("phone_number = ?");
        values.push(phone_number);
      }
      if (location_lat !== undefined) {
        updateFields.push("location_lat = ?");
        values.push(location_lat);
      }
      if (location_lng !== undefined) {
        updateFields.push("location_lng = ?");
        values.push(location_lng);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(req.user.id);

      await pool.execute(
        `UPDATE users SET ${updateFields.join(", ")} WHERE user_id = ?`,
        values
      );

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update profile picture
  updateProfilePicture: async (req, res) => {
    try {
      const { profile_picture_url } = req.body;

      if (!profile_picture_url) {
        return res
          .status(400)
          .json({ message: "Profile picture URL is required" });
      }

      await pool.execute(
        "UPDATE users SET profile_picture_url = ? WHERE user_id = ?",
        [profile_picture_url, req.user.id]
      );

      res.json({
        message: "Profile picture updated successfully",
        profile_picture_url,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      // Get current password hash
      const [users] = await pool.execute(
        "SELECT password_hash FROM users WHERE user_id = ?",
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        current_password,
        users[0].password_hash
      );
      if (!isValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      await pool.execute(
        "UPDATE users SET password_hash = ? WHERE user_id = ?",
        [hashedPassword, req.user.id]
      );

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get nearby arenas based on location
  getNearbyArenas: async (req, res) => {
    try {
      const { lat, lng, sport_id, radius = 8 } = req.query;

      if (!lat || !lng) {
        return res
          .status(400)
          .json({ message: "Location coordinates are required" });
      }

      let query = `
        SELECT a.*, 
               (6371 * acos(cos(radians(?)) * cos(radians(a.location_lat)) * 
                cos(radians(a.location_lng) - radians(?)) + 
                sin(radians(?)) * sin(radians(a.location_lat)))) AS distance,
               GROUP_CONCAT(DISTINCT st.name) as sports
        FROM arenas a
        LEFT JOIN arena_sports asp ON a.arena_id = asp.arena_id
        LEFT JOIN sports_types st ON asp.sport_id = st.sport_id
        WHERE a.is_active = TRUE AND a.is_blocked = FALSE
      `;

      const queryParams = [lat, lng, lat];

      if (sport_id) {
        query += " AND asp.sport_id = ?";
        queryParams.push(sport_id);
      }

      query += `
        GROUP BY a.arena_id
        HAVING distance < ?
        ORDER BY distance ASC
        LIMIT 20
      `;

      queryParams.push(radius);

      const [arenas] = await pool.execute(query, queryParams);

      res.json(arenas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all active arenas (for user homepage)
  getAllArenas: async (req, res) => {
    try {
      const { sport_id } = req.query;

      let query = `
            SELECT a.*, 
                   AVG(ar.rating) as avg_rating,
                   COUNT(ar.review_id) as review_count,
                   GROUP_CONCAT(DISTINCT st.name) as sports,
                   (SELECT image_url FROM arena_images WHERE arena_id = a.arena_id AND is_primary = TRUE LIMIT 1) as primary_image
            FROM arenas a
            LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
            LEFT JOIN arena_sports asp ON a.arena_id = asp.arena_id
            LEFT JOIN sports_types st ON asp.sport_id = st.sport_id
            WHERE a.is_active = TRUE AND a.is_blocked = FALSE
        `;

      const params = [];

      if (sport_id) {
        query += " AND asp.sport_id = ?";
        params.push(sport_id);
      }

      query += " GROUP BY a.arena_id ORDER BY a.created_at DESC LIMIT 50";

      const [arenas] = await pool.execute(query, params);

      // Format the sports field properly
      const formattedArenas = arenas.map((arena) => ({
        ...arena,
        sports: arena.sports ? arena.sports.split(",") : [],
      }));

      res.json(formattedArenas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Search arenas
  searchArenas: async (req, res) => {
    try {
      const {
        query,
        sport_id,
        min_price,
        max_price,
        sort_by = "rating",
      } = req.query;

      let sql = `
        SELECT a.*, 
               AVG(ar.rating) as avg_rating,
               COUNT(ar.review_id) as review_count,
               GROUP_CONCAT(DISTINCT st.name) as sports
        FROM arenas a
        LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
        LEFT JOIN arena_sports asp ON a.arena_id = asp.arena_id
        LEFT JOIN sports_types st ON asp.sport_id = st.sport_id
        WHERE a.is_active = TRUE AND a.is_blocked = FALSE
      `;

      const params = [];

      if (query) {
        sql += " AND (a.name LIKE ? OR a.address LIKE ?)";
        params.push(`%${query}%`, `%${query}%`);
      }

      if (sport_id) {
        sql += " AND asp.sport_id = ?";
        params.push(sport_id);
      }

      if (min_price) {
        sql += " AND a.base_price_per_hour >= ?";
        params.push(min_price);
      }

      if (max_price) {
        sql += " AND a.base_price_per_hour <= ?";
        params.push(max_price);
      }

      sql += " GROUP BY a.arena_id";

      // Sorting
      switch (sort_by) {
        case "price_asc":
          sql += " ORDER BY a.base_price_per_hour ASC";
          break;
        case "price_desc":
          sql += " ORDER BY a.base_price_per_hour DESC";
          break;
        case "rating":
          sql += " ORDER BY avg_rating DESC";
          break;
        case "distance":
          // Requires location coordinates
          if (req.query.lat && req.query.lng) {
            sql = sql.replace(
              "SELECT a.*",
              `
              SELECT a.*, 
                     (6371 * acos(cos(radians(?)) * cos(radians(a.location_lat)) * 
                      cos(radians(a.location_lng) - radians(?)) + 
                      sin(radians(?)) * sin(radians(a.location_lat)))) AS distance
            `
            );
            params.unshift(req.query.lat, req.query.lng, req.query.lat);
            sql += " ORDER BY distance ASC";
          }
          break;
        default:
          sql += " ORDER BY a.rating DESC";
      }

      const [arenas] = await pool.execute(sql, params);
      res.json(arenas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get arena details
  // In userController.js - Update getArenaDetails function
  getArenaDetails: async (req, res) => {
    try {
      const { arena_id } = req.params;

      const [arenas] = await pool.execute(
        `SELECT a.*, 
              ao.arena_name as owner_name,
              ao.phone_number as owner_phone,
              GROUP_CONCAT(DISTINCT st.name) as sports,
              AVG(ar.rating) as avg_rating,
              COUNT(ar.review_id) as total_reviews
       FROM arenas a
       JOIN arena_owners ao ON a.owner_id = ao.owner_id
       LEFT JOIN arena_sports asp ON a.arena_id = asp.arena_id
       LEFT JOIN sports_types st ON asp.sport_id = st.sport_id
       LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
       WHERE a.arena_id = ? AND a.is_active = TRUE
       GROUP BY a.arena_id`,
        [arena_id]
      );

      if (arenas.length === 0) {
        return res.status(404).json({ message: "Arena not found" });
      }

      // Get arena images
      const [images] = await pool.execute(
        "SELECT image_url, is_primary FROM arena_images WHERE arena_id = ? ORDER BY is_primary DESC",
        [arena_id]
      );

      // Get all courts for this arena
      const [courts] = await pool.execute(
        `SELECT cd.*, 
              GROUP_CONCAT(DISTINCT st.name) as sports_names
       FROM court_details cd
       LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
       LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
       WHERE cd.arena_id = ?
       GROUP BY cd.court_id
       ORDER BY cd.court_number`,
        [arena_id]
      );

      // Get time slots for next 7 days (all courts)
      const [slots] = await pool.execute(
        `SELECT ts.*, cd.court_name, cd.court_number,
              b.booking_id as existing_booking_id,
              b.status as booking_status
       FROM time_slots ts
       JOIN court_details cd ON ts.court_id = cd.court_id
       LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
         AND b.status IN ('pending', 'accepted', 'completed')
       WHERE ts.arena_id = ? 
         AND ts.date >= CURDATE() 
         AND ts.date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY ts.date, ts.start_time`,
        [arena_id]
      );

      // Get reviews
      const [reviews] = await pool.execute(
        `SELECT ar.*, u.name as user_name, u.profile_picture_url
       FROM arena_reviews ar
       JOIN users u ON ar.user_id = u.user_id
       WHERE ar.arena_id = ?
       ORDER BY ar.created_at DESC
       LIMIT 10`,
        [arena_id]
      );

      // Check if arena is in user's favorites
      let is_favorite = false;
      if (req.user && req.user.role === "user") {
        const [fav] = await pool.execute(
          "SELECT 1 FROM favorite_arenas WHERE user_id = ? AND arena_id = ?",
          [req.user.id, arena_id]
        );
        is_favorite = fav.length > 0;
      }

      // Organize slots by court for easier frontend consumption
      const slotsByCourt = {};
      slots.forEach(slot => {
        const courtId = slot.court_id;
        if (!slotsByCourt[courtId]) {
          slotsByCourt[courtId] = [];
        }
        slotsByCourt[courtId].push(slot);
      });

      res.json({
        ...arenas[0],
        images,
        courts: courts.map(court => ({
          ...court,
          sports: court.sports_names ? court.sports_names.split(',') : []
        })),
        slots: slotsByCourt,
        reviews,
        is_favorite,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  getCourtSlots: async (req, res) => {
    try {
      const { arena_id, court_id } = req.params;
      const { date, sport_id } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      let query = `
      SELECT ts.*, cd.court_name, cd.court_number,
             CASE 
               WHEN b.booking_id IS NOT NULL THEN FALSE
               WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
               WHEN ts.is_holiday = TRUE THEN FALSE
               WHEN ts.locked_until > NOW() AND ts.locked_by_user_id IS NOT NULL THEN FALSE
               ELSE ts.is_available 
             END as actually_available
      FROM time_slots ts
      JOIN court_details cd ON ts.court_id = cd.court_id
      LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
        AND b.status IN ('pending', 'accepted', 'completed')
      WHERE ts.arena_id = ? 
        AND ts.court_id = ?
        AND ts.date = ?
        AND (b.booking_id IS NULL OR b.status NOT IN ('pending', 'accepted', 'completed'))
    `;

      const params = [arena_id, court_id, date];

      if (sport_id) {
        query += " AND ts.sport_id = ?";
        params.push(sport_id);
      }

      query += " ORDER BY ts.start_time";

      const [slots] = await pool.execute(query, params);

      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // Get user's favorite arenas

  // Then in getFavoriteArenas:
  getFavoriteArenas: async (req, res) => {
    try {
      console.log("Fetching favorites for user ID:", req.user?.id);

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const [favorites] = await pool.execute(
        `
            SELECT 
              a.arena_id, 
              a.name, 
              a.description,
              a.location_lat,
              a.location_lng,
              a.address,
              a.base_price_per_hour,
              a.rating,
              a.total_reviews,
              a.is_active
            FROM favorite_arenas fa
            INNER JOIN arenas a ON fa.arena_id = a.arena_id
            WHERE fa.user_id = ?
            AND a.is_active = TRUE
            AND a.is_blocked = FALSE
            ORDER BY fa.added_at DESC
        `,
        [req.user.id]
      );

      console.log("Found favorites:", favorites.length);
      res.json(favorites);
    } catch (error) {
      console.error("Error in getFavoriteArenas:", error);
      res.status(500).json({
        message: "Server error fetching favorites",
        error: error.message,
      });
    }
  },
  // Add arena to favorites
  addToFavorites: async (req, res) => {
    try {
      const { arena_id } = req.params;

      // Check if arena exists
      const [arenas] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND is_active = TRUE",
        [arena_id]
      );

      if (arenas.length === 0) {
        return res.status(404).json({ message: "Arena not found" });
      }

      // Check if already in favorites
      const [existing] = await pool.execute(
        "SELECT 1 FROM favorite_arenas WHERE user_id = ? AND arena_id = ?",
        [req.user.id, arena_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({ message: "Arena already in favorites" });
      }

      await pool.execute(
        "INSERT INTO favorite_arenas (user_id, arena_id) VALUES (?, ?)",
        [req.user.id, arena_id]
      );

      res.json({ message: "Arena added to favorites" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Remove arena from favorites
  removeFromFavorites: async (req, res) => {
    try {
      const { arena_id } = req.params;

      await pool.execute(
        "DELETE FROM favorite_arenas WHERE user_id = ? AND arena_id = ?",
        [req.user.id, arena_id]
      );

      res.json({ message: "Arena removed from favorites" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get available slots for an arena (general)
  getAvailableSlots: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { date, sport_id, court_id } = req.query;

      console.log("🔍 getAvailableSlots called for arena:", arena_id);
      console.log("🔍 Query params:", { date, sport_id, court_id });

      let query = `
        SELECT ts.*, cd.court_name, cd.court_number, st.name as sport_name,
               CASE 
                 WHEN b.booking_id IS NOT NULL THEN FALSE
                 WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
                 WHEN ts.is_holiday = TRUE THEN FALSE
                 WHEN ts.locked_until > NOW() AND ts.locked_by_user_id IS NOT NULL THEN FALSE
                 ELSE ts.is_available 
               END as actually_available
        FROM time_slots ts
        JOIN court_details cd ON ts.court_id = cd.court_id
        LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
        LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
          AND b.status IN ('pending', 'accepted', 'completed')
        WHERE ts.arena_id = ?
          AND (b.booking_id IS NULL OR b.status NOT IN ('pending', 'accepted', 'completed'))
      `;

      const params = [arena_id];

      if (date) {
        query += " AND ts.date = ?";
        params.push(date);
      }

      if (sport_id) {
        query += " AND ts.sport_id = ?";
        params.push(sport_id);
      }

      if (court_id) {
        query += " AND ts.court_id = ?";
        params.push(court_id);
      }

      query += " ORDER BY ts.date, ts.start_time";

      console.log("🔍 SQL Query:", query);
      console.log("🔍 Query params:", params);

      const [slots] = await pool.execute(query, params);

      console.log(`✅ Found ${slots.length} slots`);

      res.json(slots);
    } catch (error) {
      console.error("❌ Error in getAvailableSlots:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  // Get sports categories
  getSportsCategories: async (req, res) => {
    try {
      console.log("🔍 getSportsCategories called");
      const [sports] = await pool.execute(
        "SELECT sport_id, name FROM sports_types ORDER BY name"
      );
      console.log(`✅ Found ${sports.length} sports`);
      res.json(sports);
    } catch (error) {
      console.error("❌ Error fetching sports:", error);
      // Return default sports as fallback
      res.json([
        { sport_id: 1, name: "Badminton" },
        { sport_id: 2, name: "Tennis" },
        { sport_id: 3, name: "Squash" },
        { sport_id: 4, name: "Basketball" },
        { sport_id: 5, name: "Volleyball" },
        { sport_id: 6, name: "Cricket" },
        { sport_id: 7, name: "Football" },
        { sport_id: 8, name: "Table Tennis" }
      ]);
    }
  },

  // Get court details for an arena
  getCourtDetails: async (req, res) => {
    try {
      const { arena_id } = req.params;
      console.log("🔍 getCourtDetails called for arena:", arena_id);

      const [courts] = await pool.execute(
        `SELECT cd.*, 
                GROUP_CONCAT(DISTINCT st.name) as sports_names
         FROM court_details cd
         LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
         LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
         WHERE cd.arena_id = ?
         GROUP BY cd.court_id
         ORDER BY cd.court_number`,
        [arena_id]
      );

      // Format sports as array
      const formattedCourts = courts.map(court => ({
        ...court,
        sports: court.sports_names ? court.sports_names.split(',') : []
      }));

      console.log(`✅ Found ${formattedCourts.length} courts`);

      res.json({
        courts: formattedCourts
      });
    } catch (error) {
      console.error("❌ Error in getCourtDetails:", error);
      res.status(500).json({
        message: "Error fetching court details",
        error: error.message
      });
    }
  },

  // Get sports available at an arena
  getArenaSports: async (req, res) => {
    try {
      const { arena_id } = req.params;
      console.log("🔍 getArenaSports called for arena:", arena_id);

      const [sports] = await pool.execute(
        `SELECT st.sport_id, st.name
         FROM arena_sports asp
         JOIN sports_types st ON asp.sport_id = st.sport_id
         WHERE asp.arena_id = ?
         ORDER BY st.name`,
        [arena_id]
      );

      console.log(`✅ Found ${sports.length} sports for arena`);

      res.json({
        sports
      });
    } catch (error) {
      console.error("❌ Error in getArenaSports:", error);
      res.status(500).json({
        message: "Error fetching arena sports",
        error: error.message
      });
    }
  },

  // Get available sports for arena
  getAvailableSportsForArena: async (req, res) => {
    try {
      const { arena_id } = req.params;
      console.log("🔍 getAvailableSportsForArena called for arena:", arena_id);

      // Get sports that have active courts
      const [sports] = await pool.execute(
        `SELECT DISTINCT st.sport_id, st.name
         FROM court_details cd
         JOIN court_sports cs ON cd.court_id = cs.court_id
         JOIN sports_types st ON cs.sport_id = st.sport_id
         WHERE cd.arena_id = ? AND cd.is_active = TRUE
         ORDER BY st.name`,
        [arena_id]
      );

      console.log(`✅ Found ${sports.length} available sports`);

      res.json({
        sports
      });
    } catch (error) {
      console.error("❌ Error in getAvailableSportsForArena:", error);
      res.status(500).json({
        message: "Error fetching available sports",
        error: error.message
      });
    }
  },

  // Lock a time slot
  lockTimeSlot: async (req, res) => {
    try {
      const { slot_id } = req.params;
      const user_id = req.user ? req.user.id : null;
      const lock_duration = 15 * 60; // 15 minutes in seconds

      console.log("🔒 lockTimeSlot called for slot:", slot_id, "by user:", user_id);

      if (!user_id) {
        console.log("❌ Authentication required");
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if slot exists and is available
      const [slots] = await pool.execute(
        `SELECT * FROM time_slots 
         WHERE slot_id = ? 
         AND is_available = TRUE
         AND (is_blocked_by_owner = FALSE OR is_blocked_by_owner IS NULL)
         AND (locked_until IS NULL OR locked_until < NOW())`,
        [slot_id]
      );

      if (slots.length === 0) {
        console.log("❌ Slot not available for locking");
        return res.status(400).json({ message: "Slot not available for locking" });
      }

      // Lock the slot
      await pool.execute(
        `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL ? SECOND),
             locked_by_user_id = ?
         WHERE slot_id = ?`,
        [lock_duration, user_id, slot_id]
      );

      console.log("✅ Slot locked successfully");

      res.json({
        message: "Slot locked successfully",
        lock_expires_at: new Date(Date.now() + lock_duration * 1000)
      });
    } catch (error) {
      console.error("❌ Error in lockTimeSlot:", error);
      res.status(500).json({
        message: "Error locking slot",
        error: error.message
      });
    }
  },

  // Release a time slot
  releaseTimeSlot: async (req, res) => {
    try {
      const { slot_id } = req.params;
      const user_id = req.user ? req.user.id : null;

      console.log("🔓 releaseTimeSlot called for slot:", slot_id, "by user:", user_id);

      if (!user_id) {
        console.log("❌ Authentication required");
        return res.status(401).json({ message: "Authentication required" });
      }

      // Release the slot
      await pool.execute(
        `UPDATE time_slots 
         SET locked_until = NULL,
             locked_by_user_id = NULL
         WHERE slot_id = ? AND (locked_by_user_id = ? OR ? = 'admin')`,
        [slot_id, user_id, req.user.role]
      );

      console.log("✅ Slot released successfully");

      res.json({
        message: "Slot released successfully"
      });
    } catch (error) {
      console.error("❌ Error in releaseTimeSlot:", error);
      res.status(500).json({
        message: "Error releasing slot",
        error: error.message
      });
    }
  },

  // Add review
  addReview: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { rating, comment } = req.body;
      const user_id = req.user ? req.user.id : null;

      console.log("📝 addReview called for arena:", arena_id, "by user:", user_id);

      if (!user_id) {
        console.log("❌ Authentication required");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!rating || !comment) {
        console.log("❌ Rating and comment are required");
        return res.status(400).json({ message: "Rating and comment are required" });
      }

      // Check if user has already reviewed this arena
      const [existingReviews] = await pool.execute(
        "SELECT review_id FROM arena_reviews WHERE arena_id = ? AND user_id = ?",
        [arena_id, user_id]
      );

      if (existingReviews.length > 0) {
        console.log("❌ User already reviewed this arena");
        return res.status(400).json({ message: "You have already reviewed this arena" });
      }

      // Add review
      await pool.execute(
        "INSERT INTO arena_reviews (arena_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
        [arena_id, user_id, rating, comment]
      );

      console.log("✅ Review added successfully");

      res.json({
        message: "Review added successfully"
      });
    } catch (error) {
      console.error("❌ Error in addReview:", error);
      res.status(500).json({
        message: "Error adding review",
        error: error.message
      });
    }
  },

  // Get reviews for an arena
  getReviews: async (req, res) => {
    try {
      const { arena_id } = req.params;
      console.log("📋 getReviews called for arena:", arena_id);

      const [reviews] = await pool.execute(
        `SELECT ar.*, u.name as user_name, u.profile_picture_url
         FROM arena_reviews ar
         JOIN users u ON ar.user_id = u.user_id
         WHERE ar.arena_id = ?
         ORDER BY ar.created_at DESC`,
        [arena_id]
      );

      console.log(`✅ Found ${reviews.length} reviews`);

      res.json({
        reviews
      });
    } catch (error) {
      console.error("❌ Error in getReviews:", error);
      res.status(500).json({
        message: "Error fetching reviews",
        error: error.message
      });
    }
  }
};

module.exports = userController;
