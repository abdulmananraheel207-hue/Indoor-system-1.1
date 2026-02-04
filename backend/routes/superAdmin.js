// routes/superAdmin.js
const express = require('express');
const router = express.Router();
const superAdminController = require('../Controllers/superAdminController');
const auth = require('../middleware/auth');

// All routes require SUPER ADMIN authentication
router.use(auth.verifyToken, auth.isSuperAdmin);

// 1. CENTRAL CONTROL ROUTES
router.get('/system-overview', superAdminController.getSystemOverview);
router.get('/system-health', superAdminController.getSystemHealth);

// 2. ACTIVITY MONITORING ROUTES
router.get('/analytics', superAdminController.getAnalytics);

// 3. FINANCIAL MANAGEMENT ROUTES
router.get('/commission-reports', superAdminController.getCommissionReports);
router.get('/overdue-payments', superAdminController.getOverduePayments);
router.get('/export/financial-report', superAdminController.exportFinancialReport);

// 4. PAYMENT ENFORCEMENT ROUTES
router.post('/arenas/:arena_id/enforce-payment', superAdminController.enforcePayment);

module.exports = router;