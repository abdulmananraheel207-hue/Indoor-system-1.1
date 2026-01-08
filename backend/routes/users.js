const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const arenaController = require("../Controllers/arenaController");
const auth = require("../middleware/auth");
const { userValidation } = require("../middleware/validation");
const { uploadProfilePicture } = require("../middleware/upload"); // ADD THIS IMPORT

// All routes require user authentication
router.use(auth.verifyToken, auth.isUser);

// User profile routes
router.get("/profile", userController.getProfile);
router.put(
  "/profile",
  userValidation.updateProfile,
  userController.updateProfile
);

// === UPDATE THIS ROUTE FOR PROFILE PICTURE ===
router.post(
  "/profile/picture", // Changed from PUT to POST
  uploadProfilePicture, // ADD THIS MIDDLEWARE
  userController.uploadProfilePicture // Change from updateProfilePicture
);

router.put("/profile/password", userController.changePassword);

// Arena discovery and search
router.get("/arenas/nearby", userController.getNearbyArenas);
router.get("/arenas/search", userController.searchArenas);
router.get("/arenas/:arena_id", userController.getArenaDetails);
router.get("/arenas/all", userController.getAllArenas);

// Favorites
router.get("/favorites", userController.getFavoriteArenas);
router.post("/arenas/:arena_id/favorite", userController.addToFavorites);
router.delete("/arenas/:arena_id/favorite", userController.removeFromFavorites);

// Sports categories
router.get("/sports", arenaController.getSportsCategories);

// Time slots
router.get("/arenas/:arena_id/slots", arenaController.getAvailableSlots);
router.post("/slots/:slot_id/lock", arenaController.lockTimeSlot);
router.delete("/slots/:slot_id/lock", arenaController.releaseTimeSlot);

// Reviews
router.get("/arenas/:arena_id/reviews", arenaController.getArenaReviews);
router.post("/arenas/:arena_id/reviews", arenaController.addReview);

// Court details
router.get("/arenas/:arena_id/courts", arenaController.getCourtDetails);

module.exports = router;