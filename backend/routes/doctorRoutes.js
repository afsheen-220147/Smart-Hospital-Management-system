const express = require('express');
const {
  getDoctors,
  getDoctor,
  getMyProfile,
  createDoctor,
  updateDoctor
} = require('../controllers/doctorController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getDoctors);
router.post('/', protect, authorize('admin'), createDoctor);

router.get('/me', protect, authorize('doctor'), getMyProfile);

router.get('/:id', getDoctor);
router.put('/:id', protect, authorize('doctor', 'admin'), updateDoctor);

module.exports = router;
// 