const pool = require("../db");

const managerController = {
  // In managerController.js - Update getDashboard to use initial stats

  getDashboard: async (req, res) => {
    try {
      const { owner_id, permissions, id: manager_id } = req.manager;
      const today = new Date().toISOString().split("T")[0];

      console.log("📊 Building dashboard for manager:", manager_id);
      console.log("Permissions from req.manager:", permissions);

      // Get the raw permissions from the database to extract arena IDs and initial stats
      let accessibleArenaIds = [];
      let arenaPermissionsMap = {};
      let initialStats = {};

      const [managerData] = await pool.execute(
        `SELECT permissions FROM arena_managers WHERE manager_id = ?`,
        [manager_id]
      );

      if (managerData.length > 0) {
        let rawPermissions = {};
        try {
          rawPermissions = typeof managerData[0].permissions === 'string'
            ? JSON.parse(managerData[0].permissions)
            : managerData[0].permissions || {};

          console.log("📦 Raw permissions from DB:", rawPermissions);

          // Extract arena IDs, their permissions, and initial stats
          Object.keys(rawPermissions).forEach(key => {
            if (key.startsWith('arena_')) {
              const arenaId = parseInt(key.replace('arena_', ''));
              accessibleArenaIds.push(arenaId);
              arenaPermissionsMap[arenaId] = rawPermissions[key] || {};

              // Get initial stats if they exist
              if (rawPermissions[key]?.initial_stats) {
                initialStats[arenaId] = rawPermissions[key].initial_stats;
              }
            }
          });
        } catch (e) {
          console.error("Error parsing permissions:", e);
        }
      }

      console.log("Accessible arenas from DB:", accessibleArenaIds);
      console.log("Initial stats from permissions:", initialStats);

      const dashboardData = {
        permissions: permissions,
        arena_permissions: arenaPermissionsMap,
        stats: {
          today_bookings: 0,
          pending_requests_count: 0,
          total_arenas: accessibleArenaIds.length,
          today_revenue: 0,
          monthly_revenue: 0
        },
        pending_requests: [],
        recent_bookings: [],
        arenas: [],
        arena_stats: []
      };

      if (accessibleArenaIds.length === 0) {
        return res.json(dashboardData);
      }

      const placeholders = accessibleArenaIds.map(() => '?').join(',');

      // Get arena details
      const [arenas] = await pool.execute(
        `SELECT arena_id, name, address, base_price_per_hour 
             FROM arenas 
             WHERE arena_id IN (${placeholders}) AND is_active = TRUE`,
        accessibleArenaIds
      );
      dashboardData.arenas = arenas;

      // Get current stats for each arena (or use initial stats if no current data)
      for (let arena of arenas) {
        // Today's bookings for this arena
        const [todayBookings] = await pool.execute(
          `SELECT COUNT(*) as count 
                 FROM bookings b
                 JOIN time_slots ts ON b.slot_id = ts.slot_id
                 WHERE b.arena_id = ? AND DATE(ts.date) = ?`,
          [arena.arena_id, today]
        );

        // Pending requests for this arena
        const [pendingCount] = await pool.execute(
          `SELECT COUNT(*) as count 
                 FROM bookings b
                 WHERE b.arena_id = ? AND b.status = 'pending'`,
          [arena.arena_id]
        );

        // Today's revenue for this arena
        const [todayRevenue] = await pool.execute(
          `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
                 FROM bookings b
                 JOIN time_slots ts ON b.slot_id = ts.slot_id
                 WHERE b.arena_id = ? AND DATE(ts.date) = ? AND b.status = 'completed'`,
          [arena.arena_id, today]
        );

        // Monthly revenue for this arena
        const [monthlyRevenue] = await pool.execute(
          `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
                 FROM bookings b
                 JOIN time_slots ts ON b.slot_id = ts.slot_id
                 WHERE b.arena_id = ? 
                   AND MONTH(ts.date) = MONTH(CURRENT_DATE())
                   AND YEAR(ts.date) = YEAR(CURRENT_DATE())
                   AND b.status = 'completed'`,
          [arena.arena_id]
        );

        // Get initial stats for this arena if they exist
        const arenaInitialStats = initialStats[arena.arena_id] || {};

        // Use current stats, fallback to initial stats if current is 0
        const currentTodayBookings = todayBookings[0].count || 0;
        const currentPendingCount = pendingCount[0].count || 0;
        const currentTodayRevenue = todayRevenue[0].revenue || 0;
        const currentMonthlyRevenue = monthlyRevenue[0].revenue || 0;

        dashboardData.arena_stats.push({
          arena_id: arena.arena_id,
          arena_name: arena.name,
          today_bookings: currentTodayBookings || arenaInitialStats.today_bookings || 0,
          pending_bookings: currentPendingCount || arenaInitialStats.pending_requests || 0,
          today_revenue: currentTodayRevenue || arenaInitialStats.today_revenue || 0,
          monthly_revenue: currentMonthlyRevenue || arenaInitialStats.monthly_revenue || 0,
          permissions: arenaPermissionsMap[arena.arena_id] || {}
        });

        // Add to global stats (use current or initial)
        dashboardData.stats.today_bookings += currentTodayBookings || arenaInitialStats.today_bookings || 0;
        dashboardData.stats.pending_requests_count += currentPendingCount || arenaInitialStats.pending_requests || 0;
        dashboardData.stats.today_revenue += currentTodayRevenue || arenaInitialStats.today_revenue || 0;
        dashboardData.stats.monthly_revenue += currentMonthlyRevenue || arenaInitialStats.monthly_revenue || 0;
      }

      // Get pending requests (only if manager has permission)
      if (permissions.manage_bookings) {
        const [pendingRequests] = await pool.execute(
          `SELECT b.*, u.name as user_name, u.phone_number as user_phone,
                        st.name as sport_name, a.name as arena_name,
                        ts.date, ts.start_time, ts.end_time,
                        a.arena_id
                 FROM bookings b
                 JOIN arenas a ON b.arena_id = a.arena_id
                 JOIN users u ON b.user_id = u.user_id
                 JOIN sports_types st ON b.sport_id = st.sport_id
                 JOIN time_slots ts ON b.slot_id = ts.slot_id
                 WHERE a.arena_id IN (${placeholders}) AND b.status = 'pending'
                 ORDER BY ts.date ASC, ts.start_time ASC
                 LIMIT 10`,
          accessibleArenaIds
        );
        dashboardData.pending_requests = pendingRequests;

        const [recentBookings] = await pool.execute(
          `SELECT b.*, u.name as user_name, st.name as sport_name,
                        a.name as arena_name, ts.date, ts.start_time, ts.end_time,
                        a.arena_id
                 FROM bookings b
                 JOIN arenas a ON b.arena_id = a.arena_id
                 JOIN users u ON b.user_id = u.user_id
                 JOIN sports_types st ON b.sport_id = st.sport_id
                 JOIN time_slots ts ON b.slot_id = ts.slot_id
                 WHERE a.arena_id IN (${placeholders})
                 ORDER BY b.booking_date DESC
                 LIMIT 5`,
          accessibleArenaIds
        );
        dashboardData.recent_bookings = recentBookings;
      }

      console.log("✅ Dashboard data prepared with arena stats:", dashboardData.arena_stats);
      res.json(dashboardData);
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // In managerController.js - Update getBookings

  getBookings: async (req, res) => {
    try {
      const { owner_id, id: manager_id } = req.manager;
      const { status, date_from, date_to, type = "all", arena_id } = req.query;

      // Get all arenas this manager has access to
      const [managerData] = await pool.execute(
        `SELECT permissions FROM arena_managers WHERE manager_id = ?`,
        [manager_id]
      );

      let accessibleArenaIds = [];
      if (managerData.length > 0) {
        let permissions = {};
        try {
          permissions = typeof managerData[0].permissions === 'string'
            ? JSON.parse(managerData[0].permissions)
            : managerData[0].permissions || {};

          Object.keys(permissions).forEach(key => {
            if (key.startsWith('arena_')) {
              const arenaId = parseInt(key.replace('arena_', ''));
              accessibleArenaIds.push(arenaId);
            }
          });
        } catch (e) {
          console.error("Error parsing permissions:", e);
        }
      }

      if (accessibleArenaIds.length === 0) {
        return res.json([]);
      }

      let query = `
            SELECT b.booking_id, b.status, b.total_amount, b.commission_amount,
                   b.booking_date, b.payment_status, u.name as user_name,
                   u.email as user_email, u.phone_number as user_phone,
                   st.name as sport_name, a.name as arena_name,
                   ts.date, ts.start_time, ts.end_time,
                   a.arena_id
            FROM bookings b
            JOIN arenas a ON b.arena_id = a.arena_id
            JOIN users u ON b.user_id = u.user_id
            JOIN sports_types st ON b.sport_id = st.sport_id
            JOIN time_slots ts ON b.slot_id = ts.slot_id
            WHERE a.arena_id IN (${accessibleArenaIds.map(() => '?').join(',')})
        `;

      const params = [...accessibleArenaIds];

      // Filter by specific arena if provided
      if (arena_id) {
        query += " AND a.arena_id = ?";
        params.push(arena_id);
      }

      if (status && status !== "all") {
        query += " AND b.status = ?";
        params.push(status);
      }

      if (type === "upcoming") {
        query += " AND b.status IN ('accepted', 'pending') AND ts.date >= CURDATE()";
      } else if (type === "history") {
        query += " AND b.status IN ('completed', 'cancelled', 'rejected')";
      }

      if (date_from) {
        query += " AND ts.date >= ?";
        params.push(date_from);
      }

      if (date_to) {
        query += " AND ts.date <= ?";
        params.push(date_to);
      }

      query += " ORDER BY ts.date DESC, ts.start_time DESC";

      const [bookings] = await pool.execute(query, params);
      res.json(bookings);
    } catch (error) {
      console.error("Get bookings error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Accept booking
  acceptBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { owner_id } = req.manager;

      // Verify booking belongs to owner's arena
      const [bookingCheck] = await pool.execute(
        `SELECT b.* FROM bookings b
                 JOIN arenas a ON b.arena_id = a.arena_id
                 WHERE b.booking_id = ? AND a.owner_id = ? AND b.status = 'pending'`,
        [booking_id, owner_id]
      );

      if (bookingCheck.length === 0) {
        return res.status(404).json({
          message: "Booking not found or already processed"
        });
      }

      // Accept booking
      await pool.execute(
        `UPDATE bookings 
                 SET status = 'accepted'
                 WHERE booking_id = ?`,
        [booking_id]
      );

      res.json({ message: "Booking accepted successfully" });
    } catch (error) {
      console.error("Accept booking error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Reject booking
  rejectBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { owner_id } = req.manager;
      const { reason } = req.body;

      // Verify booking belongs to owner's arena
      const [bookingCheck] = await pool.execute(
        `SELECT b.* FROM bookings b
                 JOIN arenas a ON b.arena_id = a.arena_id
                 WHERE b.booking_id = ? AND a.owner_id = ? AND b.status = 'pending'`,
        [booking_id, owner_id]
      );

      if (bookingCheck.length === 0) {
        return res.status(404).json({
          message: "Booking not found or already processed"
        });
      }

      // Reject booking
      await pool.execute(
        `UPDATE bookings 
                 SET status = 'rejected',
                     cancellation_reason = ?
                 WHERE booking_id = ?`,
        [reason, booking_id]
      );

      res.json({ message: "Booking rejected successfully" });
    } catch (error) {
      console.error("Reject booking error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Complete booking
  completeBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { owner_id } = req.manager;

      // Verify booking belongs to owner's arena and is accepted
      const [bookingCheck] = await pool.execute(
        `SELECT b.* FROM bookings b
                 JOIN arenas a ON b.arena_id = a.arena_id
                 WHERE b.booking_id = ? AND a.owner_id = ? AND b.status = 'accepted'`,
        [booking_id, owner_id]
      );

      if (bookingCheck.length === 0) {
        return res.status(404).json({
          message: "Booking not found or not accepted"
        });
      }

      // Complete booking
      await pool.execute(
        `UPDATE bookings 
                 SET status = 'completed'
                 WHERE booking_id = ?`,
        [booking_id]
      );

      res.json({ message: "Booking marked as completed" });
    } catch (error) {
      console.error("Complete booking error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // In managerController.js - Update getCalendar

  getCalendar: async (req, res) => {
    try {
      const { id: manager_id } = req.manager;
      const { arena_id, date, court_id } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      // Verify this manager has access to this arena
      const [managerData] = await pool.execute(
        `SELECT permissions FROM arena_managers WHERE manager_id = ?`,
        [manager_id]
      );

      let hasAccess = false;
      if (managerData.length > 0) {
        let permissions = {};
        try {
          permissions = typeof managerData[0].permissions === 'string'
            ? JSON.parse(managerData[0].permissions)
            : managerData[0].permissions || {};

          hasAccess = permissions[`arena_${arena_id}`] !== undefined;
        } catch (e) {
          console.error("Error parsing permissions:", e);
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You don't have access to this arena"
        });
      }

      let query = `
            SELECT ts.*, b.booking_id, b.status as booking_status,
                   u.name as booked_by, cd.court_number, cd.court_name
            FROM time_slots ts
            LEFT JOIN court_details cd ON ts.court_id = cd.court_id
            LEFT JOIN bookings b ON ts.slot_id = b.slot_id 
                AND b.status IN ('pending', 'accepted', 'completed')
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE ts.arena_id = ? AND ts.date = ?
        `;

      const params = [arena_id, date];

      if (court_id) {
        query += " AND ts.court_id = ?";
        params.push(court_id);
      }

      query += " ORDER BY cd.court_number, ts.start_time";

      const [slots] = await pool.execute(query, params);
      res.json(slots);
    } catch (error) {
      console.error("Get calendar error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update time slots
  // In managerController.js - FIXED updateTimeSlots function
  updateTimeSlots: async (req, res) => {
    try {
      const { owner_id } = req.manager;
      const { arena_id, date, slots, action, court_id } = req.body;

      // Log the received payload for debugging
      console.log("Manager updateTimeSlots payload:", req.body);

      // Verify arena belongs to owner
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, owner_id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({
          message: "Arena not found or access denied"
        });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        if (action === "block_all") {
          let query = `UPDATE time_slots 
                           SET is_blocked_by_owner = TRUE,
                               is_available = FALSE,
                               locked_until = NULL,
                               locked_by_user_id = NULL
                           WHERE arena_id = ? AND date = ?`;
          const params = [arena_id, date];

          if (court_id) {
            query += " AND court_id = ?";
            params.push(court_id);
          }

          await connection.execute(query, params);
        }
        else if (action === "unblock_all") {
          let query = `UPDATE time_slots 
                           SET is_blocked_by_owner = FALSE,
                               is_available = TRUE,
                               locked_until = NULL,
                               locked_by_user_id = NULL
                           WHERE arena_id = ? AND date = ?`;
          const params = [arena_id, date];

          if (court_id) {
            query += " AND court_id = ?";
            params.push(court_id);
          }

          await connection.execute(query, params);
        }
        else if (action === "update_slots" && slots && slots.length > 0) {
          // Update specific slots
          for (const slot of slots) {
            const slotCourtId = slot.court_id || court_id;

            if (!slotCourtId) {
              console.warn("Skipping slot - no court_id provided:", slot);
              continue;
            }

            // First check if slot exists
            const [existingSlot] = await connection.execute(
              `SELECT slot_id FROM time_slots 
                         WHERE arena_id = ? AND date = ? AND start_time = ? AND end_time = ? 
                         AND court_id = ?`,
              [arena_id, date, slot.start_time, slot.end_time, slotCourtId]
            );

            if (existingSlot.length > 0) {
              // Update existing slot
              await connection.execute(
                `UPDATE time_slots 
                             SET is_blocked_by_owner = ?,
                                 is_holiday = ?,
                                 price = ?
                             WHERE slot_id = ?`,
                [
                  slot.is_blocked || false,
                  slot.is_holiday || false,
                  slot.price || 500,
                  existingSlot[0].slot_id,
                ]
              );
            } else {
              // Create new slot
              const slotAvailable = !(slot.is_blocked || false);
              await connection.execute(
                `INSERT INTO time_slots 
                             (arena_id, court_id, date, start_time, end_time, price, 
                              is_blocked_by_owner, is_holiday, is_available)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  arena_id,
                  slotCourtId,
                  date,
                  slot.start_time,
                  slot.end_time,
                  slot.price || 500,
                  slot.is_blocked || false,
                  slot.is_holiday || false,
                  slotAvailable,
                ]
              );
            }
          }
        }
        else if (action === "update_price" && price) {
          let query = `UPDATE time_slots 
                           SET price = ?
                           WHERE arena_id = ? AND date = ?`;
          const params = [price, arena_id, date];

          if (court_id) {
            query += " AND court_id = ?";
            params.push(court_id);
          }

          await connection.execute(query, params);
        }

        await connection.commit();
        res.json({
          message: "Time slots updated successfully",
          date: date,
          action: action,
          court_id: court_id || null,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Update time slots error:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },

  // Get arenas
  getArenas: async (req, res) => {
    try {
      const { owner_id } = req.manager;

      const [arenas] = await pool.execute(
        `SELECT a.*, COUNT(DISTINCT b.booking_id) as total_bookings
                 FROM arenas a
                 LEFT JOIN bookings b ON a.arena_id = b.arena_id
                 WHERE a.owner_id = ?
                 GROUP BY a.arena_id
                 ORDER BY a.arena_id DESC`,
        [owner_id]
      );

      res.json(arenas);
    } catch (error) {
      console.error("Get arenas error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // In managerController.js - Update getCourts

  getCourts: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { id: manager_id } = req.manager;

      // Verify manager has access to this arena
      const [managerData] = await pool.execute(
        `SELECT permissions FROM arena_managers WHERE manager_id = ?`,
        [manager_id]
      );

      let hasAccess = false;
      if (managerData.length > 0) {
        let permissions = {};
        try {
          permissions = typeof managerData[0].permissions === 'string'
            ? JSON.parse(managerData[0].permissions)
            : managerData[0].permissions || {};

          hasAccess = permissions[`arena_${arena_id}`] !== undefined;
        } catch (e) {
          console.error("Error parsing permissions:", e);
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You don't have access to this arena"
        });
      }

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

      // Fetch images for each court
      for (let court of courts) {
        const [images] = await pool.execute(
          `SELECT image_id, image_url, cloudinary_id, is_primary, uploaded_at
         FROM court_images 
         WHERE court_id = ?
         ORDER BY is_primary DESC, uploaded_at DESC`,
          [court.court_id]
        );
        court.images = images;
      }

      res.json(courts);
    } catch (error) {
      console.error("Get courts error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // In managerController.js - Replace with improved error handling
  uploadCourtPhotos: async (req, res) => {
    try {
      const { court_id } = req.params;
      const { owner_id, id: manager_id } = req.manager;
      const files = req.files;

      console.log("📸 Manager uploading court photos:", {
        court_id,
        manager_id,
        owner_id,
        filesCount: files?.length,
        files: files ? files.map(f => ({ originalname: f.originalname, filename: f.filename })) : []
      });

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded"
        });
      }

      // Verify court belongs to owner's arena
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id, cd.court_name, cd.arena_id
       FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, owner_id]
      );

      if (courtCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Court not found or you don't have permission"
        });
      }

      // Check photo limit (max 3)
      const [existingPhotos] = await pool.execute(
        "SELECT COUNT(*) as count FROM court_images WHERE court_id = ?",
        [court_id]
      );

      const currentCount = existingPhotos[0].count;
      if (currentCount + files.length > 3) {
        return res.status(400).json({
          success: false,
          message: `Maximum 3 photos per court. You have ${currentCount}, trying to add ${files.length}.`
        });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check existing primary image
        const [existingPrimary] = await connection.execute(
          "SELECT image_id FROM court_images WHERE court_id = ? AND is_primary = TRUE",
          [court_id]
        );

        const uploadedImages = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const image_url = file.path;
          const cloudinary_id = file.filename;

          // Set first image as primary if no primary exists
          const is_primary = existingPrimary.length === 0 && i === 0;

          // Check if uploaded_by_manager_id column exists
          try {
            // First try with uploaded_by_manager_id
            const [result] = await connection.execute(
              `INSERT INTO court_images 
             (court_id, image_url, cloudinary_id, is_primary, uploaded_by_manager_id, uploaded_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
              [court_id, image_url, cloudinary_id, is_primary, manager_id]
            );

            uploadedImages.push({
              image_id: result.insertId,
              image_url,
              cloudinary_id,
              is_primary,
              court_id: parseInt(court_id),
              uploaded_by_manager_id: manager_id,
            });
          } catch (insertError) {
            // If column doesn't exist, try without uploaded_by_manager_id
            if (insertError.code === 'ER_BAD_FIELD_ERROR') {
              console.log("⚠️ uploaded_by_manager_id column doesn't exist, inserting without it");
              const [result] = await connection.execute(
                `INSERT INTO court_images 
               (court_id, image_url, cloudinary_id, is_primary, uploaded_at)
               VALUES (?, ?, ?, ?, NOW())`,
                [court_id, image_url, cloudinary_id, is_primary]
              );

              uploadedImages.push({
                image_id: result.insertId,
                image_url,
                cloudinary_id,
                is_primary,
                court_id: parseInt(court_id),
                uploaded_by_manager_id: null,
              });
            } else {
              throw insertError;
            }
          }
        }

        await connection.commit();

        res.json({
          success: true,
          message: `${uploadedImages.length} photo(s) uploaded successfully`,
          count: uploadedImages.length,
          images: uploadedImages,
        });

      } catch (error) {
        await connection.rollback();
        console.error("Transaction error:", error);
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error("❌ Error uploading court photos:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
        code: error.code
      });
    }
  },

  // In managerController.js - Add deleteCourtPhoto
  // In managerController.js - Update deleteCourtPhoto for full control
  deleteCourtPhoto: async (req, res) => {
    try {
      const { court_id, photo_id } = req.params;
      const { owner_id, id: manager_id, permissions } = req.manager;

      console.log("🗑️ Manager deleting court photo:", {
        court_id,
        photo_id,
        manager_id,
        owner_id,
        permissions
      });

      // First, get photo details with uploader info
      const [photoDetails] = await pool.execute(
        `SELECT ci.*, cd.arena_id 
       FROM court_images ci
       JOIN court_details cd ON ci.court_id = cd.court_id
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE ci.image_id = ? AND ci.court_id = ? AND a.owner_id = ?`,
        [photo_id, court_id, owner_id]
      );

      if (photoDetails.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Photo not found or access denied"
        });
      }

      const photo = photoDetails[0];

      // 🔥 NEW: Manager with manage_arena permission can delete ANY photo
      // No need to check if they uploaded it
      const canDelete = permissions.manage_arena === true;

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: "Permission denied: manage_arena required to delete photos"
        });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Delete from database
        await connection.execute(
          "DELETE FROM court_images WHERE image_id = ? AND court_id = ?",
          [photo_id, court_id]
        );

        // If we deleted the primary photo, set a new primary if available
        if (photo.is_primary) {
          const [remainingPhotos] = await connection.execute(
            "SELECT image_id FROM court_images WHERE court_id = ? ORDER BY uploaded_at LIMIT 1",
            [court_id]
          );

          if (remainingPhotos.length > 0) {
            await connection.execute(
              "UPDATE court_images SET is_primary = TRUE WHERE image_id = ?",
              [remainingPhotos[0].image_id]
            );
          }
        }

        await connection.commit();

        // Optionally delete from Cloudinary
        if (photo.cloudinary_id && process.env.CLOUDINARY_CLOUD_NAME) {
          try {
            const cloudinary = require("cloudinary").v2;
            await cloudinary.uploader.destroy(photo.cloudinary_id);
            console.log(`Deleted from Cloudinary: ${photo.cloudinary_id}`);
          } catch (cloudinaryError) {
            console.warn("Could not delete from Cloudinary:", cloudinaryError.message);
          }
        }

        res.json({
          success: true,
          message: "Photo deleted successfully",
          deleted_photo: {
            image_id: photo.image_id,
            image_url: photo.image_url,
            was_primary: photo.is_primary,
            uploaded_by_manager_id: photo.uploaded_by_manager_id
          }
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error("Error deleting court photo:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },
  // Get stats
  getStats: async (req, res) => {
    try {
      const { owner_id } = req.manager;
      const { period = "month" } = req.query;

      let dateFilter = "";
      switch (period) {
        case "day":
          dateFilter = "DATE(ts.date) = CURDATE()";
          break;
        case "week":
          dateFilter = "YEARWEEK(ts.date) = YEARWEEK(CURDATE())";
          break;
        case "month":
          dateFilter = "MONTH(ts.date) = MONTH(CURDATE()) AND YEAR(ts.date) = YEAR(CURDATE())";
          break;
        case "year":
          dateFilter = "YEAR(ts.date) = YEAR(CURDATE())";
          break;
        default:
          dateFilter = "MONTH(ts.date) = MONTH(CURDATE()) AND YEAR(ts.date) = YEAR(CURDATE())";
      }

      const [stats] = await pool.execute(
        `SELECT 
                   COUNT(*) as total_bookings,
                   SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                   SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                   SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bookings,
                   SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected_bookings,
                   SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                   COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
                 FROM bookings b
                 JOIN arenas a ON b.arena_id = a.arena_id
                 JOIN time_slots ts ON b.slot_id = ts.slot_id
                 WHERE a.owner_id = ? AND ${dateFilter}`,
        [owner_id]
      );

      res.json(stats[0]);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get profile
  getProfile: async (req, res) => {
    try {
      const { id } = req.manager;

      const [managers] = await pool.execute(
        `SELECT m.name, m.email, m.phone_number, m.permissions,
                        o.arena_name, o.email as owner_email
                 FROM arena_managers m
                 JOIN arena_owners o ON m.owner_id = o.owner_id
                 WHERE m.manager_id = ?`,
        [id]
      );

      if (managers.length === 0) {
        return res.status(404).json({ message: "Manager not found" });
      }

      const manager = managers[0];
      manager.permissions = typeof manager.permissions === "string"
        ? JSON.parse(manager.permissions)
        : manager.permissions;

      res.json(manager);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update profile
  updateProfile: async (req, res) => {
    try {
      const { id } = req.manager;
      const { phone_number } = req.body;

      await pool.execute(
        "UPDATE arena_managers SET phone_number = ? WHERE manager_id = ?",
        [phone_number, id]
      );

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};

module.exports = managerController;