const express = require('express');
const {
  getAppointments,
  getPatientAppointments,
  getDoctorAppointments,
  bookAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  getAvailableSlots,
  deleteAppointment,
  getAppointmentDetails,
  startConsultation,
  endConsultation,
  uploadMedicalReport,
  cancelAppointmentByDoctor,
  autoCancelNoShows,
  pauseAppointment,
  resumeAppointment
} = require('../controllers/appointmentController');

const { uploadReport } = require('../config/cloudinary');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect); // All appointment routes are protected

router
  .route('/')
  .get(authorize('admin'), getAppointments)
  .post(authorize('patient'), bookAppointment);

// Get patient appointments (MUST be before /:id to avoid matching as generic ID)
router.get('/patient/:patientId', authorize('patient', 'doctor', 'admin'), getPatientAppointments);

// Get doctor appointments (MUST be before /:id to avoid matching as generic ID)
router.get('/doctor/:doctorId', authorize('doctor', 'admin'), getDoctorAppointments);

// Get available slots for a doctor
router.get('/doctor/:doctorId/available-slots', getAvailableSlots);

// Get appointment details (MUST be AFTER specific routes like /patient and /doctor)
router.get('/:id', getAppointmentDetails);

// Start consultation
router.post('/:id/start', authorize('doctor', 'admin'), startConsultation);

// Pause consultation
router.post('/:id/pause', authorize('doctor', 'admin'), pauseAppointment);

// Resume consultation
router.post('/:id/resume', authorize('doctor', 'admin'), resumeAppointment);

// End consultation
router.post('/:id/end', authorize('doctor', 'admin'), endConsultation);

// Upload report
router.post('/:id/upload-report', protect, authorize('doctor', 'admin'), uploadReport.single('file'), uploadMedicalReport);

// Update appointment status
router.put('/:id', authorize('patient', 'doctor', 'admin'), updateAppointmentStatus);

// Reschedule appointment
router.put('/:id/reschedule', authorize('patient', 'doctor', 'admin'), rescheduleAppointment);

// Delete appointment (only pending)
router.delete('/:id', authorize('patient', 'admin'), deleteAppointment);

// FEATURE 6: Doctor cancel appointment (e.g., patient no-show)
router.post('/:id/cancel-by-doctor', authorize('doctor'), cancelAppointmentByDoctor);

// FEATURE 2: Auto-cancel no-shows at session end
router.post('/auto-cancel/no-shows', authorize('admin', 'doctor'), autoCancelNoShows);

module.exports = router;
