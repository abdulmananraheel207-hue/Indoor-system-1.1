const pool = require("../db");

const ownerController = {
  // Get owner dashboard data
  getDashboard: async (req, res) => {
    try {
      const owner_id = req.user.id;
      const today = new Date().toISOString().split("T")[0];

      // Today's bookings count
      const [todayBookings] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE a.owner_id = ? AND DATE(b.booking_date) = ?`,
        [owner_id, today]
      );

      // Total revenue for today
      const [todayRevenue] = await pool.execute(
        `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE a.owner_id = ? AND DATE(b.booking_date) = ? AND b.status = 'completed'`,
        [owner_id, today]
      );

      // Monthly revenue
      const [monthlyRevenue] = await pool.execute(
        `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE a.owner_id = ? 
           AND MONTH(b.booking_date) = MONTH(CURRENT_DATE())
           AND YEAR(b.booking_date) = YEAR(CURRENT_DATE())
           AND b.status = 'completed'`,
        [owner_id]
      );

      // Pending booking requests
      const [pendingRequests] = await pool.execute(
        `SELECT b.*, u.name as user_name, u.phone_number as user_phone,
                st.name as sport_name, ts.date, ts.start_time, ts.end_time
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

      // Recent activity (last 10 bookings)
      const [recentActivity] = await pool.execute(
        `SELECT b.*, u.name as user_name, st.name as sport_name, 
                ts.date, ts.start_time, ts.end_time,
                a.name as arena_name
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN users u ON b.user_id = u.user_id
         JOIN sports_types st ON b.sport_id = st.sport_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE a.owner_id = ?
         ORDER BY b.booking_date DESC
         LIMIT 10`,
        [owner_id]
      );

      // Get arenas owned by this owner
      const [arenas] = await pool.execute(
        "SELECT * FROM arenas WHERE owner_id = ?",
        [owner_id]
      );

      res.json({
        dashboard: {
          today_bookings: todayBookings[0].count,
          today_revenue: todayRevenue[0].revenue,
          monthly_revenue: monthlyRevenue[0].revenue,
          total_arenas: arenas.length,
        },
        pending_requests: pendingRequests,
        recent_activity: recentActivity,
        arenas: arenas,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all booking requests for owner
  getBookingRequests: async (req, res) => {
    try {
      const owner_id = req.user.id;
      const { status, date_from, date_to } = req.query;

      let query = `
        SELECT b.*, u.name as user_name, u.email as user_email, u.phone_number as user_phone,
               st.name as sport_name, ts.date, ts.start_time, ts.end_time,
               a.name as arena_name
        FROM bookings b
        JOIN arenas a ON b.arena_id = a.arena_id
        JOIN users u ON b.user_id = u.user_id
        JOIN sports_types st ON b.sport_id = st.sport_id
        JOIN time_slots ts ON b.slot_id = ts.slot_id
        WHERE a.owner_id = ?
      `;

      const params = [owner_id];

      if (status) {
        query += " AND b.status = ?";
        params.push(status);
      }

      if (date_from) {
        query += " AND ts.date >= ?";
        params.push(date_from);
      }

      if (date_to) {
        query += " AND ts.date <= ?";
        params.push(date_to);
      }

      query += " ORDER BY b.booking_date DESC";

      const [bookings] = await pool.execute(query, params);
      res.json(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Accept a booking request
  acceptBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;

      // Verify owner owns this booking's arena
      const [bookingCheck] = await pool.execute(
        `SELECT b.* FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE b.booking_id = ? AND a.owner_id = ?`,
        [booking_id, req.user.id]
      );

      if (bookingCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Booking not found or access denied" });
      }

      if (bookingCheck[0].status !== "pending") {
        return res
          .status(400)
          .json({ message: "Booking is not in pending status" });
      }

      // Update booking status
      await pool.execute(
        'UPDATE bookings SET status = "accepted" WHERE booking_id = ?',
        [booking_id]
      );

      res.json({ message: "Booking accepted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Reject a booking request
  rejectBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { reason } = req.body;

      // Verify owner owns this booking's arena
      const [bookingCheck] = await pool.execute(
        `SELECT b.*, ts.slot_id FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE b.booking_id = ? AND a.owner_id = ?`,
        [booking_id, req.user.id]
      );

      if (bookingCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Booking not found or access denied" });
      }

      if (bookingCheck[0].status !== "pending") {
        return res
          .status(400)
          .json({ message: "Booking is not in pending status" });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Update booking status
        await connection.execute(
          `UPDATE bookings 
           SET status = "rejected", cancelled_by = "owner", cancellation_time = NOW()
           WHERE booking_id = ?`,
          [booking_id]
        );

        // Make the time slot available again
        await connection.execute(
          `UPDATE time_slots 
           SET is_available = TRUE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
          [bookingCheck[0].slot_id]
        );

        await connection.commit();
        res.json({ message: "Booking rejected successfully", reason });
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

  // Get owner's arenas
  getArenas: async (req, res) => {
    try {
      const [arenas] = await pool.execute(
        `SELECT a.*, 
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
         FROM arenas a
         LEFT JOIN bookings b ON a.arena_id = b.arena_id
         WHERE a.owner_id = ?
         GROUP BY a.arena_id
         ORDER BY a.created_at DESC`,
        [req.user.id]
      );

      res.json(arenas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Create a new arena
  createArena: async (req, res) => {
    try {
      const {
        name,
        description,
        location_lat,
        location_lng,
        address,
        base_price_per_hour,
        sports,
        time_slots,
      } = req.body;

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Create arena
        const [arenaResult] = await connection.execute(
          `INSERT INTO arenas 
           (owner_id, name, description, location_lat, location_lng, 
            address, base_price_per_hour, rating, total_reviews)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            req.user.id,
            name,
            description,
            location_lat,
            location_lng,
            address,
            base_price_per_hour,
          ]
        );

        const arena_id = arenaResult.insertId;

        // Add sports
        if (sports && sports.length > 0) {
          for (const sport of sports) {
            await connection.execute(
              "INSERT INTO arena_sports (arena_id, sport_id, price_per_hour) VALUES (?, ?, ?)",
              [
                arena_id,
                sport.sport_id,
                sport.price_per_hour || base_price_per_hour,
              ]
            );
          }
        }

        // Add time slots
        if (time_slots && time_slots.length > 0) {
          for (const slot of time_slots) {
            await connection.execute(
              `INSERT INTO time_slots 
               (arena_id, sport_id, date, start_time, end_time, price, is_available)
               VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
              [
                arena_id,
                slot.sport_id || null,
                slot.date,
                slot.start_time,
                slot.end_time,
                slot.price || base_price_per_hour,
              ]
            );
          }
        }

        await connection.commit();

        res.status(201).json({
          message: "Arena created successfully",
          arena_id,
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

  // Update arena details
  updateArena: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { name, description, address, base_price_per_hour, is_active } =
        req.body;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Arena not found or access denied" });
      }

      const updateFields = [];
      const values = [];

      if (name) {
        updateFields.push("name = ?");
        values.push(name);
      }
      if (description) {
        updateFields.push("description = ?");
        values.push(description);
      }
      if (address) {
        updateFields.push("address = ?");
        values.push(address);
      }
      if (base_price_per_hour) {
        updateFields.push("base_price_per_hour = ?");
        values.push(base_price_per_hour);
      }
      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        values.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(arena_id);

      await pool.execute(
        `UPDATE arenas SET ${updateFields.join(", ")} WHERE arena_id = ?`,
        values
      );

      res.json({ message: "Arena updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Manage time slots for an arena
  manageTimeSlots: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { date, slots, is_blocked, is_holiday } = req.body;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Arena not found or access denied" });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        if (slots && slots.length > 0) {
          for (const slot of slots) {
            // Check if slot exists
            const [existingSlot] = await connection.execute(
              `SELECT slot_id FROM time_slots 
               WHERE arena_id = ? AND date = ? AND start_time = ? AND end_time = ?`,
              [arena_id, date, slot.start_time, slot.end_time]
            );

            if (existingSlot.length > 0) {
              // Update existing slot
              await connection.execute(
                `UPDATE time_slots 
                 SET is_blocked_by_owner = ?, is_holiday = ?, price = ?
                 WHERE slot_id = ?`,
                [
                  is_blocked || false,
                  is_holiday || false,
                  slot.price,
                  existingSlot[0].slot_id,
                ]
              );
            } else {
              // Create new slot
              await connection.execute(
                `INSERT INTO time_slots 
                 (arena_id, date, start_time, end_time, price, is_blocked_by_owner, is_holiday)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  arena_id,
                  date,
                  slot.start_time,
                  slot.end_time,
                  slot.price,
                  is_blocked || false,
                  is_holiday || false,
                ]
              );
            }
          }
        } else if (is_blocked !== undefined || is_holiday !== undefined) {
          // Block all slots for the date
          await connection.execute(
            `UPDATE time_slots 
             SET is_blocked_by_owner = COALESCE(?, is_blocked_by_owner),
                 is_holiday = COALESCE(?, is_holiday)
             WHERE arena_id = ? AND date = ?`,
            [is_blocked, is_holiday, arena_id, date]
          );
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
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get booking statistics for owner
  getBookingStats: async (req, res) => {
    try {
      const owner_id = req.user.id;
      const { period = "month" } = req.query; // day, week, month, year

      let dateFilter = "";
      switch (period) {
        case "day":
          dateFilter = "DATE(booking_date) = CURDATE()";
          break;
        case "week":
          dateFilter = "YEARWEEK(booking_date) = YEARWEEK(CURDATE())";
          break;
        case "month":
          dateFilter =
            "MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURDATE())";
          break;
        case "year":
          dateFilter = "YEAR(booking_date) = YEAR(CURDATE())";
          break;
      }

      const [stats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_bookings,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
           SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_bookings,
           SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_bookings,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
           COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_revenue,
           COALESCE(SUM(commission_amount), 0) as total_commission
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE a.owner_id = ? AND ${dateFilter}`,
        [owner_id]
      );

      // Get arena-wise breakdown
      const [arenaStats] = await pool.execute(
        `SELECT a.name as arena_name, a.arena_id,
                COUNT(b.booking_id) as booking_count,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as revenue
         FROM arenas a
         LEFT JOIN bookings b ON a.arena_id = b.arena_id AND ${dateFilter}
         WHERE a.owner_id = ?
         GROUP BY a.arena_id
         ORDER BY revenue DESC`,
        [owner_id]
      );

      res.json({
        period_stats: stats[0],
        arena_stats: arenaStats,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Add manager/staff
  addManager: async (req, res) => {
    try {
      const { name, email, password, phone_number, permissions } = req.body;

      // Check if manager already exists
      const [existingManager] = await pool.execute(
        "SELECT manager_id FROM arena_managers WHERE email = ? AND owner_id = ?",
        [email, req.user.id]
      );

      if (existingManager.length > 0) {
        return res.status(400).json({ message: "Manager already exists" });
      }

      // Hash password
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert manager
      const [result] = await pool.execute(
        `INSERT INTO arena_managers 
         (owner_id, name, email, password_hash, phone_number, permissions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          name,
          email,
          hashedPassword,
          phone_number,
          JSON.stringify(permissions),
        ]
      );

      res.status(201).json({
        message: "Manager added successfully",
        manager_id: result.insertId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all managers
  getManagers: async (req, res) => {
    try {
      const [managers] = await pool.execute(
        "SELECT * FROM arena_managers WHERE owner_id = ? ORDER BY created_at DESC",
        [req.user.id]
      );

      res.json(managers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update manager permissions
  updateManager: async (req, res) => {
    try {
      const { manager_id } = req.params;
      const { permissions, is_active } = req.body;

      // Verify owner owns this manager
      const [managerCheck] = await pool.execute(
        "SELECT manager_id FROM arena_managers WHERE manager_id = ? AND owner_id = ?",
        [manager_id, req.user.id]
      );

      if (managerCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Manager not found or access denied" });
      }

      const updateFields = [];
      const values = [];

      if (permissions) {
        updateFields.push("permissions = ?");
        values.push(JSON.stringify(permissions));
      }

      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        values.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(manager_id);

      await pool.execute(
        `UPDATE arena_managers SET ${updateFields.join(
          ", "
        )} WHERE manager_id = ?`,
        values
      );

      res.json({ message: "Manager updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // In ownerController.js, add this method:
  getOwnerProfile: async (req, res) => {
    try {
      const [owners] = await pool.execute(
        "SELECT arena_name, email, phone_number, business_address, created_at FROM arena_owners WHERE owner_id = ?",
        [req.user.id]
      );

      if (owners.length === 0) {
        return res.status(404).json({ message: "Owner not found" });
      }

      res.json(owners[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  updateOwnerProfile: async (req, res) => {
    try {
      const { arena_name, phone_number, business_address } = req.body;

      const updateFields = [];
      const values = [];

      if (arena_name) {
        updateFields.push("arena_name = ?");
        values.push(arena_name);
      }
      if (phone_number) {
        updateFields.push("phone_number = ?");
        values.push(phone_number);
      }
      if (business_address) {
        updateFields.push("business_address = ?");
        values.push(business_address);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(req.user.id);

      await pool.execute(
        `UPDATE arena_owners SET ${updateFields.join(", ")} WHERE owner_id = ?`,
        values
      );

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Export booking data as CSV (simplified - returns JSON that can be converted to CSV)
  exportBookingData: async (req, res) => {
    try {
      const owner_id = req.user.id;
      const { start_date, end_date } = req.query;

      let query = `
        SELECT 
          b.booking_id,
          b.booking_date,
          b.status,
          b.total_amount,
          b.commission_amount,
          u.name as customer_name,
          u.email as customer_email,
          u.phone_number as customer_phone,
          a.name as arena_name,
          st.name as sport_name,
          ts.date,
          ts.start_time,
          ts.end_time,
          b.payment_method,
          b.payment_status
        FROM bookings b
        JOIN arenas a ON b.arena_id = a.arena_id
        JOIN users u ON b.user_id = u.user_id
        JOIN sports_types st ON b.sport_id = st.sport_id
        JOIN time_slots ts ON b.slot_id = ts.slot_id
        WHERE a.owner_id = ?
      `;

      const params = [owner_id];

      if (start_date) {
        query += " AND ts.date >= ?";
        params.push(start_date);
      }

      if (end_date) {
        query += " AND ts.date <= ?";
        params.push(end_date);
      }

      query += " ORDER BY ts.date, ts.start_time";

      const [bookings] = await pool.execute(query, params);

      res.json({
        filename: `bookings_export_${
          new Date().toISOString().split("T")[0]
        }.json`,
        data: bookings,
        total_records: bookings.length,
        total_revenue: bookings.reduce(
          (sum, b) => sum + (b.total_amount || 0),
          0
        ),
        total_commission: bookings.reduce(
          (sum, b) => sum + (b.commission_amount || 0),
          0
        ),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = ownerController;
