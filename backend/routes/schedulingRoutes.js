/**
 * Smart Scheduling Routes
 * All routes for the intelligent appointment scheduling system
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const {
  // Slot Management
  getAvailableSlots,
  getAvailableSlotsRange,
  checkSlotAvailability,
  getSmartSuggestions,
  
  // Appointment Booking
  bookSmartAppointment,
  cancelAppointment,
  rescheduleAppointment,
  markAsNoShow,
  completeAppointment,
  checkInPatient,
  
  // Waitlist
  joinWaitlist,
  getMyWaitlist,
  getDoctorWaitlist,
  cancelWaitlistEntry,
  bookFromWaitlist,
  getWaitlistStats,
  
  // Doctor Management
  getDailySchedule,
  getWorkingHours,
  updateWorkingHours,
  getConsultationTypes,
  getScheduleSummary,
  
  // No-Show Prediction
  predictNoShow,
  getHighRiskAppointments,
  
  // Natural Language
  parseNaturalLanguageRequest,
  
  // Notifications
  sendBulkReminders,

  // Real-time delay adjustment
  applyDelay,

  // Session status & load control
  getSessionStatus,
  checkOverload
} = require('../controllers/schedulingController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// ==================== PUBLIC ROUTES ====================

// Get available slots for a doctor (public for booking UI)
router.get('/slots/:doctorId', getAvailableSlots);
router.get('/slots/:doctorId/range', getAvailableSlotsRange);
router.get('/suggestions/:doctorId', getSmartSuggestions);
router.get('/working-hours/:doctorId', getWorkingHours);
router.get('/consultation-types/:doctorId', getConsultationTypes);

// ==================== PROTECTED ROUTES ====================

// Use protect middleware for all routes below
router.use(protect);

// Slot availability check
router.post('/slots/check', checkSlotAvailability);

// ==================== PATIENT ROUTES ====================

// Smart appointment booking
router.post('/book', authorize('patient'), bookSmartAppointment);

// Waitlist for patients
router.post('/waitlist/join', authorize('patient'), joinWaitlist);
router.get('/waitlist/my', authorize('patient'), getMyWaitlist);
router.delete('/waitlist/:waitlistId', authorize('patient'), cancelWaitlistEntry);
router.post('/waitlist/:waitlistId/book', authorize('patient'), bookFromWaitlist);

// Natural language request parsing
router.post('/parse-request', authorize('patient'), parseNaturalLanguageRequest);

// ==================== PATIENT/DOCTOR ROUTES ====================

// Cancel appointment (patient can cancel their own, doctor/admin can cancel any)
router.post('/cancel/:appointmentId', authorize('patient', 'doctor', 'admin'), cancelAppointment);

// Reschedule appointment
router.post('/reschedule/:appointmentId', authorize('patient', 'doctor', 'admin'), rescheduleAppointment);

// No-show prediction (useful for patients to see their risk)
router.post('/predict-no-show', authorize('patient', 'doctor', 'admin'), predictNoShow);

// ==================== DOCTOR/ADMIN ROUTES ====================

// Appointment status management
router.post('/no-show/:appointmentId', authorize('doctor', 'admin'), markAsNoShow);
router.post('/complete/:appointmentId', authorize('doctor', 'admin'), completeAppointment);
router.post('/checkin/:appointmentId', authorize('doctor', 'admin'), checkInPatient);

// Doctor's schedule and waitlist
router.get('/schedule/:doctorId', authorize('doctor', 'admin'), getDailySchedule);
router.get('/waitlist/doctor/:doctorId', authorize('doctor', 'admin'), getDoctorWaitlist);
router.get('/waitlist/stats/:doctorId', authorize('doctor', 'admin'), getWaitlistStats);
router.get('/summary/:doctorId', authorize('doctor', 'admin'), getScheduleSummary);

// High-risk appointments
router.get('/high-risk/:doctorId', authorize('doctor', 'admin'), getHighRiskAppointments);

// Working hours management
router.put('/working-hours/:doctorId', authorize('doctor', 'admin'), updateWorkingHours);

// Schedule update notification (doctor notifying admin of schedule changes)
router.post('/notify-schedule-update', authorize('doctor'), asyncHandler(async (req, res) => {
  // This is a placeholder for admin notification - in production, this would send an email/notification
  console.log('Schedule update notification received:', req.body);
  res.status(200).json({ success: true, message: 'Admin notified of schedule changes' });
}));

// ==================== ADMIN ROUTES ====================

// Bulk reminders (for cron job or manual trigger)
router.post('/send-reminders', authorize('admin'), sendBulkReminders);

// ==================== REAL-TIME DELAY & LOAD CONTROL ====================

// Apply delay adjustment: shifts patient estimated times + sends emails
// Public session status: shows live capacity (used by booking UI to lock slots)
router.get('/session-status/:doctorId', getSessionStatus);

// Doctor/Admin delay report
router.post('/delay/:doctorId', protect, authorize('doctor', 'admin'), applyDelay);

// Overload detection endpoint
router.get('/overload/:doctorId', protect, authorize('doctor', 'admin'), checkOverload);

module.exports = router;
