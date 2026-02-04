const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const auth = require("../middleware/auth");
const { reviewValidation } = require("../middleware/validation"); // ADD THIS IMPORT

// ========================
// PUBLIC ROUTES (No auth required)
// ========================

// Sports categories - BOTH ENDPOINTS
router.get("/sports", userController.getSportsCategories);  // This is for /api/arenas/sports

// Get all arenas
router.get("/all", userController.getAllArenas);

// Search arenas
router.get("/search", userController.searchArenas);

// Arena details
router.get("/:arena_id", userController.getArenaDetails);

// Get court-specific slots
router.get("/:arena_id/courts/:court_id/slots", userController.getCourtSlots);

// Get available slots (general)
router.get("/:arena_id/slots", userController.getAvailableSlots);

// Court details endpoint
router.get("/:arena_id/courts", userController.getCourtDetails);

// Arena sports endpoint
router.get("/:arena_id/sports", userController.getArenaSports);

// Available sports for arena endpoint
router.get("/:arena_id/available-sports", userController.getAvailableSportsForArena);

// Reviews endpoint
router.get("/:arena_id/reviews", userController.getReviews);

// ========================
// PROTECTED ROUTES (Auth required)
// ========================
router.use(auth.verifyToken);

// Slot locking endpoints
router.post("/slots/:slot_id/lock", userController.lockTimeSlot);
router.post("/slots/:slot_id/release", userController.releaseTimeSlot);

// Add review endpoint
router.post(
    "/:arena_id/reviews",
    reviewValidation.addReview, // ADD VALIDATION HERE
    userController.addReview
);
module.exports = router;