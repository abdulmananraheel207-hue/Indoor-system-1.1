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

// In routes/managers.js - REPLACE the login endpoint

// In routes/managers.js - REPLACE with this corrected version

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("=".repeat(50));
        console.log("🔐 MANAGER LOGIN ATTEMPT");
        console.log("Email:", email);

        // Validate input
        if (!email || !password) {
            console.log("❌ Missing email or password");
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find manager with proper status check
        const [managers] = await pool.execute(
            `SELECT m.*, o.owner_name, o.arena_name as owner_arena_name 
       FROM arena_managers m
       LEFT JOIN arena_owners o ON m.owner_id = o.owner_id
       WHERE m.email = ?`,
            [email]
        );

        if (managers.length === 0) {
            console.log("❌ Manager not found:", email);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const manager = managers[0];
        console.log("✅ Manager found:", {
            id: manager.manager_id,
            name: manager.name,
            email: manager.email,
            is_active: manager.is_active
        });

        // Check if manager is active
        if (manager.is_active !== 1 && manager.is_active !== true) {
            console.log("❌ Manager inactive:", manager.manager_id);
            return res.status(403).json({
                success: false,
                message: "Account is inactive. Please contact the arena owner."
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, manager.password_hash);
        if (!isValidPassword) {
            console.log("❌ Invalid password for manager:", manager.manager_id);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        console.log("✅ Password verified successfully");

        // Parse permissions safely
        let permissions = {};
        let arenaPermissions = {};
        let initialStats = {}; // 🔥 KEEP THIS - CRITICAL FOR DASHBOARD

        try {
            permissions = typeof manager.permissions === 'string'
                ? JSON.parse(manager.permissions)
                : (manager.permissions || {});

            console.log("📦 Raw permissions from DB:", permissions);

            // Store arena-specific permissions and collect initial stats
            arenaPermissions = permissions; // Keep the arena-specific structure

            // Extract initial stats from each arena's permissions
            Object.keys(permissions).forEach(key => {
                if (key.startsWith('arena_')) {
                    const perms = permissions[key] || {};

                    // Store initial stats for this arena if they exist
                    if (perms.initial_stats) {
                        const arenaId = parseInt(key.replace('arena_', ''));
                        initialStats[arenaId] = perms.initial_stats;
                    }
                }
            });

            console.log("📦 Arena-specific permissions:", arenaPermissions);
            console.log("📦 Initial stats from DB:", initialStats); // 🔥 Still here!

        } catch (parseError) {
            console.error("⚠️ Error parsing permissions:", parseError);
            permissions = {};
            arenaPermissions = {};
            initialStats = {};
        }

        // Get all arenas this manager has access to
        const accessibleArenaIds = [];

        Object.keys(arenaPermissions).forEach(key => {
            if (key.startsWith('arena_')) {
                const arenaId = parseInt(key.replace('arena_', ''));
                if (!isNaN(arenaId)) {
                    accessibleArenaIds.push(arenaId);
                }
            }
        });

        console.log("📋 Accessible arena IDs:", accessibleArenaIds);

        // Get arena details
        let arenas = [];
        if (accessibleArenaIds.length > 0) {
            try {
                const placeholders = accessibleArenaIds.map(() => '?').join(',');
                const [arenaRows] = await pool.execute(
                    `SELECT arena_id, name, address 
           FROM arenas 
           WHERE arena_id IN (${placeholders}) AND is_active = TRUE`,
                    accessibleArenaIds
                );
                arenas = arenaRows;
                console.log(`✅ Found ${arenas.length} arenas`);
            } catch (arenaError) {
                console.error("❌ Error fetching arenas:", arenaError);
            }
        }

        // Helper function to flatten permissions for quick checks
        const flattenPermissions = (arenaPerms) => {
            const flattened = {};
            Object.keys(arenaPerms).forEach(key => {
                if (key.startsWith('arena_')) {
                    const perms = arenaPerms[key] || {};
                    Object.keys(perms).forEach(permKey => {
                        if (permKey !== 'initial_stats' && perms[permKey]) {
                            flattened[permKey] = true;
                        }
                    });
                }
            });
            return flattened;
        };

        // Create JWT token - Store BOTH flattened and arena-specific permissions
        const jwtSecret = process.env.JWT_SECRET || "09631e3f99caf686f08d48965782fcdb751c691bb08d610e51d893c300b6e694e86a3645ef38a94a414fd11f8d077292057c0ca7e94a6fb3db33cc2197891e35";

        const token = jwt.sign(
            {
                id: manager.manager_id,
                owner_id: manager.owner_id,
                name: manager.name,
                email: manager.email,
                role: "manager",
                // Flattened permissions for quick checks in middleware
                permissions: flattenPermissions(arenaPermissions),
                // Keep arena-specific permissions for detailed checks
                arena_permissions: arenaPermissions
            },
            jwtSecret,
            { expiresIn: "24h" }
        );

        // Prepare user data for frontend
        const userData = {
            id: manager.manager_id,
            name: manager.name,
            email: manager.email,
            phone_number: manager.phone_number,
            role: "manager",
            // Send BOTH formats to frontend
            permissions: flattenPermissions(arenaPermissions), // Global flattened
            arena_permissions: arenaPermissions, // Arena-specific
            initial_stats: initialStats, // 🔥 KEEP THIS - IMPORTANT FOR DASHBOARD
            arenas: arenas,
            owner_id: manager.owner_id,
            owner_name: manager.owner_name || "Arena Owner"
        };

        console.log("✅ Login successful for manager:", manager.manager_id);
        console.log("✅ Final permissions for frontend:", flattenPermissions(arenaPermissions));
        console.log("✅ Arena-specific permissions:", arenaPermissions);
        console.log("✅ Initial stats:", initialStats); // 🔥 Still logging
        console.log("=".repeat(50));

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: userData,
            manager: userData
        });

    } catch (error) {
        console.error("💥 FATAL LOGIN ERROR:", error);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// All protected routes require manager authentication
router.use(managerAuth.verifyToken);

router.get("/dashboard",
    managerAuth.verifyToken, // Just verify token, no permission check
    (req, res, next) => {
        console.log("📊 Dashboard access attempt by manager:", req.manager.id);
        console.log("Manager permissions:", req.manager.permissions);

        // Check if they have ANY permission to manage anything
        const permissions = req.manager.permissions || {};

        // If they have no permissions at all, they can still view dashboard
        // but with limited data
        next();
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