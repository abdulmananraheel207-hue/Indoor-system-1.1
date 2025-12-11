const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// Arena Owner Registration
router.post("/register", async (req, res) => {
  console.log("Request body received:", req.body);
  const {
    arena_name,
    email,
    password,
    phone_number,
    business_address,
    google_maps_location,
    number_of_courts,
    agreed_to_terms,
    time_slots,
    sports_pricing,
    court_details,
  } = req.body;

  // Validation
  if (!arena_name || !email || !password || !phone_number || !agreed_to_terms) {
    return res.status(400).json({
      error:
        "Arena name, email, password, phone number, and terms agreement are required",
    });
  }

  if (agreed_to_terms !== true) {
    return res.status(400).json({
      error: "You must agree to the Terms and Conditions",
    });
  }

  // ========== ADD PASSWORD VALIDATION HERE ==========
  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long",
    });
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return res.status(400).json({
      error: "Password must contain at least one uppercase letter",
    });
  }

  if (!/(?=.*\d)/.test(password)) {
    return res.status(400).json({
      error: "Password must contain at least one number",
    });
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return res.status(400).json({
      error: "Password must contain at least one special character (@$!%*?&)",
    });
  }
  // ========== END PASSWORD VALIDATION ==========

  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if owner already exists with email
      const [existingEmail] = await connection.query(
        "SELECT * FROM arena_owners WHERE email = ?",
        [email]
      );

      if (existingEmail.length > 0) {
        await connection.rollback();
        connection.release();
        return res
          .status(409)
          .json({ error: "Arena owner already exists with this email" });
      }

      // Check if owner already exists with phone number
      const [existingPhone] = await connection.query(
        "SELECT * FROM arena_owners WHERE phone_number = ?",
        [phone_number]
      );

      if (existingPhone.length > 0) {
        await connection.rollback();
        connection.release();
        return res
          .status(409)
          .json({ error: "Arena owner already exists with this phone number" });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new arena owner
      const [ownerResult] = await connection.query(
        `INSERT INTO arena_owners 
         (arena_name, email, password_hash, phone_number, business_address, google_maps_location, number_of_courts, agreed_to_terms) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          arena_name,
          email,
          passwordHash,
          phone_number,
          business_address,
          google_maps_location,
          number_of_courts,
          agreed_to_terms,
        ]
      );

      const ownerId = ownerResult.insertId;

      // Insert arena record
      const [arenaResult] = await connection.query(
        `INSERT INTO arenas 
         (owner_id, name, address, is_active) 
         VALUES (?, ?, ?, TRUE)`,
        [ownerId, arena_name, business_address]
      );

      const arenaId = arenaResult.insertId;

      // Store time slots in JSON format in arena_owners table
      if (time_slots) {
        await connection.query(
          `UPDATE arena_owners SET time_slots = ? WHERE owner_id = ?`,
          [JSON.stringify(time_slots), ownerId]
        );
      }

      // Create court details
      if (court_details && Array.isArray(court_details)) {
        for (const courtData of court_details) {
          // Insert court
          const [courtResult] = await connection.query(
            `INSERT INTO court_details 
       (arena_id, court_number, court_name, size_sqft, price_per_hour, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
              arenaId,
              courtData.courtNumber,
              courtData.name || `Court ${courtData.courtNumber}`,
              courtData.size,
              courtData.pricePerHour,
              courtData.description,
            ]
          );

          const courtId = courtResult.insertId;

          // Link sports to court
          if (courtData.sportTypes && courtData.sportTypes.length > 0) {
            for (const sportName of courtData.sportTypes) {
              const [sportResult] = await connection.query(
                "SELECT sport_id FROM sports_types WHERE name = ?",
                [sportName]
              );

              if (sportResult.length > 0) {
                await connection.query(
                  "INSERT INTO court_sports (court_id, sport_id) VALUES (?, ?)",
                  [courtId, sportResult[0].sport_id]
                );
              }
            }
          }

          // Note: Image handling would be separate - upload to cloud storage first
          // For now, we'll skip image storage during registration
        }
      }
      // Insert sports types and pricing
      if (sports_pricing && Array.isArray(sports_pricing)) {
        for (const sportData of sports_pricing) {
          // Check if sport type exists, if not create it
          const [sportResult] = await connection.query(
            "SELECT sport_id FROM sports_types WHERE name = ?",
            [sportData.sport]
          );

          let sportId;
          if (sportResult.length > 0) {
            sportId = sportResult[0].sport_id;
          } else {
            const [newSportResult] = await connection.query(
              "INSERT INTO sports_types (name) VALUES (?)",
              [sportData.sport]
            );
            sportId = newSportResult.insertId;
          }

          // Link sport to arena with pricing
          await connection.query(
            `INSERT INTO arena_sports (arena_id, sport_id, price_per_hour) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE price_per_hour = ?`,
            [arenaId, sportId, sportData.pricePerHour, sportData.pricePerHour]
          );
        }
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      // Generate JWT token
      const token = jwt.sign(
        {
          owner_id: ownerId,
          email: email,
          role: "owner",
        },
        config.JWT_SECRET || process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "Arena owner registered successfully",
        owner_id: ownerId,
        token: token,
        owner: {
          arena_name,
          email,
          phone_number,
          number_of_courts,
        },
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Owner registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Arena Owner Login with Email OR Phone Number
router.post("/login", async (req, res) => {
  const { email, phone_number, password } = req.body;

  console.log("Login attempt received:", { email, phone_number });

  // Validation - accept either email or phone_number
  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      error: "Either email or phone number along with password are required",
    });
  }

  try {
    // Find owner by email OR phone number
    let query;
    let params = [];

    if (email) {
      // Login with email
      query = "SELECT * FROM arena_owners WHERE email = ?";
      params = [email.trim().toLowerCase()]; // Normalize email
    } else {
      // Login with phone number - clean it first
      const cleanPhoneNumber = phone_number.replace(/\D/g, "");
      query = "SELECT * FROM arena_owners WHERE phone_number = ?";
      params = [cleanPhoneNumber];
    }

    console.log("Executing query:", query, params);

    const [owners] = await pool.query(query, params);
    console.log("Found records:", owners.length);

    if (owners.length === 0) {
      return res.status(401).json({
        error: "No account found with these credentials",
      });
    }

    const owner = owners[0];
    console.log("Owner found:", owner.email);

    // Check if password_hash exists
    if (!owner.password_hash) {
      console.error("Owner has no password hash!");
      return res.status(500).json({
        error: "Account setup incomplete. Please contact support.",
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, owner.password_hash);
    console.log("Password match:", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Incorrect password",
      });
    }

    // Check if account is active (if column exists)
    if (owner.is_active !== undefined && owner.is_active === 0) {
      return res.status(403).json({
        error: "Account is deactivated. Please contact support.",
      });
    }

    // Generate JWT token - use direct string for now
    const jwtSecret = config.JWT_SECRET || "arena-booking-secret-key-2024";
    const token = jwt.sign(
      {
        owner_id: owner.owner_id,
        email: owner.email,
        role: "owner",
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // Get arena details
    const [arenas] = await pool.query(
      "SELECT * FROM arenas WHERE owner_id = ?",
      [owner.owner_id]
    );

    // Return owner data (excluding password)
    res.json({
      message: "Login successful",
      token: token,
      owner: {
        owner_id: owner.owner_id,
        arena_name: owner.arena_name,
        email: owner.email,
        phone_number: owner.phone_number,
        number_of_courts: owner.number_of_courts || 0,
        is_active: owner.is_active || true,
        time_slots: owner.time_slots
          ? typeof owner.time_slots === "string"
            ? JSON.parse(owner.time_slots)
            : owner.time_slots
          : null,
        arena: arenas[0] || null,
      },
    });
  } catch (error) {
    console.error("Owner login error:", error.message);
    console.error("Full error:", error);

    // Provide more specific error messages
    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        error: "Database table not found. Please check your database setup.",
      });
    }

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      return res.status(500).json({
        error: "Database access denied. Check your database credentials.",
      });
    }

    res.status(500).json({
      error: "Login failed. Please try again.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
