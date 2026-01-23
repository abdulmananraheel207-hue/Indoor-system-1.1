// routes/admin.js - SIMPLIFIED
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");

// =================== PUBLIC ADMIN LOGIN ===================
router.post("/login", adminController.loginAdmin);

// =================== TEST ENDPOINT ===================
router.get("/test", adminController.testEndpoint);

// =================== PROTECTED ADMIN ROUTES ===================
router.use(auth.verifyToken);
router.use(auth.isAdmin); // Only admin can access routes below

// Dashboard
router.get("/dashboard", adminController.getDashboard);

// System Stats
router.get("/stats", adminController.getSystemStats);

// Arena Management
router.get("/arenas", adminController.getAllArenas);
router.put("/arenas/:arena_id/block", adminController.toggleArenaBlock);

// User Management
router.get("/users", adminController.getAllUsers);

// Owner Management
router.get("/owners", adminController.getAllOwners);

// Financial Reports
router.get("/financial-reports", adminController.getFinancialReports);

// Commission Payments
router.post("/arenas/:arena_id/mark-paid", adminController.markCommissionPaid);

module.exports = router;