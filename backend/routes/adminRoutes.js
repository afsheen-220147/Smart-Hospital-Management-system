const express = require('express');
const { getAdminStats } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { 
  triggerAppointmentUpdate, 
  getAutoUpdateStatus 
} = require('../controllers/appointmentAutoUpdateController');
const {
  approveOffDutyRequest,
  rejectOffDutyRequest,
  getAllOffDutyRequests,
  getOffDutyStats
} = require('../controllers/adminDoctorOffDutyController');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);

// Appointment auto-update endpoints
router.post('/appointments/trigger-update', triggerAppointmentUpdate);
router.get('/appointments/auto-update-status', getAutoUpdateStatus);

// Off-duty management endpoints
router.get('/off-duty/requests', getAllOffDutyRequests);
router.post('/off-duty/requests/:id/approve', approveOffDutyRequest);
router.post('/off-duty/requests/:id/reject', rejectOffDutyRequest);
router.get('/off-duty/stats', getOffDutyStats);

module.exports = router;
