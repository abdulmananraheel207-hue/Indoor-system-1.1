// routes/managers.js
const express = require("express");
const router = express.Router();
const managerController = require("../Controllers/managerController");
const managerAuth = require("../middleware/managerAuth");

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
        const token = jwt.sign(
            {
                id: manager.manager_id,
                owner_id: manager.owner_id,
                name: manager.name,
                email: manager.email,
                role: "manager",
                permissions: permissions,
                arena_name: manager.owner_arena_name
            },
            process.env.JWT_SECRET || "your-secret-key",
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

// Dashboard - requires view_dashboard
router.get("/dashboard",
    (req, res, next) => {
        if (req.manager.permissions.view_dashboard) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: view_dashboard required"
            });
        }
    },
    managerController.getDashboard
);

// Bookings management with permission checks
router.get("/bookings",
    (req, res, next) => {
        if (req.manager.permissions.view_bookings || req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: view_bookings required"
            });
        }
    },
    managerController.getBookings
);

router.post("/bookings/:booking_id/accept",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: manage_bookings required"
            });
        }
    },
    managerController.acceptBooking
);

router.post("/bookings/:booking_id/reject",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: manage_bookings required"
            });
        }
    },
    managerController.rejectBooking
);

// Complete booking - new route
router.put("/bookings/:booking_id/complete",
    (req, res, next) => {
        if (req.manager.permissions.manage_bookings) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: manage_bookings required"
            });
        }
    },
    managerController.completeBooking
);

// Calendar - requires view_calendar
router.get("/calendar",
    (req, res, next) => {
        if (req.manager.permissions.view_calendar || req.manager.permissions.manage_calendar) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: view_calendar required"
            });
        }
    },
    managerController.getCalendar
);

// Update time slots - requires manage_calendar
router.put("/calendar/slots",
    (req, res, next) => {
        if (req.manager.permissions.manage_calendar) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: manage_calendar required"
            });
        }
    },
    managerController.updateTimeSlots
);

// Arena and court management
router.get("/arenas",
    (req, res, next) => {
        if (req.manager.permissions.view_arena || req.manager.permissions.manage_arena) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: view_arena required"
            });
        }
    },
    managerController.getArenas
);

// Courts - requires manage_arena
router.get("/courts/:arena_id",
    (req, res, next) => {
        if (req.manager.permissions.manage_arena) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: manage_arena required"
            });
        }
    },
    managerController.getCourts
);

// Stats and reports
router.get("/stats",
    (req, res, next) => {
        if (req.manager.permissions.view_financial || req.manager.permissions.view_dashboard) {
            next();
        } else {
            res.status(403).json({
                message: "Permission denied: view_financial required"
            });
        }
    },
    managerController.getStats
);

// Profile management (always accessible)
router.get("/profile", managerController.getProfile);
router.put("/profile", managerController.updateProfile);

module.exports = router;