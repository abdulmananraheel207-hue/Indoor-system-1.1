
const express = require("express");
const router = express.Router();
const ownerController = require("../Controllers/ownerController");
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

// Public registration route (no authentication required)
router.post("/register/complete", ownerController.registerOwnerComplete);

// Photo upload routes (public during registration)
router.post("/arenas/:arena_id/photos", upload.array('photos', 10), ownerController.uploadArenaPhotos);
router.post("/courts/:court_id/photos", upload.array('photos', 10), ownerController.uploadCourtPhotos);

// All other routes require owner or manager authentication
router.use(auth.verifyToken, auth.isOwnerOrManager);

// Dashboard
router.get("/dashboard", ownerController.getDashboard);

// Arena management
router.get("/arenas", ownerController.getArenas);
router.post("/arenas", ownerController.createArena);
router.put("/arenas/:arena_id", ownerController.updateArena);
router.put("/arenas/:arena_id/slots", ownerController.manageTimeSlots);

// Booking management
router.get("/bookings", ownerController.getBookingRequests);
router.get("/bookings/stats", ownerController.getBookingStats);
router.post("/bookings/:booking_id/accept", ownerController.acceptBooking);
router.post("/bookings/:booking_id/reject", ownerController.rejectBooking);

// Manager/Staff management
router.get("/managers", ownerController.getManagers);
router.post("/managers", ownerController.addManager);
router.put("/managers/:manager_id", ownerController.updateManager);

// Reports
router.get("/reports/export", ownerController.exportBookingData);

// Profile
router.get("/profile", ownerController.getOwnerProfile);
router.put("/profile", ownerController.updateOwnerProfile);

module.exports = router;