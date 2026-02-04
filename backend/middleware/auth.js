const jwt = require("jsonwebtoken");
const pool = require("../db");

const auth = {
  // Middleware to verify JWT token AND check user exists
  verifyToken: async (req, res, next) => {
    try {
      console.log("🔐 AUTH MIDDLEWARE - Verifying token...");

      const token = req.headers.authorization?.split(" ")[1];
      console.log("Token present:", !!token);

      if (!token) {
        console.log("❌ No token provided");
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided."
        });
      }

      // Decode token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      console.log("✅ Token decoded:", {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });

      // Verify user exists in database based on role
      let user = null;

      // 1. Check for SUPER ADMIN or ADMIN
      if (decoded.role === "super_admin" || decoded.role === "admin") {
        console.log("🔍 Checking admin in database...");
        const [admins] = await pool.execute(
          `SELECT admin_id as id, email, name, username, role, 
                  is_super_admin, permissions, is_active 
           FROM admins WHERE admin_id = ?`,
          [decoded.id]
        );

        if (admins.length > 0) {
          user = {
            id: admins[0].id,
            email: admins[0].email,
            role: admins[0].role || 'admin',
            name: admins[0].name,
            username: admins[0].username,
            is_super_admin: admins[0].is_super_admin || false,
            permissions: admins[0].permissions || {},
            is_active: admins[0].is_active
          };

          // Check if admin is active
          if (!user.is_active) {
            console.log("❌ Admin account is inactive");
            return res.status(403).json({
              success: false,
              message: "Account is deactivated. Please contact support."
            });
          }

          console.log("✅ Admin verified:", {
            id: user.id,
            email: user.email,
            role: user.role,
            is_super_admin: user.is_super_admin
          });
        }
      }
      // 2. Check for OWNER (your existing code)
      else if (decoded.role === "owner") {
        console.log("🔍 Checking owner in database...");
        const [owners] = await pool.execute(
          "SELECT owner_id as id, email, arena_name, phone_number, is_active FROM arena_owners WHERE owner_id = ?",
          [decoded.id]
        );

        if (owners.length > 0) {
          user = {
            id: owners[0].id,
            email: owners[0].email,
            role: "owner",
            name: owners[0].arena_name,
            phone: owners[0].phone_number,
            is_active: owners[0].is_active
          };

          // Check if owner is active
          if (!user.is_active) {
            console.log("❌ Owner account is inactive");
            return res.status(403).json({
              success: false,
              message: "Account is deactivated. Please contact support."
            });
          }

          console.log("✅ Owner verified:", user);
        }
      }
      // 3. Check for USER (your existing code)
      else if (decoded.role === "user") {
        console.log("🔍 Checking user in database...");
        const [users] = await pool.execute(
          "SELECT user_id as id, name, email, phone_number FROM users WHERE user_id = ?",
          [decoded.id]
        );

        if (users.length > 0) {
          user = {
            id: users[0].id,
            email: users[0].email,
            role: "user",
            name: users[0].name,
            phone: users[0].phone_number
          };
          console.log("✅ User verified:", user);
        }
      }
      // 4. Check for MANAGER (your existing code)
      else if (decoded.role === "manager") {
        console.log("🔍 Checking manager in database...");
        const [managers] = await pool.execute(
          `SELECT am.manager_id as id, am.email, am.name, am.owner_id, 
                  ao.arena_name, am.is_active
           FROM arena_managers am
           LEFT JOIN arena_owners ao ON am.owner_id = ao.owner_id
           WHERE am.manager_id = ?`,
          [decoded.id]
        );

        if (managers.length > 0) {
          user = {
            id: managers[0].id,
            email: managers[0].email,
            role: "manager",
            name: managers[0].name,
            owner_id: managers[0].owner_id,
            arena_name: managers[0].arena_name,
            is_active: managers[0].is_active
          };

          // Check if manager is active
          if (!user.is_active) {
            console.log("❌ Manager account is inactive");
            return res.status(403).json({
              success: false,
              message: "Manager account is deactivated."
            });
          }

          console.log("✅ Manager verified:", user);
        }
      }

      if (!user) {
        console.log("❌ User not found in database for decoded token:", decoded);
        return res.status(401).json({
          success: false,
          message: "User account not found or invalid token."
        });
      }

      // Attach user to request
      req.user = user;
      console.log("✅ Authentication successful. User attached to request.");
      next();

    } catch (error) {
      console.error("❌ Token verification error:", error.message);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again."
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Authentication error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  },

  isSuperAdmin: (req, res, next) => {
    console.log('👑 Checking super admin role:', req.user?.role);
    if (req.user?.role === 'super_admin' || req.user?.is_super_admin === true) {
      next();
    } else {
      console.log('❌ Access denied. Super admin role required.');
      res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }
  },

  isAdminOrSuperAdmin: (req, res, next) => {
    console.log('🔐 Checking admin/super admin role:', req.user?.role);
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin' ||
      req.user?.is_super_admin === true) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
  },
  // Check if user is a regular user
  isUser: (req, res, next) => {
    console.log("👤 Checking user role:", req.user?.role);
    if (req.user?.role === "user") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. User role required."
      });
    }
  },

  // Check if user is an arena owner
  isOwner: (req, res, next) => {
    console.log("👑 Checking owner role:", req.user?.role);
    if (req.user?.role === "owner") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. Owner role required."
      });
    }
  },

  // Check if user is an admin
  isAdmin: (req, res, next) => {
    console.log("🛡️ Checking admin role:", req.user?.role);
    if (req.user?.role === "admin") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. Admin role required."
      });
    }
  },

  // Check if user is a manager
  isManager: (req, res, next) => {
    console.log("👔 Checking manager role:", req.user?.role);
    if (req.user?.role === "manager") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. Manager role required."
      });
    }
  },

  // Check if user is owner or manager
  isOwnerOrManager: (req, res, next) => {
    console.log("🔑 Checking owner/manager role:", req.user?.role);
    if (req.user?.role === "owner" || req.user?.role === "manager") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. Owner or manager role required."
      });
    }
  },
};

module.exports = auth;