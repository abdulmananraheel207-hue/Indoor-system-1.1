const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// Manager Login with Email OR Phone Number
router.post("/login", async (req, res) => {
  const { email, phone_number, password } = req.body;

  // Validation - accept either email or phone_number
  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      error: "Either email or phone number along with password are required"
    });
  }

  try {
    // Find manager by email OR phone number
    let manager;
    let query;
    let params = [];

    if (email) {
      // Login with email
      query = "SELECT * FROM arena_managers WHERE email = ? AND is_active = TRUE";
      params = [email];
    } else {
      // Login with phone number
      query = "SELECT * FROM arena_managers WHERE phone_number = ? AND is_active = TRUE";
      params = [phone_number];
    }

    const [managers] = await pool.query(query, params);

    if (managers.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    manager = managers[0];
    const isPasswordValid = await bcrypt.compare(password, manager.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        manager_id: manager.manager_id,
        owner_id: manager.owner_id,
        email: manager.email,
        role: "manager",
        permissions: manager.permissions,
      },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token: token,
      manager: {
        manager_id: manager.manager_id,
        name: manager.name,
        email: manager.email,
        phone_number: manager.phone_number,
        owner_id: manager.owner_id,
        permissions: manager.permissions,
      },
    });
  } catch (error) {
    console.error("Manager login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;