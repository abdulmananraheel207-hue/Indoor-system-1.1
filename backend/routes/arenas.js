const express = require('express');
const router = express.Router();
const arenaController = require('../Controllers/arenaController');
const userController = require('../Controllers/userController');

// Public arena routes (no authentication required)
router.get('/sports', arenaController.getSportsCategories);
router.get('/search', userController.searchArenas);
router.get('/:arena_id', userController.getArenaDetails);
router.get('/:arena_id/slots', arenaController.getAvailableSlots);
router.get('/:arena_id/reviews', arenaController.getArenaReviews);
router.get('/:arena_id/courts', arenaController.getCourtDetails);

module.exports = router;