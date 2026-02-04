// scripts/seedSuperAdmin.js
const bcrypt = require('bcrypt');
const pool = require('../db');

async function createSuperAdmin() {
    try {
        // Your super admin credentials (CHANGE THESE!)
        const SUPER_ADMIN = {
            name: 'Super Administrator',
            email: 'manan114@gmail.com',  // CHANGE THIS
            username: 'manan',              // CHANGE THIS
            password: 'manan114h',        // CHANGE THIS - Strong password
            role: 'super_admin'
        };

        console.log('🚀 Creating Super Admin...');
        console.log('Credentials:', {
            username: SUPER_ADMIN.username,
            email: SUPER_ADMIN.email,
            password: SUPER_ADMIN.password
        });

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, saltRounds);

        // Super admin permissions
        const permissions = {
            can_manage_all: true,
            can_view_financials: true,
            can_block_arenas: true,
            can_export_reports: true,
            can_view_analytics: true,
            can_manage_users: true,
            can_manage_owners: true,
            can_access_super_admin: true
        };

        // Check if super admin exists
        const [existing] = await pool.execute(
            'SELECT admin_id FROM admins WHERE email = ? OR username = ?',
            [SUPER_ADMIN.email, SUPER_ADMIN.username]
        );

        if (existing.length > 0) {
            console.log('⚠️ Super Admin already exists. Updating...');

            await pool.execute(
                `UPDATE admins 
                 SET name = ?, password_hash = ?, role = ?, 
                     is_super_admin = TRUE, permissions = ?, is_active = TRUE
                 WHERE email = ?`,
                [SUPER_ADMIN.name, passwordHash, SUPER_ADMIN.role,
                JSON.stringify(permissions), SUPER_ADMIN.email]
            );

            console.log('✅ Super Admin updated!');
        } else {
            // Insert super admin
            await pool.execute(
                `INSERT INTO admins (name, email, username, password_hash, role, is_super_admin, permissions) 
                 VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
                [SUPER_ADMIN.name, SUPER_ADMIN.email, SUPER_ADMIN.username,
                    passwordHash, SUPER_ADMIN.role, JSON.stringify(permissions)]
            );

            console.log('✅ Super Admin created successfully!');
        }

        console.log('\n📋 SUPER ADMIN LOGIN DETAILS:');
        console.log('==============================');
        console.log('🔐 Username:', SUPER_ADMIN.username);
        console.log('🔐 Password:', SUPER_ADMIN.password);
        console.log('📧 Email:', SUPER_ADMIN.email);
        console.log('👑 Role: Super Admin');
        console.log('🚀 Access: Full system control');
        console.log('==============================');
        console.log('\n⚠️  IMPORTANT: Change password after first login!');
        console.log('📞 Support: Save these credentials securely');

    } catch (error) {
        console.error('❌ Error creating super admin:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

createSuperAdmin();