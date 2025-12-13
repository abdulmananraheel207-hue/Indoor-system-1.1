const express = require('express');
const router = express.Router();
const bookingController = require('../Controllers/bookingController');
const auth = require('../middleware/auth');
const { bookingValidation } = require('../middleware/validation');

// All routes require authentication
router.use(auth.verifyToken);

// User booking routes
router.post('/', bookingValidation.createBooking, bookingController.createBooking);
router.get('/', bookingController.getUserBookings);
router.get('/stats', bookingController.getBookingStats);
router.get('/slots/available', bookingController.getAvailableSlots);

// Specific booking routes
router.get('/:booking_id', bookingController.getBookingDetails);
router.put('/:booking_id/cancel', bookingController.cancelBooking);
router.put('/:booking_id/payment', bookingController.uploadPaymentScreenshot);
router.put('/:booking_id/complete', bookingController.completeBooking);

module.exports = router;