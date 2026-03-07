const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/students', adminController.getStudents);
router.post('/delete-user', adminController.deleteUser);
router.post('/students/:id/add-points', adminController.addPoints);
router.get('/students/:id/points-history', adminController.getPointsHistory);
router.get('/students/:id/certificate/:eventId', adminController.getStudentCertificate);

router.post('/events/:eventId/participants/:studentId/role', adminController.updateParticipantRole);

module.exports = router;
