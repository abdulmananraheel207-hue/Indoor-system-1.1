const jwt = require("jsonwebtoken");

const managerAuth = {
    verifyToken: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];

            if (!token) {
                return res.status(401).json({
                    message: "Access denied. No token provided."
                });
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "your-secret-key"
            );

            if (decoded.role !== "manager") {
                return res.status(403).json({
                    message: "Access denied. Invalid token type."
                });
            }

            console.log("📦 Decoded manager token:", {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                hasPermissions: !!decoded.permissions,
                hasArenaPermissions: !!decoded.arena_permissions
            });

            // Attach manager info to request - INCLUDE BOTH
            req.manager = {
                id: decoded.id,
                owner_id: decoded.owner_id,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role,
                permissions: decoded.permissions || {}, // Flattened for quick checks
                arena_permissions: decoded.arena_permissions || {}, // Arena-specific
                arena_name: decoded.arena_name
            };

            console.log("✅ Manager authenticated:", req.manager.email);
            next();
        } catch (error) {
            console.error("Token verification error:", error);

            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Token expired. Please login again."
                });
            }

            return res.status(401).json({
                message: "Invalid token"
            });
        }
    },

    // NEW: Check permission for a specific arena
    hasPermissionForArena: (permission) => {
        return (req, res, next) => {
            const { arena_id } = req.params;

            if (!req.manager) {
                return res.status(401).json({ message: "Authentication required" });
            }

            // Check if manager has this permission for the specific arena
            const arenaKey = `arena_${arena_id}`;
            const arenaPerms = req.manager.arena_permissions[arenaKey] || {};

            if (arenaPerms[permission]) {
                next();
            } else {
                res.status(403).json({
                    message: `Permission denied: ${permission} required for this arena`
                });
            }
        };
    }
};

module.exports = managerAuth;