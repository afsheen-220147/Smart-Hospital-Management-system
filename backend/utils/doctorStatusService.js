/**
 * Doctor Status Service (Backend)
 * Handles auto off-duty detection and status management
 * 
 * File: backend/utils/doctorStatusService.js
 */

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const moment = require('moment-timezone');

const IST = 'Asia/Kolkata';

/**
 * Get session from time slot
 * @param {string} timeSlot - e.g., "10:30 AM"
 * @returns {string} - 'morning', 'afternoon', or 'evening'
 */
const getSessionFromTimeSlot = (timeSlot) => {
  if (!timeSlot) return 'morning';

  let hour = parseInt(timeSlot.split(':')[0]);
  const isPM = timeSlot.toLowerCase().includes('pm');

  let militaryHour = hour;
  if (isPM && hour !== 12) militaryHour = hour + 12;
  if (!isPM && hour === 12) militaryHour = 0;

  if (militaryHour >= 9 && militaryHour < 12) return 'morning';
  if (militaryHour >= 13 && militaryHour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Get current session in IST
 * @returns {string} - 'morning', 'afternoon', or 'evening'
 */
const getCurrentSession = () => {
  const now = moment().tz(IST);
  const hour = now.hour();

  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 13 && hour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Get current time in IST
 * @returns {moment} - Current moment in IST
 */
const getCurrentTimeIST = () => {
  return moment().tz(IST);
};

/**
 * Check if doctor should be automatically marked off-duty
 * 
 * Rules:
 * 1. Current time > 6:00 PM IST
 * 2. No appointments in next 2 hours
 * 3. All appointments completed for today
 * 
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<{shouldBeOffDuty: boolean, reason: string}>}
 */
const checkDoctorOffDutyStatus = async (doctorId) => {
  try {
    const now = getCurrentTimeIST();
    const currentHour = now.hour();

    // Rule 1: After 6 PM IST - Always off-duty
    if (currentHour >= 18) {
      return {
        shouldBeOffDuty: true,
        reason: 'After working hours (≥ 6:00 PM IST)'
      };
    }

    // Get today's date range in IST
    const todayStart = now.clone().startOf('day');
    const todayEnd = now.clone().endOf('day');

    // Rule 2 & 3: Check appointments
    const todayAppointments = await Appointment.find({
      doctor: doctorId,
      date: {
        $gte: todayStart.toDate(),
        $lte: todayEnd.toDate()
      },
      status: { $in: ['pending', 'confirmed', 'scheduled', 'in-progress'] }
    }).sort({ date: 1 });

    // No upcoming appointments
    if (todayAppointments.length === 0) {
      return {
        shouldBeOffDuty: true,
        reason: 'No appointments scheduled for today'
      };
    }

    // Check if all remaining appointments are too far in future (> 2 hours)
    const nextAppt = todayAppointments[0];
    const apptTime = moment(nextAppt.date).tz(IST);
    
    // Parse time slot
    const [hours, minutes] = nextAppt.timeSlot
      .replace(/am|pm/i, '')
      .trim()
      .split(':')
      .map(Number);
    
    const isPM = nextAppt.timeSlot.toLowerCase().includes('pm');
    let militaryHour = hours;
    if (isPM && hours !== 12) militaryHour = hours + 12;
    if (!isPM && hours === 12) militaryHour = 0;

    apptTime.hour(militaryHour).minute(minutes);

    // If next appointment is more than 2 hours away, consider off-duty
    const minutesUntilAppt = apptTime.diff(now, 'minutes');
    if (minutesUntilAppt > 120) {
      return {
        shouldBeOffDuty: true,
        reason: 'No appointments in next 2 hours'
      };
    }

    // Doctor is on-duty
    return {
      shouldBeOffDuty: false,
      reason: 'Has upcoming appointments'
    };
  } catch (err) {
    console.error('Error checking doctor off-duty status:', err);
    return {
      shouldBeOffDuty: false,
      reason: 'Error checking status'
    };
  }
};

/**
 * Update doctor availability status
 * Should be called every minute or on appointment changes
 * 
 * @param {string} doctorId  
 * @returns {Promise<string>} - 'on-duty' or 'off-duty'
 */
const updateDoctorStatus = async (doctorId) => {
  try {
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      console.warn(`Doctor ${doctorId} not found`);
      return null;
    }

    const { shouldBeOffDuty, reason } = await checkDoctorOffDutyStatus(doctorId);

    const newStatus = shouldBeOffDuty ? 'off-duty' : 'on-duty';

    // Only update if status changed
    if (doctor.availabilityStatus !== newStatus) {
      doctor.availabilityStatus = newStatus;
      doctor.lastStatusChange = new Date();
      doctor.statusReason = reason;
      await doctor.save();

      console.log(`✅ Doctor ${doctor._id} status updated to: ${newStatus} (${reason})`);
    }

    return newStatus;
  } catch (err) {
    console.error('Error updating doctor status:', err);
    return null;
  }
};

/**
 * Batch update all doctors' status
 * Run periodically (e.g., every 5 minutes via cron job)
 * 
 * @returns {Promise<object>} - Summary of updates
 */
const updateAllDoctorsStatus = async () => {
  try {
    const doctors = await Doctor.find({ active: true });
    
    const results = {
      total: doctors.length,
      updated: 0,
      errors: 0
    };

    for (const doctor of doctors) {
      try {
        const newStatus = await updateDoctorStatus(doctor._id);
        if (newStatus) results.updated++;
      } catch (err) {
        console.error(`Error updating doctor ${doctor._id}:`, err);
        results.errors++;
      }
    }

    console.log(`📊 Batch status update completed:`, results);
    return results;
  } catch (err) {
    console.error('Error in batch doctor status update:', err);
    return { total: 0, updated: 0, errors: 0 };
  }
};

/**
 * Get doctor's current session
 * @param {string} doctorId
 * @returns {Promise<string>} - 'morning', 'afternoon', or 'evening'
 */
const getDoctorCurrentSession = async (doctorId) => {
  try {
    const nextAppt = await Appointment.findOne({
      doctor: doctorId,
      status: { $in: ['pending', 'confirmed', 'in-progress'] }
    }).sort({ date: 1 });

    if (!nextAppt) {
      return getCurrentSession();
    }

    return getSessionFromTimeSlot(nextAppt.timeSlot);
  } catch (err) {
    console.error('Error getting doctor session:', err);
    return getCurrentSession();
  }
};

/**
 * Get doctor's last appointment end time
 * @param {string} doctorId
 * @returns {Promise<{endTime: Date, timeSlot: string}>}
 */
const getDoctorLastAppointmentEndTime = async (doctorId) => {
  try {
    const today = getCurrentTimeIST().clone().startOf('day');
    const yesterday = today.clone().subtract(1, 'day');

    // Get last appointment from today or yesterday
    const lastAppt = await Appointment.findOne({
      doctor: doctorId,
      date: {
        $gte: yesterday.toDate(),
        $lte: today.clone().endOf('day').toDate()
      }
    }).sort({ date: -1, timeSlot: -1 });

    if (!lastAppt) return null;

    // Parse end time
    const apptTime = moment(lastAppt.date).tz(IST);
    const [hours, minutes] = lastAppt.timeSlot
      .replace(/am|pm/i, '')
      .trim()
      .split(':')
      .map(Number);

    const isPM = lastAppt.timeSlot.toLowerCase().includes('pm');
    let militaryHour = hours;
    if (isPM && hours !== 12) militaryHour = hours + 12;
    if (!isPM && hours === 12) militaryHour = 0;

    apptTime.hour(militaryHour).minute(minutes).add(lastAppt.duration || 30, 'minutes');

    return {
      endTime: apptTime.toDate(),
      timeSlot: lastAppt.timeSlot,
      duration: lastAppt.duration || 30
    };
  } catch (err) {
    console.error('Error getting last appointment:', err);
    return null;
  }
};

module.exports = {
  getSessionFromTimeSlot,
  getCurrentSession,
  getCurrentTimeIST,
  checkDoctorOffDutyStatus,
  updateDoctorStatus,
  updateAllDoctorsStatus,
  getDoctorCurrentSession,
  getDoctorLastAppointmentEndTime
};
