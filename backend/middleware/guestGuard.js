// Create new file: middleware/guestGuard.js
const guestGuard = (req, res, next) => {
    // Check if token is a guest token
    const token = req.headers.authorization?.split(' ')[1];

    if (token && token.startsWith('guest-')) {
        return res.status(403).json({
            message: "Please register/sign in to perform this action",
            requiresAuth: true
        });
    }

    next();
};

// Use in your routes:
// bookingRoutes.js
router.post('/bookings', auth.verifyToken, guestGuard, bookingController.createBooking);