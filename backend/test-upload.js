// test-upload.js - Run this to test everything
require('dotenv').config();

async function testEverything() {
    console.log("🔍 Testing Photo Upload Setup...\n");

    // 1. Check environment variables
    console.log("1. Checking Environment Variables:");
    console.log("   CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "✓ Set" : "✗ Missing");
    console.log("   CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "✓ Set (" + process.env.CLOUDINARY_API_KEY.length + " chars)" : "✗ Missing");
    console.log("   CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✓ Set (" + process.env.CLOUDINARY_API_SECRET.length + " chars)" : "✗ Missing");
    console.log("   JWT_SECRET:", process.env.JWT_SECRET ? "✓ Set" : "✗ Missing");

    // 2. Check if routes are mounted
    console.log("\n2. Checking Routes:");
    const fs = require('fs');
    const routesPath = './routes/owners.js';
    if (fs.existsSync(routesPath)) {
        const content = fs.readFileSync(routesPath, 'utf8');
        const hasUploadRoute = content.includes('/courts/:court_id/photos');
        console.log("   Upload route in owners.js:", hasUploadRoute ? "✓ Found" : "✗ Missing");
    } else {
        console.log("   owners.js file:", "✗ Not found");
    }

    // 3. Test Cloudinary connection
    console.log("\n3. Testing Cloudinary Connection:");
    try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const ping = await cloudinary.api.ping();
        console.log("   Cloudinary ping:", ping.status === 'ok' ? "✓ Connected" : "✗ Failed");
    } catch (error) {
        console.log("   Cloudinary connection:", "✗ Failed - " + error.message);
    }

    // 4. Check database connection
    console.log("\n4. Checking Database:");
    try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sports_arena'
        });

        console.log("   Database connection:", "✓ Connected");

        // Check court_images table
        const [tables] = await connection.execute("SHOW TABLES LIKE 'court_images'");
        console.log("   court_images table:", tables.length > 0 ? "✓ Exists" : "✗ Missing");

        await connection.end();
    } catch (error) {
        console.log("   Database connection:", "✗ Failed - " + error.message);
    }

    // 5. Summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ SETUP SUMMARY:");
    console.log("1. Make sure owners.js router is mounted in app.js:");
    console.log("   app.use('/api/owners', require('./routes/owners'))");
    console.log("\n2. Test endpoints:");
    console.log("   - POST /api/owners/debug/upload-test");
    console.log("   - POST /api/owners/courts/1/photos (with Bearer token)");
    console.log("\n3. Check .env file for Cloudinary credentials");
    console.log("=".repeat(50));
}

testEverything().catch(console.error);