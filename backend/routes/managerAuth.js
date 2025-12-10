// routes/managerAuth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");

// Manager Login Only (Managers are added by Arena Owners)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Managers will be stored in a separate table (you need to create it)
    const [managers] = await pool.query(
      "SELECT * FROM arena_managers WHERE email = ? AND is_active = TRUE",
      [email]
    );

    if (managers.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const manager = managers[0];
    const isPasswordValid = await bcrypt.compare(
      password,
      manager.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
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
