/**
 * Notification Service
 * Handles all email notifications for appointments
 */

const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

/**
 * Send appointment confirmation email
 */
const sendAppointmentConfirmation = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email' }
      });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Build estimatedTime string from Date if present
    let estimatedTimeStr = null;
    if (appointment.estimatedStartTime) {
      const est = new Date(appointment.estimatedStartTime);
      estimatedTimeStr = `${est.getHours()}:${String(est.getMinutes()).padStart(2, '0')}`;
    }

    const template = emailTemplates.appointmentConfirmation({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      department: appointment.doctor.specialization,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      visitType: appointment.visitType || 'Consultation',
      duration: appointment.duration || 30,
      reason: appointment.reason,
      mode: appointment.mode || appointment.consultationType || 'in-person',
      session: appointment.session,
      queuePosition: appointment.queuePosition,
      estimatedTime: estimatedTimeStr
    });

    await sendEmail({
      to: appointment.patient.email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Confirmation email sent to ${appointment.patient.email}`);
    return { success: true, email: appointment.patient.email };
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send appointment reminder email
 */
const sendReminder = async (appointmentId, hoursUntil = 24) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email' }
      });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.reminderSent) {
      console.log(`Reminder already sent for appointment ${appointmentId}`);
      return { success: false, reason: 'Reminder already sent' };
    }

    const template = emailTemplates.appointmentReminder({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      department: appointment.doctor.specialization,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      visitType: appointment.visitType || 'Consultation',
      hoursUntil
    });

    await sendEmail({
      to: appointment.patient.email,
      subject: template.subject,
      html: template.html
    });

    await Appointment.findByIdAndUpdate(appointmentId, {
      reminderSent: true,
      reminderSentAt: new Date()
    });

    console.log(`✅ Reminder email sent to ${appointment.patient.email}`);
    return { success: true, email: appointment.patient.email };
  } catch (error) {
    console.error('❌ Error sending reminder email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send cancellation notice to patient AND doctor
 */
const sendCancellationNotice = async (appointmentId, cancelledBy = 'Patient', reason = '') => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email' }
      });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // ✅ Professional templates for cancellation
    const template = emailTemplates.appointmentCancellation({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      department: appointment.doctor.specialization,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      cancelledBy,
      reason
    });

    // ✅ Send email to PATIENT
    try {
      await sendEmail({
        to: appointment.patient.email,
        subject: template.subject,
        html: template.html
      });
      console.log(`✅ Cancellation email sent to patient: ${appointment.patient.email}`);
    } catch (patientEmailErr) {
      console.error('❌ Error sending cancellation email to patient:', patientEmailErr.message);
    }

    // ✅ Send email to DOCTOR (professional notification)
    if (appointment.doctor.user.email) {
      const doctorTemplate = emailTemplates.appointmentCancellation({
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.user.name,
        department: appointment.doctor.specialization,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        cancelledBy,
        reason
      });

      try {
        await sendEmail({
          to: appointment.doctor.user.email,
          subject: `[NOTIFICATION] ${doctorTemplate.subject}`,
          html: doctorTemplate.html
        });
        console.log(`✅ Cancellation notification sent to doctor: ${appointment.doctor.user.email}`);
      } catch (doctorEmailErr) {
        console.error('❌ Error sending cancellation email to doctor:', doctorEmailErr.message);
      }
    }

    return { 
      success: true, 
      emails: {
        patient: appointment.patient.email,
        doctor: appointment.doctor.user.email
      }
    };
  } catch (error) {
    console.error('❌ Error sending cancellation notice:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send reschedule notification
 */
const sendRescheduleNotification = async (appointmentId, oldDate, oldTime) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email' }
      });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const template = emailTemplates.appointmentRescheduled({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      department: appointment.doctor.specialization,
      oldDate,
      oldTime,
      newDate: appointment.date,
      newTime: appointment.timeSlot,
      visitType: appointment.visitType || 'Consultation'
    });

    await sendEmail({
      to: appointment.patient.email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Reschedule notification sent to ${appointment.patient.email}`);
    return { success: true, email: appointment.patient.email };
  } catch (error) {
    console.error('❌ Error sending reschedule notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send waitlist slot-available notification (existing logic)
 */
const sendWaitlistNotification = async (patientEmail, patientName, doctorName, date, timeSlot, visitType, expiresIn = '2 hours') => {
  try {
    const template = emailTemplates.waitlistNotification({
      patientName,
      doctorName,
      date,
      timeSlot,
      visitType,
      expiresIn
    });

    await sendEmail({
      to: patientEmail,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Waitlist notification sent to ${patientEmail}`);
    return { success: true, email: patientEmail };
  } catch (error) {
    console.error('❌ Error sending waitlist notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send waitlist confirmation email when patient joins the waitlist.
 * Includes their queue position and AI-derived probability score.
 */
const sendWaitlistConfirmation = async (waitlistEntryId) => {
  try {
    const Waitlist = require('../models/Waitlist');
    const entry = await Waitlist.findById(waitlistEntryId)
      .populate('patient', 'name email')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } });

    if (!entry) throw new Error('Waitlist entry not found');

    // Compute position among waiting entries for this doctor + date (priority desc, then FIFO)
    const startOfDay = new Date(entry.requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(entry.requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const aheadCount = await Waitlist.countDocuments({
      doctor: entry.doctor._id,
      status: 'waiting',
      requestedDate: { $gte: startOfDay, $lte: endOfDay },
      $or: [
        { priority: { $gt: entry.priority } },
        { priority: entry.priority, createdAt: { $lt: entry.createdAt } }
      ]
    });

    const waitlistPosition = aheadCount + 1;

    const template = emailTemplates.waitlistConfirmation({
      patientName: entry.patient.name,
      doctorName: entry.doctor.user.name,
      department: entry.doctor.specialization,
      requestedDate: entry.requestedDate,
      waitlistPosition,
      probability: entry.probabilityScore
    });

    await sendEmail({
      to: entry.patient.email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Waitlist confirmation sent to ${entry.patient.email} – position #${waitlistPosition}, probability ${entry.probabilityScore}%`);
    return { success: true, email: entry.patient.email, waitlistPosition, probability: entry.probabilityScore };
  } catch (error) {
    console.error('❌ Error sending waitlist confirmation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send delay notification to all affected patients for a doctor on a given day.
 * Updates their estimated arrival time based on cumulative delay.
 */
const sendDelayNotification = async (doctorId, date, delayMinutes) => {
  try {
    const doctor = await Doctor.findById(doctorId).populate('user', 'name');
    if (!doctor) throw new Error('Doctor not found');

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const affectedAppointments = await Appointment.find({
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    })
      .populate('patient', 'name email')
      .sort({ timeSlot: 1 });

    const { parseTimeToMinutes, minutesToTimeString } = require('../utils/slotGenerator');
    const results = [];

    for (const appt of affectedAppointments) {
      const baseTimeStr = appt.estimatedStartTime
        ? `${new Date(appt.estimatedStartTime).getHours()}:${String(new Date(appt.estimatedStartTime).getMinutes()).padStart(2, '0')}`
        : appt.timeSlot;

      const originalMins = parseTimeToMinutes(baseTimeStr);
      const updatedMins = originalMins + delayMinutes;
      const updatedTimeStr = minutesToTimeString(updatedMins);

      const template = emailTemplates.delayNotification({
        patientName: appt.patient.name,
        doctorName: doctor.user.name,
        date: appt.date,
        originalTime: baseTimeStr,
        updatedTime: updatedTimeStr,
        delayMinutes
      });

      await sendEmail({
        to: appt.patient.email,
        subject: template.subject,
        html: template.html
      });

      results.push({ appointmentId: appt._id, email: appt.patient.email, updatedTime: updatedTimeStr });
      // Throttle to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(`✅ Delay notifications sent to ${results.length} patients`);
    return { success: true, count: results.length, results };
  } catch (error) {
    console.error('❌ Error sending delay notifications:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send waitlist promotion email when a waitlisted patient gets a confirmed slot.
 */
const sendWaitlistPromotion = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } });

    if (!appointment) throw new Error('Appointment not found');

    const template = emailTemplates.waitlistPromotion({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      department: appointment.doctor.specialization,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      session: appointment.session,
      mode: appointment.mode || appointment.consultationType || 'in-person'
    });

    await sendEmail({
      to: appointment.patient.email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Waitlist promotion email sent to ${appointment.patient.email}`);
    return { success: true, email: appointment.patient.email };
  } catch (error) {
    console.error('❌ Error sending waitlist promotion email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send doctor schedule change notification to affected patients
 */
const sendScheduleChangeNotification = async (doctorId, changeType, affectedDate, newSchedule = null) => {
  try {
    const doctor = await Doctor.findById(doctorId).populate('user', 'name');
    if (!doctor) throw new Error('Doctor not found');

    const startOfDay = new Date(affectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(affectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const affectedAppointments = await Appointment.find({
      doctor: doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    }).populate('patient', 'name email');

    const results = [];
    for (const appointment of affectedAppointments) {
      const template = emailTemplates.doctorScheduleChange({
        patientName: appointment.patient.name,
        doctorName: doctor.user.name,
        changeType,
        affectedDate,
        newSchedule
      });

      await sendEmail({
        to: appointment.patient.email,
        subject: template.subject,
        html: template.html
      });

      results.push({ success: true, email: appointment.patient.email });
    }

    console.log(`✅ Schedule change notifications sent to ${results.length} patients`);
    return { success: true, count: results.length, results };
  } catch (error) {
    console.error('❌ Error sending schedule change notifications:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk reminders for upcoming appointments (cron job target)
 */
const sendBulkReminders = async (hoursAhead = 24) => {
  try {
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const appointments = await Appointment.find({
      date: {
        $gte: new Date(now.getTime() + (hoursAhead - 1) * 60 * 60 * 1000),
        $lte: targetTime
      },
      status: { $in: ['pending', 'confirmed'] },
      reminderSent: { $ne: true }
    });

    console.log(`📧 Found ${appointments.length} appointments needing reminders`);

    const results = [];
    for (const appointment of appointments) {
      const result = await sendReminder(appointment._id, hoursAhead);
      results.push({ appointmentId: appointment._id, ...result });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { success: true, count: results.length, results };
  } catch (error) {
    console.error('❌ Error sending bulk reminders:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAppointmentConfirmation,
  sendReminder,
  sendCancellationNotice,
  sendRescheduleNotification,
  sendWaitlistNotification,
  sendWaitlistConfirmation,
  sendDelayNotification,
  sendWaitlistPromotion,
  sendScheduleChangeNotification,
  sendBulkReminders
};
