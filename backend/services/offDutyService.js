/**
 * Doctor Off-Duty Service
 * Handles off-duty request management and automatic appointment rescheduling
 */

const Appointment = require('../models/Appointment');
const DoctorOffDutyRequest = require('../models/DoctorOffDutyRequest');
const Doctor = require('../models/Doctor');
const availabilityService = require('./availabilityService');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Helper function: Get current time in IST
 */
const getCurrentTimeIST = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istTime;
};

/**
 * Helper function: Get date in YYYY-MM-DD format (IST)
 */
const getTodayIST = () => {
  const istTime = getCurrentTimeIST();
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper function: Get current session (morning = 6-12, afternoon = 12-18)
 */
const getCurrentSession = () => {
  const istTime = getCurrentTimeIST();
  const hour = istTime.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'off-hours';
};

/**
 * Helper function: Get session from timeSlot (e.g., "10:30 AM" or "14:30")
 */
const getSessionFromTimeSlot = (timeSlot) => {
  if (!timeSlot) return null;
  
  let hour = 0;
  if (timeSlot.includes('AM') || timeSlot.includes('PM')) {
    const match = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;
    hour = parseInt(match[1], 10);
    if (match[3]?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (match[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
  } else {
    hour = parseInt(timeSlot.split(':')[0], 10);
  }
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
};

/**
 * Create an off-duty request
 * @param {string} doctorId - Doctor ID
 * @param {Date} date - Date for off-duty
 * @param {string} session - 'morning' or 'afternoon'
 * @param {string} reason - Optional reason
 * @returns {Promise<Object>} - Created request object
 */
const createOffDutyRequest = async (doctorId, date, session, reason = null) => {
  // Validate doctor exists
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Validate date is not in the past
  const requestDate = new Date(date);
  requestDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (requestDate < today) {
    throw new Error('Cannot create off-duty request for past dates');
  }

  // Check if duplicate request already exists
  const existingRequest = await DoctorOffDutyRequest.findOne({
    doctor: doctorId,
    date: requestDate,
    session: session,
    status: { $in: ['pending', 'approved'] }
  });

  if (existingRequest) {
    throw new Error(`Off-duty request already exists for this date and session`);
  }

  // Create the request
  const offDutyRequest = new DoctorOffDutyRequest({
    doctor: doctorId,
    date: requestDate,
    session: session,
    reason: reason || 'Doctor Unavailable'
  });

  await offDutyRequest.save();
  return offDutyRequest;
};

/**
 * Find all affected appointments for off-duty request
 * @param {string} doctorId - Doctor ID
 * @param {Date} date - Date
 * @param {string} session - 'morning' or 'afternoon'
 * @returns {Promise<Array>} - Array of affected appointments
 */
const findAffectedAppointments = async (doctorId, date, session) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Normalize date
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);
  
  // Get all appointments for this doctor on this date (excluding cancelled/completed)
  const allAppointments = await Appointment.find({
    doctor: doctorId,
    date: {
      $gte: appointmentDate,
      $lt: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000) // Same day
    },
    status: { $in: ['pending', 'confirmed', 'in-progress', 'no-show'] }
  });

  // Filter by session
  const affected = allAppointments.filter(apt => {
    const aptSession = getSessionFromTimeSlot(apt.timeSlot);
    return aptSession === session;
  });

  return affected;
};

/**
 * Reschedule appointment to day after tomorrow (same time slot)
 * @param {Object} appointment - Appointment to reschedule
 * @param {Date} dayAfterTomorrow - Target date
 * @returns {Promise<Object>} - Updated appointment
 */
const rescheduleAppointment = async (appointment, dayAfterTomorrow) => {
  // Check if target slot is available
  const existingAppointments = await Appointment.find({
    doctor: appointment.doctor,
    date: {
      $gte: dayAfterTomorrow,
      $lt: new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000)
    },
    timeSlot: appointment.timeSlot,
    status: { $in: ['pending', 'confirmed', 'in-progress'] }
  });

  if (existingAppointments.length > 0) {
    throw new Error(`Slot ${appointment.timeSlot} already booked for day after tomorrow`);
  }

  // Mark original appointment as cancelled
  appointment.status = 'cancelled';
  appointment.cancelledBy = 'system';
  appointment.cancelReason = 'Doctor Off-Duty - Rescheduled';
  appointment.cancelledAt = getCurrentTimeIST();
  await appointment.save();

  // Create new appointment on day after tomorrow
  const newAppointment = new Appointment({
    patient: appointment.patient,
    patientName: appointment.patientName,
    doctor: appointment.doctor,
    doctorName: appointment.doctorName,
    date: dayAfterTomorrow,
    timeSlot: appointment.timeSlot,
    endTime: appointment.endTime,
    status: 'confirmed', // Auto-confirm rescheduled appointments
    reason: appointment.reason,
    visitType: appointment.visitType,
    duration: appointment.duration,
    consultationType: appointment.consultationType,
    session: getSessionFromTimeSlot(appointment.timeSlot),
    rescheduledFrom: appointment._id,
    bookedVia: 'admin-reschedule'
  });

  await newAppointment.save();
  return { oldAppointment: appointment, newAppointment };
};

/**
 * Approve off-duty request and send apology emails to affected patients
 * @param {string} requestId - Off-duty request ID
 * @param {string} adminId - Admin user ID approving the request
 * @param {string} remarks - Optional admin remarks
 * @returns {Promise<Object>} - Result object with stats
 */
const approveOffDutyRequest = async (requestId, adminId, remarks = null) => {
  console.log(`🔍 [OFF-DUTY] Approving request ${requestId} by admin ${adminId}`);
  
  const request = await DoctorOffDutyRequest.findById(requestId);
  if (!request) {
    throw new Error('Off-duty request not found');
  }

  if (request.status !== 'pending') {
    throw new Error(`Cannot approve ${request.status} request`);
  }

  try {
    // Find affected appointments
    console.log(`📅 [OFF-DUTY] Finding appointments for doctor ${request.doctor} on ${request.date} (${request.session})`);
    const affectedAppointments = await findAffectedAppointments(
      request.doctor,
      request.date,
      request.session
    );
    console.log(`📌 [OFF-DUTY] Found ${affectedAppointments.length} affected appointments`);

    // Send apology emails to affected patients
    let emailsSent = 0;
    for (const apt of affectedAppointments) {
      try {
        const patient = await require('../models/Patient').findOne({ user: apt.patient }).populate('user', 'email name');
        const doctor = await Doctor.findById(request.doctor).populate('user', 'name');
        
        if (patient && patient.user && patient.user.email) {
          // Send apology email asking them to reschedule
          const emailContent = {
            subject: `Appointment Reschedule Required - Dr. ${doctor.user.name} Unavailable`,
            html: `
              <h2>Appointment Rescheduling Required</h2>
              <p>Dear ${patient.user.name},</p>
              <p>We regret to inform you that your appointment with <strong>Dr. ${doctor.user.name}</strong> on <strong>${new Date(apt.date).toLocaleDateString()}</strong> at <strong>${apt.timeSlot}</strong> cannot proceed.</p>
              <p>Dr. ${doctor.user.name} has requested time off on that date due to ${request.reason || 'personal reasons'}.</p>
              <p><strong>We sincerely apologize for the inconvenience.</strong></p>
              <p>Please <a href="${process.env.FRONTEND_URL || 'https://localhost:3000'}/patient/book">book a new appointment</a> at your earliest convenience. Future appointments are available starting tomorrow.</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Thank you for your understanding.<br/>NeoTherapy Team</p>
            `
          };

          console.log(`📧 Sending apology email to ${patient.user.email}`);
          await sendEmail({
            to: patient.user.email,
            subject: emailContent.subject,
            html: emailContent.html
          });
          console.log(`✅ Email sent successfully to ${patient.user.email}`);
          emailsSent++;
        }
      } catch (err) {
        console.error(`❌ Failed to send email for appointment ${apt._id}:`, err.message);
      }
    }

    // Update off-duty request
    request.status = 'approved';
    request.approvedAt = getCurrentTimeIST();
    request.approvedBy = adminId;
    request.adminRemarks = remarks;
    request.affectedAppointmentsCount = affectedAppointments.length;
    request.notificationsCount = emailsSent;
    await request.save();

    console.log(`✅ [OFF-DUTY] Request ${requestId} approved. ${emailsSent} emails sent.`);

    return {
      success: true,
      affectedAppointmentsCount: affectedAppointments.length,
      emailsSent,
      message: `Off-duty approved. ${emailsSent} apology emails sent to affected patients asking them to reschedule.`
    };
  } catch (err) {
    console.error('Error approving off-duty request:', err);
    throw new Error(`Failed to approve off-duty request: ${err.message}`);
  }
};

/**
 * Reject off-duty request
 * @param {string} requestId - Off-duty request ID
 * @param {string} adminId - Admin user ID rejecting the request
 * @param {string} remarks - Rejection remarks
 * @returns {Promise<Object>} - Updated request
 */
const rejectOffDutyRequest = async (requestId, adminId, remarks) => {
  const request = await DoctorOffDutyRequest.findById(requestId);
  if (!request) {
    throw new Error('Off-duty request not found');
  }

  if (request.status !== 'pending') {
    throw new Error(`Cannot reject ${request.status} request`);
  }

  request.status = 'rejected';
  request.rejectedAt = getCurrentTimeIST();
  request.rejectedBy = adminId;
  request.adminRemarks = remarks;
  await request.save();

  return request;
};

/**
 * Get off-duty requests with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} - Array of requests
 */
const getOffDutyRequests = async (filters = {}) => {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.doctor) {
    query.doctor = filters.doctor;
  }

  if (filters.startDate && filters.endDate) {
    query.date = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  const requests = await DoctorOffDutyRequest.find(query)
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email' }
    })
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Get doctor's off-duty status for a specific date and session
 * @param {string} doctorId - Doctor ID
 * @param {Date} date - Date
 * @param {string} session - Session
 * @returns {Promise<Object|null>} - Off-duty request if exists, null otherwise
 */
const getDoctorOffDutyStatus = async (doctorId, date, session) => {
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  const request = await DoctorOffDutyRequest.findOne({
    doctor: doctorId,
    date: appointmentDate,
    session: session,
    status: 'approved'
  });

  return request || null;
};

/**
 * Check if appointment date is available for booking (Today or Tomorrow only)
 * @param {Date} appointmentDate - Appointment date
 * @returns {Object} - { available: boolean, reason: string }
 */
const isAppointmentDateAvailable = (appointmentDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const apptDate = new Date(appointmentDate);
  apptDate.setHours(0, 0, 0, 0);

  // Can only book for today or tomorrow
  if (apptDate.getTime() !== today.getTime() && apptDate.getTime() !== tomorrow.getTime()) {
    return {
      available: false,
      reason: 'Appointments can only be booked for today or tomorrow',
      bookableUntil: 'tomorrow'
    };
  }

  return { available: true };
};

/**
 * Get dashboard stats for admin
 * @returns {Promise<Object>} - Stats object
 */
const getOffDutyStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalPending,
    totalApproved,
    totalRejected,
    pendingRequests,
    approvedToday,
    upcomingApproved
  ] = await Promise.all([
    DoctorOffDutyRequest.countDocuments({ status: 'pending' }),
    DoctorOffDutyRequest.countDocuments({ status: 'approved' }),
    DoctorOffDutyRequest.countDocuments({ status: 'rejected' }),
    DoctorOffDutyRequest.countDocuments({ status: 'pending', date: { $gte: today } }),
    DoctorOffDutyRequest.countDocuments({ status: 'approved', approvedAt: { $gte: today } }),
    DoctorOffDutyRequest.countDocuments({ 
      status: 'approved', 
      date: { $gte: today, $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) }
    })
  ]);

  return {
    totalPending,
    totalApproved,
    totalRejected,
    pendingRequests,
    approvedToday,
    upcomingApproved
  };
};

module.exports = {
  createOffDutyRequest,
  findAffectedAppointments,
  rescheduleAppointment,
  approveOffDutyRequest,
  rejectOffDutyRequest,
  getOffDutyRequests,
  getDoctorOffDutyStatus,
  isAppointmentDateAvailable,
  getOffDutyStats,
  getCurrentSession,
  getTodayIST,
  getSessionFromTimeSlot
};
