/**
 * Smart Scheduling Service
 * Frontend API service for smart scheduling features
 */

import api from './api'

// ==================== SLOT MANAGEMENT ====================

/**
 * Get available slots for a doctor on a specific date
 */
export const getAvailableSlots = async (doctorId, date, visitType = 'First Consultation') => {
  const response = await api.get(`/scheduling/slots/${doctorId}`, {
    params: { date, visitType }
  })
  return response.data
}

/**
 * Get available slots for a date range
 */
export const getAvailableSlotsRange = async (doctorId, startDate, days = 7, visitType = 'First Consultation') => {
  const response = await api.get(`/scheduling/slots/${doctorId}/range`, {
    params: { startDate, days, visitType }
  })
  return response.data
}

/**
 * Check if a specific slot is available
 */
export const checkSlotAvailability = async (doctorId, date, timeSlot, duration = 30) => {
  const response = await api.post('/scheduling/slots/check', {
    doctorId, date, timeSlot, duration
  })
  return response.data
}

/**
 * Get smart appointment suggestions
 */
export const getSmartSuggestions = async (doctorId, visitType = 'First Consultation', preferredDate = null) => {
  const response = await api.get(`/scheduling/suggestions/${doctorId}`, {
    params: { visitType, preferredDate }
  })
  return response.data
}

// ==================== APPOINTMENT BOOKING ====================

/**
 * Book a smart appointment
 */
export const bookSmartAppointment = async (bookingData) => {
  const response = await api.post('/scheduling/book', bookingData)
  return response.data
}

/**
 * Cancel an appointment
 */
export const cancelAppointment = async (appointmentId, reason = '') => {
  const response = await api.post(`/scheduling/cancel/${appointmentId}`, { reason })
  return response.data
}

/**
 * Reschedule an appointment
 */
export const rescheduleAppointment = async (appointmentId, newDate, newTimeSlot) => {
  const response = await api.post(`/scheduling/reschedule/${appointmentId}`, {
    newDate, newTimeSlot
  })
  return response.data
}

// ==================== WAITLIST ====================

/**
 * Join the waitlist
 */
export const joinWaitlist = async (waitlistData) => {
  const response = await api.post('/scheduling/waitlist/join', waitlistData)
  return response.data
}

/**
 * Get patient's waitlist entries
 */
export const getMyWaitlist = async () => {
  const response = await api.get('/scheduling/waitlist/my')
  return response.data
}

/**
 * Cancel a waitlist entry
 */
export const cancelWaitlistEntry = async (waitlistId) => {
  const response = await api.delete(`/scheduling/waitlist/${waitlistId}`)
  return response.data
}

/**
 * Book from waitlist notification
 */
export const bookFromWaitlist = async (waitlistId, timeSlot) => {
  const response = await api.post(`/scheduling/waitlist/${waitlistId}/book`, { timeSlot })
  return response.data
}

// ==================== DOCTOR MANAGEMENT ====================

/**
 * Get doctor's working hours
 */
export const getWorkingHours = async (doctorId) => {
  const response = await api.get(`/scheduling/working-hours/${doctorId}`)
  return response.data
}

/**
 * Get consultation types for a doctor
 */
export const getConsultationTypes = async (doctorId) => {
  const response = await api.get(`/scheduling/consultation-types/${doctorId}`)
  return response.data
}

/**
 * Get daily schedule for a doctor
 */
export const getDailySchedule = async (doctorId, date = new Date().toISOString()) => {
  const response = await api.get(`/scheduling/schedule/${doctorId}`, {
    params: { date }
  })
  return response.data
}

/**
 * Get schedule summary for a doctor
 */
export const getScheduleSummary = async (doctorId, startDate, endDate) => {
  const response = await api.get(`/scheduling/summary/${doctorId}`, {
    params: { startDate, endDate }
  })
  return response.data
}

/**
 * Update working hours
 */
export const updateWorkingHours = async (doctorId, dayName, workingHours) => {
  const response = await api.put(`/scheduling/working-hours/${doctorId}`, {
    dayName, workingHours
  })
  return response.data
}

// ==================== NO-SHOW PREDICTION ====================

/**
 * Get no-show prediction for a potential appointment
 */
export const predictNoShow = async (predictionData) => {
  const response = await api.post('/scheduling/predict-no-show', predictionData)
  return response.data
}

/**
 * Get high-risk appointments for a doctor
 */
export const getHighRiskAppointments = async (doctorId, date = new Date().toISOString()) => {
  const response = await api.get(`/scheduling/high-risk/${doctorId}`, {
    params: { date }
  })
  return response.data
}

// ==================== NATURAL LANGUAGE ====================

/**
 * Parse natural language appointment request
 */
export const parseNaturalLanguageRequest = async (text, doctorId = null) => {
  const response = await api.post('/scheduling/parse-request', { text, doctorId })
  return response.data
}

// ==================== DOCTOR WAITLIST ====================

/**
 * Get doctor's waitlist
 */
export const getDoctorWaitlist = async (doctorId, date = null) => {
  const response = await api.get(`/scheduling/waitlist/doctor/${doctorId}`, {
    params: date ? { date } : {}
  })
  return response.data
}

/**
 * Get waitlist statistics for a doctor
 */
export const getWaitlistStats = async (doctorId) => {
  const response = await api.get(`/scheduling/waitlist/stats/${doctorId}`)
  return response.data
}

// ==================== APPOINTMENT STATUS ====================

/**
 * Mark appointment as no-show
 */
export const markAsNoShow = async (appointmentId) => {
  const response = await api.post(`/scheduling/no-show/${appointmentId}`)
  return response.data
}

/**
 * Complete an appointment
 */
export const completeAppointment = async (appointmentId) => {
  const response = await api.post(`/scheduling/complete/${appointmentId}`)
  return response.data
}

/**
 * Check in a patient
 */
export const checkInPatient = async (appointmentId) => {
  const response = await api.post(`/scheduling/checkin/${appointmentId}`)
  return response.data
}

export default {
  getAvailableSlots,
  getAvailableSlotsRange,
  checkSlotAvailability,
  getSmartSuggestions,
  bookSmartAppointment,
  cancelAppointment,
  rescheduleAppointment,
  joinWaitlist,
  getMyWaitlist,
  cancelWaitlistEntry,
  bookFromWaitlist,
  getWorkingHours,
  getConsultationTypes,
  getDailySchedule,
  getScheduleSummary,
  updateWorkingHours,
  predictNoShow,
  getHighRiskAppointments,
  parseNaturalLanguageRequest,
  getDoctorWaitlist,
  getWaitlistStats,
  markAsNoShow,
  completeAppointment,
  checkInPatient
}
