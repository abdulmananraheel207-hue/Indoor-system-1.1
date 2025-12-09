const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS for frontend
app.use(cors());

// Simple test endpoint
app.get('/api/health', (req, res) => {
    res.json({
        message: 'Backend is running!',
        database: 'MySQL Connected',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});