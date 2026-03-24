const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const notificationService = require('./notificationService');

/**
 * applyDelayAdjustment
 * Shifts estimated times for all remaining appointments on a specific date for a doctor.
 * Updates the doctor's delayFactor and triggers delay notifications.
 */
exports.applyDelayAdjustment = async (doctorId, date, delayMinutes) => {
  // 1. Update doctor's delay factor (using EMA or simple cumulative)
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new Error('Doctor not found');

  // Simple Exponential Moving Average (EMA) update for delayFactor
  const alpha = 0.3;
  doctor.delayFactor = (1 - alpha) * (doctor.delayFactor || 0) + alpha * delayMinutes;
  await doctor.save();

  // 2. Find all pending/confirmed appointments for today that haven't started
  const startOfDay = new Date(date).setHours(0, 0, 0, 0);
  const endOfDay = new Date(date).setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    doctor: doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
    actualStartTime: { $exists: false } // Only those that haven't started
  });

  // 3. Shift estimated times
  const updates = [];
  for (const appt of appointments) {
    if (appt.estimatedStartTime) {
      appt.estimatedStartTime = new Date(appt.estimatedStartTime.getTime() + delayMinutes * 60000);
    }
    if (appt.estimatedEndTime) {
      appt.estimatedEndTime = new Date(appt.estimatedEndTime.getTime() + delayMinutes * 60000);
    }
    await appt.save();
    updates.push(appt);
  }

  // 4. Trigger bulk notifications (fire and forget)
  notificationService.sendDelayNotification(doctorId, date, delayMinutes).catch(err => {
    console.error('Error sending bulk delay notifications:', err);
  });

  return {
    affectedAppointments: updates.length,
    updatedDelayFactor: doctor.delayFactor,
    updates: updates.map(u => ({ id: u._id, newEstimatedTime: u.estimatedStartTime }))
  };
};

/**
 * getSessionStatus
 * Returns live capacity metrics for a specific session.
 */
exports.getSessionStatus = async (doctorId, date, sessionName = 'morning') => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new Error('Doctor not found');

  const startOfDay = new Date(date).setHours(0, 0, 0, 0);
  const endOfDay = new Date(date).setHours(23, 59, 59, 999);

  // Get total capacity (effective slots)
  // This usually comes from availabilityService or a similar calculation
  // For now, we'll use a placeholder or derive from session templates
  const sessionTemplate = doctor.sessionTemplates?.find(s => s.name === sessionName) || { name: sessionName, maxPatients: 15 };
  
  const filledSlots = await Appointment.countDocuments({
    doctor: doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    session: sessionName,
    status: { $in: ['pending', 'confirmed', 'in-progress', 'completed'] }
  });

  const remaining = Math.max(0, sessionTemplate.maxPatients - filledSlots);
  const overloaded = remaining <= 0 || (doctor.delayFactor > 30);

  return {
    session: sessionName,
    effectiveSlots: sessionTemplate.maxPatients,
    filled: filledSlots,
    remaining,
    overloaded,
    delayFactor: doctor.delayFactor || 0,
    closureReason: overloaded ? (remaining <= 0 ? 'Session capacity reached' : 'Excessive clinical delay (>30 min)') : null
  };
};

/**
 * detectOverload
 * Global check for a doctor across all sessions for a day.
 */
exports.detectOverload = async (doctorId, date) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new Error('Doctor not found');

  const morning = await this.getSessionStatus(doctorId, date, 'morning');
  const afternoon = await this.getSessionStatus(doctorId, date, 'afternoon');

  const allOverloaded = morning.overloaded && afternoon.overloaded;
  let reason = null;

  if (allOverloaded) {
    reason = "Today's appointments are closed. Please book for the next available day.";
  } else if (morning.overloaded && afternoon.overloaded === false) {
    reason = "Morning session is closed, but afternoon slots may be available.";
  }

  return {
    overloaded: allOverloaded,
    reason,
    sessionStatuses: [morning, afternoon],
    delayFactor: doctor.delayFactor || 0
  };
};
