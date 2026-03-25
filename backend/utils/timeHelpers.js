/**
 * Time Comparison Utilities for Medical Appointment Booking
 * 
 * Handles precise time calculations for detecting overlaps and conflicts
 * in healthcare scheduling systems (IST timezone aware)
 */

/**
 * Convert time string (e.g., "02:30 PM") to minutes since midnight
 * Handles both 12-hour format with AM/PM
 * 
 * @param {string} timeStr - Time in format "HH:MM AM/PM" (e.g., "02:30 PM", "09:00 AM")
 * @returns {number} Total minutes since midnight (0-1439)
 * 
 * Examples:
 *   "09:00 AM" → 540 (9*60 + 0)
 *   "02:00 PM" → 840 (14*60 + 0)
 *   "12:00 AM" → 0 (midnight)
 *   "12:00 PM" → 720 (noon)
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;

  const [time, period] = timeStr.split(' ');
  if (!time || !period) return 0;

  let [hours, minutes] = time.split(':').map(Number);

  // Handle 12-hour format edge cases
  if (period === 'PM' && hours !== 12) {
    hours += 12;  // 2:00 PM → 14:00
  } else if (period === 'AM' && hours === 12) {
    hours = 0;    // 12:00 AM → 00:00 (midnight)
  }

  return (hours * 60) + minutes;
};

/**
 * Check if two time intervals overlap
 * Intervals overlap if one starts before the other ends
 * 
 * @param {string} slot1Start - Start time of interval 1 (e.g., "02:00 PM")
 * @param {string} slot1End - End time of interval 1 (e.g., "02:30 PM")
 * @param {string} slot2Start - Start time of interval 2
 * @param {string} slot2End - End time of interval 2
 * @returns {boolean} True if intervals overlap, false otherwise
 * 
 * Examples:
 *   2:00 PM - 2:30 PM overlaps with 2:15 PM - 2:45 PM → true
 *   2:00 PM - 2:30 PM doesn't overlap with 2:30 PM - 3:00 PM → false
 *   2:00 PM - 2:30 PM overlaps with 2:00 PM - 2:30 PM → true
 */
const doTimesOverlap = (slot1Start, slot1End, slot2Start, slot2End) => {
  const s1Start = timeToMinutes(slot1Start);
  const s1End = timeToMinutes(slot1End);
  const s2Start = timeToMinutes(slot2Start);
  const s2End = timeToMinutes(slot2End);

  // Two intervals [s1Start, s1End) and [s2Start, s2End) overlap if:
  // s1Start < s2End AND s2Start < s1End
  // This is the standard interval overlap formula
  return s1Start < s2End && s2Start < s1End;
};

/**
 * Check if a time slot is within doctor's working hours
 * Doctor's working hours: 9:00 AM - 12:00 PM, 1:00 PM - 5:00 PM
 * 
 * @param {string} timeStr - Time to check (e.g., "02:30 PM")
 * @returns {boolean} True if time is within working hours, false otherwise
 */
const isWithinWorkingHours = (timeStr) => {
  const minutes = timeToMinutes(timeStr);

  // Morning: 9 AM (540 min) to 12 PM (720 min)
  const morningStart = 9 * 60;     // 540
  const morningEnd = 12 * 60;      // 720

  // Afternoon: 1 PM (780 min) to 5 PM (1020 min)
  const afternoonStart = 13 * 60;  // 780
  const afternoonEnd = 17 * 60;    // 1020

  return (
    (minutes >= morningStart && minutes < morningEnd) ||
    (minutes >= afternoonStart && minutes < afternoonEnd)
  );
};

/**
 * Format minutes back to time string (opposite of timeToMinutes)
 * 
 * @param {number} minutes - Total minutes since midnight
 * @returns {string} Time in format "HH:MM AM/PM" (e.g., "02:30 PM")
 */
const minutesToTime = (minutes) => {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours > 12) {
    hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
};

/**
 * Calculate appointment end time given start time and duration
 * 
 * @param {string} startTime - Start time (e.g., "02:00 PM")
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} End time in format "HH:MM AM/PM"
 */
const calculateEndTime = (startTime, durationMinutes) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  
  // Handle day wrap-around (shouldn't happen in our context but safety first)
  const normalizedEnd = endMinutes >= 1440 ? endMinutes - 1440 : endMinutes;
  
  return minutesToTime(normalizedEnd);
};

/**
 * Get time in IST (India Standard Time) as minutes since midnight
 * Used for current time comparisons
 * 
 * @returns {number} Current time in minutes since midnight
 */
const getCurrentTimeInMinutes = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata'
  }));

  return (istTime.getHours() * 60) + istTime.getMinutes();
};

/**
 * Check if a given time has already passed today (IST timezone)
 * Only returns true for today; past dates return false
 * 
 * @param {string} timeStr - Time to check (e.g., "02:00 PM")
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} todayStr - Today's date in YYYY-MM-DD format (optional, auto-detected if not provided)
 * @returns {boolean} True if time has passed today
 */
const hasTimePassed = (timeStr, dateStr, todayStr = null) => {
  // If no today provided, calculate it
  if (!todayStr) {
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata'
    }));
    todayStr = istDate.toISOString().split('T')[0];
  }

  // Only check time if it's today
  if (dateStr !== todayStr) {
    return false;
  }

  const currentMinutes = getCurrentTimeInMinutes();
  const timeMinutes = timeToMinutes(timeStr);

  return timeMinutes <= currentMinutes;
};

module.exports = {
  timeToMinutes,
  doTimesOverlap,
  isWithinWorkingHours,
  minutesToTime,
  calculateEndTime,
  getCurrentTimeInMinutes,
  hasTimePassed
};
