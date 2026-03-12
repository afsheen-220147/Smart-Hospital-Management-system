const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadReport, uploadPrescription, uploadProfile } = require('../config/cloudinary');
const {
  uploadMedicalReport,
  uploadPrescription: uploadPrescriptionController,
  uploadProfileImage,
  deleteUpload
} = require('../controllers/uploadController');

// Medical report upload (all authenticated users)
router.post(
  '/report',
  protect,
  uploadReport.single('file'),
  uploadMedicalReport
);

// Prescription upload (doctors only)
router.post(
  '/prescription',
  protect,
  authorize('doctor', 'admin'),
  uploadPrescription.single('file'),
  uploadPrescriptionController
);

// Profile image upload
router.post(
  '/profile',
  protect,
  uploadProfile.single('image'),
  uploadProfileImage
);

// Delete upload
router.delete(
  '/:publicId',
  protect,
  deleteUpload
);

module.exports = router;
