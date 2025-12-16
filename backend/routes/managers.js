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

        // Find manager
        const [managers] = await pool.execute(
            `SELECT m.*, o.arena_name as owner_arena_name 
       FROM arena_managers m
       JOIN arena_owners o ON m.owner_id = o.owner_id
       WHERE m.email = ?`,
            [email]
        );

        if (managers.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const manager = managers[0];

        // Check if manager is active
        if (!manager.is_active) {
            return res.status(403).json({
                message: "Account is inactive. Please contact the arena owner."
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, manager.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Parse permissions
        const permissions = typeof manager.permissions === 'string'
            ? JSON.parse(manager.permissions)
            : (manager.permissions || {});

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

        // Get arenas
        const [arenas] = await pool.execute(
            "SELECT arena_id, name FROM arenas WHERE owner_id = ? AND is_active = TRUE",
            [manager.owner_id]
        );

        res.json({
            message: "Login successful",
            token,
            manager: {
                id: manager.manager_id,
                name: manager.name,
                email: manager.email,
                phone_number: manager.phone_number,
                arena_name: manager.owner_arena_name,
                permissions: permissions,
                arenas: arenas
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// All protected routes require manager authentication
router.use(managerAuth.verifyToken);

// Dashboard (requires view_dashboard permission)
router.get("/dashboard",
    managerAuth.hasPermission("view_dashboard"),
    managerController.getDashboard
);

// Bookings management
router.get("/bookings",
    managerAuth.hasPermission("view_bookings"),
    managerController.getBookings
);

router.post("/bookings/:booking_id/accept",
    managerAuth.hasPermission("manage_bookings"),
    managerController.acceptBooking
);

router.post("/bookings/:booking_id/reject",
    managerAuth.hasPermission("manage_bookings"),
    managerController.rejectBooking
);

// Arena and calendar management
router.get("/arenas",
    managerAuth.hasAnyPermission(["view_calendar", "manage_arena", "view_bookings"]),
    managerController.getArenas
);

router.get("/arenas/slots",
    managerAuth.hasPermission("view_calendar"),
    managerController.getTimeSlots
);

router.put("/arenas/:arena_id/slots",
    managerAuth.hasPermission("manage_calendar"),
    managerController.updateTimeSlots
);

// Reports and stats
router.get("/stats",
    managerAuth.hasAnyPermission(["view_dashboard", "view_financial"]),
    managerController.getBookingStats
);

// Profile management
router.get("/profile",
    managerController.getProfile
);

router.put("/profile",
    managerController.updateProfile
);

module.exports = router;