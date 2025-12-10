const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// Admin Login with Email OR Phone Number
router.post("/login", async (req, res) => {
  const { email, phone_number, password } = req.body;

  // Validation - accept either email or phone_number
  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      error: "Either email or phone number along with password are required"
    });
  }

  try {
    // Find admin by email OR phone number
    let admin;
    let query;
    let params = [];

    if (email) {
      // Login with email
      query = "SELECT * FROM admins WHERE email = ?";
      params = [email];
    } else {
      // Login with phone number
      query = "SELECT * FROM admins WHERE phone_number = ?";
      params = [phone_number];
    }

    const [admins] = await pool.query(query, params);

    if (admins.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    admin = admins[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        email: admin.email,
        role: "admin",
        is_super_admin: admin.is_super_admin,
      },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token: token,
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        phone_number: admin.phone_number,
        full_name: admin.full_name,
        is_super_admin: admin.is_super_admin,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;