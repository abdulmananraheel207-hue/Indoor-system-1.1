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

      // Get time slots for next 7 days
      const [slots] = await pool.execute(
        `SELECT * FROM time_slots 
         WHERE arena_id = ? AND date >= CURDATE() AND date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         ORDER BY date, start_time`,
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

      res.json({
        ...arenas[0],
        images,
        time_slots: slots,
        reviews,
        is_favorite,
      });
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
};

module.exports = userController;
