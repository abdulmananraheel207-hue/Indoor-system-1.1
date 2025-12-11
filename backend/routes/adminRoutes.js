// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { verifyAdminToken } = require("../authMiddleware");

// Apply middleware to ALL admin routes
router.use(verifyAdminToken);

// Protected admin dashboard endpoint
router.get("/dashboard", (req, res) => {
  console.log("✅ Admin accessing dashboard:", req.admin.email);

  res.json({
    success: true,
    message: "Welcome to Admin Dashboard",
    admin: req.admin,
    data: {
      statistics: {
        totalBookings: 1250,
        activeUsers: 342,
        totalArenas: 28,
        revenue: 2500000,
        commissionEarned: 125000,
        growthRate: 15.5,
      },
    },
  });
});

// Add more protected admin routes here as needed

module.exports = router;
