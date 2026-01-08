// routes/owners.js - FINAL WORKING VERSION
const express = require("express");
const router = express.Router();
const ownerController = require("../Controllers/ownerController");
const auth = require("../middleware/auth");
const { uploadArenaImages, uploadCourtImages } = require("../middleware/upload");

// =================== PUBLIC ROUTES ===================
router.post("/register/complete", ownerController.registerOwnerComplete);

// =================== DEBUG/TEST ROUTES ===================
router.post("/debug/upload-test", uploadCourtImages, (req, res) => {
  console.log("=== DEBUG UPLOAD TEST ===");
  console.log("Files:", req.files);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files in test upload"
    });
  }

  res.json({
    success: true,
    message: "Debug upload successful",
    files: req.files.map(f => ({
      originalname: f.originalname,
      filename: f.filename,
      path: f.path,
      size: f.size,
      mimetype: f.mimetype
    }))
  });
});

// All routes below require owner authentication
router.use(auth.verifyToken, auth.isOwnerOrManager);

// =================== PHOTO UPLOAD API ENDPOINTS ===================
// Court photos - THIS IS THE KEY ROUTE
router.post(
  "/courts/:court_id/photos",
  uploadCourtImages,
  ownerController.uploadCourtPhotos
);

// Arena photos
router.post(
  "/arenas/:arena_id/photos",
  uploadArenaImages,
  ownerController.uploadArenaPhotos
);

// Get court images
router.get(
  "/courts/:court_id/images",
  ownerController.getCourtImages
);

// Get arena images
router.get(
  "/arenas/:arena_id/images",
  ownerController.getArenaImages
);

// Delete court photo
router.delete(
  "/courts/:court_id/photos/:photo_id",
  ownerController.deleteCourtPhoto
);

// Delete arena photo
router.delete(
  "/arenas/:arena_id/photos/:image_id",
  ownerController.deleteArenaPhoto
);

// Dashboard
router.get("/dashboard", ownerController.getDashboard);

// Arena management
router.get("/arenas", ownerController.getArenas);
router.post("/arenas", ownerController.createArena);
router.put("/arenas/:arena_id", ownerController.updateArena);

// Time slot management
router.get("/arenas/:arena_id/slots", ownerController.getTimeSlotsForDate);
router.put("/arenas/:arena_id/slots", ownerController.manageTimeSlots);

// Court management
router.get("/arenas/:arena_id/courts", ownerController.getCourts);
router.post("/arenas/:arena_id/courts", ownerController.addCourt);
router.put("/courts/:court_id", ownerController.updateCourt);

// Booking management
router.get("/bookings", ownerController.getOwnerBookings);
router.get("/bookings/stats", ownerController.getBookingStats);
router.put("/bookings/:booking_id/accept", ownerController.acceptBooking);
router.put("/bookings/:booking_id/reject", ownerController.rejectBooking);
router.put("/bookings/:booking_id/complete", ownerController.completeBooking);

// Manager/Staff management
router.get("/managers", ownerController.getManagers);
router.post("/managers", ownerController.addManager);
router.put("/managers/:manager_id", ownerController.updateManager);

// Reports
router.get("/reports/export", ownerController.exportBookingData);

// Profile
router.get("/profile", ownerController.getOwnerProfile);
router.put("/profile", ownerController.updateOwnerProfile);

// Cleanup
router.post("/cleanup/expired-locks", ownerController.cleanupExpiredLocks);

module.exports = router;