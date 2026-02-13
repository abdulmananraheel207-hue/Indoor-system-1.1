// routes/managers.js
const express = require("express");
const router = express.Router();
const managerController = require("../Controllers/managerController");
const managerAuth = require("../middleware/managerAuth");
const { uploadCourtImages } = require("../middleware/upload");

// Manager authentication routes (public)
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Manager Login (public)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        console.log("Manager login attempt for email:", email);

        // Find manager with proper status check
        const [managers] = await pool.execute(
            `SELECT m.*, o.arena_name as owner_arena_name 
       FROM arena_managers m
       JOIN arena_owners o ON m.owner_id = o.owner_id
       WHERE m.email = ?`,
            [email]
        );

        if (managers.length === 0) {
            console.log("Manager not found:", email);
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const manager = managers[0];

        // Check if manager is active
        if (manager.is_active !== 1 && manager.is_active !== true) {
            console.log("Manager inactive:", manager.manager_id);
            return res.status(403).json({
                message: "Account is inactive. Please contact the arena owner."
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, manager.password_hash);
        if (!isValidPassword) {
            console.log("Invalid password for manager:", manager.manager_id);
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Parse permissions safely
        let permissions = {};
        try {
            permissions = typeof manager.permissions === 'string'
                ? JSON.parse(manager.permissions)
                : (manager.permissions || {});
        } catch (parseError) {
            console.error("Error parsing permissions:", parseError);
            permissions = {};
        }

        console.log("Manager login successful:", manager.manager_id);

        // Create JWT token
        // In the login endpoint
        const token = jwt.sign(
            {
                id: manager.manager_id,
                owner_id: manager.owner_id,
                name: manager.name,
                email: manager.email,
                role: "manager",
                permissions: permissions, // Now only contains 4 permissions max
                arena_name: manager.owner_arena_name
            },
            process.env.JWT_SECRET || "09631e3f99caf686f08d48965782fcdb751c691bb08d610e51d893c300b6e694e86a3645ef38a94a414fd11f8d077292057c0ca7e94a6fb3db33cc2197891e35",

            { expiresIn: "24h" }
        );

        // Get arenas for this manager
        const [arenas] = await pool.execute(
            "SELECT arena_id, name FROM arenas WHERE owner_id = ? AND is_active = TRUE",
            [manager.owner_id]
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            manager: {
                id: manager.manager_id,
                name: manager.name,
                email: manager.email,
                phone_number: manager.phone_number,
                arena_name: manager.owner_arena_name,
                permissions: permissions,
                arenas: arenas,
                owner_id: manager.owner_id
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// All protected routes require manager authentication
router.use(managerAuth.verifyToken);

// Dashboard - accessible if has any permission (or specific check for financials)
router.get("/dashboard",
    (req, res, next) => {
        // If they have ANY permission, they can view dashboard
        const { view_financials, manage_bookings, manage_calendar, manage_arena } = req.manager.permissions;
        if (view_financials || manage_bookings || manage_calendar || manage_arena) {
            next();
        } else {
            res.status(403).json({ message: "No permissions to access dashboard" });
        }
    },
    managerController.getDashboard
);

// Bookings management - requires manage_bookings
router.get("/bookings",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_bookings required" });
        }
    },
    managerController.getBookings
);

router.put("/bookings/:booking_id/accept",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_bookings required" });
        }
    },
    managerController.acceptBooking
);

// Reject booking - use PUT
router.put("/bookings/:booking_id/reject",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_bookings required" });
        }
    },
    managerController.rejectBooking
);

router.put("/bookings/:booking_id/complete",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_bookings required" });
        }
    },
    managerController.completeBooking
);

// Calendar - requires manage_calendar
router.get("/calendar",
    (req, res, next) => {
        if (req.manager.permissions.manage_calendar) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_calendar required" });
        }
    },
    (req, res) => {
        req.query.arena_id = req.query.arena_id;
        req.query.date = req.query.date;
        req.query.court_id = req.query.court_id;
        managerController.getCalendar(req, res);
    }
);

router.put("/calendar/slots",
    (req, res, next) => {
        if (req.manager.permissions.manage_calendar) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_calendar required" });
        }
    },
    managerController.updateTimeSlots
);

// Arena settings - requires manage_arena
router.get("/arenas",
    (req, res, next) => {
        if (req.manager.permissions.manage_arena) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_arena required" });
        }
    },
    managerController.getArenas
);

router.get("/courts/:arena_id",
    (req, res, next) => {
        if (req.manager.permissions.manage_arena) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: manage_arena required" });
        }
    },
    managerController.getCourts
);

// Financial stats - requires view_financials
router.get("/stats",
    (req, res, next) => {
        if (req.manager.permissions.view_financials) {
            next();
        } else {
            res.status(403).json({ message: "Permission denied: view_financials required" });
        }
    },
    managerController.getStats
);
// In managers.js - Add this route

// Upload court photos - requires manage_arena
router.post("/courts/:court_id/photos",
    (req, res, next) => {
        if (req.manager.permissions.manage_arena) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: "Permission denied: manage_arena required"
            });
        }
    },
    uploadCourtImages,
    managerController.uploadCourtPhotos
);
// In managers.js - Add delete route after the upload route

// Delete court photo - requires manage_arena
router.delete("/courts/:court_id/photos/:photo_id",
    (req, res, next) => {
        if (req.manager.permissions.manage_arena) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: "Permission denied: manage_arena required"
            });
        }
    },
    managerController.deleteCourtPhoto
);
// Profile management (always accessible)
router.get("/profile", managerController.getProfile);
router.put("/profile", managerController.updateProfile);

module.exports = router;