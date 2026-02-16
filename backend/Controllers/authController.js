const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");

const authController = {
  // User Registration
  registerUser: async (req, res) => {
    try {
      // Accept both phone and phone_number from frontend
      const { name, email, password, phone, phone_number, location } = req.body;

      // Use phone if provided, otherwise phone_number, otherwise null
      const userPhone = phone || phone_number || null;

      // Handle location if provided (you might want to parse lat/lng from string)
      let location_lat = null;
      let location_lng = null;

      if (location) {
        // If location is a string like "lat,lng", parse it
        if (typeof location === 'string' && location.includes(',')) {
          const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
          location_lat = lat;
          location_lng = lng;
        }
        // If location is an object with lat/lng
        else if (typeof location === 'object') {
          location_lat = location.lat || location.latitude || null;
          location_lng = location.lng || location.longitude || null;
        }
      }

      // Check if user exists
      const [existingUser] = await pool.execute(
        "SELECT user_id FROM users WHERE email = ?",
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user - include all fields from your table
      const [result] = await pool.execute(
        `INSERT INTO users 
       (name, email, password_hash, phone_number, location_lat, location_lng, is_logged_in, last_login) 
       VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [name, email, hashedPassword, userPhone, location_lat, location_lng]
      );

      // Generate token
      const token = jwt.sign(
        { id: result.insertId, email, role: "user" },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: result.insertId,
          name,
          email,
          phone_number: userPhone,
          role: "user"
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },



  registerOwner: async (req, res) => {
    try {
      console.log("Register owner request body:", req.body);
      console.log("Register owner headers:", req.headers);

      const {
        owner_name,           // New field from step 1
        personal_number,      // New field from step 1
        arena_name,           // Moved to step 2
        email,
        password,
        phone_number,         // Moved to step 2
        business_address,     // Moved to step 2
        google_maps_location, // Moved to step 2
        number_of_courts,
        agreed_to_terms,
      } = req.body;

      // Log each field
      console.log("Fields received:");
      console.log("- owner_name:", owner_name);
      console.log("- personal_number:", personal_number);
      console.log("- arena_name:", arena_name);
      console.log("- agreed_to_terms:", agreed_to_terms, "type:", typeof agreed_to_terms);
      console.log("- email:", email);

      // Check if owner exists
      const [existingOwner] = await pool.execute(
        "SELECT owner_id FROM arena_owners WHERE email = ?",
        [email]
      );

      if (existingOwner.length > 0) {
        return res.status(400).json({ message: "Owner already exists" });
      }

      if (!agreed_to_terms) {
        return res
          .status(400)
          .json({ message: "Must agree to terms and conditions" });
      }

      // Make it more robust:
      if (
        agreed_to_terms !== true &&
        agreed_to_terms !== "true" &&
        agreed_to_terms !== 1
      ) {
        return res.status(400).json({
          message: "Must agree to terms and conditions",
          received: agreed_to_terms,
          type: typeof agreed_to_terms,
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert owner - Updated with new fields
      const [result] = await pool.execute(
        `INSERT INTO arena_owners 
        (owner_name, personal_number, arena_name, email, password_hash, phone_number, business_address, 
         google_maps_location, number_of_courts, agreed_to_terms) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          owner_name || null,           // New field
          personal_number || null,       // New field
          arena_name,
          email,
          hashedPassword,
          phone_number,
          business_address,
          google_maps_location,
          number_of_courts,
          agreed_to_terms,
        ]
      );

      // Generate token
      const token = jwt.sign(
        { id: result.insertId, email, role: "owner" },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "Arena owner registered successfully",
        token,
        owner: {
          id: result.insertId,
          owner_name,
          arena_name,
          email,
          phone_number,
          personal_number,
          role: "owner",
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Admin Registration (for super admin only)
  registerAdmin: async (req, res) => {
    try {
      const { username, email, password, full_name } = req.body;

      // Check if admin exists
      const [existingAdmin] = await pool.execute(
        "SELECT admin_id FROM admins WHERE email = ? OR username = ?",
        [email, username]
      );

      if (existingAdmin.length > 0) {
        return res.status(400).json({ message: "Admin already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert admin
      const [result] = await pool.execute(
        `INSERT INTO admins (username, email, password_hash, full_name) 
         VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, full_name]
      );

      // Generate token
      const token = jwt.sign(
        { id: result.insertId, email, role: "admin" },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "Admin registered successfully",
        token,
        admin: {
          id: result.insertId,
          username,
          email,
          full_name,
          role: "admin",
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Manager Registration (by arena owner)
  registerManager: async (req, res) => {
    try {
      const { name, email, password, phone_number, permissions } = req.body;
      const owner_id = req.user.id;

      // Check if manager exists
      const [existingManager] = await pool.execute(
        "SELECT manager_id FROM arena_managers WHERE email = ? AND owner_id = ?",
        [email, owner_id]
      );

      if (existingManager.length > 0) {
        return res
          .status(400)
          .json({ message: "Manager already exists for this arena" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert manager
      const [result] = await pool.execute(
        `INSERT INTO arena_managers (owner_id, name, email, password_hash, phone_number, permissions, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          owner_id,
          name,
          email,
          hashedPassword,
          phone_number,
          JSON.stringify(permissions),
        ]
      );

      res.status(201).json({
        message: "Manager registered successfully",
        manager: {
          id: result.insertId,
          name,
          email,
          phone_number,
          permissions,
          owner_id,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Login for all user types - FIXED with simple owner block check for managers
  login: async (req, res) => {
    try {
      const { email, password, userType } = req.body;
      let user, table;

      // Determine which table to query based on userType
      switch (userType) {
        case "user":
          table = "users";
          break;
        case "owner":
          table = "arena_owners";
          break;
        case "admin":
          table = "admins";
          break;
        case "manager":
          console.log("🔍 Manager login attempt for email:", email);

          // Get manager details with owner blocking status
          const [managers] = await pool.execute(`
            SELECT 
                m.manager_id,
                m.name,
                m.email,
                m.password_hash,
                m.phone_number,
                m.permissions,
                m.is_active as manager_is_active,
                o.owner_id,
                o.arena_name as owner_name,
                o.is_blocked,
                o.blocked_reason,
                o.blocked_at
            FROM arena_managers m
            INNER JOIN arena_owners o ON m.owner_id = o.owner_id
            WHERE m.email = ?
          `, [email]);

          if (managers.length === 0) {
            return res.status(401).json({
              success: false,
              message: "Invalid credentials"
            });
          }

          user = managers[0];

          // CHECK 1: If the owner is blocked, deny manager access
          // This prevents all managers from logging in when their owner is blocked
          const ownerIsBlocked = Number(user.is_blocked) === 1;
          if (ownerIsBlocked) {
            console.log('🚫 Manager login denied - Owner is blocked:', {
              manager_id: user.manager_id,
              manager_name: user.name,
              owner_id: user.owner_id,
              owner_name: user.owner_name,
              blocked_reason: user.blocked_reason
            });

            return res.status(403).json({
              success: false,
              message: 'OWNER_BLOCKED',
              details: {
                reason: user.blocked_reason || 'The arena owner account has been blocked',
                blocked_date: user.blocked_at ?
                  new Date(user.blocked_at).toLocaleDateString() : 'Recently',
                owner_name: user.owner_name,
                support_email: 'support@arenafinder.com',
                action_required: 'Please contact the super admin to resolve this issue.'
              }
            });
          }

          // CHECK 2: Verify manager is active
          if (user.manager_is_active != 1) {
            console.log('❌ Manager login denied - Manager is inactive:', user.manager_id);
            return res.status(403).json({
              success: false,
              message: 'MANAGER_INACTIVE',
              details: {
                reason: 'Your manager account has been deactivated'
              }
            });
          }

          // CHECK 3: Verify password
          const isValidManagerPassword = await bcrypt.compare(password, user.password_hash);
          if (!isValidManagerPassword) {
            return res.status(401).json({
              success: false,
              message: "Invalid credentials"
            });
          }

          // Update last login
          await pool.execute(
            `UPDATE arena_managers SET last_login = NOW() WHERE manager_id = ?`,
            [user.manager_id]
          );

          // Parse permissions
          let permissions = user.permissions;
          if (typeof permissions === 'string') {
            try {
              permissions = JSON.parse(permissions);
            } catch (e) {
              permissions = {};
            }
          }

          // Generate token
          const managerToken = jwt.sign(
            {
              id: user.manager_id,
              email: user.email,
              role: "manager",
              owner_id: user.owner_id,
              name: user.name
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
          );

          console.log("✅ Manager login successful:", {
            manager_id: user.manager_id,
            name: user.name,
            owner_name: user.owner_name
          });

          return res.json({
            success: true,
            message: "Login successful",
            token: managerToken,
            user: {
              id: user.manager_id,
              name: user.name,
              email: user.email,
              phone_number: user.phone_number,
              role: "manager",
              owner_id: user.owner_id,
              owner_name: user.owner_name,
              permissions: permissions || {}
            }
          });

        default:
          return res.status(400).json({ message: "Invalid user type" });
      }

      // For non-manager users (user, owner, admin)
      let query;
      if (table === "arena_owners") {
        query = `SELECT * FROM ${table} WHERE email = ? AND is_active = TRUE`;
      } else {
        query = `SELECT * FROM ${table} WHERE email = ?`;
      }

      const [users] = await pool.execute(query, [email]);

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      user = users[0];

      // CHECK IF OWNER IS BLOCKED (for owner login)
      if (userType === "owner" && user.is_blocked == 1) {
        console.log('🚫 Blocked owner attempted login:', user.owner_id, user.email);
        return res.status(403).json({
          success: false,
          message: 'ACCOUNT_BLOCKED',
          details: {
            reason: user.blocked_reason || 'Your account has been blocked due to non-payment or violation of terms.',
            blocked_date: user.blocked_at ? new Date(user.blocked_at).toLocaleDateString() : 'Recently',
            support_email: 'support@arenafinder.com',
            support_phone: '+92 300 1234567'
          }
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Update last login for users
      if (table === "users") {
        await pool.execute(
          "UPDATE users SET is_logged_in = TRUE, last_login = NOW() WHERE user_id = ?",
          [user.user_id]
        );
      }

      // Determine actual role from database for admins
      let actualRole = userType;
      if (table === "admins") {
        actualRole = user.role || "admin";
      }

      // Generate token
      const tokenPayload = {
        id: user.user_id || user.owner_id || user.admin_id,
        email: user.email,
        role: actualRole,
      };

      // Add admin-specific info
      if (table === "admins") {
        tokenPayload.is_super_admin = user.is_super_admin || false;
        tokenPayload.permissions = user.permissions || null;
      }

      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      // Prepare response data
      let userData;
      if (actualRole === "user") {
        userData = {
          id: user.user_id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          profile_picture_url: user.profile_picture_url,
          role: actualRole,
        };
      } else if (actualRole === "owner") {
        userData = {
          id: user.owner_id,
          arena_name: user.arena_name,
          email: user.email,
          phone_number: user.phone_number,
          role: actualRole,
        };
      } else if (table === "admins") {
        userData = {
          id: user.admin_id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: actualRole,
          is_super_admin: user.is_super_admin || false,
          permissions: user.permissions || null,
        };
      }

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: userData,
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Guest session
  createGuestSession: async (req, res) => {
    try {
      const sessionId = crypto.randomUUID();

      await pool.execute("INSERT INTO guest_sessions (session_id) VALUES (?)", [
        sessionId,
      ]);

      res.json({
        message: "Guest session created",
        session_id: sessionId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Logout
  logout: async (req, res) => {
    try {
      if (req.user.role === "user") {
        await pool.execute(
          "UPDATE users SET is_logged_in = FALSE WHERE user_id = ?",
          [req.user.id]
        );
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

module.exports = authController;