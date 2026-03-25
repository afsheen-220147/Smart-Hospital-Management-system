/**
 * Backend Session Management Utility (Node.js)
 * Used for Doctor Dashboard and Diagnosis Access Control
 * Timezone: Asia/Kolkata (IST - Indian Standard Time)
 */

const moment = require('moment-timezone');

/**
 * Session Types (Enum-like)
 */
const SESSION_TYPES = {
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON',
  OFF_HOURS: 'OFF_HOURS'
};

/**
 * Session Configuration
 */
const SESSION_CONFIG = {
  MORNING: {
    startHour: 6,    // 6:00 AM IST
    endHour: 12,     // 12:00 PM IST
    label: 'Morning Session'
  },
  AFTERNOON: {
    startHour: 12,   // 12:00 PM IST
    endHour: 18,     // 6:00 PM IST
    label: 'Afternoon Session'
  },
  OFF_HOURS: {
    startHour: 18,   // 6:00 PM IST
    endHour: 6,      // 6:00 AM next day IST
    label: 'Off Hours'
  }
};

/**
 * Get current time in IST
 * @returns {moment.Moment} Current time in Asia/Kolkata timezone
 */
const getCurrentTimeIST = () => {
  return moment().tz('Asia/Kolkata');
};

/**
 * Get current date in IST (YYYY-MM-DD format)
 * @returns {string} Today's date in IST
 */
const getTodayIST = () => {
  return getCurrentTimeIST().format('YYYY-MM-DD');
};

/**
 * Get current session based on IST time
 * @returns {string} 'MORNING' | 'AFTERNOON' | 'OFF_HOURS'
 */
const getCurrentSession = () => {
  const nowIST = getCurrentTimeIST();
  const hour = nowIST.hour();

  if (hour >= 6 && hour < 12) {
    return SESSION_TYPES.MORNING;
  }
  if (hour >= 12 && hour < 18) {
    return SESSION_TYPES.AFTERNOON;
  }
  return SESSION_TYPES.OFF_HOURS;
};

/**
 * Detect appointment session based on time
 * @param {string|moment.Moment} time - Time in HH:MM or HH:MM AM/PM format
 * @returns {string} 'MORNING' | 'AFTERNOON' | 'OFF_HOURS'
 */
const getAppointmentSession = (appointmentTime) => {
  if (!appointmentTime) return SESSION_TYPES.MORNING;

  let timeStr = appointmentTime.toString().toUpperCase();
  let hour = 0;

  // Parse "10:30 AM" or "14:30" format
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const parts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (parts) {
      hour = parseInt(parts[1]);
      const period = parts[3].toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
    }
  } else {
    hour = parseInt(timeStr.split(':')[0]);
  }

  if (hour >= 6 && hour < 12) {
    return SESSION_TYPES.MORNING;
  }
  if (hour >= 12 && hour < 18) {
    return SESSION_TYPES.AFTERNOON;
  }
  return SESSION_TYPES.OFF_HOURS;
};

/**
 * Check if date is today (IST)
 * @param {string|Date} appointmentDate - Appointment date
 * @returns {boolean}
 */
const isAppointmentToday = (appointmentDate) => {
  if (!appointmentDate) return false;

  const appointmentDateIST = moment(appointmentDate).tz('Asia/Kolkata').format('YYYY-MM-DD');
  const todayIST = getTodayIST();

  return appointmentDateIST === todayIST;
};

/**
 * STRICT VALIDATION: Doctor can only diagnose patients in current session & today
 * Used on diagnosis access endpoint
 * @param {object} appointment - Appointment object {date, timeSlot, status, session}
 * @param {string} currentSession - Current session (from backend getCurrentSession())
 * @returns {object} { allowed: boolean, reason: string, code: string }
 */
const validateDiagnosisAccess = (appointment, currentSession) => {
  if (!appointment) {
    return {
      allowed: false,
      reason: 'Appointment not found',
      code: 'APPOINTMENT_NOT_FOUND'
    };
  }

  // Rule 1: Appointment must be today
  if (!isAppointmentToday(appointment.date)) {
    return {
      allowed: false,
      reason: 'You can only diagnose patients scheduled for today',
      code: 'NOT_TODAY_APPOINTMENT'
    };
  }

  // Rule 2: Status must be valid for diagnosis
  const validStatuses = ['pending', 'confirmed', 'in-progress'];
  if (!validStatuses.includes(appointment.status)) {
    return {
      allowed: false,
      reason: `Appointment status is ${appointment.status}. Only scheduled/ongoing appointments can be diagnosed.`,
      code: 'INVALID_STATUS'
    };
  }

  // Rule 3: CRITICAL - Must be current session (strict enforcement)
  if (currentSession === SESSION_TYPES.OFF_HOURS) {
    return {
      allowed: false,
      reason: 'Cannot diagnose patients outside working hours (6 AM - 6 PM IST)',
      code: 'OUTSIDE_WORKING_HOURS'
    };
  }

  const appointmentSession = appointment.session || getAppointmentSession(appointment.timeSlot);

  if (appointmentSession !== currentSession) {
    const sessionName = appointmentSession === SESSION_TYPES.MORNING ? 'Morning' : 'Afternoon';
    const currentSessionName = currentSession === SESSION_TYPES.MORNING ? 'Morning' : 'Afternoon';

    return {
      allowed: false,
      reason: `Session mismatch. This is a ${sessionName} appointment. You are currently in ${currentSessionName} session.`,
      code: 'WRONG_SESSION'
    };
  }

  return {
    allowed: true,
    reason: 'Doctor can diagnose this patient',
    code: 'ALLOWED'
  };
};

/**
 * Calculate doctor duty status
 * @param {array} todayAppointments - Array of today's appointments
 * @returns {object} { onDuty: boolean, reason: string }
 */
const calculateDoctorDutyStatus = (todayAppointments = []) => {
  const currentSession = getCurrentSession();

  // Off-duty if outside working hours
  if (currentSession === SESSION_TYPES.OFF_HOURS) {
    return {
      onDuty: false,
      reason: 'Off duty - Outside working hours (6 AM - 6 PM IST)'
    };
  }

  // Otherwise on duty during working hours
  return {
    onDuty: true,
    reason: `On duty - ${currentSession === SESSION_TYPES.MORNING ? 'Morning' : 'Afternoon'} session active`
  };
};

/**
 * Format appointment response with session info (for API responses)
 * @param {object} appointment - Raw appointment object
 * @returns {object} Appointment with session metadata
 */
const enrichAppointmentWithSession = (appointment) => {
  const session = appointment.session || getAppointmentSession(appointment.timeSlot);

  return {
    ...appointment,
    session,
    isToday: isAppointmentToday(appointment.date),
    canDiagnose: validateDiagnosisAccess(appointment, getCurrentSession()).allowed
  };
};

/**
 * Middleware to enforce session-based access on /diagnosis endpoint
 * Usage: app.post('/doctor/diagnosis/:appointmentId/start', validateSessionMiddleware, handler)
 */
const validateSessionMiddleware = (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user?._id || req.user?.id;

    // You'll fetch appointment from DB
    // const appointment = await Appointment.findById(appointmentId);
    
    // Validate session access
    const currentSession = getCurrentSession();
    const validation = validateDiagnosisAccess(req.appointment, currentSession); // req.appointment pre-fetched

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.reason,
        code: validation.code,
        currentSession,
        appointmentSession: req.appointment?.session
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Session validation error',
      error: error.message
    });
  }
};

module.exports = {
  SESSION_TYPES,
  SESSION_CONFIG,
  getCurrentTimeIST,
  getTodayIST,
  getCurrentSession,
  getAppointmentSession,
  isAppointmentToday,
  validateDiagnosisAccess,
  calculateDoctorDutyStatus,
  enrichAppointmentWithSession,
  validateSessionMiddleware
};
