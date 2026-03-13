/**
 * No-Show Prediction Service
 * Predicts the probability of a patient not showing up for their appointment
 * Uses a simple heuristic-based approach with weighted factors
 */

const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

// Weight factors for prediction (sum should approach 1.0)
const WEIGHTS = {
  attendanceHistory: 0.35,     // Past attendance record
  distanceFromClinic: 0.15,   // Geographic distance
  appointmentTime: 0.15,       // Time of day (early morning/late have higher no-show)
  dayOfWeek: 0.10,            // Day of week (Mondays have higher no-show)
  leadTime: 0.10,              // Days between booking and appointment
  visitType: 0.10,             // Emergency vs routine
  weatherImpact: 0.05          // Placeholder for weather data integration
};

// Thresholds
const HIGH_RISK_THRESHOLD = 40;  // Above this, patient is high risk
const MEDIUM_RISK_THRESHOLD = 20;

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in km
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate score based on patient's attendance history
 * @param {Object} patient - Patient document with attendanceHistory
 * @returns {number} Score 0-100 (higher = more likely to no-show)
 */
const calculateAttendanceScore = (patient) => {
  const history = patient.attendanceHistory;
  
  if (!history || history.totalAppointments === 0) {
    // New patient - use default moderate risk
    return 25;
  }
  
  // Use average no-show rate directly
  const noShowRate = history.averageNoShowRate || 0;
  
  // Factor in recent behavior (if they completed last appointment, lower risk)
  let recentFactor = 0;
  if (history.lastAppointmentDate) {
    const daysSinceLastAppointment = (Date.now() - new Date(history.lastAppointmentDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastAppointment > 180) {
      recentFactor = 10; // Long gap increases risk
    }
  }
  
  // Calculate score
  const score = Math.min(100, noShowRate + recentFactor);
  return score;
};

/**
 * Calculate score based on distance from clinic
 * @param {Object} patient - Patient document with coordinates
 * @param {Object} doctor - Doctor document with clinicCoordinates
 * @returns {number} Score 0-100
 */
const calculateDistanceScore = (patient, doctor) => {
  if (!patient.coordinates || !doctor.clinicCoordinates) {
    return 20; // Default moderate risk when distance unknown
  }
  
  const distance = calculateDistance(
    patient.coordinates.latitude,
    patient.coordinates.longitude,
    doctor.clinicCoordinates.latitude,
    doctor.clinicCoordinates.longitude
  );
  
  if (distance === null) return 20;
  
  // Distance risk mapping
  if (distance <= 5) return 5;
  if (distance <= 10) return 15;
  if (distance <= 20) return 30;
  if (distance <= 50) return 50;
  return 70; // Very far
};

/**
 * Calculate score based on appointment time
 * Early morning and late afternoon have higher no-show rates
 * @param {string} timeSlot - Time slot string
 * @returns {number} Score 0-100
 */
const calculateTimeScore = (timeSlot) => {
  if (!timeSlot) return 20;
  
  // Parse time (assumes format like "09:00 AM" or "14:00")
  let hours;
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    hours = parseInt(match[1]);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else {
    return 20;
  }
  
  // Time-based risk
  if (hours < 9) return 40;    // Early morning - higher risk
  if (hours >= 9 && hours < 11) return 10;  // Mid-morning - lowest risk
  if (hours >= 11 && hours < 14) return 15; // Around lunch
  if (hours >= 14 && hours < 16) return 20; // Early afternoon
  if (hours >= 16) return 35;  // Late afternoon - higher risk
  return 20;
};

/**
 * Calculate score based on day of week
 * @param {Date} appointmentDate 
 * @returns {number} Score 0-100
 */
const calculateDayScore = (appointmentDate) => {
  const day = new Date(appointmentDate).getDay();
  
  // Day risk mapping (0 = Sunday)
  const dayScores = {
    0: 45, // Sunday - higher risk (if open)
    1: 35, // Monday - higher risk
    2: 15, // Tuesday - lower risk
    3: 15, // Wednesday - lower risk
    4: 20, // Thursday
    5: 30, // Friday - moderate risk
    6: 40  // Saturday - higher risk
  };
  
  return dayScores[day] || 20;
};

/**
 * Calculate score based on lead time (days between booking and appointment)
 * @param {Date} bookingDate 
 * @param {Date} appointmentDate 
 * @returns {number} Score 0-100
 */
const calculateLeadTimeScore = (bookingDate, appointmentDate) => {
  const leadDays = Math.ceil(
    (new Date(appointmentDate).getTime() - new Date(bookingDate).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  
  if (leadDays <= 1) return 5;    // Same day or next day - very committed
  if (leadDays <= 3) return 10;   // Within 3 days
  if (leadDays <= 7) return 20;   // Within a week
  if (leadDays <= 14) return 35;  // 1-2 weeks
  if (leadDays <= 30) return 50;  // 2-4 weeks
  return 70;                       // More than a month - higher risk
};

/**
 * Calculate score based on visit type
 * @param {string} visitType 
 * @returns {number} Score 0-100
 */
const calculateVisitTypeScore = (visitType) => {
  const typeScores = {
    'Emergency': 5,           // Very committed
    'First Consultation': 15, // New patients somewhat more likely to show
    'Follow-up': 25,          // Moderate risk
    'Routine Checkup': 35,    // Can be postponed easily
    'Other': 25
  };
  
  return typeScores[visitType] || 25;
};

/**
 * Main prediction function - calculates no-show probability
 * @param {Object} params
 * @param {string} params.patientId - Patient's user ID
 * @param {string} params.doctorId - Doctor ID
 * @param {Date} params.appointmentDate - Appointment date
 * @param {string} params.timeSlot - Time slot
 * @param {string} params.visitType - Visit type
 * @param {Date} params.bookingDate - When the appointment was booked (optional, defaults to now)
 * @returns {Promise<Object>} Prediction result
 */
const predictNoShow = async (params) => {
  const {
    patientId,
    doctorId,
    appointmentDate,
    timeSlot,
    visitType = 'First Consultation',
    bookingDate = new Date()
  } = params;

  try {
    // Fetch patient and doctor data
    const [patient, doctor] = await Promise.all([
      Patient.findOne({ user: patientId }),
      require('../models/Doctor').findById(doctorId)
    ]);

    // Calculate individual scores
    const scores = {
      attendance: calculateAttendanceScore(patient || {}),
      distance: calculateDistanceScore(patient || {}, doctor || {}),
      time: calculateTimeScore(timeSlot),
      day: calculateDayScore(appointmentDate),
      leadTime: calculateLeadTimeScore(bookingDate, appointmentDate),
      visitType: calculateVisitTypeScore(visitType),
      weather: 20 // Placeholder - could integrate weather API
    };

    // Calculate weighted average
    const probability = 
      scores.attendance * WEIGHTS.attendanceHistory +
      scores.distance * WEIGHTS.distanceFromClinic +
      scores.time * WEIGHTS.appointmentTime +
      scores.day * WEIGHTS.dayOfWeek +
      scores.leadTime * WEIGHTS.leadTime +
      scores.visitType * WEIGHTS.visitType +
      scores.weather * WEIGHTS.weatherImpact;

    // Round to integer
    const finalProbability = Math.round(probability);

    // Determine risk level
    let riskLevel;
    if (finalProbability >= HIGH_RISK_THRESHOLD) {
      riskLevel = 'high';
    } else if (finalProbability >= MEDIUM_RISK_THRESHOLD) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate recommendations
    const recommendations = [];
    if (finalProbability >= HIGH_RISK_THRESHOLD) {
      recommendations.push('Send multiple reminders (48h, 24h, 2h before)');
      recommendations.push('Consider phone call confirmation');
      recommendations.push('Enable overbooking for this slot');
    } else if (finalProbability >= MEDIUM_RISK_THRESHOLD) {
      recommendations.push('Send reminder 24h before');
      recommendations.push('Request confirmation via email');
    }

    return {
      probability: finalProbability,
      riskLevel,
      scores,
      recommendations,
      factors: {
        attendanceHistory: patient?.attendanceHistory || null,
        distanceKm: patient?.distanceFromClinic || null,
        leadTimeDays: Math.ceil(
          (new Date(appointmentDate).getTime() - new Date(bookingDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        )
      }
    };
  } catch (error) {
    console.error('Error predicting no-show:', error);
    // Return default moderate probability on error
    return {
      probability: 25,
      riskLevel: 'medium',
      error: error.message,
      recommendations: ['Send standard reminder']
    };
  }
};

/**
 * Update patient attendance history after appointment completion
 * @param {string} patientUserId 
 * @param {string} status - 'completed', 'cancelled', or 'no-show'
 */
const updatePatientHistory = async (patientUserId, status) => {
  try {
    const patient = await Patient.findOne({ user: patientUserId });
    if (patient && patient.updateAttendanceHistory) {
      await patient.updateAttendanceHistory(status);
      console.log(`✅ Updated attendance history for patient ${patientUserId}: ${status}`);
    }
  } catch (error) {
    console.error('Error updating patient history:', error);
  }
};

/**
 * Get high-risk appointments for a doctor on a specific date
 * Useful for daily reports
 * @param {string} doctorId 
 * @param {Date} date 
 * @returns {Promise<Array>}
 */
const getHighRiskAppointments = async (doctorId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    doctor: doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
    noShowProbability: { $gte: HIGH_RISK_THRESHOLD }
  }).populate('patient', 'name email');

  return appointments;
};

module.exports = {
  predictNoShow,
  updatePatientHistory,
  getHighRiskAppointments,
  calculateDistance,
  HIGH_RISK_THRESHOLD,
  MEDIUM_RISK_THRESHOLD
};
