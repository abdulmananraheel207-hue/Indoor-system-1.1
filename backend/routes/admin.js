const express = require('express');
const router = express.Router();
const adminController = require('../Controllers/adminController');
const auth = require('../middleware/auth');

// All routes require admin authentication
router.use(auth.verifyToken, auth.isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Arena management
router.get('/arenas', adminController.getAllArenas);
router.put('/arenas/:arena_id/block', adminController.toggleArenaBlock);
router.delete('/arenas/:arena_id', adminController.removeArena);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/owners', adminController.getAllOwners);

// Financial management
router.post('/arenas/:arena_id/payment', adminController.markPaymentCompleted);
router.get('/reports/financial', adminController.getFinancialReports);

module.exports = router;