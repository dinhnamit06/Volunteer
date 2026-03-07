const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');

// Import controllers directly for routes that don't fit perfectly in the sub-routers
const eventController = require('../controllers/eventController');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');

// Mount routes
router.use('/', authRoutes);  // /api/register, /api/login, /api/google-login
router.use('/events', eventRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// Additional routes mapping from old index.js
router.post('/register-event', eventController.registerEvent);
router.post('/attendance/scan', eventController.scanAttendance);
router.get('/dashboard/stats', adminController.getDashboardStats); // Mapped via adminController

// Provide direct access to profile functions to match old API routes pattern
router.get('/profile/:id', userController.getProfile);
router.post('/profile/:id', userController.updateProfile);

module.exports = router;
