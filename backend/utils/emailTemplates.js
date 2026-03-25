/**
 * NeoTherapy Hospital - Professional Email Templates (Enterprise Grade)
 * Tone: Clinical, Formal, Trustworthy
 */

const HOSPITAL_NAME = 'NeoTherapy Hospital';
const HOSPITAL_ADDRESS = 'Healthcare Avenue, Medical District, India';
const HOSPITAL_PHONE = '+91-XXXXXXXXXX';
const HOSPITAL_EMAIL = 'support@neotherapy.com';
const HOSPITAL_WEBSITE = 'www.neotherapy.com';

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// ✅ Professional Base Styles for NeoTherapy Hospital
const baseStyles = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #374151; background-color: #f4f6f8; }
    .email-wrapper { 
      width: 100%;
      max-width: 600px; 
      margin: 0 auto; 
      border: 1px solid #e1e8f0;
    }
    .header { background: #1e3a8a; color: #ffffff; padding: 26px; text-align: center; }
    .header h1 { font-size: 22px; font-weight: 600; margin: 0; }
    .header-tagline { font-size: 13px; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; }
    .content { padding: 30px; background: rgba(255, 255, 255, 0.93); }
    .greeting { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 12px; }
    .intro-text { font-size: 14px; color: #374151; margin-bottom: 16px; line-height: 1.6; }
    .alert-box { padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }
    .alert-warning { background: #fef3c7; border-color: #fcd34d; }
    .alert-info { background: #dbeafe; border-color: #93c5fd; }
    .alert-success { background: #dcfce7; border-color: #86efac; }
    .alert-danger { background: #fee2e2; border-color: #fca5a5; }
    .alert-title { font-weight: 600; margin-bottom: 4px; color: #374151; }
    .alert-text { font-size: 13px; color: #374151; }
    .details-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0; background: #f9fafb; }
    .detail-row { padding: 8px 0; }
    .detail-label { font-weight: 600; color: #374151; }
    .detail-value { color: #1f2937; margin-top: 2px; font-size: 14px; }
    .footer { background: #f8fafc; padding: 20px; font-size: 12px; color: #6b7280; text-align: center; }
    .footer-brand { font-weight: 600; color: #1f2937; margin-bottom: 8px; }
    .footer-contact { margin: 8px 0; line-height: 1.8; }
    .footer-legal { margin-top: 10px; font-size: 11px; color: #9ca3af; }
    .cta-button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .cta-button:hover { background: #1e40af; }
  </style>
`;

// ✅ Professional Email Header
const emailHeader = (title = HOSPITAL_NAME) => `
  <div class="header">
    <div style="margin-bottom: 12px; display: inline-block;">
      <img src="cid:logo" alt="NeoTherapy Logo" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid white; background: white; object-fit: cover;" />
    </div>
    <h1 style="display: block;">${HOSPITAL_NAME}</h1>
    <p class="header-tagline">on one click</p>
  </div>
`;

// ✅ Professional Email Footer
const emailFooter = () => `
  <div class="footer">
    <div class="footer-brand">${HOSPITAL_NAME}</div>
    <div class="footer-contact">
      <p>${HOSPITAL_ADDRESS}</p>
      <p>Phone: ${HOSPITAL_PHONE} | Email: ${HOSPITAL_EMAIL}</p>
    </div>
    <div class="footer-legal">
      © ${new Date().getFullYear()} ${HOSPITAL_NAME}. All rights reserved.<br>
      This communication contains confidential medical information intended only for the recipient.
    </div>
  </div>
`;

/**
 * Appointment Confirmation Email
 */
const appointmentConfirmation = ({ patientName, doctorName, department, date, timeSlot, visitType, duration, reason, location, mode, session, queuePosition, estimatedTime }) => ({
  subject: `Appointment Confirmed – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Your appointment with Dr. ${doctorName} has been successfully scheduled at ${HOSPITAL_NAME}.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Appointment Details</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Scheduled Time:</span> <span class="detail-value">${formatTime(timeSlot)}</span></div>
                ${estimatedTime ? `<div class="detail-row"><span class="detail-label">Estimated Start:</span> <span class="detail-value">${formatTime(estimatedTime)}</span></div>` : ''}
                ${queuePosition ? `<div class="detail-row"><span class="detail-label">Queue Position:</span> <span class="detail-value">#${queuePosition}</span></div>` : ''}
                <div class="detail-row"><span class="detail-label">Visit Type:</span> <span class="detail-value">${visitType}</span></div>
                <div class="detail-row"><span class="detail-label">Mode:</span> <span class="detail-value">${mode === 'video' ? 'Video Consultation' : 'In-Person Visit'}</span></div>
                ${session ? `<div class="detail-row"><span class="detail-label">Session:</span> <span class="detail-value">${session.charAt(0).toUpperCase() + session.slice(1)}</span></div>` : ''}
                <div class="detail-row"><span class="detail-label">Duration:</span> <span class="detail-value">${duration} minutes</span></div>
                ${reason ? `<div class="detail-row"><span class="detail-label">Reason for Visit:</span> <span class="detail-value">${reason}</span></div>` : ''}
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">Please Note</div>
                  <div class="alert-text">Please arrive 10 minutes early to allow time for check-in and any necessary paperwork. Your presence is important for maintaining the clinic schedule.</div>
                </div>
              </div>
              
              <div class="details-card" style="background: #f0f9ff; border-left: 4px solid #1e3a8a;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Hospital Location</div>
                <div style="color: #374151; font-size: 14px;">${location || HOSPITAL_ADDRESS}</div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Appointment Reminder Email
 */
const appointmentReminder = ({ patientName, doctorName, department, date, timeSlot, visitType, hoursUntil }) => ({
  subject: `Appointment Reminder – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">This is a reminder about your upcoming appointment with Dr. ${doctorName} ${hoursUntil <= 24 ? 'tomorrow' : 'in a few days'}.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Appointment Details</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Time:</span> <span class="detail-value">${formatTime(timeSlot)}</span></div>
                <div class="detail-row"><span class="detail-label">Visit Type:</span> <span class="detail-value">${visitType}</span></div>
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">What to Bring</div>
                  <div class="alert-text">• Valid identification and insurance card<br>• List of current medications<br>• Relevant medical records or test results<br>• Any referral letters if applicable</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Appointment Cancellation Email
 */
const appointmentCancellation = ({ patientName, doctorName, department, date, timeSlot, cancelledBy, reason }) => ({
  subject: `Appointment Cancelled – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Your appointment has been cancelled. Details are provided below for your records.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Cancelled Appointment</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Time:</span> <span class="detail-value">${formatTime(timeSlot)}</span></div>
                <div class="detail-row"><span class="detail-label">Cancelled By:</span> <span class="detail-value">${cancelledBy}</span></div>
                ${reason ? `<div class="detail-row"><span class="detail-label">Reason:</span> <span class="detail-value">${reason}</span></div>` : ''}
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">Reschedule Your Appointment</div>
                  <div class="alert-text">You can easily book a new appointment through our patient portal or by contacting our appointment desk.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Appointment Rescheduled Email
 */
const appointmentRescheduled = ({ patientName, doctorName, department, oldDate, oldTime, newDate, newTime, visitType }) => ({
  subject: `Appointment Rescheduled – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Your appointment has been rescheduled. Please review the updated details below.</p>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">Previous Appointment</div>
                  <div class="alert-text">Cancelled: ${formatDate(oldDate)} at ${formatTime(oldTime)}</div>
                </div>
              </div>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">New Appointment Details</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(newDate)}</span></div>
                <div class="detail-row"><span class="detail-label">Time:</span> <span class="detail-value">${formatTime(newTime)}</span></div>
                <div class="detail-row"><span class="detail-label">Visit Type:</span> <span class="detail-value">${visitType}</span></div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});
/**
 * Waitlist Notification Email
 */
const waitlistNotification = ({ patientName, doctorName, department, date, timeSlot, visitType, expiresIn }) => ({
  subject: `Appointment Slot Available – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">A slot has become available for your requested appointment with Dr. ${doctorName}.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Available Slot Details</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Time:</span> <span class="detail-value">${formatTime(timeSlot)}</span></div>
                <div class="detail-row"><span class="detail-label">Visit Type:</span> <span class="detail-value">${visitType}</span></div>
              </div>
              
              <div class="alert-box alert-warning">
                <div class="alert-content">
                  <div class="alert-title">Time Sensitive</div>
                  <div class="alert-text">This slot will expire in ${expiresIn}. Please book immediately to secure your appointment.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Waitlist Confirmation Email
 */
const waitlistConfirmation = ({ patientName, doctorName, department, date, session, requestedDate, waitlistPosition, probability }) => ({
  subject: `Waitlist Confirmation – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">You have been added to the waitlist for Dr. ${doctorName}. We will notify you by email as soon as a slot becomes available.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Waitlist Details</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Requested Date:</span> <span class="detail-value">${formatDate(requestedDate || date)}</span></div>
                ${session ? `<div class="detail-row"><span class="detail-label">Preferred Session:</span> <span class="detail-value">${session.charAt(0).toUpperCase() + session.slice(1)}</span></div>` : ''}
                ${waitlistPosition ? `<div class="detail-row"><span class="detail-label">Your Position:</span> <span class="detail-value">#${waitlistPosition} in queue</span></div>` : ''}
                ${probability !== undefined && probability !== null ? `<div class="detail-row"><span class="detail-label">Confirmation Probability:</span> <span class="detail-value" style="color:#1e3a8a;font-weight:700;">${probability}% estimated</span></div>` : ''}
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">What Happens Next</div>
                  <div class="alert-text">You will receive an email notification the moment a confirmed slot becomes available. Please check your email promptly so you can accept or decline the offer.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Delay Notification Email
 */
const delayNotification = ({ patientName, doctorName, date, originalTime, updatedTime, delayMinutes }) => ({
  subject: `Schedule Update – Dr. ${doctorName} – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Dr. ${doctorName} is running approximately ${delayMinutes} minute(s) behind schedule on ${formatDate(date)}. Your estimated appointment time has been updated.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Updated Schedule</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Original Time:</span> <span class="detail-value" style="text-decoration:line-through;">${formatTime(originalTime)}</span></div>
                <div class="detail-row"><span class="detail-label">Updated Time:</span> <span class="detail-value" style="color:#1e3a8a;font-weight:600;">${formatTime(updatedTime)}</span></div>
                <div class="detail-row"><span class="detail-label">Delay:</span> <span class="detail-value">${delayMinutes} minutes</span></div>
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">No Action Required</div>
                  <div class="alert-text">Your appointment remains confirmed. Please plan to arrive at the updated time. We appreciate your patience.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Waitlist Promotion Email
 */
const waitlistPromotion = ({ patientName, doctorName, department, date, timeSlot, session, mode }) => ({
  subject: `Your Appointment is Confirmed – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Congratulations! Your waitlisted appointment with Dr. ${doctorName} has been confirmed. A slot has opened and has been assigned to you.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Confirmed Appointment Details</div>
                <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department || 'General'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(date)}</span></div>
                <div class="detail-row"><span class="detail-label">Time:</span> <span class="detail-value">${formatTime(timeSlot)}</span></div>
                ${session ? `<div class="detail-row"><span class="detail-label">Session:</span> <span class="detail-value">${session.charAt(0).toUpperCase() + session.slice(1)}</span></div>` : ''}
                <div class="detail-row"><span class="detail-label">Mode:</span> <span class="detail-value">${mode === 'video' ? 'Video Consultation' : 'In-Person Visit'}</span></div>
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">Please Note</div>
                  <div class="alert-text">Please arrive 10 minutes early to allow time for check-in and any necessary documentation.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});
/**
 * Doctor Schedule Change Email
 */
const doctorScheduleChange = ({ patientName, doctorName, changeType, affectedDate, newSchedule }) => ({
  subject: `Schedule Update – Dr. ${doctorName} – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">There has been a change to Dr. ${doctorName}'s schedule that may affect your appointment.</p>
              
              <div class="alert-box alert-warning">
                <div class="alert-content">
                  <div class="alert-title">${changeType}</div>
                  <div class="alert-text">Affected date: ${formatDate(affectedDate)}${newSchedule ? `<br>New schedule: ${newSchedule}` : ''}</div>
                </div>
              </div>
              
              <p style="color: #374151; font-size: 14px;">If you have an appointment on this date, please check your appointment status in your patient portal or contact our appointment desk to reschedule if necessary.</p>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Report Upload Confirmation Email
 */
const reportUploadConfirmation = ({ patientName, reportType, uploadDate, fileName, status }) => ({
  subject: `Report Uploaded Successfully – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Your medical report has been successfully uploaded to our system.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Upload Details</div>
                <div class="detail-row"><span class="detail-label">Report Type:</span> <span class="detail-value">${reportType || 'Medical Report'}</span></div>
                <div class="detail-row"><span class="detail-label">File Name:</span> <span class="detail-value">${fileName}</span></div>
                <div class="detail-row"><span class="detail-label">Upload Date:</span> <span class="detail-value">${formatDate(uploadDate)}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span> <span class="detail-value">${status || 'Processing'}</span></div>
              </div>
              
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">AI Analysis Available</div>
                  <div class="alert-text">You can use our AI Report Summarizer feature to get instant insights and analysis from your medical report.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Welcome Email for New Patients
 */
const welcomeEmail = ({ patientName, email }) => ({
  subject: `Welcome to ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Welcome to ${HOSPITAL_NAME}. We are honored to have you as part of our healthcare community and look forward to providing you with excellent clinical care.</p>
              
              <div class="alert-box alert-success">
                <div class="alert-content">
                  <div class="alert-title">Your Account is Ready</div>
                  <div class="alert-text">You can now access all of our digital health services and features.</div>
                </div>
              </div>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">What You Can Do</div>
                <div class="detail-row"><span class="detail-label">Book Appointments:</span> <span class="detail-value">Schedule visits with our specialists</span></div>
                <div class="detail-row"><span class="detail-label">View Medical Records:</span> <span class="detail-value">Access your complete health history</span></div>
                <div class="detail-row"><span class="detail-label">Upload Documents:</span> <span class="detail-value">Share medical reports and test results</span></div>
                <div class="detail-row"><span class="detail-label">AI Report Analysis:</span> <span class="detail-value">Get instant summarization of medical documents</span></div>
              </div>
              
              <div class="details-card" style="background: #f0f9ff; border-left: 4px solid #1e3a8a;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Visit Us</div>
                <div style="color: #374151; font-size: 14px;">${HOSPITAL_ADDRESS}</div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

/**
 * Diagnosis/Prescription Completion Email
 */
const diagnosisComplete = ({ patientName, doctorName, department, diagnosis, prescription, recordType, visitDate, followUpNotes }) => ({
  subject: `Your Diagnosis and Prescription – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <table class="email-wrapper" cellpadding="0" cellspacing="0" border="0" background="cid:watermark" style="background-image: url('cid:watermark'); background-repeat: no-repeat; background-position: center; background-size: 450px;">
        <tr>
          <td style="background-color: rgba(255, 255, 255, 0.93);">
            ${emailHeader()}
            <div class="content">
              <p class="greeting">Dear ${patientName},</p>
              <p class="intro-text">Your medical record has been finalized by Dr. ${doctorName}. Please login to your patient dashboard to view your complete diagnosis and prescription details.</p>
              
              <div class="details-card">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Visit Information</div>
                <div class="detail-row"><span class="detail-label">Attending Doctor:</span> <span class="detail-value">Dr. ${doctorName}</span></div>
                ${department ? `<div class="detail-row"><span class="detail-label">Department:</span> <span class="detail-value">${department}</span></div>` : ''}
                <div class="detail-row"><span class="detail-label">Visit Date:</span> <span class="detail-value">${formatDate(visitDate || new Date())}</span></div>
                <div class="detail-row"><span class="detail-label">Record Type:</span> <span class="detail-value">${recordType || 'Prescription'}</span></div>
              </div>

              ${diagnosis ? `
              <div class="details-card" style="border-left: 4px solid #1e3a8a;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Diagnosis</div>
                <p style="color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${diagnosis}</p>
              </div>` : ''}

              ${prescription ? `
              <div class="details-card" style="border-left: 4px solid #10b981;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">Prescribed Medication</div>
                <p style="color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${prescription}</p>
              </div>` : ''}

              ${followUpNotes ? `
              <div class="alert-box alert-info">
                <div class="alert-content">
                  <div class="alert-title">Follow-up Instructions</div>
                  <div class="alert-text">${followUpNotes}</div>
                </div>
              </div>` : ''}

              <div class="alert-box alert-warning">
                <div class="alert-content">
                  <div class="alert-title">Important</div>
                  <div class="alert-text">Please follow the prescribed medication schedule carefully. If you experience any adverse effects or have questions about your treatment, contact us immediately.</div>
                </div>
              </div>
            </div>
            ${emailFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
});

module.exports = {
  appointmentConfirmation,
  appointmentReminder,
  appointmentCancellation,
  appointmentRescheduled,
  waitlistNotification,
  waitlistConfirmation,
  delayNotification,
  waitlistPromotion,
  doctorScheduleChange,
  reportUploadConfirmation,
  welcomeEmail,
  diagnosisComplete,
  formatDate,
  formatTime,
  HOSPITAL_NAME,
  HOSPITAL_ADDRESS,
  HOSPITAL_PHONE,
  HOSPITAL_EMAIL
};
