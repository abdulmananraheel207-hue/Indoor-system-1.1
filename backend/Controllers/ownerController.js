const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ownerController = {
  // Complete owner registration with arena, courts, sports, and time slots
  registerOwnerComplete: async (req, res) => {
    try {
      const {
        // Owner details
        arena_name,
        email,
        password,
        phone_number,
        business_address,
        google_maps_location,
        number_of_courts,
        agreed_to_terms,

        // Arena details
        description,
        base_price_per_hour,

        // Sports
        sports = [],

        // Court details (array of courts)
        courts = [],

        // Time slots configuration
        opening_time = "06:00",
        closing_time = "22:00",
        slot_duration = 60,
        days_available = {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
      } = req.body;

      // Validate required fields
      if (
        !arena_name ||
        !email ||
        !password ||
        !phone_number ||
        !business_address
      ) {
        return res.status(400).json({
          message:
            "Missing required fields: arena_name, email, password, phone_number, business_address",
        });
      }

      if (!agreed_to_terms) {
        return res.status(400).json({
          message: "You must agree to terms and conditions",
        });
      }

      // Normalize phone number for Pakistani format
      let normalizedPhone = phone_number.trim().replace(/[\s\-()]/g, "");

      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "+92" + normalizedPhone.substring(1);
      } else if (
        normalizedPhone.startsWith("92") &&
        !normalizedPhone.startsWith("+92")
      ) {
        normalizedPhone = "+" + normalizedPhone;
      } else if (!normalizedPhone.startsWith("+")) {
        normalizedPhone = "+92" + normalizedPhone;
      }

      const phoneRegex = /^\+923[0-9]{9}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          message:
            "Please enter a valid Pakistani mobile number (e.g., 03001234567, +923001234567)",
        });
      }

      // Check if email already exists
      const [existingOwner] = await pool.execute(
        "SELECT owner_id FROM arena_owners WHERE email = ?",
        [email]
      );

      if (existingOwner.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // 1. Create owner record
        const hashedPassword = await bcrypt.hash(password, 10);

        const [ownerResult] = await connection.execute(
          `INSERT INTO arena_owners 
           (arena_name, email, password_hash, phone_number, 
            business_address, google_maps_location, 
            number_of_courts, agreed_to_terms, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            arena_name,
            email,
            hashedPassword,
            normalizedPhone,
            business_address,
            google_maps_location || null,
            parseInt(number_of_courts) || 1,
            agreed_to_terms,
          ]
        );

        const owner_id = ownerResult.insertId;

        // 2. Create arena record
        // Match exactly the columns that exist in your arenas table
        const [arenaResult] = await connection.execute(
          `INSERT INTO arenas 
           (owner_id, name, description, location_lat, location_lng,
            address, base_price_per_hour, rating, total_reviews, is_active, is_blocked, total_commission_due)
           VALUES (?, ?, ?, 0, 0, ?, ?, 0, 0, TRUE, FALSE, 0.00)`,
          [
            owner_id,
            arena_name,
            description || "",
            business_address,
            parseFloat(base_price_per_hour) || 500,
          ]
        );

        const arena_id = arenaResult.insertId;

        if (sports.length > 0) {
          // Validate sport IDs exist
          const placeholders = sports.map(() => "?").join(",");
          const [validSports] = await connection.execute(
            `SELECT COUNT(*) as count FROM sports_types WHERE sport_id IN (${placeholders})`,
            sports
          );

          if (validSports[0].count !== sports.length) {
            await connection.rollback();
            return res.status(400).json({
              message: "Invalid sport IDs. Please select valid sports.",
            });
          }

          // Then proceed with your existing arena_sports insertion
          for (const sport_id of sports) {
            await connection.execute(
              `INSERT INTO arena_sports (arena_id, sport_id, price_per_hour)
       VALUES (?, ?, ?)`,
              [arena_id, sport_id, parseFloat(base_price_per_hour) || 500]
            );
          }
        }

        // 4. Create court details (if courts array provided)
        let courtData = courts;
        if (courts.length === 0) {
          // Auto-generate courts based on number_of_courts
          courtData = Array.from(
            { length: parseInt(number_of_courts) || 1 },
            (_, i) => ({
              court_number: i + 1,
              court_name: `Court ${i + 1}`,
              size_sqft: 2000,
              price_per_hour: parseFloat(base_price_per_hour) || 500,
              description: "",
              sports: sports, // Assign all selected sports to each court
            })
          );
        }

        for (const court of courtData) {
          const [courtResult] = await connection.execute(
            `INSERT INTO court_details 
             (arena_id, court_number, court_name, size_sqft, 
              price_per_hour, description, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              arena_id,
              court.court_number || 1,
              court.court_name || `Court ${court.court_number || 1}`,
              parseFloat(court.size_sqft) || 2000,
              parseFloat(court.price_per_hour) ||
              parseFloat(base_price_per_hour) ||
              500,
              court.description || "",
            ]
          );

          const court_id = courtResult.insertId;

          // Add sports to court
          const courtSports = court.sports || sports;
          if (courtSports && courtSports.length > 0) {
            for (const sport_id of courtSports) {
              await connection.execute(
                `INSERT INTO court_sports (court_id, sport_id)
                 VALUES (?, ?)`,
                [court_id, sport_id]
              );
            }
          }
        }

        // 5. Generate and create time slots for next 30 days
        const timeSlots = generateTimeSlots(
          opening_time,
          closing_time,
          slot_duration
        );

        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split("T")[0];
          const dayName = date
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase();

          if (days_available[dayName] !== false) {
            for (const slot of timeSlots) {
              await connection.execute(
                `INSERT INTO time_slots 
                 (arena_id, sport_id, date, start_time, end_time, price, is_available)
                 VALUES (?, NULL, ?, ?, ?, ?, TRUE)`,
                [
                  arena_id,
                  dateStr,
                  slot.start_time,
                  slot.end_time,
                  parseFloat(base_price_per_hour) || 500,
                ]
              );
            }
          }
        }

        // 6. Store time slots configuration in owner record (time_slots JSON exists in arena_owners)
        const timeSlotsConfig = JSON.stringify({
          opening_time,
          closing_time,
          slot_duration,
          days_available,
        });

        await connection.execute(
          `UPDATE arena_owners SET time_slots = ? WHERE owner_id = ?`,
          [timeSlotsConfig, owner_id]
        );

        // Commit transaction
        await connection.commit();

        // Generate JWT token for immediate login
        const token = jwt.sign(
          { id: owner_id, email, role: "owner" },
          process.env.JWT_SECRET || "your_jwt_secret",
          { expiresIn: "7d" }
        );

        // Get owner data
        const [ownerData] = await connection.execute(
          "SELECT owner_id, arena_name, email, phone_number, business_address, created_at FROM arena_owners WHERE owner_id = ?",
          [owner_id]
        );

        // Get arena data
        const [arenaData] = await connection.execute(
          "SELECT * FROM arenas WHERE arena_id = ?",
          [arena_id]
        );

        res.status(201).json({
          message: "Owner registration completed successfully",
          token,
          owner: ownerData[0],
          arena: arenaData[0],
          arena_id,
        });
      } catch (error) {
        await connection.rollback();
        console.error("Transaction error:", error);
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Server error during registration",
        error: error.message,
      });
    }
  },

  // Upload arena photos
  uploadArenaPhotos: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const files = req.files; // Assuming multer middleware

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

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

      // Save photos to database
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await pool.execute(
          `INSERT INTO arena_images (arena_id, image_url, is_primary, uploaded_at)
           VALUES (?, ?, ?, NOW())`,
          [
            arena_id,
            `/uploads/arenas/${file.filename}`,
            i === 0, // First photo is primary
          ]
        );
      }

      res.json({
        message: "Arena photos uploaded successfully",
        count: files.length,
        files: files.map((f) => f.filename),
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Upload court photos
  uploadCourtPhotos: async (req, res) => {
    try {
      const { court_id } = req.params;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Verify court belongs to owner's arena
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id FROM court_details cd
         JOIN arenas a ON cd.arena_id = a.arena_id
         WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Court not found or access denied" });
      }

      // Save photos to database
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await pool.execute(
          `INSERT INTO court_images (court_id, image_url, is_primary, uploaded_at)
           VALUES (?, ?, ?, NOW())`,
          [
            court_id,
            `/uploads/courts/${file.filename}`,
            i === 0, // First photo is primary
          ]
        );
      }

      res.json({
        message: "Court photos uploaded successfully",
        count: files.length,
        files: files.map((f) => f.filename),
      });
    } catch (error) {
      console.error("Court photo upload error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

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
         ORDER BY a.arena_id DESC`,
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
        // Create arena (match arenas table)
        const [arenaResult] = await connection.execute(
          `INSERT INTO arenas 
           (owner_id, name, description, location_lat, location_lng, 
            address, base_price_per_hour, rating, total_reviews, is_active, is_blocked, total_commission_due)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, TRUE, FALSE, 0.00)`,
          [
            req.user.id,
            name,
            description || "",
            location_lat || 0,
            location_lng || 0,
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

  // Get courts for an arena
  getCourts: async (req, res) => {
    try {
      const { arena_id } = req.params;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({ message: "Arena not found or access denied" });
      }

      // Get all courts with their sports and images
      const [courts] = await pool.execute(
        `SELECT 
        cd.*,
        GROUP_CONCAT(DISTINCT cs.sport_id) as sports,
        GROUP_CONCAT(DISTINCT st.name) as sports_names,
        (SELECT image_url FROM court_images WHERE court_id = cd.court_id AND is_primary = TRUE LIMIT 1) as primary_image,
        GROUP_CONCAT(DISTINCT ci.image_url) as additional_images
      FROM court_details cd
      LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
      LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
      LEFT JOIN court_images ci ON cd.court_id = ci.court_id AND ci.is_primary = FALSE
      WHERE cd.arena_id = ?
      GROUP BY cd.court_id
      ORDER BY cd.court_number`,
        [arena_id]
      );

      // Parse the sports and images
      const formattedCourts = courts.map(court => ({
        ...court,
        sports: court.sports ? court.sports.split(',').map(Number) : [],
        sports_names: court.sports_names ? court.sports_names.split(',') : [],
        additional_images: court.additional_images ? court.additional_images.split(',') : []
      }));

      res.json(formattedCourts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update court details
  updateCourt: async (req, res) => {
    try {
      const { court_id } = req.params;
      const { court_name, size_sqft, price_per_hour, description, sports } = req.body;

      // Verify court belongs to owner's arena
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res.status(404).json({ message: "Court not found or access denied" });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Update court details
        const updateFields = [];
        const values = [];

        if (court_name !== undefined) {
          updateFields.push("court_name = ?");
          values.push(court_name);
        }
        if (size_sqft !== undefined) {
          updateFields.push("size_sqft = ?");
          values.push(parseFloat(size_sqft));
        }
        if (price_per_hour !== undefined) {
          updateFields.push("price_per_hour = ?");
          values.push(parseFloat(price_per_hour));
        }
        if (description !== undefined) {
          updateFields.push("description = ?");
          values.push(description);
        }

        if (updateFields.length > 0) {
          values.push(court_id);
          await connection.execute(
            `UPDATE court_details SET ${updateFields.join(", ")} WHERE court_id = ?`,
            values
          );
        }

        // Update sports if provided
        if (sports !== undefined) {
          // Delete existing sports
          await connection.execute(
            "DELETE FROM court_sports WHERE court_id = ?",
            [court_id]
          );

          // Add new sports
          const sportsArray = Array.isArray(sports) ? sports : sports.split(',').map(Number);
          for (const sport_id of sportsArray) {
            if (sport_id) {
              await connection.execute(
                "INSERT INTO court_sports (court_id, sport_id) VALUES (?, ?)",
                [court_id, sport_id]
              );
            }
          }
        }

        await connection.commit();
        res.json({ message: "Court updated successfully" });
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

  // Add new court to arena
  addCourt: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { court_number, court_name, size_sqft, price_per_hour, description, sports } = req.body;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({ message: "Arena not found or access denied" });
      }

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Get the next court number if not provided
        let nextCourtNumber = court_number;
        if (!nextCourtNumber) {
          const [maxCourt] = await connection.execute(
            "SELECT MAX(court_number) as max_num FROM court_details WHERE arena_id = ?",
            [arena_id]
          );
          nextCourtNumber = (maxCourt[0].max_num || 0) + 1;
        }

        // Insert new court
        const [courtResult] = await connection.execute(
          `INSERT INTO court_details 
         (arena_id, court_number, court_name, size_sqft, price_per_hour, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            arena_id,
            nextCourtNumber,
            court_name || `Court ${nextCourtNumber}`,
            parseFloat(size_sqft) || 2000,
            parseFloat(price_per_hour) || 500,
            description || ""
          ]
        );

        const newCourtId = courtResult.insertId;

        // Add sports if provided
        if (sports && sports.length > 0) {
          const sportsArray = Array.isArray(sports) ? sports : sports.split(',').map(Number);
          for (const sport_id of sportsArray) {
            if (sport_id) {
              await connection.execute(
                "INSERT INTO court_sports (court_id, sport_id) VALUES (?, ?)",
                [newCourtId, sport_id]
              );
            }
          }
        }

        await connection.commit();

        res.status(201).json({
          message: "Court added successfully",
          court_id: newCourtId,
          court_number: nextCourtNumber
        });
      } catch (error) {
        await connection.rollback();

        // Handle duplicate court number error
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({
            message: "Court number already exists for this arena"
          });
        }

        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Delete court photo
  deleteCourtPhoto: async (req, res) => {
    try {
      const { court_id } = req.params;
      const { photo_path } = req.body;

      // Verify court belongs to owner's arena
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res.status(404).json({ message: "Court not found or access denied" });
      }

      // Delete the photo
      await pool.execute(
        "DELETE FROM court_images WHERE court_id = ? AND image_url = ?",
        [court_id, photo_path]
      );

      // If we deleted the primary photo, set a new primary if available
      const [remainingPhotos] = await pool.execute(
        "SELECT image_id FROM court_images WHERE court_id = ? ORDER BY uploaded_at LIMIT 1",
        [court_id]
      );

      if (remainingPhotos.length > 0) {
        await pool.execute(
          "UPDATE court_images SET is_primary = TRUE WHERE image_id = ?",
          [remainingPhotos[0].image_id]
        );
      }

      res.json({ message: "Photo deleted successfully" });
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
                 (arena_id, date, start_time, end_time, price, is_blocked_by_owner, is_holiday, is_available)
                 VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
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
            "MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURRENT_DATE())";
          break;
        case "year":
          dateFilter = "YEAR(booking_date) = YEAR(CURDATE())";
          break;
        default:
          dateFilter =
            "MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURRENT_DATE())";
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

  // Get owner profile
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

  // Update owner profile
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

  // Export booking data as JSON (can be turned into CSV on frontend)
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
        filename: `bookings_export_${new Date().toISOString().split("T")[0]
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

// Helper function to generate time slots
function generateTimeSlots(opening_time, closing_time, slot_duration) {
  const slots = [];

  const startHour = parseInt(opening_time.split(":")[0]);
  const endHour = parseInt(closing_time.split(":")[0]);
  const durationHours = slot_duration / 60;

  for (let hour = startHour; hour < endHour; hour += durationHours) {
    const startHourStr = hour.toString().padStart(2, "0");
    const endHourStr = (hour + durationHours).toString().padStart(2, "0");

    slots.push({
      start_time: `${startHourStr}:00`,
      end_time: `${endHourStr}:00`,
    });
  }

  return slots;
}

module.exports = ownerController;
