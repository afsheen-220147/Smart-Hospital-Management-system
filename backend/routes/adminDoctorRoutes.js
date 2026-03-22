const express = require('express');
const {
  getAdminDoctors,
  addAdminDoctor,
  removeAdminDoctor,
  verifyDoctorEmail,
} = require('../controllers/adminDoctorController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public route - used during registration to verify doctor email
router.post('/verify', verifyDoctorEmail);

// Admin-only CRUD
router.get('/', protect, authorize('admin'), getAdminDoctors);
router.post('/', protect, authorize('admin'), addAdminDoctor);
router.delete('/:id', protect, authorize('admin'), removeAdminDoctor);

module.exports = router;
