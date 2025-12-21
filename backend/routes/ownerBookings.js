// routes/ownerBookings.js
const express = require("express");
const router = express.Router();
const bookingController = require("../Controllers/bookingController");
const auth = require("../middleware/auth");
const validate = require("../middleware/validation");

router.use(auth.verifyToken);
router.use(validate.checkOwnerRole); // Only owners can access these routes

// Get owner bookings with filters
router.get("/bookings", async (req, res) => {
  try {
    const pool = require("../db");
    const { status, date_from, date_to } = req.query;

    let query = `
            SELECT b.*, 
                   u.name as user_name, 
                   u.phone_number as user_phone,
                   u.email as user_email,
                   st.name as sport_name,
                   a.name as arena_name,
                   ts.date, ts.start_time, ts.end_time
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN arenas a ON b.arena_id = a.arena_id
            JOIN sports_types st ON b.sport_id = st.sport_id
            JOIN time_slots ts ON b.slot_id = ts.slot_id
            WHERE a.owner_id = ?
        `;

    const params = [req.user.id];

    if (status && status !== "all") {
      query += " AND b.status = ?";
      params.push(status);
    }

    if (date_from) {
      query += " AND ts.date >= ?";
      params.push(date_from);
    }

    if (date_to) {
      query += " AND ts.date <= ?";
      params.push(date_to);
    }

    query += " ORDER BY b.booking_date DESC";

    const [bookings] = await pool.execute(query, params);
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Accept booking
router.post("/bookings/:booking_id/accept", async (req, res) => {
  try {
    const pool = require("../db");
    const { booking_id } = req.params;

    // Check if booking exists and belongs to owner's arena
    const [bookings] = await pool.execute(
      `
            SELECT b.* FROM bookings b
            JOIN arenas a ON b.arena_id = a.arena_id
            WHERE b.booking_id = ? AND a.owner_id = ?
        `,
      [booking_id, req.user.id]
    );

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "Booking not found or access denied" });
    }

    if (bookings[0].status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be accepted" });
    }

    // Update booking status to 'accepted' (not 'approved')
    await pool.execute(
      'UPDATE bookings SET status = "accepted" WHERE booking_id = ?',
      [booking_id]
    );

    res.json({ message: "Booking accepted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reject booking
router.post("/bookings/:booking_id/reject", async (req, res) => {
  try {
    const pool = require("../db");
    const { booking_id } = req.params;
    const { reason } = req.body;

    // Check if booking exists and belongs to owner's arena
    const [bookings] = await pool.execute(
      `
            SELECT b.* FROM bookings b
            JOIN arenas a ON b.arena_id = a.arena_id
            WHERE b.booking_id = ? AND a.owner_id = ?
        `,
      [booking_id, req.user.id]
    );

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "Booking not found or access denied" });
    }

    if (bookings[0].status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be rejected" });
    }

    if (!reason || reason.trim() === "") {
      return res
        .status(400)
        .json({ message: "Reason is required for rejection" });
    }

    // Update booking status to 'rejected'
    await pool.execute(
      'UPDATE bookings SET status = "rejected" WHERE booking_id = ?',
      [booking_id]
    );

    res.json({ message: "Booking rejected successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
