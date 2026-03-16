/**
 * Smart Slot Generator Utility
 * Generates dynamic appointment slots based on doctor availability and visit types
 */

/**
 * Parse time string to minutes from midnight
 * @param {string} timeStr - Time in "HH:MM" or "HH:MM AM/PM" format
 * @returns {number} Minutes from midnight
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  
  // Handle "HH:MM" format
  let [hours, minutes] = timeStr.split(':').map(Number);
  
  // Handle "HH:MM AM/PM" format
  if (timeStr.toLowerCase().includes('pm') && hours !== 12) {
    hours += 12;
  } else if (timeStr.toLowerCase().includes('am') && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + (minutes || 0);
};

/**
 * Convert minutes from midnight to time string
 * @param {number} minutes - Minutes from midnight
 * @param {boolean} use12Hour - Use 12-hour format
 * @returns {string} Formatted time string
 */
const minutesToTimeString = (minutes, use12Hour = true) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (use12Hour) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
  }
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Get day name from date
 * @param {Date} date 
 * @returns {string} Day name
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
};

/**
 * Check if two time ranges overlap
 * @param {number} start1 - Start of first range (minutes)
 * @param {number} end1 - End of first range (minutes)
 * @param {number} start2 - Start of second range (minutes)
 * @param {number} end2 - End of second range (minutes)
 * @returns {boolean}
 */
const doTimesOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

/**
 * Generate available time slots for a doctor on a specific date
 * @param {Object} doctor - Doctor document with workingHours and consultationTypes
 * @param {Date} date - The date to generate slots for
 * @param {Array} existingAppointments - Already booked appointments for that date
 * @param {string} visitType - Type of visit (determines duration)
 * @param {Object} options - Additional options
 * @returns {Array} Available slots
 */
const generateAvailableSlots = (doctor, date, existingAppointments = [], visitType = 'First Consultation', options = {}) => {
  const {
    slotInterval = 5, // Minimum slot interval in minutes
    includeOverbooking = false,
    currentTime = new Date()
  } = options;

  const dayName = getDayName(date);
  const workingDay = doctor.workingHours?.find(wh => wh.day === dayName);
  
  // Check if doctor works on this day
  if (!workingDay || !workingDay.isWorking) {
    return [];
  }

  // Get consultation duration for visit type
  const consultationType = doctor.consultationTypes?.find(ct => ct.name === visitType);
  const duration = consultationType?.duration || doctor.defaultSlotDuration || 30;

  // Parse working hours
  const workStart = parseTimeToMinutes(workingDay.startTime);
  const workEnd = parseTimeToMinutes(workingDay.endTime);
  const breakStart = workingDay.breakStart ? parseTimeToMinutes(workingDay.breakStart) : null;
  const breakEnd = workingDay.breakEnd ? parseTimeToMinutes(workingDay.breakEnd) : null;

  if (workStart === null || workEnd === null) {
    return [];
  }

  // Parse existing appointments into time ranges
  const bookedSlots = existingAppointments
    .filter(apt => apt.status !== 'cancelled')
    .map(apt => {
      const start = parseTimeToMinutes(apt.timeSlot);
      const end = apt.endTime ? parseTimeToMinutes(apt.endTime) : start + (apt.duration || 30);
      return { start, end, isOverbooking: apt.isOverbooking };
    });

  // Generate all possible slots
  const slots = [];
  let currentSlotStart = workStart;

  // Check if date is today - if so, only show future slots
  const isToday = new Date(date).toDateString() === currentTime.toDateString();
  const currentTimeMinutes = isToday 
    ? currentTime.getHours() * 60 + currentTime.getMinutes() + 30 // Add 30 min buffer
    : 0;

  while (currentSlotStart + duration <= workEnd) {
    const slotEnd = currentSlotStart + duration;

    // Skip if slot is in the past (for today)
    if (currentSlotStart < currentTimeMinutes) {
      currentSlotStart += slotInterval;
      continue;
    }

    // Skip if slot overlaps with break time
    if (breakStart !== null && breakEnd !== null) {
      if (doTimesOverlap(currentSlotStart, slotEnd, breakStart, breakEnd)) {
        currentSlotStart = breakEnd;
        continue;
      }
    }

    // Check for conflicts with existing appointments
    const hasConflict = bookedSlots.some(booked => 
      doTimesOverlap(currentSlotStart, slotEnd, booked.start, booked.end)
    );

    if (!hasConflict) {
      slots.push({
        startTime: minutesToTimeString(currentSlotStart),
        endTime: minutesToTimeString(slotEnd),
        duration,
        visitType,
        isAvailable: true,
        isOverbooking: false
      });
    } else if (includeOverbooking) {
      // Check if overbooking is allowed for high no-show probability slots
      const conflictingSlot = bookedSlots.find(booked => 
        doTimesOverlap(currentSlotStart, slotEnd, booked.start, booked.end)
      );
      
      if (conflictingSlot && !conflictingSlot.isOverbooking) {
        const overbookCount = bookedSlots.filter(b => 
          b.isOverbooking && doTimesOverlap(currentSlotStart, slotEnd, b.start, b.end)
        ).length;
        
        if (overbookCount < (doctor.maxOverbookingLimit || 2)) {
          slots.push({
            startTime: minutesToTimeString(currentSlotStart),
            endTime: minutesToTimeString(slotEnd),
            duration,
            visitType,
            isAvailable: true,
            isOverbooking: true,
            note: 'Overbooking slot - available due to predicted no-show'
          });
        }
      }
    }

    currentSlotStart += slotInterval;
  }

  return slots;
};

/**
 * Get all available slots for multiple days
 * @param {Object} doctor - Doctor document
 * @param {Date} startDate - Start date
 * @param {number} daysAhead - Number of days to look ahead
 * @param {Function} getAppointmentsForDate - Async function to fetch appointments
 * @param {string} visitType - Visit type
 * @param {Object} options - Options
 * @returns {Promise<Object>} Slots grouped by date
 */
const generateSlotsForDateRange = async (doctor, startDate, daysAhead, getAppointmentsForDate, visitType, options = {}) => {
  const slotsByDate = {};
  const currentDate = new Date(startDate);

  for (let i = 0; i < daysAhead; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const appointments = await getAppointmentsForDate(doctor._id, currentDate);
    
    const slots = generateAvailableSlots(doctor, currentDate, appointments, visitType, options);
    
    if (slots.length > 0) {
      slotsByDate[dateStr] = {
        date: new Date(currentDate),
        dayName: getDayName(currentDate),
        slots,
        totalAvailable: slots.filter(s => !s.isOverbooking).length
      };
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slotsByDate;
};

/**
 * Calculate end time for an appointment
 * @param {string} startTime - Start time
 * @param {number} duration - Duration in minutes
 * @returns {string} End time
 */
const calculateEndTime = (startTime, duration) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = startMinutes + duration;
  return minutesToTimeString(endMinutes);
};

/**
 * Check if a specific slot is available
 * @param {Object} doctor - Doctor document
 * @param {Date} date - Date
 * @param {string} timeSlot - Time slot
 * @param {number} duration - Duration
 * @param {Array} existingAppointments - Existing appointments
 * @returns {Object} Availability result
 */
const isSlotAvailable = (doctor, date, timeSlot, duration, existingAppointments) => {
  const dayName = getDayName(date);
  const workingDay = doctor.workingHours?.find(wh => wh.day === dayName);
  
  if (!workingDay || !workingDay.isWorking) {
    return { available: false, reason: 'Doctor does not work on this day' };
  }

  const slotStart = parseTimeToMinutes(timeSlot);
  const slotEnd = slotStart + duration;
  const workStart = parseTimeToMinutes(workingDay.startTime);
  const workEnd = parseTimeToMinutes(workingDay.endTime);
  const breakStart = workingDay.breakStart ? parseTimeToMinutes(workingDay.breakStart) : null;
  const breakEnd = workingDay.breakEnd ? parseTimeToMinutes(workingDay.breakEnd) : null;

  // Check if within working hours
  if (slotStart < workStart || slotEnd > workEnd) {
    return { available: false, reason: 'Slot is outside working hours' };
  }

  // Check if overlaps with break
  if (breakStart && breakEnd && doTimesOverlap(slotStart, slotEnd, breakStart, breakEnd)) {
    return { available: false, reason: 'Slot overlaps with break time' };
  }

  // Check for conflicts
  const conflict = existingAppointments
    .filter(apt => apt.status !== 'cancelled')
    .find(apt => {
      const aptStart = parseTimeToMinutes(apt.timeSlot);
      const aptEnd = apt.endTime ? parseTimeToMinutes(apt.endTime) : aptStart + (apt.duration || 30);
      return doTimesOverlap(slotStart, slotEnd, aptStart, aptEnd);
    });

  if (conflict) {
    return { available: false, reason: 'Slot conflicts with existing appointment', conflictWith: conflict._id };
  }

  return { available: true };
};

module.exports = {
  parseTimeToMinutes,
  minutesToTimeString,
  getDayName,
  doTimesOverlap,
  generateAvailableSlots,
  generateSlotsForDateRange,
  calculateEndTime,
  isSlotAvailable
};
