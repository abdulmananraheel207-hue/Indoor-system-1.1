const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// User Registration
router.post("/register", async (req, res) => {
  const { name, email, password, phone_number } = req.body;

  // Validation
  if (!name || !email || !password || !phone_number) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Clean phone number (remove any non-digit characters)
  const cleanPhoneNumber = phone_number.replace(/\D/g, '');

  // Validate phone number
  if (cleanPhoneNumber.length < 10 || cleanPhoneNumber.length > 15) {
    return res.status(400).json({ error: "Please enter a valid phone number" });
  }

  try {
    // Check if user already exists with email
    const [existingEmailUser] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingEmailUser.length > 0) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // Check if user already exists with phone number
    const [existingPhoneUser] = await pool.query(
      "SELECT * FROM users WHERE phone_number = ?",
      [cleanPhoneNumber]
    );

    if (existingPhoneUser.length > 0) {
      return res
        .status(409)
        .json({ error: "User already exists with this phone number" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone_number) 
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, cleanPhoneNumber]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: result.insertId,
        email: email,
        role: "user",
      },
      config.JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user_id: result.insertId,
      token: token,
      user: {
        name,
        email,
        phone_number: cleanPhoneNumber,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Login with Email OR Phone Number
router.post("/login", async (req, res) => {
  const { email, phone_number, password } = req.body;

  // Validation - accept either email or phone_number
  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      error: "Either email or phone number along with password are required"
    });
  }

  try {
    // Find user by email OR phone number
    let user;
    let query;
    let params = [];

    if (email) {
      // Login with email
      query = "SELECT * FROM users WHERE email = ?";
      params = [email];
    } else {
      // Login with phone number - clean it first
      const cleanPhoneNumber = phone_number.replace(/\D/g, '');
      query = "SELECT * FROM users WHERE phone_number = ?";
      params = [cleanPhoneNumber];
    }

    const [users] = await pool.query(query, params);

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user = users[0];

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await pool.query(
      "UPDATE users SET last_login = NOW(), is_logged_in = TRUE WHERE user_id = ?",
      [user.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: "user",
      },
      config.JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data (excluding password)
    res.json({
      message: "Login successful",
      token: token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        profile_picture_url: user.profile_picture_url,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Logout
router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        config.JWT_SECRET || process.env.JWT_SECRET
      );

      await pool.query(
        "UPDATE users SET is_logged_in = FALSE WHERE user_id = ?",
        [decoded.user_id]
      );
    } catch (error) {
      console.error("Logout token error:", error);
    }
  }

  res.json({ message: "Logged out successfully" });
});

// Optional: Get user profile
router.get("/profile", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET || process.env.JWT_SECRET
    );

    const [users] = await pool.query(
      "SELECT user_id, name, email, phone_number, profile_picture_url, created_at FROM users WHERE user_id = ?",
      [decoded.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;