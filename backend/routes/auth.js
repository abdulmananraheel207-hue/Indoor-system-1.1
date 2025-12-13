const express = require("express");
const router = express.Router();
const authController = require("../Controllers/authController");
const auth = require("../middleware/auth");
const { userValidation } = require("../middleware/validation");
const { ownerValidation } = require("../middleware/validation");

// Public routes
router.post(
  "/register/user",
  userValidation.register,
  authController.registerUser
);
router.post(
  "/register/owner",
  ownerValidation.register,
  authController.registerOwner
);
router.post(
  "/register/admin",
  userValidation.register,
  authController.registerAdmin
);
router.post("/login", userValidation.login, authController.login);
router.post("/guest", authController.createGuestSession);

// Protected routes (need authentication)
router.post("/logout", auth.verifyToken, authController.logout);

module.exports = router;
