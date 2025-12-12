// routes/adminAuth.js - WITH TEST ADMIN ACCOUNTS
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Hardcoded test admin accounts (for development only!)
const TEST_ADMINS = [
  {
    admin_id: 1,
    username: "superadmin",
    email: "super@admin.com",
    full_name: "Super Administrator",
    password: "admin123", // Plain text for testing
    is_super_admin: true
  },
  {
    admin_id: 2,
    username: "testadmin",
    email: "test@admin.com",
    full_name: "Test Admin",
    password: "test123",
    is_super_admin: false
  },
  {
    admin_id: 3,
    username: "dev",
    email: "dev@admin.com",
    full_name: "Development Admin",
    password: "password",
    is_super_admin: true
  }
];

// Test credentials endpoint (for development)
router.get("/test-credentials", (req, res) => {
  res.json({
    message: "Development Test Credentials",
    note: "Use these to login during development",
    credentials: TEST_ADMINS.map(admin => ({
      email: admin.email,
      password: admin.password,
      role: admin.is_super_admin ? "Super Admin" : "Regular Admin"
    }))
  });
});

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        available_test_accounts: TEST_ADMINS.map(a => a.email)
      });
    }

    let admin = null;

    // FIRST: Check hardcoded test admins (for development)
    const testAdmin = TEST_ADMINS.find(
      a => a.email.toLowerCase() === email.toLowerCase()
    );

    if (testAdmin) {
      // Test admin found - check password
      if (password !== testAdmin.password) {
        return res.status(401).json({
          error: "Wrong password",
          hint: `Try: ${testAdmin.password}`
        });
      }
      admin = testAdmin;
    } else {
      // SECOND: Check database for real admins
      const [admins] = await pool.query(
        "SELECT * FROM admins WHERE email = ?",
        [email.toLowerCase().trim()]
      );

      if (admins.length === 0) {
        return res.status(401).json({
          error: "No admin account found",
          suggestion: "Try one of the test accounts: " +
            TEST_ADMINS.map(a => a.email).join(", ")
        });
      }

      admin = admins[0];

      // For database admins, you might want to add password checking
      // For now, we'll use a simple check
      if (password !== "admin123") { // Default password for DB admins
        return res.status(401).json({
          error: "Wrong password for database admin",
          hint: "Try 'admin123' for database admins"
        });
      }
    }

    // Create token
    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        email: admin.email,
        role: "admin",
        is_super_admin: admin.is_super_admin || false,
      },
      process.env.JWT_SECRET || "arena-booking-secret-key-2024",
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
        is_test_account: !!testAdmin // Flag to identify test accounts
      },
      redirect: "/admin/dashboard"
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Quick login endpoints for testing
router.post("/quick-login/:type", (req, res) => {
  const { type } = req.params;

  let admin = null;

  switch (type) {
    case "super":
      admin = TEST_ADMINS.find(a => a.is_super_admin);
      break;
    case "regular":
      admin = TEST_ADMINS.find(a => !a.is_super_admin);
      break;
    case "dev":
      admin = TEST_ADMINS.find(a => a.username === "dev");
      break;
    default:
      return res.status(400).json({ error: "Invalid login type" });
  }

  if (!admin) {
    return res.status(404).json({ error: "Admin not found" });
  }

  const token = jwt.sign(
    {
      admin_id: admin.admin_id,
      email: admin.email,
      role: "admin",
      is_super_admin: admin.is_super_admin,
    },
    process.env.JWT_SECRET || "arena-booking-secret-key-2024",
    { expiresIn: "7d" }
  );

  res.json({
    message: "Quick login successful",
    token: token,
    admin: {
      admin_id: admin.admin_id,
      username: admin.username,
      email: admin.email,
      full_name: admin.full_name,
      is_super_admin: admin.is_super_admin,
      is_quick_login: true
    }
  });
});

// Get current admin info
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "arena-booking-secret-key-2024"
    );

    res.json({
      admin: decoded,
      isAuthenticated: true,
      permissions: {
        canManageUsers: decoded.is_super_admin,
        canManageBookings: true,
        canViewReports: true
      }
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;