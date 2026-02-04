const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../db");

const adminAuthController = {
    adminLogin: async (req, res) => {
        try {
            console.log("🔐 ADMIN LOGIN ATTEMPT");
            const { username, password } = req.body;

            // Validate input
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required"
                });
            }

            console.log("🔍 Searching for admin:", username);

            // Check if admin exists in admins table
            const [admins] = await pool.execute(
                `SELECT admin_id, name, email, username, password_hash, 
                role, is_super_admin, permissions, is_active
         FROM admins 
         WHERE (username = ? OR email = ?)`,
                [username, username]
            );

            if (admins.length === 0) {
                console.log("❌ Admin not found:", username);
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            const admin = admins[0];
            console.log("✅ Admin found:", {
                id: admin.admin_id,
                username: admin.username,
                role: admin.role,
                is_super_admin: admin.is_super_admin,
                is_active: admin.is_active
            });

            // Check if admin is active
            if (!admin.is_active) {
                console.log("❌ Admin account inactive:", admin.admin_id);
                return res.status(403).json({
                    success: false,
                    message: "Account is deactivated. Please contact system administrator."
                });
            }

            // Verify password (password is stored in password_hash column)
            console.log("🔑 Verifying password...");

            // Direct comparison (assuming password is stored as plain text or hashed)
            const isValidPassword = await bcrypt.compare(password, admin.password_hash);

            if (!isValidPassword) {
                console.log("❌ Invalid password for admin:", admin.admin_id);
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            console.log("✅ Password verified");

            // Determine role - if is_super_admin is true, role is "super_admin"
            const userRole = admin.is_super_admin ? "super_admin" : (admin.role || "admin");

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: admin.admin_id,
                    username: admin.username,
                    email: admin.email,
                    name: admin.name,
                    role: userRole,
                    is_super_admin: admin.is_super_admin,
                    permissions: admin.permissions || {}
                },
                process.env.JWT_SECRET || "your-secret-key",
                { expiresIn: "24h" }
            );

            console.log("✅ Token generated for admin:", admin.username);
            console.log("✅ Admin role:", userRole);
            console.log("✅ Is super admin:", admin.is_super_admin);

            // Prepare admin data for response
            // Prepare admin data for response
            const adminData = {
                id: admin.admin_id,
                name: admin.name,
                email: admin.email,
                username: admin.username,
                role: userRole,
                is_super_admin: admin.is_super_admin === 1,
                permissions: admin.permissions || {}
            };

            res.json({
                success: true,
                message: "Login successful",
                token: token,
                admin: adminData
            });

        } catch (error) {
            console.error("❌ Admin login error:", error);
            res.status(500).json({
                success: false,
                message: "Server error during login",
                error: process.env.NODE_ENV === "development" ? error.message : undefined
            });
        }
    },

    // Get admin profile (for frontend to verify session)
    getAdminProfile: async (req, res) => {
        try {
            const adminId = req.user.id;

            const [admins] = await pool.execute(
                `SELECT admin_id, name, email, username, role, 
                is_super_admin, permissions, is_active, created_at
         FROM admins 
         WHERE admin_id = ?`,
                [adminId]
            );

            if (admins.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            const admin = admins[0];
            const userRole = admin.is_super_admin ? "super_admin" : (admin.role || "admin");

            const adminData = {
                id: admin.admin_id,
                name: admin.name,
                email: admin.email,
                username: admin.username,
                role: userRole,
                is_super_admin: admin.is_super_admin === 1,
                permissions: admin.permissions ? JSON.parse(admin.permissions) : {},
                is_active: admin.is_active === 1,
                created_at: admin.created_at
            };

            res.json({
                success: true,
                admin: adminData
            });

        } catch (error) {
            console.error("❌ Get admin profile error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch admin profile"
            });
        }
    },

    // Simple logout endpoint
    adminLogout: (req, res) => {
        res.json({
            success: true,
            message: "Logout successful"
        });
    }
};

module.exports = adminAuthController;