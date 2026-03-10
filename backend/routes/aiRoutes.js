const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/reports');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `report-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, TXT, JPG, PNG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/symptoms/analyze', optionalAuth, aiController.analyzeSymptoms);

router.post('/symptoms/doctors', optionalAuth, aiController.getDoctorsBySymptoms);

router.post('/appointment/recommend', optionalAuth, aiController.getSmartRecommendation);

router.post('/report/summarize', optionalAuth, upload.single('file'), aiController.summarizeReport);

router.post('/doctor/recommend', optionalAuth, aiController.recommendDoctor);

router.post('/health/risk', optionalAuth, aiController.predictHealthRisk);

router.post('/doctor/load-balance', protect, aiController.getLoadBalancedDoctor);

router.post('/emergency/detect', aiController.detectEmergency);

router.post('/chat', optionalAuth, aiController.chatAssistant);

router.get('/appointment/:appointmentId/summary', protect, aiController.getAppointmentSummary);

// Prescription safety check - requires doctor authentication
router.post('/prescription-check', protect, aiController.checkPrescriptionSafety);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
});

module.exports = router;
