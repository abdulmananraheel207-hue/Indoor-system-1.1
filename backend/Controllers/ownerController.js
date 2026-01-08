const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateTimeSlots } = require("../utils/timeSlotHelper");
const decisionService = require("../utils/bookingDecisionService");

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

          // Add arena sports
          for (const sport_id of sports) {
            await connection.execute(
              `INSERT INTO arena_sports (arena_id, sport_id)
   VALUES (?, ?)`,
              [arena_id, sport_id]
            );
          }
        }

        // 3. Create court details (if courts array provided)
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
              sports: sports,
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

        // 4. Generate and create time slots for next 30 days
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
            // Get all courts for this arena
            const [courtRows] = await connection.execute(
              "SELECT court_id FROM court_details WHERE arena_id = ?",
              [arena_id]
            );

            // Create time slots for EACH court
            for (const court of courtRows) {
              for (const slot of timeSlots) {
                await connection.execute(
                  `INSERT INTO time_slots 
       (arena_id, court_id, sport_id, date, start_time, end_time, price, is_available)
       VALUES (?, ?, NULL, ?, ?, ?, ?, TRUE)`,
                  [
                    arena_id,
                    court.court_id,
                    dateStr,
                    slot.start_time,
                    slot.end_time,
                    parseFloat(base_price_per_hour) || 500,
                  ]
                );
              }
            }
          }
        }

        // 5. Store time slots configuration in owner record
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
      const files = req.files; // Array of files from Cloudinary

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({
          message: "Arena not found or access denied",
        });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check existing primary image
        const [existingPrimary] = await connection.execute(
          "SELECT image_id FROM arena_images WHERE arena_id = ? AND is_primary = TRUE",
          [arena_id]
        );

        // Save photos to database
        const uploadedImages = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const image_url = file.path; // Cloudinary URL

          // Set first image as primary if no primary exists
          const is_primary = existingPrimary.length === 0 && i === 0;

          const [result] = await connection.execute(
            `INSERT INTO arena_images (arena_id, image_url, is_primary, uploaded_at)
           VALUES (?, ?, ?, NOW())`,
            [arena_id, image_url, is_primary]
          );

          uploadedImages.push({
            image_id: result.insertId,
            image_url,
            is_primary,
            arena_id,
          });
        }

        await connection.commit();

        res.json({
          message: "Arena photos uploaded successfully",
          count: files.length,
          images: uploadedImages,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Arena photo upload error:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },

  // Delete arena photo
  deleteArenaPhoto: async (req, res) => {
    try {
      const { arena_id, image_id } = req.params;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({
          message: "Arena not found or access denied",
        });
      }

      // Get photo details before deletion
      const [photoDetails] = await pool.execute(
        "SELECT image_url, cloudinary_id, is_primary FROM arena_images WHERE image_id = ? AND arena_id = ?",
        [image_id, arena_id]
      );

      if (photoDetails.length === 0) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const photo = photoDetails[0];

      // Delete from database
      await pool.execute(
        "DELETE FROM arena_images WHERE image_id = ? AND arena_id = ?",
        [image_id, arena_id]
      );

      // If we deleted the primary photo, set a new primary if available
      if (photo.is_primary) {
        const [remainingPhotos] = await pool.execute(
          "SELECT image_id FROM arena_images WHERE arena_id = ? ORDER BY uploaded_at LIMIT 1",
          [arena_id]
        );

        if (remainingPhotos.length > 0) {
          await pool.execute(
            "UPDATE arena_images SET is_primary = TRUE WHERE image_id = ?",
            [remainingPhotos[0].image_id]
          );
        }
      }

      // Optionally delete from Cloudinary
      if (photo.cloudinary_id && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudinary = require("cloudinary").v2;
          await cloudinary.uploader.destroy(photo.cloudinary_id);
          console.log(`Deleted from Cloudinary: ${photo.cloudinary_id}`);
        } catch (cloudinaryError) {
          console.warn(
            "Could not delete from Cloudinary:",
            cloudinaryError.message
          );
        }
      }

      res.json({
        message: "Photo deleted successfully",
        deleted_photo: photo,
      });
    } catch (error) {
      console.error("Error deleting arena photo:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  uploadCourtPhotos: async (req, res) => {
    console.log("🚀 UPLOAD COURT PHOTOS STARTED");

    try {
      const { court_id } = req.params;

      console.log("📋 Request details:", {
        courtId: court_id,
        userId: req.user?.id,
        filesCount: req.files ? req.files.length : 0
      });

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        console.log("❌ No files uploaded");
        return res.status(400).json({
          success: false,
          message: "No files uploaded. Please select at least one image.",
        });
      }

      // Log all files received from Cloudinary middleware
      console.log("📸 Files from Cloudinary:");
      req.files.forEach((file, i) => {
        console.log(`File ${i}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          filename: file.filename,       // This is the Cloudinary public_id
          path: file.path,               // This is the Cloudinary URL
          size: file.size,
          mimetype: file.mimetype
        });
      });

      // Verify court belongs to owner
      console.log("🔍 Verifying court ownership...");
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id, cd.court_name, a.owner_id 
       FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        console.log("❌ Court ownership verification failed");
        return res.status(403).json({
          success: false,
          message: "Court not found or you don't have permission",
          debug: { courtId: court_id, userId: req.user.id }
        });
      }

      console.log("✅ Court verified:", courtCheck[0].court_name);

      // Start database transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check existing primary image
        const [existingPrimary] = await connection.execute(
          "SELECT image_id FROM court_images WHERE court_id = ? AND is_primary = TRUE",
          [court_id]
        );

        console.log(`📊 Existing primary images: ${existingPrimary.length}`);

        const uploadedImages = [];

        // Save each photo to database
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];

          // Get Cloudinary URL and public_id
          const image_url = file.path; // Cloudinary URL
          const cloudinary_id = file.filename; // Cloudinary public_id

          console.log(`💾 Saving to DB [${i + 1}/${req.files.length}]:`, {
            image_url: image_url.substring(0, 50) + "...",
            cloudinary_id: cloudinary_id
          });

          // Set first image as primary if no primary exists
          const is_primary = existingPrimary.length === 0 && i === 0;

          // Insert into database
          const [result] = await connection.execute(
            `INSERT INTO court_images 
           (court_id, image_url, cloudinary_id, is_primary, uploaded_at)
           VALUES (?, ?, ?, ?, NOW())`,
            [court_id, image_url, cloudinary_id, is_primary]
          );

          const insertedId = result.insertId;
          console.log(`✅ Saved to DB with ID: ${insertedId}`);

          uploadedImages.push({
            image_id: insertedId,
            image_url: image_url,
            cloudinary_id: cloudinary_id,
            is_primary: is_primary,
            court_id: parseInt(court_id),
            court_name: courtCheck[0].court_name,
          });
        }

        await connection.commit();
        console.log("💾 Database transaction committed");

        console.log("🎉 Upload completed successfully!");
        console.log(`📊 Uploaded ${uploadedImages.length} images`);

        res.json({
          success: true,
          message: `${uploadedImages.length} photos uploaded successfully`,
          count: uploadedImages.length,
          images: uploadedImages,
        });

      } catch (dbError) {
        await connection.rollback();
        console.error("❌ Database error:", dbError);
        throw dbError;
      } finally {
        connection.release();
        console.log("🔓 Database connection released");
      }

    } catch (error) {
      console.error("💥 Upload error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to upload photos. Please try again.",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  // Get arena images
  getArenaImages: async (req, res) => {
    try {
      const { arena_id } = req.params;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({
          message: "Arena not found or access denied",
        });
      }

      const [images] = await pool.execute(
        "SELECT * FROM arena_images WHERE arena_id = ? ORDER BY is_primary DESC, uploaded_at DESC",
        [arena_id]
      );

      res.json({ images });
    } catch (error) {
      console.error("Error getting arena images:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get court images
  getCourtImages: async (req, res) => {
    try {
      const { court_id } = req.params;

      // Verify court belongs to owner
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res.status(404).json({
          message: "Court not found or access denied",
        });
      }

      const [images] = await pool.execute(
        "SELECT * FROM court_images WHERE court_id = ? ORDER BY is_primary DESC, uploaded_at DESC",
        [court_id]
      );

      res.json({ images });
    } catch (error) {
      console.error("Error getting court images:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Delete court photo
  deleteCourtPhoto: async (req, res) => {
    try {
      const { court_id } = req.params;
      const { image_url } = req.body;

      // Verify court belongs to owner
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res.status(404).json({
          message: "Court not found or access denied",
        });
      }

      // Delete from database
      await pool.execute(
        "DELETE FROM court_images WHERE court_id = ? AND image_url = ?",
        [court_id, image_url]
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

  getDashboard: async (req, res) => {
    try {
      const owner_id = req.user.id;
      const today = new Date().toISOString().split("T")[0];

      // Today's bookings count
      const [todayBookings] = await pool.execute(
        `SELECT COUNT(*) as count 
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE a.owner_id = ? AND ts.date = ?`,
        [owner_id, today]
      );

      // Total revenue for today
      const [todayRevenue] = await pool.execute(
        `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE a.owner_id = ? AND ts.date = ? AND b.status = 'completed'`,
        [owner_id, today]
      );

      // Monthly revenue
      const [monthlyRevenue] = await pool.execute(
        `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE a.owner_id = ? 
         AND MONTH(ts.date) = MONTH(CURRENT_DATE())
         AND YEAR(ts.date) = YEAR(CURRENT_DATE())
         AND b.status = 'completed'`,
        [owner_id]
      );

      // Pending booking requests
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
       ORDER BY ts.date ASC, ts.start_time ASC
       LIMIT 10`,
        [owner_id]
      );

      // Upcoming bookings (accepted but not completed)
      const [upcomingBookings] = await pool.execute(
        `SELECT b.*, u.name as user_name, u.phone_number as user_phone,
              st.name as sport_name, a.name as arena_name,
              ts.date, ts.start_time, ts.end_time,
              DATEDIFF(ts.date, CURDATE()) as days_until
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN users u ON b.user_id = u.user_id
       JOIN sports_types st ON b.sport_id = st.sport_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE a.owner_id = ? AND b.status = 'accepted' AND ts.date >= CURDATE()
       ORDER BY ts.date ASC, ts.start_time ASC
       LIMIT 10`,
        [owner_id]
      );

      // Get arenas owned by this owner
      const [arenas] = await pool.execute(
        "SELECT * FROM arenas WHERE owner_id = ?",
        [owner_id]
      );

      // Get total lost revenue
      const [lostRevenue] = await pool.execute(
        `SELECT COALESCE(SUM(lost_revenue), 0) as total_lost
       FROM arena_owners WHERE owner_id = ?`,
        [owner_id]
      );

      res.json({
        dashboard: {
          today_bookings: todayBookings[0].count,
          today_revenue: todayRevenue[0].revenue,
          monthly_revenue: monthlyRevenue[0].revenue,
          total_lost_revenue: lostRevenue[0].total_lost,
          total_arenas: arenas.length,
          pending_requests_count: pendingRequests.length,
          upcoming_bookings_count: upcomingBookings.length,
        },
        pending_requests: pendingRequests,
        upcoming_bookings: upcomingBookings,
        arenas: arenas,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all booking requests for owner
  getOwnerBookings: async (req, res) => {
    try {
      const { status, date_from, date_to, type = "all" } = req.query;
      const ownerId = req.user.id;

      let query = `
      SELECT 
        b.booking_id,
        b.status,
        b.total_amount,
        b.commission_amount,
        b.booking_date,
        b.payment_status,
        u.name as user_name,
        u.email as user_email,
        u.phone_number as user_phone,
        st.name as sport_name,
        a.name as arena_name,
        ts.date,
        ts.start_time,
        ts.end_time,
        DATEDIFF(ts.date, CURDATE()) as days_until,
        TIMESTAMP(ts.date, ts.end_time) as slot_end_datetime
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN sports_types st ON b.sport_id = st.sport_id
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      JOIN arenas a ON b.arena_id = a.arena_id
      WHERE a.owner_id = ?
    `;

      const params = [ownerId];

      if (status && status !== "all") {
        query += " AND b.status = ?";
        params.push(status);
      }

      // Filter by booking type - MODIFIED THIS SECTION
      if (type === "upcoming") {
        query += " AND b.status IN ('accepted', 'pending')"; // Keep even if time has passed
      } else if (type === "past") {
        query += " AND b.status IN ('completed', 'cancelled', 'rejected')";
      } else if (type === "history") {
        // Show all except pending/accepted (these are in upcoming)
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

      query += " ORDER BY ts.date ASC, ts.start_time ASC";

      const [bookings] = await pool.execute(query, params);
      res.json(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Accept a booking request
  acceptBooking: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { booking_id } = req.params;
      const ownerId = req.user.id;

      await connection.beginTransaction();

      // Verify owner owns this booking
      const [bookingCheck] = await connection.execute(
        `SELECT b.*, ts.slot_id, ts.date, ts.start_time, ts.end_time
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE b.booking_id = ? AND a.owner_id = ? AND b.status = 'pending'`,
        [booking_id, ownerId]
      );

      if (bookingCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: "Booking not found, already processed, or access denied",
        });
      }

      const booking = bookingCheck[0];

      // Update booking status
      await connection.execute(
        `UPDATE bookings 
         SET status = 'accepted',
             booking_date = NOW()
         WHERE booking_id = ?`,
        [booking_id]
      );

      // Mark time slot as unavailable
      await connection.execute(
        `UPDATE time_slots 
         SET is_available = FALSE,
             locked_until = NULL,
             locked_by_user_id = NULL
         WHERE slot_id = ?`,
        [booking.slot_id]
      );

      await connection.commit();

      // Send notification to user
      try {
        await pool.execute(
          `INSERT INTO notifications (user_id, notification_type, title, message)
           VALUES (?, 'booking.accepted', 'Booking Accepted', 
                   'Your booking for ${booking.date} ${booking.start_time}-${booking.end_time} has been accepted.')`,
          [booking.user_id]
        );
      } catch (notifError) {
        console.warn("Could not send notification:", notifError.message);
      }

      res.json({
        message: "Booking accepted successfully",
        booking_id: booking_id,
        status: "accepted",
      });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      connection.release();
    }
  },

  // Reject a booking request
  rejectBooking: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { booking_id } = req.params;
      const ownerId = req.user.id;

      await connection.beginTransaction();

      // Verify owner owns this booking
      const [bookingCheck] = await connection.execute(
        `SELECT b.*, ts.slot_id, ts.date, ts.start_time, ts.end_time
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE b.booking_id = ? AND a.owner_id = ? AND b.status = 'pending'`,
        [booking_id, ownerId]
      );

      if (bookingCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: "Booking not found, already processed, or access denied",
        });
      }

      const booking = bookingCheck[0];

      // Update booking status
      await connection.execute(
        `UPDATE bookings 
         SET status = 'rejected',
             cancelled_by = 'owner',
             cancellation_time = NOW()
         WHERE booking_id = ?`,
        [booking_id]
      );

      // Make time slot available again
      await connection.execute(
        `UPDATE time_slots 
         SET is_available = TRUE,
             locked_until = NULL,
             locked_by_user_id = NULL
         WHERE slot_id = ?`,
        [booking.slot_id]
      );

      await connection.commit();

      // Send notification to user
      try {
        await pool.execute(
          `INSERT INTO notifications (user_id, notification_type, title, message)
           VALUES (?, 'booking.rejected', 'Booking Rejected', 
                   'Your booking for ${booking.date} ${booking.start_time}-${booking.end_time} has been rejected.')`,
          [booking.user_id]
        );
      } catch (notifError) {
        console.warn("Could not send notification:", notifError.message);
      }

      res.json({
        message: "Booking rejected successfully",
        booking_id: booking_id,
        status: "rejected",
      });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      connection.release();
    }
  },

  // Get owner's arenas
  getArenas: async (req, res) => {
    try {
      const [arenas] = await pool.execute(
        `SELECT a.*, 
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END), 0) as pending_bookings
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
  completeBooking: async (req, res) => {
    try {
      const { booking_id } = req.params;

      // Only owners/managers can mark booking as completed
      const [bookingCheck] = await pool.execute(
        `SELECT b.* FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE b.booking_id = ? AND a.owner_id = ? AND b.status = 'accepted'`,
        [booking_id, req.user.id]
      );

      if (bookingCheck.length === 0) {
        return res.status(404).json({
          message: "Booking not found, not accepted yet, or access denied",
        });
      }

      const booking = bookingCheck[0];

      await pool.execute(
        `UPDATE bookings SET status = 'completed' WHERE booking_id = ?`,
        [booking_id]
      );

      // Update arena owner revenue
      await pool.execute(
        `UPDATE arena_owners 
         SET total_revenue = total_revenue + ?
         WHERE owner_id = (SELECT owner_id FROM arenas WHERE arena_id = ?)`,
        [booking.total_amount, booking.arena_id]
      );

      res.json({
        message: "Booking marked as completed",
        booking_id: booking_id,
        status: "completed",
      });
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
        if (sports.length > 0) {
          // Add arena sports WITHOUT price
          for (const sport_id of sports) {
            await connection.execute(
              `INSERT INTO arena_sports (arena_id, sport_id)
       VALUES (?, ?)`,
              [arena_id, sport_id]
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

  // Get courts for an arena - FIXED SQL QUERY
  getCourts: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const owner_id = req.user.id;

      console.log("Fetching courts for arena:", arena_id, "owner:", owner_id);

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, owner_id]
      );

      if (arenaCheck.length === 0) {
        return res
          .status(403)
          .json({ message: "Arena not found or access denied" });
      }

      // Get all courts first
      const [courts] = await pool.execute(
        `SELECT cd.*
       FROM court_details cd
       WHERE cd.arena_id = ?
       ORDER BY cd.court_number`,
        [arena_id]
      );

      console.log("Found courts:", courts.length);

      // For each court, get its images and sports
      for (let court of courts) {
        // Get images for this court
        const [images] = await pool.execute(
          `SELECT image_id, image_url, cloudinary_id, is_primary, uploaded_at
         FROM court_images 
         WHERE court_id = ?
         ORDER BY is_primary DESC, uploaded_at DESC`,
          [court.court_id]
        );

        // Get sports for this court
        const [sports] = await pool.execute(
          `SELECT cs.sport_id, st.name as sport_name
         FROM court_sports cs
         JOIN sports_types st ON cs.sport_id = st.sport_id
         WHERE cs.court_id = ?`,
          [court.court_id]
        );

        // Add images and sports to court object
        court.images = images;
        court.sports = sports.map((s) => s.sport_id);
        court.sports_names = sports.map((s) => s.sport_name);

        console.log(`Court ${court.court_id} has ${images.length} images`);
      }

      console.log("Returning courts with images");

      res.json(courts);
    } catch (error) {
      console.error("Error fetching courts:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Update court details
  updateCourt: async (req, res) => {
    try {
      const { court_id } = req.params;
      const { court_name, size_sqft, price_per_hour, description, sports } =
        req.body;

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
            `UPDATE court_details SET ${updateFields.join(
              ", "
            )} WHERE court_id = ?`,
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
          const sportsArray = Array.isArray(sports)
            ? sports
            : sports.split(",").map(Number);
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
      const {
        court_number,
        court_name,
        size_sqft,
        price_per_hour,
        description,
        sports,
      } = req.body;

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
            description || "",
          ]
        );

        const newCourtId = courtResult.insertId;

        // Add sports if provided
        if (sports && sports.length > 0) {
          const sportsArray = Array.isArray(sports)
            ? sports
            : sports.split(",").map(Number);
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
          court_number: nextCourtNumber,
        });
      } catch (error) {
        await connection.rollback();

        // Handle duplicate court number error
        if (error.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Court number already exists for this arena",
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
  // Add this function to ownerController.js
  deleteCourtPhoto: async (req, res) => {
    try {
      const { court_id, photo_id } = req.params;

      // Verify court belongs to owner's arena
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res.status(404).json({
          message: "Court not found or access denied",
        });
      }

      // Get photo details before deletion
      const [photoDetails] = await pool.execute(
        "SELECT image_url, cloudinary_id, is_primary FROM court_images WHERE image_id = ? AND court_id = ?",
        [photo_id, court_id]
      );

      if (photoDetails.length === 0) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const photo = photoDetails[0];

      // Delete from database
      await pool.execute(
        "DELETE FROM court_images WHERE image_id = ? AND court_id = ?",
        [photo_id, court_id]
      );

      // If we deleted the primary photo, set a new primary if available
      if (photo.is_primary) {
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
      }

      // Optionally delete from Cloudinary
      if (photo.cloudinary_id && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudinary = require("cloudinary").v2;
          await cloudinary.uploader.destroy(photo.cloudinary_id);
          console.log(`Deleted from Cloudinary: ${photo.cloudinary_id}`);
        } catch (cloudinaryError) {
          console.warn(
            "Could not delete from Cloudinary:",
            cloudinaryError.message
          );
        }
      }

      res.json({
        message: "Photo deleted successfully",
        deleted_photo: photo,
      });
    } catch (error) {
      console.error("Error deleting court photo:", error);
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

  getBookingStats: async (req, res) => {
    try {
      const owner_id = req.user.id;
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
          dateFilter =
            "MONTH(ts.date) = MONTH(CURDATE()) AND YEAR(ts.date) = YEAR(CURDATE())";
          break;
        case "year":
          dateFilter = "YEAR(ts.date) = YEAR(CURDATE())";
          break;
        default:
          dateFilter =
            "MONTH(ts.date) = MONTH(CURDATE()) AND YEAR(ts.date) = YEAR(CURRENT_DATE())";
      }

      // Get comprehensive stats
      const [stats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_bookings,
           SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
           SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
           SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bookings,
           SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected_bookings,
           SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
           COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
           COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.commission_amount ELSE 0 END), 0) as total_commission,
           COALESCE(SUM(CASE WHEN b.status = 'cancelled' AND b.cancelled_by = 'user' THEN b.cancellation_fee ELSE 0 END), 0) as lost_revenue
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE a.owner_id = ? AND ${dateFilter}`,
        [owner_id]
      );

      // Get daily revenue for last 7 days
      const [revenueTrend] = await pool.execute(
        `SELECT 
           DATE(ts.date) as date,
           COUNT(b.booking_id) as bookings_count,
           COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as daily_revenue
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE a.owner_id = ? AND ts.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(ts.date)
         ORDER BY date ASC`,
        [owner_id]
      );

      // Get arena-wise breakdown - FIXED THIS QUERY
      const [arenaStats] = await pool.execute(
        `SELECT a.name as arena_name, a.arena_id,
                COUNT(b.booking_id) as booking_count,
                COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count
         FROM arenas a
         LEFT JOIN bookings b ON a.arena_id = b.arena_id
         LEFT JOIN time_slots ts ON b.slot_id = ts.slot_id AND ${dateFilter}
         WHERE a.owner_id = ?
         GROUP BY a.arena_id, a.name
         ORDER BY revenue DESC`,
        [owner_id]
      );

      // Get status distribution
      const [statusDistribution] = await pool.execute(
        `SELECT 
           b.status,
           COUNT(*) as count,
           COALESCE(SUM(b.total_amount), 0) as total_amount
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE a.owner_id = ? AND ${dateFilter}
         GROUP BY b.status`,
        [owner_id]
      );

      res.json({
        period_stats: stats[0],
        revenue_trend: revenueTrend,
        arena_stats: arenaStats,
        status_distribution: statusDistribution,
      });
    } catch (error) {
      console.error("Booking stats error:", error);
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
  getTimeSlotsForDate: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
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

      const [slots] = await pool.execute(
        `SELECT ts.*, 
                b.booking_id,
                b.status as booking_status,
                u.name as booked_by,
                CASE 
                  WHEN b.booking_id IS NOT NULL THEN FALSE
                  WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
                  WHEN ts.is_holiday = TRUE THEN FALSE
                  ELSE TRUE
                END as is_available_display
         FROM time_slots ts
         LEFT JOIN bookings b ON ts.slot_id = b.slot_id AND b.status IN ('pending', 'accepted', 'completed')
         LEFT JOIN users u ON b.user_id = u.user_id
         WHERE ts.arena_id = ? AND ts.date = ?
         ORDER BY ts.start_time`,
        [arena_id, date]
      );

      res.json(slots);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Manage time slots - ENHANCED
  manageTimeSlots: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const {
        date,
        action, // 'block_all', 'unblock_all', 'holiday', 'update_slots', 'block_range'
        slots,
        is_blocked,
        is_holiday,
        start_time,
        end_time,
        price,
      } = req.body;

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

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        if (action === "block_all") {
          // Block all slots for the specific date
          await connection.execute(
            `UPDATE time_slots 
             SET is_blocked_by_owner = TRUE,
                 is_available = FALSE,
                 locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE arena_id = ? AND date = ?`,
            [arena_id, date]
          );
        } else if (action === "unblock_all") {
          // Unblock all slots for the specific date
          await connection.execute(
            `UPDATE time_slots 
             SET is_blocked_by_owner = FALSE,
                 is_available = TRUE,
                 locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE arena_id = ? AND date = ?`,
            [arena_id, date]
          );
        } else if (action === "holiday") {
          // Mark as holiday
          await connection.execute(
            `UPDATE time_slots 
             SET is_holiday = TRUE,
                 is_blocked_by_owner = TRUE,
                 is_available = FALSE,
                 locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE arena_id = ? AND date = ?`,
            [arena_id, date]
          );
        } else if (action === "unholiday") {
          // Remove holiday status
          await connection.execute(
            `UPDATE time_slots 
             SET is_holiday = FALSE,
                 is_blocked_by_owner = FALSE,
                 is_available = TRUE
             WHERE arena_id = ? AND date = ?`,
            [arena_id, date]
          );
        } else if (action === "block_range" && start_time && end_time) {
          // Block specific time range
          await connection.execute(
            `UPDATE time_slots 
             SET is_blocked_by_owner = TRUE,
                 is_available = FALSE,
                 locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE arena_id = ? AND date = ? 
               AND start_time >= ? AND end_time <= ?`,
            [arena_id, date, start_time, end_time]
          );
        } else if (action === "update_slots" && slots && slots.length > 0) {
          // Update specific slots
          for (const slot of slots) {
            // First check if slot exists
            const [existingSlot] = await connection.execute(
              `SELECT slot_id FROM time_slots 
               WHERE arena_id = ? AND date = ? AND start_time = ? AND end_time = ?`,
              [arena_id, date, slot.start_time, slot.end_time]
            );

            if (existingSlot.length > 0) {
              // Update existing slot
              await connection.execute(
                `UPDATE time_slots 
                 SET is_blocked_by_owner = ?,
                     is_holiday = ?,
                     price = ?,
                     is_available = CASE 
                       WHEN ? = TRUE THEN FALSE 
                       WHEN b.booking_id IS NOT NULL THEN FALSE 
                       ELSE TRUE 
                     END
                 FROM (SELECT 1) as dummy
                 LEFT JOIN bookings b ON time_slots.slot_id = b.slot_id AND b.status IN ('pending', 'accepted', 'completed')
                 WHERE time_slots.slot_id = ?`,
                [
                  slot.is_blocked || false,
                  slot.is_holiday || false,
                  slot.price || 500,
                  slot.is_blocked || false,
                  existingSlot[0].slot_id,
                ]
              );
            } else {
              // Create new slot only if not blocked
              const slotAvailable = !(slot.is_blocked || false);
              await connection.execute(
                `INSERT INTO time_slots 
                 (arena_id, date, start_time, end_time, price, 
                  is_blocked_by_owner, is_holiday, is_available)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  arena_id,
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
        } else if (action === "update_price" && price) {
          // Update price for all slots on this date
          await connection.execute(
            `UPDATE time_slots 
             SET price = ?
             WHERE arena_id = ? AND date = ?`,
            [price, arena_id, date]
          );
        }

        await connection.commit();
        res.json({
          message: "Time slots updated successfully",
          date: date,
          action: action,
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

  // Export booking data as JSON
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

  cleanupExpiredLocks: async (req, res) => {
    try {
      // Only allow admins or the system to call this
      if (req.user && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const [result] = await pool.execute(
        `UPDATE time_slots 
       SET locked_until = NULL,
           locked_by_user_id = NULL
       WHERE locked_until IS NOT NULL 
         AND locked_until <= NOW()`
      );

      res.json({
        message: `Cleaned up ${result.affectedRows} expired locks`,
        affected_rows: result.affectedRows,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error cleaning up expired locks:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};
module.exports = ownerController;
