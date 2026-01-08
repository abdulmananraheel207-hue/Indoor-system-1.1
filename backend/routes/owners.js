
const express = require("express");
const router = express.Router();
const ownerController = require("../Controllers/ownerController");
const auth = require("../middleware/auth");
const { uploadArenaImages, uploadCourtImages } = require("../middleware/upload");

// Public registration route (no authentication required)
router.post("/register/complete", ownerController.registerOwnerComplete);

// === UPDATED PHOTO UPLOAD ROUTES ===

// All other routes require owner or manager authentication
router.use(auth.verifyToken, auth.isOwnerOrManager);

// Arena Photos Routes
router.post(
  "/arenas/:arena_id/photos",
  uploadArenaImages, // Use the Cloudinary middleware
  ownerController.uploadArenaPhotos
);

router.get("/arenas/:arena_id/images", ownerController.getArenaImages);
router.delete("/arenas/:arena_id/images/:image_id", ownerController.deleteArenaPhoto); // ADD THIS
router.put("/arenas/:arena_id/images/:image_id/set-primary", ownerController.setPrimaryImage); // ADD THIS

// Court Photos Routes
router.post(
  "/courts/:court_id/photos",
  uploadCourtImages,
  ownerController.uploadCourtPhotos
);

router.get("/courts/:court_id/images", ownerController.getCourtImages);
router.delete("/courts/:court_id/photos/:photo_id", ownerController.deleteCourtPhoto);

// Dashboard
router.get("/dashboard", ownerController.getDashboard);

// Arena management
router.get("/arenas", ownerController.getArenas);
router.post("/arenas", ownerController.createArena);
router.put("/arenas/:arena_id", ownerController.updateArena);

// Time slot management
router.get("/arenas/:arena_id/slots", ownerController.getTimeSlotsForDate);
router.put("/arenas/:arena_id/slots", ownerController.manageTimeSlots);

// Court management routes
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
