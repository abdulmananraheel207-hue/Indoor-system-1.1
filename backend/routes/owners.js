const express = require("express");
const router = express.Router();
const ownerController = require("../Controllers/ownerController");
const auth = require("../middleware/auth");
const {
  uploadArenaImages,
  uploadCourtImages,
} = require("../middleware/upload"); // UPDATE THIS IMPORT

// Public registration route (no authentication required)
router.post("/register/complete", ownerController.registerOwnerComplete);

// === UPDATED PHOTO UPLOAD ROUTES ===
router.post(
  "/arenas/:arena_id/photos",
  uploadArenaImages, // Use the Cloudinary middleware
  ownerController.uploadArenaPhotos
);

router.delete(
  "/courts/:court_id/photos/:photo_id",
  auth.verifyToken,
  auth.isOwnerOrManager,
  ownerController.deleteCourtPhoto
);

// 🔧 ADD THESE DELETE ROUTES
router.delete(
  "/arenas/:arena_id/images/:image_id",
  ownerController.deleteArenaPhoto // You need to create this function
);
// Add this route - NO AUTH required
router.post("/debug-upload", uploadCourtImages, (req, res) => {
  console.log("=== DEBUG UPLOAD ===");
  console.log("1. Request received");
  console.log("2. Files:", req.files);
  console.log("3. Number of files:", req.files ? req.files.length : 0);
  console.log("4. Request body keys:", Object.keys(req.body));
  console.log("5. Headers:", req.headers["content-type"]);

  if (!req.files || req.files.length === 0) {
    console.log("❌ NO FILES!");
    return res.status(400).json({
      message: "No files received",
      debug: {
        filesCount: req.files ? req.files.length : 0,
        body: req.body,
      },
    });
  }

  // Show each file
  req.files.forEach((file, i) => {
    console.log(`File ${i}:`, {
      fieldname: file.fieldname,
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
    });
  });

  res.json({
    success: true,
    message: "Files received",
    count: req.files.length,
    files: req.files.map((f) => ({
      name: f.originalname,
      url: f.path,
      size: f.size,
    })),
  });
});

// 🔧 ADD THIS ROUTE FOR COURT PHOTOS
router.post(
  "/courts/:court_id/photos",
  auth.verifyToken, // ✅ Add auth middleware
  auth.isOwnerOrManager, // ✅ Add owner/manager check
  uploadCourtImages, // ✅ Use court images upload middleware
  ownerController.uploadCourtPhotos // ✅ Use correct controller
);

// === ADD THESE IMAGE MANAGEMENT ROUTES ===
router.get("/arenas/:arena_id/images", ownerController.getArenaImages);
router.get("/courts/:court_id/images", ownerController.getCourtImages);
// All other routes require owner or manager authentication
router.use(auth.verifyToken, auth.isOwnerOrManager);

// Dashboard
router.get("/dashboard", ownerController.getDashboard);

// Arena management
router.get("/arenas", ownerController.getArenas);
router.post("/arenas", ownerController.createArena);
router.put("/arenas/:arena_id", ownerController.updateArena);

// === ADD THESE IMAGE MANAGEMENT ROUTES ===
router.get("/arenas/:arena_id/images", ownerController.getArenaImages); // ADD THIS
router.get("/courts/:court_id/images", ownerController.getCourtImages); // ADD THIS

// Time slot management
router.get("/arenas/:arena_id/slots", ownerController.getTimeSlotsForDate);
router.put("/arenas/:arena_id/slots", ownerController.manageTimeSlots);

// Court management routes
router.get("/arenas/:arena_id/courts", ownerController.getCourts);
router.post("/arenas/:arena_id/courts", ownerController.addCourt);
router.put("/courts/:court_id", ownerController.updateCourt);
// Add this route to your owners.js
router.delete(
  "/courts/:court_id/photos/:photo_id",
  auth.verifyToken,
  auth.isOwnerOrManager,
  ownerController.deleteCourtPhoto
);

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

// === ADD CLEANUP ROUTE ===
router.post("/cleanup/expired-locks", ownerController.cleanupExpiredLocks); // ADD THIS

module.exports = router;
//hello
