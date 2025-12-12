// routes/managerAuth.js - WITH TEST MANAGERS
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Hardcoded test managers (for development)
const TEST_MANAGERS = [
  {
    manager_id: 1,
    name: "Test Manager",
    email: "manager@test.com",
    phone_number: "1234567890",
    password_hash: "$2b$10$N9qo8uLOickgx2ZMRZoMy.Mrq/bH7P.3O9Q7Z0wKp7vYV0JjJw4bK", // 'manager123'
    owner_id: 1,
    permissions: JSON.stringify(["manage_bookings", "view_reports", "manage_staff"]),
    is_active: true
  },
  {
    manager_id: 2,
    name: "Arena Manager",
    email: "arena@manager.com",
    phone_number: "9876543210",
    password_hash: "$2b$10$N9qo8uLOickgx2ZMRZoMy.Mrq/bH7P.3O9Q7Z0wKp7vYV0JjJw4bK", // 'manager123'
    owner_id: 2,
    permissions: JSON.stringify(["manage_bookings"]),
    is_active: true
  }
];

// Test credentials endpoint
router.get("/test-credentials", (req, res) => {
  res.json({
    message: "Development Test Managers",
    managers: TEST_MANAGERS.map(mgr => ({
      name: mgr.name,
      email: mgr.email,
      phone: mgr.phone_number,
      password: "manager123", // All test managers use same password
      permissions: JSON.parse(mgr.permissions)
    }))
  });
});

// Manager Login
router.post("/login", async (req, res) => {
  const { email, phone_number, password } = req.body;

  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      error: "Either email or phone number along with password are required",
      test_accounts: TEST_MANAGERS.map(m => ({
        email: m.email,
        phone: m.phone_number,
        password: "manager123"
      }))
    });
  }

  try {
    let manager = null;
    let isTestAccount = false;

    // 1. First check test managers
    const testManager = TEST_MANAGERS.find(m =>
      (email && m.email === email) ||
      (phone_number && m.phone_number === phone_number)
    );

    if (testManager) {
      // Test manager found
      const isValid = await bcrypt.compare(password, testManager.password_hash);
      if (!isValid) {
        return res.status(401).json({
          error: "Invalid password for test manager",
          hint: "Try 'manager123' for test accounts"
        });
      }
      manager = testManager;
      isTestAccount = true;
    } else {
      // 2. Check database for real managers
      let query, params;

      if (email) {
        query = "SELECT * FROM arena_managers WHERE email = ? AND is_active = TRUE";
        params = [email];
      } else {
        query = "SELECT * FROM arena_managers WHERE phone_number = ? AND is_active = TRUE";
        params = [phone_number];
      }

      const [managers] = await pool.query(query, params);

      if (managers.length === 0) {
        return res.status(401).json({
          error: "Invalid credentials",
          suggestion: "Try test manager: manager@test.com / manager123"
        });
      }

      manager = managers[0];
      const isPasswordValid = await bcrypt.compare(password, manager.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }

    const token = jwt.sign(
      {
        manager_id: manager.manager_id,
        owner_id: manager.owner_id,
        email: manager.email,
        role: "manager",
        permissions: manager.permissions,
        is_test_account: isTestAccount
      },
      process.env.JWT_SECRET || "arena-booking-secret-2024",
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
        permissions: JSON.parse(manager.permissions),
        is_test_account: isTestAccount
      },
    });
  } catch (error) {
    console.error("Manager login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;