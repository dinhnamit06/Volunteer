const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:id/history', userController.getHistory);
router.get('/profile/:id', userController.getProfile); // We define it as /profile/:id but map it correctly in root
router.post('/profile/:id', userController.updateProfile);

module.exports = router;
