const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateTimeSlots } = require("../utils/timeSlotHelper");
const decisionService = require("../utils/bookingDecisionService");

const ownerController = {
  // Complete owner registration with arena, courts, sports, and time slots
  // In ownerController.js - Complete registerOwnerComplete function

  // In ownerController.js - Fixed registerOwnerComplete function

  registerOwnerComplete: async (req, res) => {
    try {
      console.log("📝 Registration request received:", JSON.stringify(req.body, null, 2));

      const {
        // Owner details
        owner_name,
        personal_number,
        email,
        password,
        phone_number, // Add this - owner's business phone
        agreed_to_terms,

        // Multiple arenas array
        arenas = []
      } = req.body;

      // Validate required fields
      if (!owner_name) {
        return res.status(400).json({ message: "Owner name is required" });
      }

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      if (!phone_number) {
        return res.status(400).json({ message: "Business phone number is required" });
      }

      if (arenas.length === 0) {
        return res.status(400).json({ message: "At least one arena is required" });
      }

      if (!agreed_to_terms) {
        return res.status(400).json({ message: "You must agree to terms and conditions" });
      }

      // Normalize phone number
      let normalizedPhone = phone_number;
      if (typeof normalizedPhone === 'string') {
        normalizedPhone = normalizedPhone.trim().replace(/[\s\-()]/g, "");
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = "+92" + normalizedPhone.substring(1);
        } else if (normalizedPhone.startsWith("92") && !normalizedPhone.startsWith("+92")) {
          normalizedPhone = "+" + normalizedPhone;
        } else if (!normalizedPhone.startsWith("+")) {
          normalizedPhone = "+92" + normalizedPhone;
        }
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
        // 1. Create owner record - Include ALL required fields
        const hashedPassword = await bcrypt.hash(password, 10);

        // Use first arena's name as the primary arena_name for the owner record
        const primaryArenaName = arenas[0]?.arena_name || "My Arena";

        const [ownerResult] = await connection.execute(
          `INSERT INTO arena_owners 
         (owner_name, arena_name, personal_number, email, phone_number, password_hash, agreed_to_terms, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            owner_name,
            primaryArenaName,
            personal_number || null,
            email,
            normalizedPhone, // Add phone_number here
            hashedPassword,
            agreed_to_terms ? 1 : 0,
          ]
        );

        const owner_id = ownerResult.insertId;
        console.log(`✅ Owner created with ID: ${owner_id}`);

        // 2. Create multiple arenas
        const createdArenas = [];

        for (let i = 0; i < arenas.length; i++) {
          const arenaData = arenas[i];
          console.log(`🏟️ Creating arena ${i + 1}:`, arenaData.arena_name);

          // Validate arena data
          if (!arenaData.arena_name) {
            throw new Error(`Arena ${i + 1} name is required`);
          }

          if (!arenaData.business_address) {
            throw new Error(`Business address is required for arena: ${arenaData.arena_name}`);
          }

          // Create arena - REMOVED phone_number from INSERT
          const [arenaResult] = await connection.execute(
            `INSERT INTO arenas 
           (owner_id, name, description, location_lat, location_lng,
            address, base_price_per_hour, rating, total_reviews, is_active, is_blocked, total_commission_due)
           VALUES (?, ?, ?, 0, 0, ?, ?, 0, 0, TRUE, FALSE, 0.00)`,
            [
              owner_id,
              arenaData.arena_name,
              arenaData.description || "",
              arenaData.business_address,
              parseFloat(arenaData.base_price_per_hour) || 500,
            ]
          );

          const arena_id = arenaResult.insertId;
          console.log(`✅ Arena created with ID: ${arena_id}`);
          createdArenas.push({ arena_id, name: arenaData.arena_name });

          // Add sports to arena
          if (arenaData.selected_sports && arenaData.selected_sports.length > 0) {
            console.log(`Adding ${arenaData.selected_sports.length} sports to arena`);
            for (const sport_id of arenaData.selected_sports) {
              // Check if sport exists
              const [sportCheck] = await connection.execute(
                "SELECT sport_id FROM sports_types WHERE sport_id = ?",
                [sport_id]
              );

              if (sportCheck.length > 0) {
                await connection.execute(
                  `INSERT INTO arena_sports (arena_id, sport_id) VALUES (?, ?)`,
                  [arena_id, sport_id]
                );
              }
            }
          }

          // Create courts
          let courtData = arenaData.courts;
          if (!courtData || courtData.length === 0) {
            // Auto-generate courts if none provided (fallback)
            courtData = Array.from(
              { length: parseInt(arenaData.number_of_courts) || 1 },
              (_, i) => ({
                court_number: i + 1,
                court_name: `Court ${i + 1}`,
                size_sqft: 2000,
                price_per_hour: 500, // Default price instead of base_price_per_hour
                description: "",
                sports: arenaData.selected_sports || [],
              })
            );
          }

          console.log(`Creating ${courtData.length} courts for arena`);

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
                parseFloat(court.price_per_hour) || 500, // Use court price, not base_price
                court.description || "",
              ]
            );
            const court_id = courtResult.insertId;

            // Add sports to court
            const courtSports = court.sports || arenaData.selected_sports || [];
            for (const sport_id of courtSports) {
              if (sport_id) {
                const [sportCheck] = await connection.execute(
                  "SELECT sport_id FROM sports_types WHERE sport_id = ?",
                  [sport_id]
                );

                if (sportCheck.length > 0) {
                  await connection.execute(
                    `INSERT INTO court_sports (court_id, sport_id) VALUES (?, ?)`,
                    [court_id, sport_id]
                  );
                }
              }
            }
          }


          // Generate time slots if opening/closing times are provided
          if (arenaData.opening_time && arenaData.closing_time) {
            const timeSlots = generateTimeSlots(
              arenaData.opening_time,
              arenaData.closing_time,
              arenaData.slot_duration || 60
            );

            const today = new Date();
            let slotsCreated = 0;

            for (let i = 0; i < 30; i++) {
              const date = new Date(today);
              date.setDate(today.getDate() + i);
              const dateStr = date.toISOString().split("T")[0];
              const dayName = date
                .toLocaleDateString("en-US", { weekday: "long" })
                .toLowerCase();

              // Check if this day is available
              let dayAvailable = true;
              if (arenaData.days_available && arenaData.days_available[dayName] !== undefined) {
                dayAvailable = arenaData.days_available[dayName];
              }

              if (dayAvailable) {
                // Get all courts for this arena with their specific prices
                const [courtRows] = await connection.execute(
                  "SELECT court_id, price_per_hour FROM court_details WHERE arena_id = ?",
                  [arena_id]
                );

                // Create time slots for EACH court using court-specific prices
                for (const court of courtRows) {
                  for (const slot of timeSlots) {
                    await connection.execute(
                      `INSERT INTO time_slots 
                         (arena_id, court_id, date, start_time, end_time, price, is_available)
                         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                      [
                        arena_id,
                        court.court_id,
                        dateStr,
                        slot.start_time,
                        slot.end_time,
                        parseFloat(court.price_per_hour) || 500, // Use court-specific price
                      ]
                    );
                    slotsCreated++;
                  }
                }
              }
            }
            console.log(`Created ${slotsCreated} time slots for arena ${arena_id}`);
          }
        }

        // Commit transaction
        await connection.commit();
        console.log(`✅ Transaction committed successfully`);

        // Generate JWT token
        const token = jwt.sign(
          { id: owner_id, email, role: "owner" },
          process.env.JWT_SECRET || "your_jwt_secret",
          { expiresIn: "7d" }
        );

        // Get owner data
        const [ownerData] = await pool.execute(
          `SELECT owner_id, owner_name, arena_name, email, phone_number, personal_number, created_at 
         FROM arena_owners WHERE owner_id = ?`,
          [owner_id]
        );

        res.status(201).json({
          message: `Registration successful with ${createdArenas.length} arena(s)`,
          token,
          owner: ownerData[0],
          arenas: createdArenas
        });

      } catch (error) {
        await connection.rollback();
        console.error("❌ Transaction error:", error);
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("❌ Registration error:", error);

      res.status(500).json({
        message: "Server error during registration",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

  // In ownerController.js - Replace the uploadCourtPhotos function with this:

  uploadCourtPhotos: async (req, res) => {
    console.log("🚀 UPLOAD COURT PHOTOS STARTED");

    try {
      const { court_id } = req.params;

      console.log("📋 Request details:", {
        courtId: court_id,
        userId: req.user?.id,
        userRole: req.user?.role,
        filesCount: req.files ? req.files.length : 0,
        hasAuth: !!req.user
      });

      // ✅ STEP 1: Check authentication
      if (!req.user) {
        console.log("❌ No user in request");
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login.",
        });
      }

      console.log("✅ User authenticated:", req.user.id);

      // ✅ STEP 2: Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        console.log("❌ No files uploaded");
        return res.status(400).json({
          success: false,
          message: "No files uploaded. Please select at least one image.",
        });
      }

      console.log(`✅ Files received: ${req.files.length}`);

      // ✅ STEP 3: Log all files from Cloudinary
      console.log("📸 Files from Cloudinary:");
      req.files.forEach((file, i) => {
        console.log(`File ${i}:`, {
          originalname: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
        });
      });

      // ✅ STEP 4: Verify court exists and belongs to owner
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
        });
      }

      const court = courtCheck[0];
      console.log("✅ Court verified:", court.court_name);

      // ✅ STEP 5: Check if adding these photos exceeds the 3-photo limit
      const [existingPhotos] = await pool.execute(
        "SELECT COUNT(*) as count FROM court_images WHERE court_id = ?",
        [court_id]
      );

      const currentCount = existingPhotos[0].count;
      const newCount = currentCount + req.files.length;

      console.log(`📊 Photo count check: Current=${currentCount}, Adding=${req.files.length}, Total will be=${newCount}`);

      if (newCount > 3) {
        console.log("❌ Photo limit exceeded");
        return res.status(400).json({
          success: false,
          message: `Maximum 3 photos per court. You have ${currentCount}, trying to add ${req.files.length}.`,
        });
      }

      console.log("✅ Photo limit check passed");

      // ✅ STEP 6: Start database transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check existing primary image
        const [existingPrimary] = await connection.execute(
          "SELECT image_id FROM court_images WHERE court_id = ? AND is_primary = TRUE",
          [court_id]
        );

        console.log(`📌 Existing primary images: ${existingPrimary.length}`);

        const uploadedImages = [];

        // ✅ STEP 7: Save each photo to database
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];

          const image_url = file.path; // Cloudinary URL
          const cloudinary_id = file.filename; // Cloudinary public_id

          console.log(`💾 Saving to DB [${i + 1}/${req.files.length}]:`, {
            image_url: image_url.substring(0, 50) + "...",
            cloudinary_id: cloudinary_id,
          });

          // Set first image as primary if no primary exists
          const is_primary = existingPrimary.length === 0 && i === 0;

          // INSERT into database
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
            court_name: court.court_name,
          });
        }

        // ✅ STEP 8: Commit transaction
        await connection.commit();
        console.log("💾 Database transaction committed");

        console.log("🎉 Upload completed successfully!");
        console.log(`📊 Uploaded ${uploadedImages.length} images`);

        // ✅ STEP 9: Return success response
        res.json({
          success: true,
          message: `${uploadedImages.length} photo(s) uploaded successfully`,
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
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

  // In ownerController.js - Update getDashboard function

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

      // 🔥 NEW: Get per-arena statistics
      const [arenaStats] = await pool.execute(
        `SELECT 
         a.arena_id,
         a.name as arena_name,
         COUNT(DISTINCT b.booking_id) as total_bookings,
         SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
         SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
         SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bookings,
         COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN b.status = 'completed' AND ts.date = CURDATE() THEN b.total_amount ELSE 0 END), 0) as today_revenue,
         COUNT(DISTINCT CASE WHEN ts.date = CURDATE() THEN b.booking_id END) as today_bookings
       FROM arenas a
       LEFT JOIN bookings b ON a.arena_id = b.arena_id
       LEFT JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE a.owner_id = ?
       GROUP BY a.arena_id, a.name`,
        [owner_id]
      );

      console.log("📊 Arena stats:", arenaStats);

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
        arena_stats: arenaStats, // 🔥 ADD THIS LINE
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Get all booking requests for owner
  getOwnerBookings: async (req, res) => {
    try {
      const { status, date_from, date_to, type = "all", arena_id } = req.query;
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
        a.arena_id,
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

      // Add arena_id filter if provided
      if (arena_id) {
        query += " AND a.arena_id = ?";
        params.push(arena_id);
      }

      if (status && status !== "all") {
        query += " AND b.status = ?";
        params.push(status);
      }

      // Filter by booking type
      if (type === "upcoming") {
        query += " AND b.status IN ('accepted', 'pending')";
      } else if (type === "history") {
        query += " AND b.status IN ('completed', 'cancelled', 'rejected')";
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

      query += " ORDER BY ts.date ASC, ts.start_time ASC";

      console.log("Executing query with params:", params);
      const [bookings] = await pool.execute(query, params);

      console.log(`Found ${bookings.length} bookings`);
      res.json(bookings);
    } catch (error) {
      console.error("Error in getOwnerBookings:", error);
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
      const { court_name, size_sqft, price_per_hour, description, sports } = req.body;

      // Verify court belongs to owner's arena
      const [courtCheck] = await pool.execute(
        `SELECT cd.court_id, cd.price_per_hour as old_price 
       FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
        [court_id, req.user.id]
      );

      if (courtCheck.length === 0) {
        return res.status(404).json({ message: "Court not found or access denied" });
      }

      const oldPrice = courtCheck[0].old_price;
      const newPrice = parseFloat(price_per_hour);

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
          values.push(newPrice);
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

        // ✅ Update future time slots price if price changed
        if (price_per_hour !== undefined && newPrice !== oldPrice) {
          await connection.execute(
            `UPDATE time_slots 
           SET price = ?
           WHERE court_id = ? 
             AND date >= CURDATE()
             AND is_blocked_by_owner = FALSE`,
            [newPrice, court_id]
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
          const sportsArray = Array.isArray(sports) ? sports : sports.split(",").map(Number);
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

        res.json({
          message: "Court updated successfully",
          price_updated: price_per_hour !== undefined ? newPrice !== oldPrice : false
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error updating court:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

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

      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res
          .status(404)
          .json({ message: "Arena not found or access denied" });
      }

      // ✅ Get arena owner's time slot configuration
      const [ownerSettings] = await pool.execute(
        `SELECT ao.time_slots, a.base_price_per_hour
       FROM arena_owners ao
       JOIN arenas a ON ao.owner_id = a.owner_id
       WHERE a.arena_id = ?`,
        [arena_id]
      );

      const ownerSetting = ownerSettings[0] || {};

      // Parse time slots configuration from JSON or use defaults
      let timeSlotsConfig = {};
      if (ownerSetting.time_slots) {
        try {
          timeSlotsConfig = JSON.parse(ownerSetting.time_slots);
        } catch (e) {
          // If JSON parsing fails, use defaults
          timeSlotsConfig = {};
        }
      }

      // Get time slot settings with defaults
      const opening_time = timeSlotsConfig.opening_time || "06:00";
      const closing_time = timeSlotsConfig.closing_time || "22:00";
      const slot_duration = timeSlotsConfig.slot_duration || 60;
      const days_available = timeSlotsConfig.days_available || {
        monday: true, tuesday: true, wednesday: true, thursday: true,
        friday: true, saturday: true, sunday: false
      };
      const base_price = price_per_hour || ownerSetting.base_price_per_hour || 500;

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
            parseFloat(price_per_hour) || base_price,
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

        // ✅ GENERATE TIME SLOTS FOR THE NEW COURT USING EXISTING generateTimeSlots
        const timeSlots = generateTimeSlots(
          opening_time,
          closing_time,
          slot_duration
        );

        const today = new Date();
        let slotsCreated = 0;

        // Generate slots for next 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split("T")[0];

          // Check if this day is available
          const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

          if (days_available[dayName] !== false) {
            // Create time slots for this day
            for (const slot of timeSlots) {
              await connection.execute(
                `INSERT INTO time_slots 
               (arena_id, court_id, date, start_time, end_time, price, is_available)
               VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [
                  arena_id,
                  newCourtId,
                  dateStr,
                  slot.start_time,
                  slot.end_time,
                  parseFloat(price_per_hour) || base_price,
                ]
              );
              slotsCreated++;
            }
          }
        }

        await connection.commit();

        res.status(201).json({
          message: "Court added successfully with time slots",
          court_id: newCourtId,
          court_number: nextCourtNumber,
          court_name: court_name || `Court ${nextCourtNumber}`,
          slots_generated: slotsCreated,
          time_slot_settings: {
            opening_time,
            closing_time,
            slot_duration,
            days_available,
            price: parseFloat(price_per_hour) || base_price
          }
        });
      } catch (error) {
        await connection.rollback();

        // Handle duplicate court number error
        if (error.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Court number already exists for this arena",
          });
        }

        console.error("Transaction error adding court:", error);
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error adding court:", error);
      res.status(500).json({
        message: "Server error adding court",
        error: error.message
      });
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

  // In ownerController.js - Update addManager
  // In ownerController.js - Update addManager with logs

  addManager: async (req, res) => {
    try {
      const { name, email, password, phone_number, arena_permissions } = req.body;
      const owner_id = req.user.id;

      console.log("=".repeat(50));
      console.log("📝 ADD MANAGER REQUEST");
      console.log("Owner ID:", owner_id);
      console.log("Name:", name);
      console.log("Email:", email);
      console.log("Phone:", phone_number);
      console.log("Arena Permissions received:", JSON.stringify(arena_permissions, null, 2));

      // Check if manager already exists
      const [existingManager] = await pool.execute(
        "SELECT manager_id FROM arena_managers WHERE email = ? AND owner_id = ?",
        [email, owner_id]
      );

      if (existingManager.length > 0) {
        console.log("❌ Manager already exists");
        return res.status(400).json({ message: "Manager already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Transform arena_permissions array into nested object
      const permissionsObj = {};
      if (arena_permissions && Array.isArray(arena_permissions)) {
        arena_permissions.forEach(ap => {
          permissionsObj[`arena_${ap.arena_id}`] = ap.permissions || {};
        });
      }

      console.log("📦 Transformed permissions object:", JSON.stringify(permissionsObj, null, 2));

      // Insert manager
      const [result] = await pool.execute(
        `INSERT INTO arena_managers 
       (owner_id, name, email, password_hash, phone_number, permissions)
       VALUES (?, ?, ?, ?, ?, ?)`,
        [
          owner_id,
          name,
          email,
          hashedPassword,
          phone_number,
          JSON.stringify(permissionsObj),
        ]
      );

      console.log("✅ Manager inserted with ID:", result.insertId);
      console.log("=".repeat(50));

      res.status(201).json({
        message: "Manager added successfully",
        manager_id: result.insertId,
      });
    } catch (error) {
      console.error("❌ Error adding manager:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  deleteManager: async (req, res) => {
    try {
      const { manager_id } = req.params;
      const owner_id = req.user.id;

      console.log(`🗑️ Delete request: Manager ID ${manager_id}, Owner ID ${owner_id}`);

      // First verify this manager exists and belongs to this owner
      const [managerCheck] = await pool.execute(
        `SELECT manager_id, name, email, is_active 
       FROM arena_managers 
       WHERE manager_id = ? AND owner_id = ?`,
        [manager_id, owner_id]
      );

      if (managerCheck.length === 0) {
        console.log(`❌ Manager ${manager_id} not found or doesn't belong to owner ${owner_id}`);
        return res.status(404).json({
          success: false,
          message: "Manager not found or you don't have permission to delete this manager"
        });
      }

      const manager = managerCheck[0];
      console.log(`✅ Found manager: ${manager.name} (${manager.email})`);

      // SOFT DELETE - Since you don't have deleted_at column, just deactivate
      // This keeps the record but prevents login
      const [deleteResult] = await pool.execute(
        `UPDATE arena_managers 
       SET 
         is_active = 0,
         email = CONCAT('deleted_', manager_id, '_', email) -- Make email unique for future reuse
       WHERE manager_id = ? AND owner_id = ?`,
        [manager_id, owner_id]
      );

      console.log(`✅ Delete result:`, deleteResult);

      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Failed to delete manager"
        });
      }

      res.json({
        success: true,
        message: `Manager "${manager.name}" has been permanently deleted`,
        deleted_manager: {
          id: manager.manager_id,
          name: manager.name,
          email: manager.email
        }
      });

    } catch (error) {
      console.error("💥 Error deleting manager:", error);

      // Handle specific database errors
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: "Error deleting manager. Please try again."
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error while deleting manager",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // In ownerController.js - Add updateManagerCredentials function

  // Update manager credentials (name, email, phone, password)
  updateManagerCredentials: async (req, res) => {
    try {
      const { manager_id } = req.params;
      const owner_id = req.user.id;
      const { name, email, phone_number, password } = req.body;

      console.log("📝 Updating manager credentials:", {
        manager_id,
        owner_id,
        name,
        email,
        phone_number,
        hasPassword: !!password
      });

      // Verify manager belongs to this owner
      const [managerCheck] = await pool.execute(
        `SELECT manager_id FROM arena_managers 
       WHERE manager_id = ? AND owner_id = ?`,
        [manager_id, owner_id]
      );

      if (managerCheck.length === 0) {
        return res.status(404).json({
          message: "Manager not found or access denied"
        });
      }

      // Build update query dynamically
      const updateFields = [];
      const values = [];

      if (name) {
        updateFields.push("name = ?");
        values.push(name);
      }

      if (email) {
        // Check if email is already taken by another manager
        const [emailCheck] = await pool.execute(
          `SELECT manager_id FROM arena_managers 
         WHERE email = ? AND manager_id != ? AND owner_id = ?`,
          [email, manager_id, owner_id]
        );

        if (emailCheck.length > 0) {
          return res.status(400).json({
            message: "Email already in use by another manager"
          });
        }

        updateFields.push("email = ?");
        values.push(email);
      }

      if (phone_number) {
        updateFields.push("phone_number = ?");
        values.push(phone_number);
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push("password_hash = ?");
        values.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      values.push(manager_id);

      await pool.execute(
        `UPDATE arena_managers SET ${updateFields.join(", ")} WHERE manager_id = ?`,
        values
      );

      res.json({
        success: true,
        message: "Manager credentials updated successfully"
      });

    } catch (error) {
      console.error("Error updating manager credentials:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  },
  getTimeSlotsForDate: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { date, court_id } = req.query;

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

      // Build query based on whether court_id is provided
      let query = `
      SELECT ts.*, 
        b.booking_id,
        b.status as booking_status,
        u.name as booked_by,
        cd.court_number,
        cd.court_name,
        CASE 
          WHEN b.booking_id IS NOT NULL THEN FALSE
          WHEN ts.is_blocked_by_owner = TRUE THEN FALSE
          WHEN ts.is_holiday = TRUE THEN FALSE
          ELSE TRUE
        END as is_available_display
      FROM time_slots ts
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      LEFT JOIN bookings b ON ts.slot_id = b.slot_id AND b.status IN ('pending', 'accepted', 'completed')
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE ts.arena_id = ? AND ts.date = ?
    `;

      const params = [arena_id, date];

      // Filter by court_id if provided
      if (court_id) {
        query += " AND ts.court_id = ?";
        params.push(court_id);
      }

      query += " ORDER BY cd.court_number, ts.start_time";

      const [slots] = await pool.execute(query, params);

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
        action,
        slots,
        is_blocked,
        is_holiday,
        start_time,
        end_time,
        price,
        court_id, // ADD court_id parameter
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

      // If court_id is provided, verify it belongs to this arena
      let validCourtId = court_id;
      if (court_id) {
        const [courtCheck] = await pool.execute(
          "SELECT court_id FROM court_details WHERE court_id = ? AND arena_id = ?",
          [court_id, arena_id]
        );

        if (courtCheck.length === 0) {
          return res.status(400).json({
            message: "Court does not belong to this arena",
          });
        }
        validCourtId = courtCheck[0].court_id;
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

          // Add court filter if provided
          if (validCourtId) {
            query += " AND court_id = ?";
            params.push(validCourtId);
          }

          await connection.execute(query, params);
        } else if (action === "unblock_all") {
          let query = `UPDATE time_slots 
                     SET is_blocked_by_owner = FALSE,
                         is_available = TRUE,
                         locked_until = NULL,
                         locked_by_user_id = NULL
                     WHERE arena_id = ? AND date = ?`;
          const params = [arena_id, date];

          // Add court filter if provided
          if (validCourtId) {
            query += " AND court_id = ?";
            params.push(validCourtId);
          }

          await connection.execute(query, params);
        } else if (action === "holiday") {
          let query = `UPDATE time_slots 
                     SET is_holiday = TRUE,
                         is_blocked_by_owner = TRUE,
                         is_available = FALSE,
                         locked_until = NULL,
                         locked_by_user_id = NULL
                     WHERE arena_id = ? AND date = ?`;
          const params = [arena_id, date];

          // Add court filter if provided
          if (validCourtId) {
            query += " AND court_id = ?";
            params.push(validCourtId);
          }

          await connection.execute(query, params);
        } else if (action === "unholiday") {
          let query = `UPDATE time_slots 
                     SET is_holiday = FALSE,
                         is_blocked_by_owner = FALSE,
                         is_available = TRUE
                     WHERE arena_id = ? AND date = ?`;
          const params = [arena_id, date];

          // Add court filter if provided
          if (validCourtId) {
            query += " AND court_id = ?";
            params.push(validCourtId);
          }

          await connection.execute(query, params);
        } else if (action === "block_range" && start_time && end_time) {
          let query = `UPDATE time_slots 
                     SET is_blocked_by_owner = TRUE,
                         is_available = FALSE,
                         locked_until = NULL,
                         locked_by_user_id = NULL
                     WHERE arena_id = ? AND date = ? 
                       AND start_time >= ? AND end_time <= ?`;
          const params = [arena_id, date, start_time, end_time];

          // Add court filter if provided
          if (validCourtId) {
            query += " AND court_id = ?";
            params.push(validCourtId);
          }

          await connection.execute(query, params);
        } else if (action === "update_slots" && slots && slots.length > 0) {
          // Update specific slots
          for (const slot of slots) {
            // Use court_id from the slot itself, fallback to top-level court_id
            const slotCourtId = slot.court_id || validCourtId;

            if (!slotCourtId) {
              // Skip if no court_id at all
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
              // Create new slot only if not blocked
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
        } else if (action === "update_price" && price) {
          // Update price for all slots on this date
          let query = `UPDATE time_slots 
                     SET price = ?
                     WHERE arena_id = ? AND date = ?`;
          const params = [price, arena_id, date];

          // Add court filter if provided
          if (validCourtId) {
            query += " AND court_id = ?";
            params.push(validCourtId);
          }

          await connection.execute(query, params);
        }

        await connection.commit();
        res.json({
          message: "Time slots updated successfully",
          date: date,
          action: action,
          court_id: validCourtId || null,
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
  getManagers: async (req, res) => {
    try {
      console.log("=".repeat(50));
      console.log("📋 FETCHING MANAGERS");
      console.log("🔑 User from token:", req.user);
      console.log("Owner ID from token:", req.user.id);

      // Get managers for this specific owner
      const [managers] = await pool.execute(
        `SELECT * FROM arena_managers 
       WHERE owner_id = ?`,
        [req.user.id]
      );

      console.log(`Found ${managers.length} managers for owner_id ${req.user.id}`);

      if (managers.length === 0) {
        console.log("❌ No managers found for this owner");
        console.log("=".repeat(50));
        return res.json([]);
      }

      // Get all arenas for this owner
      const [arenas] = await pool.execute(
        "SELECT arena_id, name FROM arenas WHERE owner_id = ?",
        [req.user.id]
      );

      const arenaMap = {};
      arenas.forEach(arena => {
        arenaMap[arena.arena_id] = arena.name;
      });

      // Process each manager
      const processedManagers = managers.map(manager => {
        let permissions = {};
        try {
          permissions = JSON.parse(manager.permissions) || {};
        } catch (e) {
          permissions = {};
        }

        // Convert to array format
        const arenaPermissions = [];
        Object.keys(permissions).forEach(key => {
          if (key.startsWith('arena_')) {
            const arenaId = parseInt(key.replace('arena_', ''));
            arenaPermissions.push({
              arena_id: arenaId,
              arena_name: arenaMap[arenaId] || `Arena ${arenaId}`,
              permissions: permissions[key]
            });
          }
        });

        return {
          ...manager,
          permissions: permissions,
          arena_permissions: arenaPermissions
        };
      });

      console.log(`✅ Returning ${processedManagers.length} processed managers`);
      console.log("=".repeat(50));

      // 🔥 IMPORTANT: Send the response!
      res.json(processedManagers);

    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // In ownerController.js - REPLACE your existing updateManager function

  updateManager: async (req, res) => {
    try {
      const { manager_id } = req.params;
      const { arena_permissions, is_active } = req.body;

      // Verify owner owns this manager
      const [managerCheck] = await pool.execute(
        `SELECT manager_id FROM arena_managers 
       WHERE manager_id = ? AND owner_id = ?`,
        [manager_id, req.user.id]
      );

      if (managerCheck.length === 0) {
        return res.status(404)
          .json({ message: "Manager not found or access denied" });
      }

      const updateFields = [];
      const values = [];

      // 🔥 Handle arena-specific permissions update
      if (arena_permissions) {
        const permissionsObj = {};
        arena_permissions.forEach(ap => {
          permissionsObj[`arena_${ap.arena_id}`] = ap.permissions || {};
        });

        updateFields.push("permissions = ?");
        values.push(JSON.stringify(permissionsObj));
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
        `UPDATE arena_managers SET ${updateFields.join(", ")} WHERE manager_id = ?`,
        values
      );

      res.json({
        message: "Manager updated successfully",
      });
    } catch (error) {
      console.error("Error updating manager:", error);
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
  // Update owner password
  updateOwnerPassword: async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({
          message: "Current password and new password are required"
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters long"
        });
      }

      // Get current password hash
      const [ownerData] = await pool.execute(
        "SELECT password_hash FROM arena_owners WHERE owner_id = ?",
        [req.user.id]
      );

      if (ownerData.length === 0) {
        return res.status(404).json({ message: "Owner not found" });
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(
        current_password,
        ownerData[0].password_hash
      );

      if (!passwordMatch) {
        return res.status(400).json({
          message: "Current password is incorrect"
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      await pool.execute(
        "UPDATE arena_owners SET password_hash = ? WHERE owner_id = ?",
        [hashedPassword, req.user.id]
      );

      res.json({
        message: "Password updated successfully"
      });

    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
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

  // Add this method to fix missing slots for existing courts
  fixMissingCourtSlots: async (req, res) => {
    try {
      const { arena_id } = req.params;
      const { court_id, start_date, end_date } = req.body;

      // Verify owner owns this arena
      const [arenaCheck] = await pool.execute(
        "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
        [arena_id, req.user.id]
      );

      if (arenaCheck.length === 0) {
        return res.status(404).json({ message: "Arena not found or access denied" });
      }

      // Get arena settings
      const [arenaSettings] = await pool.execute(
        "SELECT opening_time, closing_time, slot_duration, base_price_per_hour FROM arenas WHERE arena_id = ?",
        [arena_id]
      );

      const arenaSetting = arenaSettings[0] || {};
      const opening_time = arenaSetting.opening_time || "06:00";
      const closing_time = arenaSetting.closing_time || "22:00";
      const slot_duration = arenaSetting.slot_duration || 60;
      const base_price = arenaSetting.base_price_per_hour || 500;

      // Get court details (price_per_hour)
      const [courtDetails] = await pool.execute(
        "SELECT court_id, price_per_hour FROM court_details WHERE arena_id = ? AND court_id = ?",
        [arena_id, court_id]
      );

      if (courtDetails.length === 0) {
        return res.status(404).json({ message: "Court not found" });
      }

      const court = courtDetails[0];
      const courtPrice = court.price_per_hour || base_price;

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const timeSlots = generateTimeSlots(opening_time, closing_time, slot_duration);
        const startDate = start_date ? new Date(start_date) : new Date();
        const endDate = end_date ? new Date(end_date) : new Date();
        endDate.setDate(endDate.getDate() + 30); // Default to 30 days if not specified

        let createdCount = 0;
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split("T")[0];

          for (const slot of timeSlots) {
            // Check if slot already exists
            const [existingSlot] = await connection.execute(
              `SELECT slot_id FROM time_slots 
             WHERE arena_id = ? AND court_id = ? AND date = ? 
             AND start_time = ? AND end_time = ?`,
              [arena_id, court_id, dateStr, slot.start_time, slot.end_time]
            );

            if (existingSlot.length === 0) {
              // Create missing slot
              await connection.execute(
                `INSERT INTO time_slots 
               (arena_id, court_id, date, start_time, end_time, price, is_available)
               VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [
                  arena_id,
                  court_id,
                  dateStr,
                  slot.start_time,
                  slot.end_time,
                  courtPrice,
                ]
              );
              createdCount++;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        await connection.commit();

        res.json({
          message: `Created ${createdCount} missing time slots for court ${court_id}`,
          court_id: court_id,
          slots_created: createdCount,
          date_range: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Error fixing missing court slots:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

};
module.exports = ownerController;
