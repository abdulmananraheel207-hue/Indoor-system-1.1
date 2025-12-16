// middleware/managerAuth.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

const managerAuth = {
    // Verify manager token
    verifyToken: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    message: "Access denied. No token provided."
                });
            }

            const token = authHeader.split(" ")[1];

            // Verify JWT token
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "your-secret-key"
            );

            // Check if user is a manager
            if (decoded.role !== "manager") {
                return res.status(403).json({
                    message: "Access denied. Manager role required."
                });
            }

            // Get manager from database
            const [managers] = await pool.execute(
                `SELECT m.*, o.arena_name as owner_arena_name 
         FROM arena_managers m
         JOIN arena_owners o ON m.owner_id = o.owner_id
         WHERE m.manager_id = ?`,
                [decoded.id]
            );

            if (managers.length === 0) {
                return res.status(404).json({ message: "Manager not found" });
            }

            const manager = managers[0];

            // Check if manager is active
            if (!manager.is_active) {
                return res.status(403).json({
                    message: "Manager account is inactive"
                });
            }

            // Parse permissions
            const permissions = typeof manager.permissions === 'string'
                ? JSON.parse(manager.permissions)
                : (manager.permissions || {});

            // Attach manager info to request as BOTH req.manager AND req.user
            req.manager = {
                id: manager.manager_id,
                owner_id: manager.owner_id,
                name: manager.name,
                email: manager.email,
                permissions: permissions,
                arena_name: manager.owner_arena_name
            };

            // Also set req.user for compatibility
            req.user = {
                id: manager.manager_id,
                owner_id: manager.owner_id,
                name: manager.name,
                email: manager.email,
                role: "manager"
            };

            next();
        } catch (error) {
            console.error("Auth error:", error);
            if (error.name === "JsonWebTokenError") {
                return res.status(401).json({ message: "Invalid token" });
            }
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Token expired" });
            }
            res.status(500).json({
                message: "Authentication error",
                error: error.message
            });
        }
    },

    // Check specific permission
    hasPermission: (permission) => {
        return (req, res, next) => {
            if (!req.manager) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const permissions = req.manager.permissions || {};

            if (!permissions[permission]) {
                return res.status(403).json({
                    message: "Insufficient permissions",
                    requiredPermission: permission
                });
            }

            next();
        };
    },

    // Check any permission (at least one)
    hasAnyPermission: (requiredPermissions) => {
        return (req, res, next) => {
            if (!req.manager) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const permissions = req.manager.permissions || {};
            const hasAny = requiredPermissions.some(perm => permissions[perm]);

            if (!hasAny) {
                return res.status(403).json({
                    message: "Insufficient permissions",
                    requiredPermissions: requiredPermissions
                });
            }

            next();
        };
    }
};

module.exports = managerAuth;