/**
 * Admin Doctor Controller - Off-Duty Request Management
 * 
 * File: backend/controllers/adminDoctorController.js
 * 
 * This file handles admin approval/rejection of doctor off-duty requests,
 * automatic rescheduling of affected appointments, and patient notifications.
 */

const DoctorOffDutyRequest = require('../models/DoctorOffDutyRequest');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const notificationService = require('../services/notificationService');
const asyncHandler = require('express-async-handler');
const moment = require('moment-timezone');

const IST = 'Asia/Kolkata';

/**
 * @desc    Approve doctor off-duty request
 * @details Automatically reschedules affected appointments, notifies patients
 * @route   POST /api/v1/admin/off-duty/request/:id/approve
 * @access  Private/Admin
 */
const approveOffDutyRequest = asyncHandler(async (req, res, next) => {
  const { adminRemarks = '' } = req.body || {};

  // Fetch and validate the off-duty request
  const offDutyRequest = await DoctorOffDutyRequest.findById(req.params.id)
    .populate({
      path: 'doctor',
      select: 'specialization',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

  if (!offDutyRequest) {
    res.status(404);
    throw new Error('Off-duty request not found');
  }

  // Can only approve pending requests
  if (offDutyRequest.status !== 'pending') {
    res.status(400);
    throw new Error(`Cannot approve request with status: ${offDutyRequest.status}`);
  }

  console.log(`\n📋 Processing off-duty request approval for Dr. ${offDutyRequest.doctor.user.name}`);
  console.log(`   Date: ${offDutyRequest.date}, Session: ${offDutyRequest.session}`);

  try {
    // ============================================
    // STEP 1: Find all affected appointments
    // ============================================
    
    const requestDate = moment(offDutyRequest.date).tz(IST);
    const dayStart = requestDate.clone().startOf('day').toDate();
    const dayEnd = requestDate.clone().endOf('day').toDate();

    const affectedAppointments = await Appointment.find({
      doctor: offDutyRequest.doctor._id,
      date: { $gte: dayStart, $lte: dayEnd },
      session: offDutyRequest.session,
      status: { $in: ['pending', 'confirmed', 'scheduled'] }
    }).populate('patient', 'name email');

    console.log(`   Found ${affectedAppointments.length} affected appointments`);

    // ============================================
    // STEP 2: Process each affected appointment
    // ============================================

    const rescheduledAppointments = [];
    const cancelledAppointments = [];
    const notificationQueue = [];

    for (const appointment of affectedAppointments) {
      console.log(`\n   Processing appointment: ${appointment.patient.name}`);

      try {
        // Try to find an alternate doctor with same specialization
        const alternateDoctor = await Doctor.findOne({
          _id: { $ne: offDutyRequest.doctor._id },
          specialization: offDutyRequest.doctor.specialization,
          active: true,
          availability: {
            $in: [
              ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
                requestDate.day()
              ]
            ]
          }
        }).populate('user', 'name email');

        if (alternateDoctor) {
          // ✅ RESCHEDULE to alternate doctor
          
          const oldDoctorName = offDutyRequest.doctor.user.name;
          const newDoctorName = alternateDoctor.user.name;

          appointment.doctor = alternateDoctor._id;
          appointment.doctorName = newDoctorName;
          appointment.rescheduledFrom = appointment._id;
          appointment.rescheduleReason = 'Doctor is on leave';
          appointment.rescheduleDate = new Date();
          appointment.isRescheduled = true;

          await appointment.save();
          rescheduledAppointments.push(appointment);

          console.log(`   ✅ Rescheduled to Dr. ${newDoctorName}`);

          // Queue notification for rescheduled appointment
          notificationQueue.push({
            type: 'appointment_rescheduled_offduty',
            patientName: appointment.patient.name,
            patientEmail: appointment.patient.email,
            oldDoctorName: oldDoctorName,
            newDoctorName: newDoctorName,
            appointmentDate: appointment.date,
            timeSlot: appointment.timeSlot,
            session: appointment.session
          });
        } else {
          // ❌ NO ALTERNATE: Cancel appointment
          
          appointment.status = 'cancelled';
          appointment.cancelledBy = 'system';
          appointment.cancelReason = `Dr. ${offDutyRequest.doctor.user.name} is unavailable. Please reschedule.`;
          appointment.cancelledAt = new Date();

          await appointment.save();
          cancelledAppointments.push(appointment);

          console.log(`   ❌ Cancelled (no alternate doctor available)`);

          // Queue notification for cancelled appointment
          notificationQueue.push({
            type: 'appointment_cancelled_offduty',
            patientName: appointment.patient.name,
            patientEmail: appointment.patient.email,
            doctorName: offDutyRequest.doctor.user.name,
            appointmentDate: appointment.date,
            timeSlot: appointment.timeSlot,
            reason: offDutyRequest.reason || 'Doctor requested time off'
          });
        }
      } catch (apptErr) {
        console.error(`   ⚠️ Error processing appointment:`, apptErr.message);
      }
    }

    // ============================================
    // STEP 3: Update off-duty request
    // ============================================

    offDutyRequest.status = 'approved';
    offDutyRequest.approvedAt = new Date();
    offDutyRequest.approvedBy = req.user._id;
    offDutyRequest.adminRemarks = adminRemarks || 'Approved by admin';
    offDutyRequest.affectedAppointmentsCount = affectedAppointments.length;

    await offDutyRequest.save();

    console.log(`   Updated request status to: approved`);

    // ============================================
    // STEP 4: Send notifications
    // ============================================

    console.log(`\n   📧 Sending ${notificationQueue.length} notifications...`);

    for (const notification of notificationQueue) {
      try {
        if (notification.type === 'appointment_rescheduled_offduty') {
          await notificationService.sendAppointmentRescheduled({
            patientName: notification.patientName,
            patientEmail: notification.patientEmail,
            doctorName: notification.newDoctorName,
            oldDoctorName: notification.oldDoctorName,
            appointmentDate: notification.appointmentDate,
            timeSlot: notification.timeSlot,
            visitType: 'Rescheduled Consultation',
            duration: 30
          });
          console.log(`      ✅ Rescheduled email sent to ${notification.patientEmail}`);
        } else if (notification.type === 'appointment_cancelled_offduty') {
          // Send custom cancellation email
          await sendEmailFunc({
            to: notification.patientEmail,
            subject: `Your Appointment Has Been Cancelled – ${process.env.HOSPITAL_NAME}`,
            html: getCancelledDueToOffDutyEmailHTML({
              patientName: notification.patientName,
              doctorName: notification.doctorName,
              appointmentDate: notification.appointmentDate,
              timeSlot: notification.timeSlot,
              reason: notification.reason
            })
          });
          console.log(`      ✅ Cancellation email sent to ${notification.patientEmail}`);
        }
      } catch (emailErr) {
        console.error(`      ⚠️ Failed to send notification to ${notification.patientEmail}:`, emailErr.message);
      }
    }

    // ============================================
    // STEP 5: Send response
    // ============================================

    console.log(`\n✅ Off-duty request approved successfully!\n`);

    res.status(200).json({
      success: true,
      message: `Off-duty request approved. ${rescheduledAppointments.length} appointments rescheduled, ${cancelledAppointments.length} cancelled. All affected patients notified.`,
      data: {
        offDutyRequest,
        summary: {
          totalAffected: affectedAppointments.length,
          rescheduled: rescheduledAppointments.length,
          cancelled: cancelledAppointments.length,
          notificationsSent: notificationQueue.length
        }
      }
    });
  } catch (err) {
    console.error('❌ Error approving off-duty request:', err);
    
    // Rollback: set request back to pending if error occurred mid-process
    offDutyRequest.status = 'pending';
    await offDutyRequest.save();

    res.status(500);
    throw new Error(`Failed to approve off-duty request: ${err.message}`);
  }
});

/**
 * @desc    Reject doctor off-duty request
 * @route   POST /api/v1/admin/off-duty/request/:id/reject
 * @access  Private/Admin
 */
const rejectOffDutyRequest = asyncHandler(async (req, res, next) => {
  const { rejectionReason = 'Request does not meet approval criteria' } = req.body || {};

  const offDutyRequest = await DoctorOffDutyRequest.findById(req.params.id)
    .populate({
      path: 'doctor',
      select: 'specialization',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

  if (!offDutyRequest) {
    res.status(404);
    throw new Error('Off-duty request not found');
  }

  if (offDutyRequest.status !== 'pending') {
    res.status(400);
    throw new Error(`Cannot reject request with status: ${offDutyRequest.status}`);
  }

  // Update request
  offDutyRequest.status = 'rejected';
  offDutyRequest.rejectedAt = new Date();
  offDutyRequest.rejectedBy = req.user._id;
  offDutyRequest.adminRemarks = rejectionReason || 'Request does not meet approval criteria';

  await offDutyRequest.save();

  // Send rejection notification to doctor
  try {
    await sendEmailFunc({
      to: offDutyRequest.doctor.user.email,
      subject: `Your Off-Duty Request Has Been Rejected – ${process.env.HOSPITAL_NAME}`,
      html: getRejectionEmailHTML({
        doctorName: offDutyRequest.doctor.user.name,
        date: offDutyRequest.date,
        session: offDutyRequest.session,
        reason: offDutyRequest.adminRemarks
      })
    });
  } catch (err) {
    console.error('Error sending rejection email:', err);
  }

  res.status(200).json({
    success: true,
    message: 'Off-duty request rejected. Doctor has been notified via email.',
    data: offDutyRequest
  });
});

/**
 * @desc    Get all off-duty requests (with filters)
 * @route   GET /api/v1/admin/off-duty/requests
 * @access  Private/Admin
 */
const getAllOffDutyRequests = asyncHandler(async (req, res, next) => {
  console.log('GET /admin/off-duty/requests hit with query:', req.query);
  const { status, doctorId, dateFrom, dateTo } = req.query;

  const query = {};

  // Filter by status (strict check for pending/approved/rejected)
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query.status = status;
  }

  // Filter by doctor
  if (doctorId) {
    query.doctor = doctorId;
  }

  // Filter by date range
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) {
      query.date.$gte = moment(dateFrom).tz(IST).startOf('day').toDate();
    }
    if (dateTo) {
      query.date.$lte = moment(dateTo).tz(IST).endOf('day').toDate();
    }
  }

  console.log('Executing query:', JSON.stringify(query));

  const requests = await DoctorOffDutyRequest.find(query)
    .populate({
      path: 'doctor',
      select: 'specialization',
      populate: {
        path: 'user',
        select: 'name email'
      }
    })
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .sort({ requestedAt: -1 });

  console.log(`Found ${requests.length} requests`);

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests
  });
});

/**
 * @desc    Get dashboard statistics for off-duty requests
 * @route   GET /api/v1/admin/off-duty/stats
 * @access  Private/Admin
 */
const getOffDutyStats = asyncHandler(async (req, res, next) => {
  const today = moment().tz(IST).startOf('day').toDate();
  const thisMonth = moment().tz(IST).startOf('month').toDate();
  const thisYear = moment().tz(IST).startOf('year').toDate();

  const [
    totalPending,
    totalApproved,
    totalRejected,
    pendingToday,
    approvedThisMonth,
    approvedThisYear
  ] = await Promise.all([
    DoctorOffDutyRequest.countDocuments({ status: 'pending' }),
    DoctorOffDutyRequest.countDocuments({ status: 'approved' }),
    DoctorOffDutyRequest.countDocuments({ status: 'rejected' }),
    DoctorOffDutyRequest.countDocuments({ status: 'pending', requestedAt: { $gte: today } }),
    DoctorOffDutyRequest.countDocuments({ status: 'approved', approvedAt: { $gte: thisMonth } }),
    DoctorOffDutyRequest.countDocuments({ status: 'approved', approvedAt: { $gte: thisYear } })
  ]);

  res.status(200).json({
    success: true,
    data: {
      pending: totalPending,
      approved: totalApproved,
      rejected: totalRejected,
      pendingToday,
      approvedThisMonth,
      approvedThisYear
    }
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const sendEmailFunc = require('../utils/sendEmail');

function getCancelledDueToOffDutyEmailHTML(data) {
  const { patientName, doctorName, appointmentDate, timeSlot, reason } = data;
  const appointmentDateStr = moment(appointmentDate).tz('Asia/Kolkata').format('DD MMM YYYY');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; }
        .header h2 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .alert-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .alert-title { color: #991b1b; font-weight: bold; font-size: 16px; margin: 0 0 10px 0; }
        .alert-content { color: #7f1d1d; font-size: 14px; line-height: 1.6; margin: 0; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ Appointment Cancelled</h2>
        </div>
        <div class="content">
          <p>Dear ${patientName},</p>
          
          <p>We regret to inform you that your appointment has been cancelled.</p>
          
          <div class="alert-box">
            <p class="alert-title">Appointment Details</p>
            <p class="alert-content">
              <strong>Doctor:</strong> Dr. ${doctorName}<br>
              <strong>Date & Time:</strong> ${appointmentDateStr} at ${timeSlot}<br>
              <strong>Reason:</strong> ${reason}
            </p>
          </div>

          <p>We sincerely apologize for any inconvenience caused. We encourage you to:</p>
          <ul>
            <li>Schedule an appointment with another available doctor from our team</li>
            <li>Choose an alternative date with the same doctor once they return</li>
            <li>Contact our appointment desk for assistance with rescheduling</li>
          </ul>

          <a href="${process.env.HOSPITAL_APP_URL || 'https://hospital.com'}/patient/appointments" class="button">Reschedule Now</a>

          <p>If you have any questions, please don't hesitate to contact us at <strong>${process.env.HOSPITAL_PHONE || '+91-XXXX-XXXX'}</strong>.</p>
        </div>
        <div class="footer">
          <p><strong>${process.env.HOSPITAL_NAME || 'NeoTherapy Hospital'}</strong><br>Quality Healthcare, Compassionate Care</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getRejectionEmailHTML(data) {
  const { doctorName, date, session, reason } = data;
  const dateStr = moment(date).tz('Asia/Kolkata').format('DD MMM YYYY');
  const sessionStr = session === 'morning' ? 'Morning (9 AM - 12 PM)' : 'Afternoon (1 PM - 5 PM)';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Off-Duty Request Status</h2>
        </div>
        <div class="content">
          <p>Dear Dr. ${doctorName},</p>
          
          <p>Your off-duty request has been reviewed and rejected.</p>
          
          <div class="info-box">
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Session:</strong> ${sessionStr}</p>
            <p><strong>Status:</strong> Rejected</p>
            <p><strong>Reason:</strong> ${reason}</p>
          </div>

          <p>You are expected to be available for your scheduled appointments. If you have extraordinary circumstances or wish to appeal this decision, please contact the administration office.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  approveOffDutyRequest,
  rejectOffDutyRequest,
  getAllOffDutyRequests,
  getOffDutyStats
};
