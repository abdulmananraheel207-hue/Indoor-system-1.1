const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const arenaController = require("../Controllers/arenaController");
const auth = require("../middleware/auth");
const { userValidation, reviewValidation } = require("../middleware/validation");
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

// Profile picture
router.post(
  "/profile/picture",
  uploadProfilePicture,
  userController.uploadProfilePicture
);

// Email change routes
router.post(
  "/email/change-request",
  userController.requestEmailChange
);

router.post(
  "/email/verify-otp",
  userValidation.verifyEmailOTP,
  userController.verifyEmailChange
);

router.post(
  "/email/resend-otp",
  userValidation.verifyEmailOTP,
  userController.resendEmailOTP
);

// Password change - UPDATED to match new code
router.put(
  "/password/change",
  userController.changePassword
);

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
router.post(
  "/arenas/:arena_id/reviews",
  reviewValidation.addReview,
  arenaController.addReview
);// Review reminder routes
router.get("/reviews/pending", arenaController.getPendingReviews);
router.post("/reviews/dismiss-reminder", arenaController.dismissReviewReminder);
router.post("/reviews/skip-all-reminders", arenaController.skipAllReviewReminders);
// Court details
router.get("/arenas/:arena_id/courts", arenaController.getCourtDetails);

// In users.js - Add these routes

// Advance payment routes
router.post(
  "/bookings/:booking_id/payment-screenshot",
  auth.verifyToken,
  auth.isUser,
  userController.uploadAdvancePaymentScreenshot
);

router.get(
  "/bookings/:booking_id/payment-status",
  auth.verifyToken,
  auth.isUser,
  userController.checkAdvancePaymentStatus
);

module.exports = router;