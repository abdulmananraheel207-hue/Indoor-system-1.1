const express = require("express");
const router = express.Router();
const arenaController = require("../Controllers/arenaController");
const userController = require("../Controllers/userController");
const auth = require("../middleware/auth");

// Public arena routes (no authentication required)
router.get("/sports", arenaController.getSportsCategories);
router.get("/all", arenaController.getAllArenas);
router.get("/search", arenaController.searchArenas);
router.get("/:arena_id", arenaController.getArenaDetails);
router.get("/:arena_id/slots", arenaController.getAvailableSlots);
router.get("/:arena_id/reviews", arenaController.getArenaReviews);
router.get("/:arena_id/courts", arenaController.getCourtDetails);
// Add this endpoint for getting sports for a specific arena
router.get("/:arena_id/sports", arenaController.getArenaSports); // NEW LINE
// Add this route
router.get("/:arena_id/available-sports", arenaController.getAvailableSportsForArena);

// Protected routes
router.use(auth.verifyToken);

router.post("/slots/:slot_id/lock", arenaController.lockTimeSlot);
router.post("/slots/:slot_id/release", arenaController.releaseTimeSlot);
router.post("/:arena_id/reviews", arenaController.addReview);

module.exports = router;