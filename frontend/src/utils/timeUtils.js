/**
 * 🏥 Hospital Timing Utilities - IST Timezone Aware
 * Handles all time comparisons, slot filtering, and doctor working hours
 */

// ============================================================================
// 1. IST TIMEZONE HELPERS
// ============================================================================

/**
 * Get current time in IST (Asia/Kolkata)
 * Returns: { hours, minutes, seconds, date, timeString }
 */
export const getCurrentTimeIST = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  return {
    hours: istTime.getHours(),
    minutes: istTime.getMinutes(),
    seconds: istTime.getSeconds(),
    date: istTime,
    timeString: istTime.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

/**
 * Get today's date in IST (YYYY-MM-DD format)
 */
export const getTodayIST = () => {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Check if a date string (YYYY-MM-DD) is today
 */
export const isToday = (dateString) => {
  return dateString === getTodayIST();
};

// ============================================================================
// 2. TIME CONVERSION HELPERS
// ============================================================================

/**
 * Convert 12-hour time string to 24-hour minutes
 * Input: "09:30 AM" or "02:30 PM"
 * Output: 570 (for 09:30) or 870 (for 14:30)
 */
export const timeToMinutes = (timeString) => {
  // Parse time string like "09:30 AM"
  const match = timeString.match(/(\d{1,2}):(\d{2})\s(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'AM' && hours === 12) {
    hours = 0; // 12 AM = 00:00
  } else if (period === 'PM' && hours !== 12) {
    hours += 12; // 1 PM = 13:00
  }

  return hours * 60 + minutes;
};

/**
 * Convert minutes to 12-hour time string
 * Input: 570 or 870
 * Output: "09:30 AM" or "02:30 PM"
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
};

// ============================================================================
// 3. DOCTOR WORKING HOURS
// ============================================================================

export const DOCTOR_WORKING_HOURS = {
  morning: {
    start: 9,      // 09:00
    end: 12,       // 12:00
    label: '🌅 Morning Session (9:00 AM - 12:00 PM)',
    slots: [
      '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
      '11:00 AM', '11:30 AM', '12:00 PM'
    ]
  },
  afternoon: {
    start: 13,     // 13:00 (1 PM)
    end: 17,       // 17:00 (5 PM)
    label: '☀️ Afternoon Session (1:00 PM - 5:00 PM)',
    slots: [
      '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
      '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
    ]
  }
};

/**
 * Check if a time slot is within doctor's working hours
 */
export const isWithinWorkingHours = (timeString) => {
  const allValidSlots = [
    ...DOCTOR_WORKING_HOURS.morning.slots,
    ...DOCTOR_WORKING_HOURS.afternoon.slots
  ];
  return allValidSlots.includes(timeString);
};

/**
 * Get session for a time slot
 */
export const getSessionForSlot = (timeString) => {
  if (DOCTOR_WORKING_HOURS.morning.slots.includes(timeString)) {
    return 'morning';
  } else if (DOCTOR_WORKING_HOURS.afternoon.slots.includes(timeString)) {
    return 'afternoon';
  }
  return null;
};

// ============================================================================
// 4. SLOT FILTERING LOGIC
// ============================================================================

/**
 * Check if a time slot is in the past
 * Assumes slot time is on selectedDate
 */
export const isPastSlot = (slotTime, selectedDate) => {
  const todayString = getTodayIST();
  
  // If selected date is not today, slot is not in the past
  if (selectedDate !== todayString) {
    return false;
  }

  // Get current time in IST
  const currentTime = getCurrentTimeIST();
  const currentMinutes = currentTime.hours * 60 + currentTime.minutes;

  // Convert slot time to minutes
  const slotMinutes = timeToMinutes(slotTime);

  // Slot is past if slot time <= current time
  // Using <= means we don't allow booking the exact current minute
  return slotMinutes <= currentMinutes;
};

/**
 * Check if an entire session is completed
 */
export const isSessionCompleted = (session) => {
  const todayString = getTodayIST();
  const currentTime = getCurrentTimeIST();

  // Morning session ends at 12 PM (noon)
  if (session === 'morning') {
    return currentTime.hours >= 12;
  }

  // Afternoon session ends at 5 PM
  if (session === 'afternoon') {
    return currentTime.hours >= 17;
  }

  return false;
};

/**
 * Check if entire day's slots are completed
 */
export const isDayCompleted = (selectedDate) => {
  const todayString = getTodayIST();
  
  if (selectedDate !== todayString) {
    return false;
  }

  const currentTime = getCurrentTimeIST();
  // Day is completed after 5 PM
  return currentTime.hours >= 17;
};

/**
 * Filter slots for a specific date
 * Removes:
 * - Past slots (if date is today)
 * - Invalid slots (outside working hours)
 * - Booked slots
 */
export const filterValidSlots = (allSlots = [], bookedSlots = [], selectedDate) => {
  if (!allSlots || allSlots.length === 0) {
    return [];
  }

  return allSlots
    .filter(slot => {
      // 1. Check if slot is within working hours
      if (!isWithinWorkingHours(slot)) {
        return false;
      }

      // 2. Check if slot is already booked
      if (bookedSlots.includes(slot)) {
        return false;
      }

      // 3. Check if slot is in the past (only for today)
      if (isPastSlot(slot, selectedDate)) {
        return false;
      }

      return true;
    });
};

/**
 * Group slots by session
 */
export const groupSlotsBySession = (slots) => {
  return {
    morning: slots.filter(slot => 
      DOCTOR_WORKING_HOURS.morning.slots.includes(slot)
    ),
    afternoon: slots.filter(slot => 
      DOCTOR_WORKING_HOURS.afternoon.slots.includes(slot)
    )
  };
};

// ============================================================================
// 5. AVAILABILITY MESSAGE LOGIC
// ============================================================================

/**
 * Get appropriate message when no slots available
 */
export const getNoSlotsMessage = (selectedDate) => {
  const todayString = getTodayIST();
  
  if (selectedDate === todayString) {
    const currentTime = getCurrentTimeIST();
    
    // After 5 PM, entire day is done
    if (currentTime.hours >= 17) {
      return {
        message: '❌ No slots available for today',
        subtitle: 'Doctor\'s working hours (9 AM - 5 PM) have ended',
        type: 'day-completed'
      };
    }

    // After 12 PM, only afternoon slots possible
    if (currentTime.hours >= 12) {
      return {
        message: '🌅 Morning session has ended',
        subtitle: 'Only afternoon slots (1 PM - 5 PM) are available',
        type: 'morning-completed'
      };
    }

    return {
      message: '⏰ All available slots are booked',
      subtitle: 'Please try another date',
      type: 'all-booked'
    };
  }

  return {
    message: '📅 No slots available',
    subtitle: 'Please try another date',
    type: 'no-availability'
  };
};

// ============================================================================
// 6. HELPER FOR TESTING/DEBUG
// ============================================================================

/**
 * Get formatted time info for debugging
 */
export const getTimeDebugInfo = () => {
  const currentIST = getCurrentTimeIST();
  const todayIST = getTodayIST();

  return {
    currentTimeIST: currentIST.timeString,
    todayIST,
    currentMinutes: currentIST.hours * 60 + currentIST.minutes,
    currentHour: currentIST.hours,
    timestamp: new Date().toISOString()
  };
};

// ============================================================================
// 7. SLOT AVAILABILITY CHECK (for UI indicators)
// ============================================================================

/**
 * Check if doctor is currently available (right now)
 */
export const isDoctorAvailableNow = () => {
  const currentTime = getCurrentTimeIST();
  const currentMinutes = currentTime.hours * 60 + currentTime.minutes;

  // Morning: 9 AM (540m) to 12 PM (720m)
  const morningStart = 9 * 60;
  const morningEnd = 12 * 60;

  // Afternoon: 1 PM (780m) to 5 PM (1020m)
  const afternoonStart = 13 * 60;
  const afternoonEnd = 17 * 60;

  const isInMorning = currentMinutes >= morningStart && currentMinutes < morningEnd;
  const isInAfternoon = currentMinutes >= afternoonStart && currentMinutes < afternoonEnd;

  return isInMorning || isInAfternoon;
};

/**
 * Get next available slot from now
 */
export const getNextAvailableSlot = (allSlots) => {
  const currentTime = getCurrentTimeIST();
  const currentMinutes = currentTime.hours * 60 + currentTime.minutes;

  for (const slot of allSlots) {
    const slotMinutes = timeToMinutes(slot);
    if (slotMinutes > currentMinutes) {
      return slot;
    }
  }

  return null;
};
