/**
 * Scheduling Service
 * Main orchestrator for smart appointment scheduling
 */

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const slotGenerator = require('../utils/slotGenerator');
const availabilityService = require('./availabilityService');
const noShowPredictionService = require('./noShowPredictionService');
const notificationService = require('./notificationService');
const waitlistService = require('./waitlistService');

/**
 * Book a smart appointment with no-show prediction
 * @param {Object} params 
 * @returns {Promise<Object>}
 */
const bookSmartAppointment = async (params) => {
  const {
    patientId,
    doctorId,
    date,
    timeSlot,
    visitType = 'First Consultation',
    reason,
    notes = '',
    consultationType = 'in-person'
  } = params;

  // Validate required fields
  if (!patientId || !doctorId || !date || !timeSlot || !reason) {
    throw new Error('Missing required fields');
  }

  // NORMALIZE DATE: Convert to midnight UTC on the provided date
  // Frontend sends date as "2026-03-24" (local date string in IST)
  // Store as UTC midnight of that date for consistent querying
  let normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // Get duration for visit type
  const duration = await availabilityService.getDurationForVisitType(doctorId, visitType);

  // Calculate end time first to check for overlaps
  const endTime = slotGenerator.calculateEndTime(timeSlot, duration);

  // ✅ FEATURE 1: Check if patient already has ANY appointment at this time slot across ALL doctors
  const patientTimeSlotConflict = await Appointment.find({
    patient: patientId,
    date: {
      $gte: new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate()),
      $lt: new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate() + 1)
    },
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    _id: { $ne: null }
  }).populate({
    path: 'doctor',
    populate: { path: 'user', select: 'name' }
  });

  // Check if requested time slot overlaps with ANY of patient's appointments
  const conflictingAppt = patientTimeSlotConflict.find(apt => {
    const aptStart = apt.timeSlot;
    const aptEnd = apt.endTime || apt.timeSlot;
    return !(endTime <= aptStart || timeSlot >= aptEnd);
  });

  if (conflictingAppt) {
    const conflictingDoctorName = conflictingAppt.doctor?.user?.name || 'a doctor';
    throw new Error(`You already have an appointment with Dr. ${conflictingDoctorName} at this time. Please change the timings.`);
  }

  // Check slot availability
  const availability = await availabilityService.checkSlotAvailability(
    doctorId,
    normalizedDate,
    timeSlot,
    duration
  );

  if (!availability.available) {
    throw new Error(availability.reason || 'Slot not available');
  }

  // Calculate no-show probability
  const prediction = await noShowPredictionService.predictNoShow({
    patientId,
    doctorId,
    appointmentDate: normalizedDate,
    timeSlot,
    visitType
  });

  // Create the appointment
  const appointment = await Appointment.create({
    patient: patientId,
    doctor: doctorId,
    date: normalizedDate,
    timeSlot,
    endTime,
    duration,
    visitType,
    reason,
    notes,
    noShowProbability: prediction.probability,
    status: 'confirmed',
    bookedVia: 'manual',
    consultationType
  });

  // Send confirmation email
  await notificationService.sendAppointmentConfirmation(appointment._id);

  return {
    appointment,
    noShowPrediction: prediction,
    recommendations: prediction.recommendations
  };
};

/**
 * Cancel an appointment and trigger waitlist processing
 * @param {string} appointmentId 
 * @param {string} cancelledBy 
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
const cancelAppointment = async (appointmentId, cancelledBy = 'Patient', reason = '') => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status === 'cancelled') {
    throw new Error('Appointment is already cancelled');
  }

  const oldStatus = appointment.status;
  const appointmentDate = appointment.date;
  const appointmentTime = appointment.timeSlot;

  // Update appointment status
  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date();
  appointment.cancellationReason = reason;
  await appointment.save();

  // Update patient attendance history
  await noShowPredictionService.updatePatientHistory(appointment.patient, 'cancelled');

  // Send cancellation notice
  await notificationService.sendCancellationNotice(appointmentId, cancelledBy, reason);

  // Process waitlist for this slot
  const waitlistResult = await waitlistService.processWaitlistForCancellation(
    appointment.doctor,
    appointmentDate,
    appointmentTime
  );

  return {
    appointment,
    previousStatus: oldStatus,
    waitlistNotification: waitlistResult
  };
};

/**
 * Reschedule an appointment
 * @param {string} appointmentId 
 * @param {Date} newDate 
 * @param {string} newTimeSlot 
 * @returns {Promise<Object>}
 */
const rescheduleAppointment = async (appointmentId, newDate, newTimeSlot) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (['cancelled', 'completed', 'no-show'].includes(appointment.status)) {
    throw new Error(`Cannot reschedule ${appointment.status} appointment`);
  }

  // Check if new slot is available
  const availability = await availabilityService.checkSlotAvailability(
    appointment.doctor,
    newDate,
    newTimeSlot,
    appointment.duration
  );

  if (!availability.available) {
    throw new Error(availability.reason || 'New slot not available');
  }

  // Store old details
  const oldDate = appointment.date;
  const oldTime = appointment.timeSlot;

  // Update no-show prediction for new time
  const prediction = await noShowPredictionService.predictNoShow({
    patientId: appointment.patient,
    doctorId: appointment.doctor,
    appointmentDate: newDate,
    timeSlot: newTimeSlot,
    visitType: appointment.visitType
  });

  // Update appointment
  appointment.date = newDate;
  appointment.timeSlot = newTimeSlot;
  appointment.endTime = slotGenerator.calculateEndTime(newTimeSlot, appointment.duration);
  appointment.noShowProbability = prediction.probability;
  appointment.rescheduledFrom = appointmentId; // Self-reference to track history
  appointment.reminderSent = false; // Reset reminder flag
  await appointment.save();

  // Send reschedule notification
  await notificationService.sendRescheduleNotification(appointmentId, oldDate, oldTime);

  // Process waitlist for the freed slot
  const waitlistResult = await waitlistService.processWaitlistForCancellation(
    appointment.doctor,
    oldDate,
    oldTime
  );

  return {
    appointment,
    oldDateTime: { date: oldDate, time: oldTime },
    newPrediction: prediction,
    waitlistNotification: waitlistResult
  };
};

/**
 * Mark appointment as no-show
 * @param {string} appointmentId 
 * @returns {Promise<Object>}
 */
const markAsNoShow = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  appointment.status = 'no-show';
  await appointment.save();

  // Update patient attendance history
  await noShowPredictionService.updatePatientHistory(appointment.patient, 'no-show');

  // Try to allocate to waitlist
  const waitlistResult = await waitlistService.autoAllocateSlot(appointmentId);

  return {
    appointment,
    waitlistReallocation: waitlistResult
  };
};

/**
 * Mark appointment as completed
 * @param {string} appointmentId 
 * @returns {Promise<Object>}
 */
const completeAppointment = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  appointment.status = 'completed';
  appointment.actualEndTime = new Date();
  await appointment.save();

  // Update patient attendance history
  await noShowPredictionService.updatePatientHistory(appointment.patient, 'completed');

  // Increment doctor's total patients
  await Doctor.findByIdAndUpdate(appointment.doctor, {
    $inc: { totalPatients: 1 }
  });

  return { appointment };
};

/**
 * Check in a patient for their appointment
 * @param {string} appointmentId 
 * @returns {Promise<Object>}
 */
const checkInPatient = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  appointment.checkedIn = true;
  appointment.checkedInAt = new Date();
  appointment.status = 'in-progress';
  appointment.actualStartTime = new Date();
  await appointment.save();

  return { appointment };
};

/**
 * Get smart suggestions for appointment booking
 * @param {string} doctorId 
 * @param {string} visitType 
 * @param {Date} preferredDate - Optional
 * @returns {Promise<Object>}
 */
const getSmartSuggestions = async (doctorId, visitType = 'First Consultation', preferredDate = null) => {
  const startDate = preferredDate || new Date();
  const doctor = await Doctor.findById(doctorId).populate('user', 'name');
  
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Get available slots for next 7 days
  const slotsForRange = await availabilityService.getAvailableSlotsForRange(
    doctorId,
    startDate,
    7,
    visitType
  );

  // Get next available slot
  const nextAvailable = await availabilityService.getNextAvailableSlot(
    doctorId,
    visitType,
    startDate
  );

  // Get consultation type info
  const consultationType = doctor.consultationTypes?.find(ct => ct.name === visitType);

  return {
    doctorId,
    doctorName: doctor.user.name,
    visitType,
    duration: consultationType?.duration || doctor.defaultSlotDuration || 30,
    fee: consultationType?.fee || doctor.fees,
    nextAvailable,
    availableSlots: slotsForRange,
    totalDaysWithSlots: Object.keys(slotsForRange).length
  };
};

/**
 * Get daily schedule for a doctor
 * @param {string} doctorId 
 * @param {Date} date 
 * @returns {Promise<Object>}
 */
const getDailySchedule = async (doctorId, date = new Date()) => {
  const doctor = await Doctor.findById(doctorId).populate('user', 'name');
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  const appointments = await availabilityService.getAppointmentsForDate(doctorId, date);
  
  // Sort by time
  const sortedAppointments = await Appointment.find({
    _id: { $in: appointments.map(a => a._id) }
  })
    .populate('patient', 'name email')
    .sort({ timeSlot: 1 });

  // Get high risk appointments
  const highRiskAppointments = await noShowPredictionService.getHighRiskAppointments(doctorId, date);

  // Get waitlist count for this date
  const waitlist = await waitlistService.getDoctorWaitlist(doctorId, date);

  return {
    doctorId,
    doctorName: doctor.user.name,
    date,
    dayName: slotGenerator.getDayName(date),
    workingHours: doctor.workingHours?.find(wh => wh.day === slotGenerator.getDayName(date)),
    totalAppointments: sortedAppointments.length,
    appointments: sortedAppointments,
    highRiskCount: highRiskAppointments.length,
    highRiskAppointments: highRiskAppointments.map(a => ({
      id: a._id,
      patient: a.patient?.name,
      timeSlot: a.timeSlot,
      noShowProbability: a.noShowProbability
    })),
    waitlistCount: waitlist.length
  };
};

/**
 * Parse natural language appointment request (placeholder for LLM integration)
 * @param {string} text 
 * @returns {Object}
 */
const parseNaturalLanguageRequest = (text) => {
  // This is a simple rule-based parser
  // In production, you would integrate with an LLM API
  
  const result = {
    date: null,
    timePreference: null,
    visitType: 'First Consultation'
  };

  const textLower = text.toLowerCase();

  // Parse date preferences
  if (textLower.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = tomorrow;
  } else if (textLower.includes('today')) {
    result.date = new Date();
  } else if (textLower.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    result.date = nextWeek;
  }

  // Parse time preferences
  if (textLower.includes('morning')) {
    result.timePreference = { start: '09:00', end: '12:00' };
  } else if (textLower.includes('afternoon')) {
    result.timePreference = { start: '14:00', end: '17:00' };
  } else if (textLower.includes('evening')) {
    result.timePreference = { start: '17:00', end: '20:00' };
  }

  // Parse visit type
  if (textLower.includes('follow') || textLower.includes('follow-up')) {
    result.visitType = 'Follow-up';
  } else if (textLower.includes('emergency') || textLower.includes('urgent')) {
    result.visitType = 'Emergency';
  } else if (textLower.includes('checkup') || textLower.includes('check-up') || textLower.includes('routine')) {
    result.visitType = 'Routine Checkup';
  }

  return result;
};

module.exports = {
  bookSmartAppointment,
  cancelAppointment,
  rescheduleAppointment,
  markAsNoShow,
  completeAppointment,
  checkInPatient,
  getSmartSuggestions,
  getDailySchedule,
  parseNaturalLanguageRequest
};
