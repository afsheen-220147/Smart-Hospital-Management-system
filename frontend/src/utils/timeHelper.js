/**
 * Time Helper Utilities (Frontend)
 * Handles all IST time conversions and session detection
 * 
 * File: frontend/src/utils/timeHelper.js
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get session from time string
 * @param {string} timeString - e.g., "10:30 AM", "14:00"
 * @returns {string} - 'morning', 'afternoon', or 'evening'
 */
export const getSessionFromTime = (timeString) => {
  if (!timeString) return 'morning';
  
  let hour = 0;
  
  // Parse time string
  if (timeString.includes(':')) {
    const [h] = timeString.split(':').map(Number);
    hour = h;
  } else {
    hour = parseInt(timeString);
  }

  const isPM = timeString.toLowerCase().includes('pm') || hour >= 12;
  
  // Convert to 24-hour format
  let militaryHour = hour;
  if (isPM && hour !== 12) {
    militaryHour = hour + 12;
  } else if (!isPM && hour === 12) {
    militaryHour = 0;
  }

  // Session determination
  if (militaryHour >= 9 && militaryHour < 12) return 'morning';
  if (militaryHour >= 13 && militaryHour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Get current session in IST
 * @returns {string} - 'morning', 'afternoon', or 'evening'
 */
export const getCurrentSession = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  const hour = istTime.getHours();

  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 13 && hour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Get current time in IST
 * @returns {Date} - Current time in IST
 */
export const getCurrentTimeIST = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
};

/**
 * Check if appointment is today
 * @param {Date|string} appointmentDate
 * @returns {boolean}
 */
export const isToday = (appointmentDate) => {
  const today = new Date();
  const todayIST = new Date(today.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  
  const apptDate = new Date(appointmentDate);
  const apptDateIST = new Date(apptDate.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));

  return (
    todayIST.getFullYear() === apptDateIST.getFullYear() &&
    todayIST.getMonth() === apptDateIST.getMonth() &&
    todayIST.getDate() === apptDateIST.getDate()
  );
};

/**
 * Check if appointment is in current session
 * @param {Date|string} appointmentDate
 * @param {string} sessionType - 'morning' or 'afternoon'
 * @returns {boolean}
 */
export const isCurrentSession = (appointmentDate, sessionType) => {
  if (!isToday(appointmentDate)) return false;
  return getCurrentSession() === sessionType;
};

/**
 * Format time for display (IST)
 * @param {Date|string} date
 * @returns {string} - e.g., "HH:MM AM/PM"
 */
export const formatTimeIST = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for display (IST)
 * @param {Date|string} date
 * @returns {string} - e.g., "Jan 15, 2024"
 */
export const formatDateIST = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time together
 * @param {Date|string} date
 * @returns {string}
 */
export const formatDateTimeIST = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get session display name with emoji
 * @param {string} session
 * @returns {string}
 */
export const getSessionBadge = (session) => {
  const badges = {
    'morning': '🟡 Morning (9:00 AM - 12:00 PM)',
    'afternoon': '🔵 Afternoon (1:00 PM - 5:00 PM)',
    'evening': '⚫ After Hours (After 5:00 PM)'
  };
  return badges[session] || badges.morning;
};

/**
 * Parse time slot to minutes since midnight
 * @param {string} timeSlot - e.g., "10:30 AM"
 * @returns {number}
 */
export const parseTimeToMinutes = (timeSlot) => {
  if (!timeSlot) return 0;
  
  const timeOnly = timeSlot.replace(/am|pm/i, '').trim();
  const [hours, minutes] = timeOnly.split(':').map(Number);
  const isPM = timeSlot.toLowerCase().includes('pm');
  
  let militaryHour = hours;
  if (isPM && hours !== 12) militaryHour = hours + 12;
  if (!isPM && hours === 12) militaryHour = 0;
  
  return militaryHour * 60 + (minutes || 0);
};

/**
 * Check if doctor should be off-duty
 * Rules: After 6 PM or no appointments remaining
 * @returns {boolean}
 */
export const shouldBeDoctorOffDuty = () => {
  const now = getCurrentTimeIST();
  const hour = now.getHours();
  
  // Off-duty after 6 PM
  if (hour >= 18) return true;
  
  return false;
};

export default {
  getSessionFromTime,
  getCurrentSession,
  getCurrentTimeIST,
  isToday,
  isCurrentSession,
  formatTimeIST,
  formatDateIST,
  formatDateTimeIST,
  getSessionBadge,
  parseTimeToMinutes,
  shouldBeDoctorOffDuty
};
