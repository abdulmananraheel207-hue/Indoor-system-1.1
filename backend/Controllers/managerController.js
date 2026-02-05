const pool = require("../db");

const managerController = {
  // Get dashboard data
  getDashboard: async (req, res) => {
    try {
      const { owner_id, permissions } = req.manager;
      const today = new Date().toISOString().split("T")[0];

      const dashboardData = {
        permissions: permissions,
        stats: {},
        pending_requests: [],
        recent_bookings: [],
        arenas: [],
      };

      // Only fetch stats if has view_dashboard
      if (permissions.view_dashboard) {
        // Today's bookings count
        const [todayBookings] = await pool.execute(
          `SELECT COUNT(*) as count 
                     FROM bookings b
                     JOIN arenas a ON b.arena_id = a.arena_id
                     WHERE a.owner_id = ? AND DATE(b.booking_date) = ?`,
          [owner_id, today]
        );
        dashboardData.stats.today_bookings = todayBookings[0].count || 0;

        // Today's revenue if has view_financial
        if (permissions.view_financial) {
          const [todayRevenue] = await pool.execute(
            `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
                         FROM bookings b
                         JOIN arenas a ON b.arena_id = a.arena_id
                         WHERE a.owner_id = ? 
                           AND DATE(b.booking_date) = ? 
                           AND b.status = 'completed'`,
            [owner_id, today]
          );
          dashboardData.stats.today_revenue = todayRevenue[0].revenue || 0;
        }
      }

      // Only fetch pending requests if has view_bookings or manage_bookings
      if (permissions.view_bookings || permissions.manage_bookings) {
        const [pendingRequests] = await pool.execute(
          `SELECT b.*, u.name as user_name, u.phone_number as user_phone,
                            st.name as sport_name, a.name as arena_name,
                            ts.date, ts.start_time, ts.end_time
                     FROM bookings b
                     JOIN arenas a ON b.arena_id = a.arena_id
                     JOIN users u ON b.user_id = u.user_id
                     JOIN sports_types st ON b.sport_id = st.sport_id
                     JOIN time_slots ts ON b.slot_id = ts.slot_id
                     WHERE a.owner_id = ? AND b.status = 'pending'
                     ORDER BY b.booking_date DESC
                     LIMIT 10`,
          [owner_id]
        );
        dashboardData.pending_requests = pendingRequests;
      }

      // Get owner's arenas if has view_arena or manage_arena
      if (permissions.view_arena || permissions.manage_arena) {
        const [arenas] = await pool.execute(
          "SELECT arena_id, name FROM arenas WHERE owner_id = ? AND is_active = TRUE",
          [owner_id]
        );
        dashboardData.arenas = arenas;
      }

      // Get recent bookings if has view_bookings
      if (permissions.view_bookings) {
        const [recentBookings] = await pool.execute(
          `SELECT b.*, u.name as user_name, st.name as sport_name,
                            a.name as arena_name, ts.date, ts.start_time, ts.end_time
                     FROM bookings b
                     JOIN arenas a ON b.arena_id = a.arena_id
                     JOIN users u ON b.user_id = u.user_id
                     JOIN sports_types st ON b.sport_id = st.sport_id
                     JOIN time_slots ts ON b.slot_id = ts.slot_id
                     WHERE a.owner_id = ?
                     ORDER BY b.booking_date DESC
                     LIMIT 5`,
          [owner_id]
        );
        dashboardData.recent_bookings = recentBookings;
      }

      res.json(dashboardData);
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get bookings
  getBookings: async (req, res) => {
    try {
      const { owner_id } = req.manager;
      const { status, date_from, date_to, type = "all" } = req.query;

      let query = `
                SELECT b.booking_id, b.status, b.total_amount, b.commission_amount,
                       b.booking_date, b.payment_status, u.name as user_name,
                       u.email as user_email, u.phone_number as user_phone,
                       st.name as sport_name, a.name as arena_name,
                       ts.date, ts.start_time, ts.end_time
                FROM bookings b
                JOIN arenas a ON b.arena_id = a.arena_id
                JOIN users u ON b.user_id = u.user_id
                JOIN sports_types st ON b.sport_id = st.sport_id
                JOIN time_slots ts ON b.slot_id = ts.slot_id
                WHERE a.owner_id = ?
            `;

      const params = [owner_id];

      if (status && status !== "all") {
        query += " AND b.status = ?";
        params.push(status);
      }

      if (type === "upcoming") {
        query += " AND b.status IN ('accepted', 'pending')";
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

  // Get calendar
  getCalendar: async (req, res) => {
    try {
      const { owner_id } = req.manager;
      const { arena_id, date, court_id } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

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
  updateTimeSlots: async (req, res) => {
    try {
      const { owner_id } = req.manager;
      const { arena_id, date, slots, action, court_id } = req.body;

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
          await connection.execute(
            `UPDATE time_slots 
                         SET is_blocked_by_owner = TRUE
                         WHERE arena_id = ? AND date = ?`,
            [arena_id, date]
          );
        } else if (action === "unblock_all") {
          await connection.execute(
            `UPDATE time_slots 
                         SET is_blocked_by_owner = FALSE
                         WHERE arena_id = ? AND date = ?`,
            [arena_id, date]
          );
        } else if (slots && slots.length > 0) {
          for (const slot of slots) {
            await connection.execute(
              `UPDATE time_slots 
                             SET is_blocked_by_owner = ?,
                                 price = ?
                             WHERE slot_id = ?`,
              [slot.is_blocked || false, slot.price || 500, slot.slot_id]
            );
          }
        }

        await connection.commit();
        res.json({ message: "Time slots updated successfully" });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Update time slots error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
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

  // Get courts
  getCourts: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { owner_id } = req.manager;

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

      res.json(courts);
    } catch (error) {
      console.error("Get courts error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
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