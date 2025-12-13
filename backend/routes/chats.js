const express = require('express');
const router = express.Router();
const chatController = require('../Controllers/chatController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth.verifyToken);

// Chat routes
router.get('/', chatController.getChats);
router.get('/:booking_id', chatController.getChat);
router.post('/:booking_id/message', chatController.sendMessage);
router.put('/:booking_id/read', chatController.markAsRead);

module.exports = router;