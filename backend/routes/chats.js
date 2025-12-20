const express = require("express");
const router = express.Router();
const chatController = require("../Controllers/chatController");
const auth = require("../middleware/auth");
const pool = require("../db");

const validateBookingStatus = async (req, res, next) => {
  try {
    const { booking_id } = req.params;

    const [booking] = await pool.execute(
      "SELECT status FROM bookings WHERE booking_id = ?",
      [booking_id]
    );

    if (booking.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["pending", "approved"].includes(booking[0].status)) {
      return res.status(403).json({
        message: "Chat is only available for pending or approved bookings",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// All routes require authentication
router.use(auth.verifyToken);

// Chat routes
router.get("/", chatController.getChats);
router.get("/:booking_id", validateBookingStatus, chatController.getChat); // Add middleware
router.post(
  "/:booking_id/message",
  validateBookingStatus,
  chatController.sendMessage
); // Add middlewarerouter.put("/:booking_id/read", chatController.markAsRead);

module.exports = router;
