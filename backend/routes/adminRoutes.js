const express = require('express');
const { getAdminStats } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { 
  triggerAppointmentUpdate, 
  getAutoUpdateStatus 
} = require('../controllers/appointmentAutoUpdateController');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);

// Appointment auto-update endpoints
router.post('/appointments/trigger-update', triggerAppointmentUpdate);
router.get('/appointments/auto-update-status', getAutoUpdateStatus);

module.exports = router;
