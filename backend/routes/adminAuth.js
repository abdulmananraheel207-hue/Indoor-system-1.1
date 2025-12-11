// routes/adminAuth.js - SIMPLIFIED VERSION
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Admin Login WITHOUT bcrypt
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find admin by email
    const [admins] = await pool.query("SELECT * FROM admins WHERE email = ?", [
      email.toLowerCase().trim(),
    ]);

    if (admins.length === 0) {
      return res.status(401).json({ error: "No admin account found" });
    }

    const admin = admins[0];

    // SIMPLE PASSWORD CHECK (no bcrypt)
    if (password !== "password123") {
      return res.status(401).json({ error: "Wrong password" });
    }

    // Create token
    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        email: admin.email,
        role: "admin",
        is_super_admin: admin.is_super_admin,
      },
      "arena-booking-secret-key-2024", // Hardcoded secret
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token: token,
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        is_super_admin: admin.is_super_admin,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
