/**
 * Waitlist Service
 * Manages the appointment waitlist and automatic slot allocation
 */

const Waitlist = require('../models/Waitlist');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const notificationService = require('./notificationService');
const availabilityService = require('./availabilityService');

/**
 * Add a patient to the waitlist
 * @param {Object} params 
 * @returns {Promise<Object>}
 */
const addToWaitlist = async (params) => {
  const {
    patientId,
    doctorId,
    requestedDate,
    alternativeDates = [],
    preferredTimeRange,
    visitType = 'First Consultation',
    reason,
    priority = 1
  } = params;

  // Check if patient is already on waitlist for this doctor and date
  const existing = await Waitlist.findOne({
    patient: patientId,
    doctor: doctorId,
    requestedDate,
    status: 'waiting'
  });

  if (existing) {
    throw new Error('You are already on the waitlist for this date');
  }

  const waitlistEntry = await Waitlist.create({
    patient: patientId,
    doctor: doctorId,
    requestedDate,
    alternativeDates,
    preferredTimeRange,
    visitType,
    reason,
    priority
  });

  // Fire-and-forget: send waitlist confirmation with queue position + probability score
  // (probability may be 0/null if not yet set by adaptiveSchedulingService)
  notificationService.sendWaitlistConfirmation(waitlistEntry._id).catch((err) =>
    console.error('Waitlist confirmation email error:', err.message)
  );

  return waitlistEntry;
};

/**
 * Get waitlist entries for a patient
 * @param {string} patientId 
 * @returns {Promise<Array>}
 */
const getPatientWaitlist = async (patientId) => {
  return await Waitlist.find({
    patient: patientId,
    status: { $in: ['waiting', 'notified'] }
  })
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name' }
    })
    .sort({ requestedDate: 1 });
};

/**
 * Get waitlist entries for a doctor
 * @param {string} doctorId 
 * @param {Date} date - Optional, filter by date
 * @returns {Promise<Array>}
 */
const getDoctorWaitlist = async (doctorId, date = null) => {
  const query = {
    doctor: doctorId,
    status: { $in: ['waiting', 'notified'] }
  };

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query.$or = [
      { requestedDate: { $gte: startOfDay, $lte: endOfDay } },
      { alternativeDates: { $elemMatch: { $gte: startOfDay, $lte: endOfDay } } }
    ];
  }

  return await Waitlist.find(query)
    .populate('patient', 'name email')
    .sort({ priority: -1, createdAt: 1 });
};

/**
 * Cancel a waitlist entry
 * @param {string} waitlistId 
 * @param {string} patientId - For verification
 * @returns {Promise<Object>}
 */
const cancelWaitlistEntry = async (waitlistId, patientId) => {
  const entry = await Waitlist.findOne({
    _id: waitlistId,
    patient: patientId,
    status: { $in: ['waiting', 'notified'] }
  });

  if (!entry) {
    throw new Error('Waitlist entry not found or already processed');
  }

  entry.status = 'cancelled';
  await entry.save();

  return entry;
};

/**
 * Process waitlist when a slot becomes available
 * Called when an appointment is cancelled
 * @param {string} doctorId 
 * @param {Date} date 
 * @param {string} timeSlot 
 * @returns {Promise<Object>}
 */
const processWaitlistForCancellation = async (doctorId, date, timeSlot) => {
  try {
    const doctor = await Doctor.findById(doctorId).populate('user', 'name');
    if (!doctor) return { success: false, reason: 'Doctor not found' };

    // Find the next person in the waitlist queue for this date
    const nextInQueue = await Waitlist.getNextInQueue(doctorId, date);

    if (!nextInQueue) {
      console.log('No one on waitlist for this slot');
      return { success: false, reason: 'No one on waitlist' };
    }

    // Notify the patient
    const patient = await User.findById(nextInQueue.patient);
    if (!patient) {
      return { success: false, reason: 'Patient not found' };
    }

    await notificationService.sendWaitlistNotification(
      patient.email,
      patient.name,
      doctor.user.name,
      date,
      timeSlot,
      nextInQueue.visitType,
      '2 hours'
    );

    // Update waitlist entry status
    nextInQueue.status = 'notified';
    nextInQueue.notifiedAt = new Date();
    await nextInQueue.save();

    console.log(`✅ Notified ${patient.email} about available slot`);

    return {
      success: true,
      notifiedPatient: {
        id: patient._id,
        name: patient.name,
        email: patient.email
      },
      waitlistEntry: nextInQueue
    };
  } catch (error) {
    console.error('Error processing waitlist:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Book an appointment from waitlist
 * @param {string} waitlistId 
 * @param {string} timeSlot 
 * @returns {Promise<Object>}
 */
const bookFromWaitlist = async (waitlistId, timeSlot) => {
  const waitlistEntry = await Waitlist.findById(waitlistId);
  if (!waitlistEntry) {
    throw new Error('Waitlist entry not found');
  }

  if (waitlistEntry.status !== 'notified') {
    throw new Error('You have not been notified of an available slot');
  }

  // Check if slot is still available
  const isAvailable = await availabilityService.checkSlotAvailability(
    waitlistEntry.doctor,
    waitlistEntry.requestedDate,
    timeSlot
  );

  if (!isAvailable.available) {
    throw new Error('Sorry, this slot is no longer available');
  }

  // Get duration for visit type
  const duration = await availabilityService.getDurationForVisitType(
    waitlistEntry.doctor,
    waitlistEntry.visitType
  );

  // Create the appointment
  const appointment = await Appointment.create({
    patient: waitlistEntry.patient,
    doctor: waitlistEntry.doctor,
    date: waitlistEntry.requestedDate,
    timeSlot,
    duration,
    visitType: waitlistEntry.visitType,
    reason: waitlistEntry.reason,
    status: 'confirmed',
    bookedVia: 'waitlist'
  });

  // Update waitlist entry
  waitlistEntry.status = 'booked';
  waitlistEntry.bookedAppointmentId = appointment._id;
  await waitlistEntry.save();

  // Send waitlist promotion email ("Your appointment is confirmed")
  await notificationService.sendWaitlistPromotion(appointment._id);

  return {
    appointment,
    waitlistEntry
  };
};

/**
 * Expire old waitlist entries
 * Should be run by a cron job
 * @returns {Promise<number>} Number of expired entries
 */
const expireOldEntries = async () => {
  const result = await Waitlist.updateMany(
    {
      status: { $in: ['waiting', 'notified'] },
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );

  console.log(`Expired ${result.modifiedCount} waitlist entries`);
  return result.modifiedCount;
};

/**
 * Get waitlist statistics for a doctor
 * @param {string} doctorId 
 * @returns {Promise<Object>}
 */
const getWaitlistStats = async (doctorId) => {
  const waiting = await Waitlist.countDocuments({ doctor: doctorId, status: 'waiting' });
  const notified = await Waitlist.countDocuments({ doctor: doctorId, status: 'notified' });
  const booked = await Waitlist.countDocuments({ doctor: doctorId, status: 'booked' });
  const expired = await Waitlist.countDocuments({ doctor: doctorId, status: 'expired' });

  // Calculate conversion rate
  const totalProcessed = booked + expired;
  const conversionRate = totalProcessed > 0 
    ? ((booked / totalProcessed) * 100).toFixed(1) 
    : 0;

  return {
    waiting,
    notified,
    booked,
    expired,
    conversionRate: `${conversionRate}%`
  };
};

/**
 * Auto-allocate a slot from waitlist (for overbooking scenarios)
 * @param {string} appointmentId - The cancelled/no-show appointment
 * @returns {Promise<Object>}
 */
const autoAllocateSlot = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Original appointment not found');
  }

  return await processWaitlistForCancellation(
    appointment.doctor,
    appointment.date,
    appointment.timeSlot
  );
};

/**
 * FEATURE 3: Promote waitlisted patient to confirmed when slot becomes free
 * Called when an appointment is cancelled or no-show
 * @param {string} doctorId 
 * @param {Date} date 
 * @param {string} timeSlot 
 * @returns {Promise<Object>}
 */
const promoteWaitlistedPatient = async (doctorId, date, timeSlot) => {
  try {
    // Find the next waitlisted appointment for this doctor/date/timeSlot (FIFO - oldest first)
    const waitlistedAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      },
      timeSlot: timeSlot,
      isWaitlisted: true,
      status: 'pending'
    })
    .sort({ createdAt: 1 })
    .populate('patient', 'name email');

    if (!waitlistedAppointment) {
      console.log('No waitlisted patient found for this slot');
      return { success: false, message: 'No waitlisted patient found' };
    }

    // Promote to confirmed status - remove waitlist flag
    waitlistedAppointment.isWaitlisted = false;
    waitlistedAppointment.status = 'confirmed';
    await waitlistedAppointment.save();

    console.log(`✅ Promoted patient ${waitlistedAppointment.patient.name} to confirmed status`);

    // Send notification to patient
    try {
      notificationService.sendWaitlistPromotion(waitlistedAppointment._id).catch((err) =>
        console.error('Notification error:', err.message)
      );
    } catch (err) {
      console.error('Error sending promotion notification:', err);
    }

    return {
      success: true,
      promotedAppointment: waitlistedAppointment,
      patientName: waitlistedAppointment.patient.name,
      patientEmail: waitlistedAppointment.patient.email
    };
  } catch (error) {
    console.error('Error promoting waitlisted patient:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  addToWaitlist,
  getPatientWaitlist,
  getDoctorWaitlist,
  cancelWaitlistEntry,
  processWaitlistForCancellation,
  bookFromWaitlist,
  expireOldEntries,
  getWaitlistStats,
  autoAllocateSlot,
  promoteWaitlistedPatient
};
