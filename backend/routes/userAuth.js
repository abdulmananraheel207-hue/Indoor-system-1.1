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

  try {
    // Check if user already exists
    const [existingUser] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone_number) 
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, phone_number]
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
        phone_number,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
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

module.exports = router;
