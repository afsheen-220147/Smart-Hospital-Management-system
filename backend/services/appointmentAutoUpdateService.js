/**
 * Appointment Auto-Update Service
 * Handles automatic status updates for expired appointments
 * Runs as a scheduled cron job every 2 minutes
 */

const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const notificationService = require('./notificationService');

// Store cron job instance for cleanup
let cronJob = null;

/**
 * Parse time slot string (e.g., "14:30") into Date
 */
const parseTimeSlot = (date, timeSlot) => {
  try {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const apptDate = new Date(date);
    apptDate.setHours(hours, minutes, 0, 0);
    return apptDate;
  } catch (error) {
    console.error('Error parsing time slot:', timeSlot, error);
    return null;
  }
};

/**
 * Find and update expired appointments
 * Criteria: status = "confirmed" AND appointment time < current time
 */
const updateExpiredAppointments = async () => {
  try {
    const now = new Date();
    console.log(`\n[${now.toISOString()}] Running appointment auto-update check...`);

    // Find all confirmed appointments where the appointment time has passed
    // We fetch all unfinished appointments and check each one individually
    const expiredAppointments = await Appointment.find({
      status: { $in: ['confirmed', 'pending'] }, // Only open appointments
      cancelledBy: null, // Not already cancelled or marked no-show
      checkedIn: false, // Not checked in
      $expr: {
        // Check if appointment date is in the past (accounting for timezone awareness)
        $lt: [
          { $dateAdd: { startDate: '$date', unit: 'minute', amount: { $ifNull: ['$duration', 30] } } },
          now
        ]
      }
    })
      .populate('patient', 'name email')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email' }
      })
      .lean(false); // Need non-lean for save()

    console.log(`Found ${expiredAppointments.length} appointments to check for cancellation...`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const appointment of expiredAppointments) {
      try {
        // Parse the time slot to get exact appointment time
        const appointmentTime = parseTimeSlot(appointment.date, appointment.timeSlot);
        
        if (!appointmentTime) {
          console.warn(`Could not parse time for appointment ${appointment._id}`);
          continue;
        }

        // Add duration to get appointment end time
        const duration = appointment.duration || 30; // default 30 mins
        const appointmentEndTime = new Date(appointmentTime.getTime() + duration * 60000);

        // Check if current time is past the appointment end time AND not attended
        if (now > appointmentEndTime) {
          console.log(`Cancelling appointment ${appointment._id} - Time passed (Doctor: ${appointment.doctorName}, Patient: ${appointment.patientName})`);

          // Update appointment status to CANCELLED (not no-show)
          appointment.status = 'cancelled';
          appointment.cancelledAt = now;
          appointment.cancelledBy = 'system';
          appointment.cancellationReason = 'Appointment cancelled automatically - scheduled time has passed'; // Fixed field name
          
          await appointment.save();
          updatedCount++;

          // Send notification email to patient
          try {
            // Prepare data for email template
            const emailData = {
              patientName: appointment.patient.name || 'Patient',
              doctorName: appointment.doctor?.user?.name || 'Doctor',
              department: appointment.doctor?.specialization || 'General',
              date: appointment.date,
              timeSlot: appointment.timeSlot,
              cancelledBy: 'System',
              reason: 'Your appointment has been automatically cancelled as the scheduled time has passed without check-in.'
            };

            // Use the existing cancellation email template
            const emailTemplates = require('../utils/emailTemplates');
            const template = emailTemplates.appointmentCancellation(emailData);

            await require('../utils/sendEmail')({
              email: appointment.patient.email,
              subject: template.subject,
              message: template.html,
              isHtml: true
            });

            console.log(`✅ Cancellation notification email sent to ${appointment.patient.email}`);
          } catch (emailError) {
            console.error(`⚠️  Failed to send cancellation email for appointment ${appointment._id}:`, emailError.message);
            // Don't throw - email failure shouldn't block update
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing appointment ${appointment._id}:`, error.message);
      }
    }

    console.log(`✅ Appointment auto-update completed: ${updatedCount} cancelled, ${errorCount} errors\n`);
    return { updated: updatedCount, errors: errorCount };
  } catch (error) {
    console.error('Critical error in updateExpiredAppointments:', error);
  }
};

/**
 * Start the cron job scheduler
 * Runs every 2 minutes (configurable)
 * 
 * Cron format: minute hour day month day-of-week
 */
const startAppointmentAutoUpdateJob = () => {
  if (cronJob) {
    console.log('Appointment auto-update job already running');
    return;
  }

  // Run every 2 minutes
  cronJob = cron.schedule('*/2 * * * *', async () => {
    try {
      await updateExpiredAppointments();
    } catch (error) {
      console.error('❌ Critical error in appointment auto-update cron job:', error);
      // Don't rethrow - allow server to continue operating
    }
  });

  console.log('✅ Appointment auto-update job started (runs every 2 minutes)');
};

/**
 * Stop the cron job scheduler
 */
const stopAppointmentAutoUpdateJob = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('Appointment auto-update job stopped');
  }
};

/**
 * Manual trigger for one-time update (useful for testing or manual runs)
 */
const triggerManualUpdate = async () => {
  console.log('Manual appointment update triggered');
  return await updateExpiredAppointments();
};

module.exports = {
  startAppointmentAutoUpdateJob,
  stopAppointmentAutoUpdateJob,
  triggerManualUpdate,
  updateExpiredAppointments
};
