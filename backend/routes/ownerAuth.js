const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// Arena Owner Registration
router.post("/register", async (req, res) => {
  const {
    arena_name,
    email,
    password,
    phone_number,
    business_address,
    google_maps_location,
    number_of_courts,
    agreed_to_terms,
  } = req.body;

  // Validation
  if (!arena_name || !email || !password || !phone_number || !agreed_to_terms) {
    return res.status(400).json({
      error: "Arena name, email, password, phone number, and terms agreement are required",
    });
  }

  if (agreed_to_terms !== true) {
    return res.status(400).json({
      error: "You must agree to the Terms and Conditions",
    });
  }

  try {
    // Check if owner already exists with email
    const [existingEmail] = await pool.query(
      "SELECT * FROM arena_owners WHERE email = ?",
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({ error: "Arena owner already exists with this email" });
    }

    // Check if owner already exists with phone number
    const [existingPhone] = await pool.query(
      "SELECT * FROM arena_owners WHERE phone_number = ?",
      [phone_number]
    );

    if (existingPhone.length > 0) {
      return res.status(409).json({ error: "Arena owner already exists with this phone number" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new arena owner
    const [result] = await pool.query(
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

    // Generate JWT token
    const token = jwt.sign(
      {
        owner_id: result.insertId,
        email: email,
        role: "owner",
      },
      config.JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Arena owner registered successfully",
      owner_id: result.insertId,
      token: token,
      owner: {
        arena_name,
        email,
        phone_number,
        number_of_courts,
      },
    });
  } catch (error) {
    console.error("Owner registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Arena Owner Login with Email OR Phone Number
router.post("/login", async (req, res) => {
  const { email, phone_number, password } = req.body;

  // Validation - accept either email or phone_number
  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      error: "Either email or phone number along with password are required"
    });
  }

  try {
    // Find owner by email OR phone number
    let owner;
    let query;
    let params = [];

    if (email) {
      // Login with email
      query = "SELECT * FROM arena_owners WHERE email = ?";
      params = [email];
    } else {
      // Login with phone number
      query = "SELECT * FROM arena_owners WHERE phone_number = ?";
      params = [phone_number];
    }

    const [owners] = await pool.query(query, params);

    if (owners.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    owner = owners[0];

    // Check if account is active
    if (!owner.is_active) {
      return res.status(403).json({ error: "Account is deactivated. Please contact support." });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, owner.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        owner_id: owner.owner_id,
        email: owner.email,
        role: "owner",
      },
      config.JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
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
        number_of_courts: owner.number_of_courts,
        is_active: owner.is_active,
      },
    });
  } catch (error) {
    console.error("Owner login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;