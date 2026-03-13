/**
 * Availability Service
 * Manages doctor availability and working hours
 */

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const slotGenerator = require('../utils/slotGenerator');

/**
 * Get doctor's working hours for a specific day
 * @param {string} doctorId 
 * @param {string} dayName - e.g., 'Monday'
 * @returns {Promise<Object|null>}
 */
const getDoctorWorkingHours = async (doctorId, dayName) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return null;
  
  return doctor.workingHours?.find(wh => wh.day === dayName) || null;
};

/**
 * Get all working hours for a doctor
 * @param {string} doctorId 
 * @returns {Promise<Array>}
 */
const getAllWorkingHours = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return [];
  
  return doctor.workingHours || [];
};

/**
 * Update working hours for a specific day
 * @param {string} doctorId 
 * @param {string} dayName 
 * @param {Object} newHours - { isWorking, startTime, endTime, breakStart, breakEnd }
 * @returns {Promise<Object>}
 */
const updateWorkingHours = async (doctorId, dayName, newHours) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  const dayIndex = doctor.workingHours.findIndex(wh => wh.day === dayName);
  if (dayIndex === -1) {
    throw new Error('Invalid day name');
  }

  // Update the working hours
  Object.assign(doctor.workingHours[dayIndex], newHours);
  await doctor.save();

  return doctor.workingHours[dayIndex];
};

/**
 * Get appointments for a doctor on a specific date
 * @param {string} doctorId 
 * @param {Date} date 
 * @returns {Promise<Array>}
 */
const getAppointmentsForDate = async (doctorId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await Appointment.find({
    doctor: doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled'] }
  });
};

/**
 * Get available slots for a doctor on a specific date
 * @param {string} doctorId 
 * @param {Date} date 
 * @param {string} visitType 
 * @param {Object} options 
 * @returns {Promise<Array>}
 */
const getAvailableSlots = async (doctorId, date, visitType = 'First Consultation', options = {}) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  const existingAppointments = await getAppointmentsForDate(doctorId, date);
  
  return slotGenerator.generateAvailableSlots(
    doctor,
    date,
    existingAppointments,
    visitType,
    options
  );
};

/**
 * Get available slots for a date range
 * @param {string} doctorId 
 * @param {Date} startDate 
 * @param {number} daysAhead 
 * @param {string} visitType 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
const getAvailableSlotsForRange = async (doctorId, startDate, daysAhead = 7, visitType = 'First Consultation', options = {}) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  return await slotGenerator.generateSlotsForDateRange(
    doctor,
    startDate,
    daysAhead,
    (docId, date) => getAppointmentsForDate(docId, date),
    visitType,
    options
  );
};

/**
 * Check if a specific slot is available
 * @param {string} doctorId 
 * @param {Date} date 
 * @param {string} timeSlot 
 * @param {number} duration 
 * @returns {Promise<Object>}
 */
const checkSlotAvailability = async (doctorId, date, timeSlot, duration = 30) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return { available: false, reason: 'Doctor not found' };
  }

  const existingAppointments = await getAppointmentsForDate(doctorId, date);
  
  return slotGenerator.isSlotAvailable(doctor, date, timeSlot, duration, existingAppointments);
};

/**
 * Get consultation types for a doctor
 * @param {string} doctorId 
 * @returns {Promise<Array>}
 */
const getConsultationTypes = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return [];
  
  return doctor.consultationTypes || [];
};

/**
 * Get duration for a visit type
 * @param {string} doctorId 
 * @param {string} visitType 
 * @returns {Promise<number>}
 */
const getDurationForVisitType = async (doctorId, visitType) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return 30; // Default
  
  const consultationType = doctor.consultationTypes?.find(ct => ct.name === visitType);
  return consultationType?.duration || doctor.defaultSlotDuration || 30;
};

/**
 * Get doctor's schedule summary for a date range
 * @param {string} doctorId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Object>}
 */
const getScheduleSummary = async (doctorId, startDate, endDate) => {
  const doctor = await Doctor.findById(doctorId).populate('user', 'name');
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Get all appointments in the date range
  const appointments = await Appointment.find({
    doctor: doctorId,
    date: { $gte: startDate, $lte: endDate }
  }).populate('patient', 'name');

  // Group by status
  const byStatus = {
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    noShow: appointments.filter(a => a.status === 'no-show').length
  };

  // Group by date
  const byDate = {};
  appointments.forEach(apt => {
    const dateStr = apt.date.toISOString().split('T')[0];
    if (!byDate[dateStr]) {
      byDate[dateStr] = { total: 0, appointments: [] };
    }
    byDate[dateStr].total++;
    byDate[dateStr].appointments.push({
      id: apt._id,
      patient: apt.patient?.name,
      timeSlot: apt.timeSlot,
      status: apt.status,
      visitType: apt.visitType
    });
  });

  return {
    doctorId,
    doctorName: doctor.user.name,
    dateRange: { start: startDate, end: endDate },
    totalAppointments: appointments.length,
    byStatus,
    byDate
  };
};

/**
 * Block a specific date or time range for a doctor
 * @param {string} doctorId 
 * @param {Date} date 
 * @param {string} startTime - Optional, if not provided blocks whole day
 * @param {string} endTime - Optional
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
const blockTimeSlot = async (doctorId, date, startTime = null, endTime = null, reason = 'Blocked') => {
  // Create a dummy appointment that blocks the slot
  const blockAppointment = await Appointment.create({
    doctor: doctorId,
    patient: null, // No patient - it's a block
    date,
    timeSlot: startTime || '00:00 AM',
    endTime: endTime || '11:59 PM',
    status: 'confirmed', // So it blocks slots
    reason,
    visitType: 'Other',
    notes: 'BLOCKED_SLOT' // Marker
  });

  return blockAppointment;
};

/**
 * Get next available slot for a doctor
 * @param {string} doctorId 
 * @param {string} visitType 
 * @param {Date} afterDate - Start looking from this date
 * @returns {Promise<Object|null>}
 */
const getNextAvailableSlot = async (doctorId, visitType = 'First Consultation', afterDate = new Date()) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return null;

  // Search up to 30 days ahead
  for (let i = 0; i < 30; i++) {
    const searchDate = new Date(afterDate);
    searchDate.setDate(searchDate.getDate() + i);

    const slots = await getAvailableSlots(doctorId, searchDate, visitType);
    
    if (slots.length > 0) {
      return {
        date: searchDate,
        slot: slots[0],
        totalAvailable: slots.length
      };
    }
  }

  return null; // No slots found in 30 days
};

module.exports = {
  getDoctorWorkingHours,
  getAllWorkingHours,
  updateWorkingHours,
  getAppointmentsForDate,
  getAvailableSlots,
  getAvailableSlotsForRange,
  checkSlotAvailability,
  getConsultationTypes,
  getDurationForVisitType,
  getScheduleSummary,
  blockTimeSlot,
  getNextAvailableSlot
};
