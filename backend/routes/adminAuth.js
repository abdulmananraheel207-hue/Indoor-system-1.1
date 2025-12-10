// routes/adminAuth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// Admin Login Only (Admins are pre-created by developers)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [admins] = await pool.query("SELECT * FROM admins WHERE email = ?", [
      email,
    ]);

    if (admins.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const admin = admins[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
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
