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

    const template = emailTemplates.appointmentConfirmation({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      visitType: appointment.visitType || 'Consultation',
      duration: appointment.duration || 30,
      reason: appointment.reason
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

    // Mark reminder as sent
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
 * Send cancellation notice
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

    const template = emailTemplates.appointmentCancellation({
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.user.name,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      cancelledBy,
      reason
    });

    await sendEmail({
      to: appointment.patient.email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Cancellation notice sent to ${appointment.patient.email}`);
    return { success: true, email: appointment.patient.email };
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
 * Send waitlist notification when a slot becomes available
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
 * Send doctor schedule change notification to affected patients
 */
const sendScheduleChangeNotification = async (doctorId, changeType, affectedDate, newSchedule = null) => {
  try {
    const doctor = await Doctor.findById(doctorId).populate('user', 'name');
    
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Find all appointments on the affected date
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
 * Send bulk reminders for upcoming appointments
 * Should be called by a cron job
 */
const sendBulkReminders = async (hoursAhead = 24) => {
  try {
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    // Find appointments happening within the time window that haven't received reminders
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
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
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
  sendScheduleChangeNotification,
  sendBulkReminders
};
