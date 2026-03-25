/**
 * Hospital Session Management (IST Timezone)
 * Used for Doctor Dashboard and Diagnosis Access Control
 */

/**
 * Session Types
 */
export const SESSION_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  OFF_HOURS: 'off-hours'
};

/**
 * Session Configuration (IST)
 */
export const SESSION_CONFIG = {
  morning: {
    start: '06:00', // 6:00 AM IST
    end: '12:00',   // 12:00 PM IST
    label: '🟡 Morning',
    color: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200'
  },
  afternoon: {
    start: '12:00', // 12:00 PM IST
    end: '18:00',   // 6:00 PM IST
    label: '🔵 Afternoon',
    color: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'off-hours': {
    start: '18:00', // 6:00 PM IST
    end: '06:00',   // 6:00 AM next day IST
    label: '⚫ Off Hours',
    color: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  }
};

/**
 * Get current time in IST (Indian Standard Time)
 * @returns {Date} Current time in IST
 */
export const getCurrentTimeIST = () => {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata'
    })
  );
};

/**
 * Get current date in IST
 * @returns {string} Date in YYYY-MM-DD format (IST)
 */
export const getTodayIST = () => {
  const istDate = getCurrentTimeIST();
  return istDate.toISOString().split('T')[0];
};

/**
 * Get current session based on IST time
 * @returns {string} 'morning' | 'afternoon' | 'off-hours'
 */
export const getCurrentSession = () => {
  const istTime = getCurrentTimeIST();
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const morningStart = 6 * 60; // 360 minutes (6:00 AM)
  const afternoonStart = 12 * 60; // 720 minutes (12:00 PM)
  const eveningStart = 18 * 60; // 1080 minutes (6:00 PM)

  if (currentMinutes >= morningStart && currentMinutes < afternoonStart) {
    return SESSION_TYPES.MORNING;
  }
  if (currentMinutes >= afternoonStart && currentMinutes < eveningStart) {
    return SESSION_TYPES.AFTERNOON;
  }
  return SESSION_TYPES.OFF_HOURS;
};

/**
 * Detect appointment session based on time slot
 * @param {string} timeSlot - Time in format "HH:MM AM/PM" or "HH:MM"
 * @returns {string} 'morning' | 'afternoon' | 'off-hours'
 */
export const getAppointmentSession = (timeSlot) => {
  if (!timeSlot) return SESSION_TYPES.MORNING;

  // Parse time slot (e.g., "10:30 AM" or "14:30")
  let timeStr = timeSlot.toUpperCase();
  let [time, period] = timeStr.includes(' ')
    ? timeStr.split(' ')
    : [timeStr, null];

  let [hours, minutes] = time.split(':').map(Number);

  // Convert to 24-hour format if needed
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const timeInMinutes = hours * 60 + (minutes || 0);

  const morningStart = 6 * 60; // 6:00 AM
  const afternoonStart = 12 * 60; // 12:00 PM
  const eveningStart = 18 * 60; // 6:00 PM

  if (timeInMinutes >= morningStart && timeInMinutes < afternoonStart) {
    return SESSION_TYPES.MORNING;
  }
  if (timeInMinutes >= afternoonStart && timeInMinutes < eveningStart) {
    return SESSION_TYPES.AFTERNOON;
  }
  return SESSION_TYPES.OFF_HOURS;
};

/**
 * Check if appointment is for today (IST)
 * @param {string|Date} appointmentDate - Appointment date
 * @returns {boolean}
 */
export const isAppointmentToday = (appointmentDate) => {
  if (!appointmentDate) return false;
  
  const today = getTodayIST();
  const apptDate = new Date(appointmentDate)
    .toISOString()
    .split('T')[0];

  return today === apptDate;
};

/**
 * Check if doctor can diagnose patient (Session & Date based)
 * @param {object} appointment - Appointment object
 * @param {boolean} strict - If true, enforce session matching
 * @returns {object} { allowed: boolean, reason: string }
 */
export const canDiagnosePatient = (appointment, strict = true) => {
  if (!appointment) {
    return { allowed: false, reason: 'Appointment not found' };
  }

  // Rule 1: Only valid statuses
  if (!['pending', 'confirmed', 'in-progress'].includes(appointment.status)) {
    return {
      allowed: false,
      reason: `Cannot diagnose: appointment status is "${appointment.status}"`
    };
  }

  // Rule 2: Must be today
  if (!isAppointmentToday(appointment.date)) {
    return {
      allowed: false,
      reason: 'You can only diagnose patients assigned to today'
    };
  }

  // Rule 3: Must be current session (if strict mode)
  if (strict) {
    const currentSession = getCurrentSession();
    const appointmentSession = appointment.session || getAppointmentSession(appointment.timeSlot);

    if (currentSession === SESSION_TYPES.OFF_HOURS) {
      return {
        allowed: false,
        reason: 'Doctor is currently off duty (after work hours)'
      };
    }

    if (appointmentSession !== currentSession) {
      const sessionName = appointmentSession === SESSION_TYPES.MORNING ? 'Morning' : 'Afternoon';
      return {
        allowed: false,
        reason: `You can only diagnose patients assigned to your current session. This is a ${sessionName} appointment.`
      };
    }
  }

  return { allowed: true };
};

/**
 * Get doctor on-duty status
 * @param {Array} todayAppointments - Array of today's appointments
 * @returns {object} { onDuty: boolean, reason: string, nextOffDutyTime: string }
 */
export const calculateDoctorDutyStatus = (todayAppointments = []) => {
  const currentSession = getCurrentSession();
  const istTime = getCurrentTimeIST();
  const currentHours = istTime.getHours();

  // Check if past work hours
  if (currentSession === SESSION_TYPES.OFF_HOURS) {
    return {
      onDuty: false,
      reason: 'Off duty - Outside working hours (6:00 AM - 6:00 PM)',
      nextWorkStartTime: '6:00 AM IST tomorrow'
    };
  }

  // Check if last appointment is passed
  if (todayAppointments.length > 0) {
    const lastAppointment = todayAppointments[todayAppointments.length - 1];
    const lastTime = parseTimeToMinutes(lastAppointment.timeSlot);
    const lastEndTime = lastTime + 30; // Assume 30 min per appointment
    const currentMinutes = currentHours * 60 + istTime.getMinutes();

    if (currentMinutes > lastEndTime + 30 && currentHours >= 18) {
      // 30 minutes after last appointment and past 6 PM
      return {
        onDuty: false,
        reason: 'Off duty - All appointments completed',
        nextWorkStartTime: '6:00 AM IST tomorrow'
      };
    }
  }

  return {
    onDuty: true,
    reason: 'On duty - Working hours',
    nextOffDutyTime: currentSession === SESSION_TYPES.MORNING
      ? '12:00 PM IST'
      : '6:00 PM IST'
  };
};

/**
 * Helper: Parse time string to minutes since midnight
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const timeOnly = timeStr.replace(/ AM| PM| am| pm/g, '').trim();
  let [hours, minutes] = timeOnly.split(':').map(Number);
  if (timeStr.toLowerCase().includes('pm') && hours !== 12) hours += 12;
  if (timeStr.toLowerCase().includes('am') && hours === 12) hours = 0;
  return hours * 60 + (minutes || 0);
};

/**
 * Format appointment with session info
 * @param {object} appointment - Raw appointment
 * @returns {object} Appointment with session metadata
 */
export const enrichAppointmentWithSession = (appointment) => {
  const session = appointment.session || getAppointmentSession(appointment.timeSlot);
  const config = SESSION_CONFIG[session];

  return {
    ...appointment,
    session,
    sessionLabel: config.label,
    sessionColor: config.color,
    sessionTextColor: config.textColor,
    sessionBorderColor: config.borderColor,
    isToday: isAppointmentToday(appointment.date),
    canDiagnose: canDiagnosePatient(appointment).allowed
  };
};

/**
 * Get session display info
 * @param {string} session - Session type
 * @returns {object} Display configuration
 */
export const getSessionDisplay = (session) => {
  return SESSION_CONFIG[session] || SESSION_CONFIG['off-hours'];
};
