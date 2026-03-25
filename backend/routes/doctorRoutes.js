const express = require('express');
const {
  getDoctors,
  getDoctor,
  getMyProfile,
  createDoctor,
  updateDoctor
} = require('../controllers/doctorController');

const { createOffDutyRequest, getDoctorOffDutyRequests } = require('../controllers/offDutyController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getDoctors);
router.post('/', protect, authorize('admin'), createDoctor);

router.get('/me', protect, authorize('doctor'), getMyProfile);

// Off-duty request endpoints
router.post('/off-duty/request', protect, authorize('doctor'), createOffDutyRequest);
router.get('/off-duty/my-requests', protect, authorize('doctor'), getDoctorOffDutyRequests);

router.get('/:id', getDoctor);
router.put('/:id', protect, authorize('doctor', 'admin'), updateDoctor);

module.exports = router;
