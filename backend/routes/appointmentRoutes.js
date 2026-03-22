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
  getAppointmentDetails
} = require('../controllers/appointmentController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect); // All appointment routes are protected

router
  .route('/')
  .get(authorize('admin'), getAppointments)
  .post(authorize('patient'), bookAppointment);

// Get appointment details
router.get('/:id', getAppointmentDetails);

// Get patient appointments
router.get('/patient/:patientId', authorize('patient', 'doctor', 'admin'), getPatientAppointments);

// Get doctor appointments
router.get('/doctor/:doctorId', authorize('doctor', 'admin'), getDoctorAppointments);

// Get available slots for a doctor
router.get('/doctor/:doctorId/available-slots', getAvailableSlots);

// Update appointment status
router.put('/:id', authorize('patient', 'doctor', 'admin'), updateAppointmentStatus);

// Reschedule appointment
router.put('/:id/reschedule', authorize('patient', 'doctor', 'admin'), rescheduleAppointment);

// Delete appointment (only pending)
router.delete('/:id', authorize('patient', 'admin'), deleteAppointment);

module.exports = router;
