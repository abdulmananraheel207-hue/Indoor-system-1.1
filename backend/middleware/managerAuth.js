const jwt = require("jsonwebtoken");

const managerAuth = {
    // Verify token for managers
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

            // Check if this is a manager token
            if (decoded.role !== "manager") {
                return res.status(403).json({
                    message: "Access denied. Invalid token type."
                });
            }

            // Attach manager info to request
            req.manager = {
                id: decoded.id,
                owner_id: decoded.owner_id,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role,
                permissions: decoded.permissions || {},
                arena_name: decoded.arena_name
            };

            console.log("Manager authenticated:", req.manager.email);
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

    // Check specific permission
    hasPermission: (permission) => {
        return (req, res, next) => {
            if (!req.manager) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            // Check if manager has the required permission
            const hasPermission = req.manager.permissions[permission] === true;

            if (!hasPermission) {
                return res.status(403).json({
                    message: `Insufficient permissions. Required: ${permission}`
                });
            }

            next();
        };
    },

    // Check any of the permissions
    hasAnyPermission: (permissions) => {
        return (req, res, next) => {
            if (!req.manager) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            // Check if manager has any of the required permissions
            const hasAnyPermission = permissions.some(
                permission => req.manager.permissions[permission] === true
            );

            if (!hasAnyPermission) {
                return res.status(403).json({
                    message: `Insufficient permissions. Required one of: ${permissions.join(", ")}`
                });
            }

            next();
        };
    }
};

module.exports = managerAuth;