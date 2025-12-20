const express = require("express");
const router = express.Router();
const arenaController = require("../Controllers/arenaController");
const userController = require("../Controllers/userController");
const auth = require("../middleware/auth");
// Public arena routes (no authentication required)
router.get("/sports", arenaController.getSportsCategories);
router.get("/:arena_id/slots", arenaController.getAvailableSlots);
router.get("/:arena_id/reviews", arenaController.getArenaReviews);
router.get("/:arena_id/courts", arenaController.getCourtDetails);

// Protected routes
router.use(auth.verifyToken);

router.post("/slots/:slot_id/lock", arenaController.lockTimeSlot);
router.post("/slots/:slot_id/release", arenaController.releaseTimeSlot);
router.post("/:arena_id/reviews", arenaController.addReview);

module.exports = router;
