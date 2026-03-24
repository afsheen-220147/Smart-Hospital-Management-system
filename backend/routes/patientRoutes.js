const express = require('express');
const {
  getPatients,
  getPatient,
  updatePatientProfile,
  getMyProfile,
  deletePatient,
  fixPatientGender
} = require('../controllers/patientController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'doctor'), getPatients)
  .post(updatePatientProfile);

// Admin endpoints
router.post('/admin/fix-gender', authorize('admin'), fixPatientGender);

router.route('/me').get(getMyProfile);
router.route('/:id').get(getPatient).delete(authorize('admin'), deletePatient);

module.exports = router;
