/**
 * Smart Scheduling Controller
 * Handles all smart scheduling related endpoints
 */

const asyncHandler = require('express-async-handler');
const schedulingService = require('../services/schedulingService');
const availabilityService = require('../services/availabilityService');
const waitlistService = require('../services/waitlistService');
const noShowPredictionService = require('../services/noShowPredictionService');
const notificationService = require('../services/notificationService');

// ==================== SLOT MANAGEMENT ====================

/**
 * @desc    Get available slots for a doctor on a specific date
 * @route   GET /api/v1/scheduling/slots/:doctorId
 * @access  Public
 */
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date, visitType = 'First Consultation' } = req.query;

  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }

  const slots = await availabilityService.getAvailableSlots(
    doctorId,
    new Date(date),
    visitType
  );

  res.status(200).json({
    success: true,
    count: slots.length,
    date,
    visitType,
    data: slots
  });
});

/**
 * @desc    Get available slots for a date range
 * @route   GET /api/v1/scheduling/slots/:doctorId/range
 * @access  Public
 */
exports.getAvailableSlotsRange = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { 
    startDate = new Date().toISOString(), 
    days = 7, 
    visitType = 'First Consultation' 
  } = req.query;

  const slots = await availabilityService.getAvailableSlotsForRange(
    doctorId,
    new Date(startDate),
    parseInt(days),
    visitType
  );

  res.status(200).json({
    success: true,
    daysWithSlots: Object.keys(slots).length,
    startDate,
    daysSearched: days,
    visitType,
    data: slots
  });
});

/**
 * @desc    Check if a specific slot is available
 * @route   POST /api/v1/scheduling/slots/check
 * @access  Public
 */
exports.checkSlotAvailability = asyncHandler(async (req, res) => {
  const { doctorId, date, timeSlot, duration = 30 } = req.body;

  if (!doctorId || !date || !timeSlot) {
    res.status(400);
    throw new Error('doctorId, date, and timeSlot are required');
  }

  const result = await availabilityService.checkSlotAvailability(
    doctorId,
    new Date(date),
    timeSlot,
    duration
  );

  res.status(200).json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get smart appointment suggestions
 * @route   GET /api/v1/scheduling/suggestions/:doctorId
 * @access  Public
 */
exports.getSmartSuggestions = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { visitType = 'First Consultation', preferredDate } = req.query;

  const suggestions = await schedulingService.getSmartSuggestions(
    doctorId,
    visitType,
    preferredDate ? new Date(preferredDate) : null
  );

  res.status(200).json({
    success: true,
    data: suggestions
  });
});

// ==================== APPOINTMENT BOOKING ====================

/**
 * @desc    Book a smart appointment with no-show prediction
 * @route   POST /api/v1/scheduling/book
 * @access  Private (Patient)
 */
exports.bookSmartAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, timeSlot, visitType, reason, notes, consultationType } = req.body;

  const result = await schedulingService.bookSmartAppointment({
    patientId: req.user.id,
    doctorId,
    date: new Date(date),
    timeSlot,
    visitType,
    reason,
    notes,
    consultationType
  });

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: result.appointment,
    noShowPrediction: result.noShowPrediction,
    recommendations: result.recommendations
  });
});

/**
 * @desc    Cancel an appointment
 * @route   POST /api/v1/scheduling/cancel/:appointmentId
 * @access  Private
 */
exports.cancelAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { reason } = req.body;

  const cancelledBy = req.user.role === 'patient' ? 'Patient' : 
                      req.user.role === 'doctor' ? 'Doctor' : 'Admin';

  const result = await schedulingService.cancelAppointment(appointmentId, cancelledBy, reason);

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: result.appointment,
    waitlistNotified: result.waitlistNotification.success
  });
});

/**
 * @desc    Reschedule an appointment
 * @route   POST /api/v1/scheduling/reschedule/:appointmentId
 * @access  Private
 */
exports.rescheduleAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { newDate, newTimeSlot } = req.body;

  if (!newDate || !newTimeSlot) {
    res.status(400);
    throw new Error('newDate and newTimeSlot are required');
  }

  const result = await schedulingService.rescheduleAppointment(
    appointmentId,
    new Date(newDate),
    newTimeSlot
  );

  res.status(200).json({
    success: true,
    message: 'Appointment rescheduled successfully',
    data: result.appointment,
    previousDateTime: result.oldDateTime,
    noShowPrediction: result.newPrediction
  });
});

/**
 * @desc    Mark appointment as no-show
 * @route   POST /api/v1/scheduling/no-show/:appointmentId
 * @access  Private (Doctor/Admin)
 */
exports.markAsNoShow = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const result = await schedulingService.markAsNoShow(appointmentId);

  res.status(200).json({
    success: true,
    message: 'Appointment marked as no-show',
    data: result.appointment,
    waitlistReallocation: result.waitlistReallocation
  });
});

/**
 * @desc    Complete an appointment
 * @route   POST /api/v1/scheduling/complete/:appointmentId
 * @access  Private (Doctor/Admin)
 */
exports.completeAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const result = await schedulingService.completeAppointment(appointmentId);

  res.status(200).json({
    success: true,
    message: 'Appointment completed successfully',
    data: result.appointment
  });
});

/**
 * @desc    Check in a patient
 * @route   POST /api/v1/scheduling/checkin/:appointmentId
 * @access  Private (Doctor/Admin)
 */
exports.checkInPatient = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const result = await schedulingService.checkInPatient(appointmentId);

  res.status(200).json({
    success: true,
    message: 'Patient checked in successfully',
    data: result.appointment
  });
});

// ==================== WAITLIST ====================

/**
 * @desc    Join the waitlist
 * @route   POST /api/v1/scheduling/waitlist/join
 * @access  Private (Patient)
 */
exports.joinWaitlist = asyncHandler(async (req, res) => {
  const { 
    doctorId, 
    requestedDate, 
    alternativeDates, 
    preferredTimeRange,
    visitType,
    reason,
    priority
  } = req.body;

  if (!doctorId || !requestedDate || !reason) {
    res.status(400);
    throw new Error('doctorId, requestedDate, and reason are required');
  }

  const entry = await waitlistService.addToWaitlist({
    patientId: req.user.id,
    doctorId,
    requestedDate: new Date(requestedDate),
    alternativeDates: alternativeDates?.map(d => new Date(d)),
    preferredTimeRange,
    visitType,
    reason,
    priority
  });

  res.status(201).json({
    success: true,
    message: 'Added to waitlist successfully',
    data: entry
  });
});

/**
 * @desc    Get patient's waitlist entries
 * @route   GET /api/v1/scheduling/waitlist/my
 * @access  Private (Patient)
 */
exports.getMyWaitlist = asyncHandler(async (req, res) => {
  const entries = await waitlistService.getPatientWaitlist(req.user.id);

  res.status(200).json({
    success: true,
    count: entries.length,
    data: entries
  });
});

/**
 * @desc    Get doctor's waitlist
 * @route   GET /api/v1/scheduling/waitlist/doctor/:doctorId
 * @access  Private (Doctor/Admin)
 */
exports.getDoctorWaitlist = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  const entries = await waitlistService.getDoctorWaitlist(
    doctorId,
    date ? new Date(date) : null
  );

  res.status(200).json({
    success: true,
    count: entries.length,
    data: entries
  });
});

/**
 * @desc    Cancel waitlist entry
 * @route   DELETE /api/v1/scheduling/waitlist/:waitlistId
 * @access  Private (Patient)
 */
exports.cancelWaitlistEntry = asyncHandler(async (req, res) => {
  const { waitlistId } = req.params;

  const entry = await waitlistService.cancelWaitlistEntry(waitlistId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Waitlist entry cancelled',
    data: entry
  });
});

/**
 * @desc    Book from waitlist notification
 * @route   POST /api/v1/scheduling/waitlist/:waitlistId/book
 * @access  Private (Patient)
 */
exports.bookFromWaitlist = asyncHandler(async (req, res) => {
  const { waitlistId } = req.params;
  const { timeSlot } = req.body;

  if (!timeSlot) {
    res.status(400);
    throw new Error('timeSlot is required');
  }

  const result = await waitlistService.bookFromWaitlist(waitlistId, timeSlot);

  res.status(201).json({
    success: true,
    message: 'Appointment booked from waitlist',
    data: result.appointment
  });
});

/**
 * @desc    Get waitlist statistics for a doctor
 * @route   GET /api/v1/scheduling/waitlist/stats/:doctorId
 * @access  Private (Doctor/Admin)
 */
exports.getWaitlistStats = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const stats = await waitlistService.getWaitlistStats(doctorId);

  res.status(200).json({
    success: true,
    data: stats
  });
});

// ==================== DOCTOR MANAGEMENT ====================

/**
 * @desc    Get doctor's daily schedule
 * @route   GET /api/v1/scheduling/schedule/:doctorId
 * @access  Private (Doctor/Admin)
 */
exports.getDailySchedule = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date = new Date().toISOString() } = req.query;

  const schedule = await schedulingService.getDailySchedule(doctorId, new Date(date));

  res.status(200).json({
    success: true,
    data: schedule
  });
});

/**
 * @desc    Get doctor's working hours
 * @route   GET /api/v1/scheduling/working-hours/:doctorId
 * @access  Public
 */
exports.getWorkingHours = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const hours = await availabilityService.getAllWorkingHours(doctorId);

  res.status(200).json({
    success: true,
    data: hours
  });
});

/**
 * @desc    Update doctor's working hours
 * @route   PUT /api/v1/scheduling/working-hours/:doctorId
 * @access  Private (Doctor/Admin)
 */
exports.updateWorkingHours = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { dayName, workingHours } = req.body;

  if (!dayName || !workingHours) {
    res.status(400);
    throw new Error('dayName and workingHours are required');
  }

  const updated = await availabilityService.updateWorkingHours(doctorId, dayName, workingHours);

  res.status(200).json({
    success: true,
    message: 'Working hours updated',
    data: updated
  });
});

/**
 * @desc    Get consultation types for a doctor
 * @route   GET /api/v1/scheduling/consultation-types/:doctorId
 * @access  Public
 */
exports.getConsultationTypes = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const types = await availabilityService.getConsultationTypes(doctorId);

  res.status(200).json({
    success: true,
    data: types
  });
});

/**
 * @desc    Get schedule summary for a doctor
 * @route   GET /api/v1/scheduling/summary/:doctorId
 * @access  Private (Doctor/Admin)
 */
exports.getScheduleSummary = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { 
    startDate = new Date().toISOString(), 
    endDate 
  } = req.query;

  const end = endDate ? new Date(endDate) : new Date(startDate);
  if (!endDate) {
    end.setDate(end.getDate() + 7);
  }

  const summary = await availabilityService.getScheduleSummary(
    doctorId,
    new Date(startDate),
    end
  );

  res.status(200).json({
    success: true,
    data: summary
  });
});

// ==================== NO-SHOW PREDICTION ====================

/**
 * @desc    Get no-show prediction for a potential appointment
 * @route   POST /api/v1/scheduling/predict-no-show
 * @access  Private
 */
exports.predictNoShow = asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentDate, timeSlot, visitType } = req.body;

  const prediction = await noShowPredictionService.predictNoShow({
    patientId: patientId || req.user.id,
    doctorId,
    appointmentDate: new Date(appointmentDate),
    timeSlot,
    visitType
  });

  res.status(200).json({
    success: true,
    data: prediction
  });
});

/**
 * @desc    Get high-risk appointments for a doctor
 * @route   GET /api/v1/scheduling/high-risk/:doctorId
 * @access  Private (Doctor/Admin)
 */
exports.getHighRiskAppointments = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date = new Date().toISOString() } = req.query;

  const appointments = await noShowPredictionService.getHighRiskAppointments(
    doctorId,
    new Date(date)
  );

  res.status(200).json({
    success: true,
    count: appointments.length,
    threshold: noShowPredictionService.HIGH_RISK_THRESHOLD,
    data: appointments
  });
});

// ==================== NATURAL LANGUAGE ====================

/**
 * @desc    Parse natural language appointment request
 * @route   POST /api/v1/scheduling/parse-request
 * @access  Private (Patient)
 */
exports.parseNaturalLanguageRequest = asyncHandler(async (req, res) => {
  const { text, doctorId } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('text is required');
  }

  const parsed = schedulingService.parseNaturalLanguageRequest(text);

  // If doctor is specified, get suggestions
  let suggestions = null;
  if (doctorId && parsed.date) {
    suggestions = await schedulingService.getSmartSuggestions(
      doctorId,
      parsed.visitType,
      parsed.date
    );
  }

  res.status(200).json({
    success: true,
    parsedRequest: parsed,
    suggestions
  });
});

// ==================== NOTIFICATIONS ====================

/**
 * @desc    Send reminder emails for upcoming appointments (for cron job)
 * @route   POST /api/v1/scheduling/send-reminders
 * @access  Private (Admin)
 */
exports.sendBulkReminders = asyncHandler(async (req, res) => {
  const { hoursAhead = 24 } = req.body;

  const result = await notificationService.sendBulkReminders(parseInt(hoursAhead));

  res.status(200).json({
    success: true,
    message: `Sent ${result.count} reminders`,
    data: result
  });
});
