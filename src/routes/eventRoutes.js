const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.delete('/:id', eventController.deleteEvent);
router.get('/qr/:id', eventController.getEventQr);
router.get('/:id/feedbacks', eventController.getEventFeedbacks);
router.post('/:id/feedbacks', eventController.submitFeedback);
router.post('/:id/certificates', eventController.issueCertificate);
router.get('/:id/checkins', eventController.getEventCheckins);

module.exports = router;
