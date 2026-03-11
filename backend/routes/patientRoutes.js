const express = require('express');
const {
  getPatients,
  getPatient,
  updatePatientProfile,
  getMyProfile
} = require('../controllers/patientController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'doctor'), getPatients)
  .post(updatePatientProfile);

router.route('/me').get(getMyProfile);
router.route('/:id').get(getPatient);

module.exports = router;
