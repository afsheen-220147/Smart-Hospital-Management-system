/**
 * Professional Email Templates for MediCare+ Hospital
 */

const HOSPITAL_NAME = 'MediCare+ Hospital';
const HOSPITAL_ADDRESS = '123 Healthcare Avenue, Medical District, City - 100001';
const HOSPITAL_PHONE = '+1 (800) 123-4567';
const HOSPITAL_EMAIL = 'support@medicareplus.com';
const HOSPITAL_WEBSITE = 'www.medicareplus.com';

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

const baseStyles = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
    .email-wrapper { max-width: 640px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 30px; text-align: center; }
    .header-logo { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
    .header-logo svg { width: 48px; height: 48px; }
    .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin: 0; }
    .header-tagline { font-size: 14px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 40px 30px; background: #ffffff; }
    .greeting { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px; }
    .intro-text { font-size: 16px; color: #4b5563; margin-bottom: 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 50px; font-weight: 600; font-size: 14px; margin-bottom: 24px; }
    .status-confirmed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-reminder { background: #fef3c7; color: #92400e; }
    .status-success { background: #dbeafe; color: #1e40af; }
    .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .details-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-icon { width: 24px; color: #2563eb; margin-right: 12px; font-size: 16px; }
    .detail-label { flex: 1; font-weight: 500; color: #64748b; }
    .detail-value { flex: 2; font-weight: 600; color: #1f2937; text-align: right; }
    .alert-box { padding: 16px 20px; border-radius: 8px; margin: 20px 0; display: flex; align-items: flex-start; gap: 12px; }
    .alert-warning { background: #fffbeb; border: 1px solid #fcd34d; }
    .alert-info { background: #eff6ff; border: 1px solid #93c5fd; }
    .alert-success { background: #f0fdf4; border: 1px solid #86efac; }
    .alert-danger { background: #fef2f2; border: 1px solid #fca5a5; }
    .alert-icon { font-size: 20px; flex-shrink: 0; }
    .alert-content { flex: 1; }
    .alert-title { font-weight: 600; margin-bottom: 4px; }
    .alert-text { font-size: 14px; color: #4b5563; }
    .cta-section { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); }
    .btn-secondary { background: #ffffff; color: #2563eb; border: 2px solid #2563eb; margin-left: 12px; }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; }
    .checklist { margin: 24px 0; padding: 0; }
    .checklist li { display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 15px; color: #374151; }
    .checklist li::before { content: "✓"; color: #10b981; font-weight: bold; }
    .location-card { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .location-title { font-weight: 600; color: #1e293b; margin-bottom: 8px; }
    .location-address { font-size: 14px; color: #64748b; }
    .footer { background: #1e293b; color: #94a3b8; padding: 32px 30px; text-align: center; }
    .footer-brand { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .footer-contact { font-size: 13px; line-height: 2; margin-bottom: 16px; }
    .footer-contact a { color: #60a5fa; text-decoration: none; }
    .footer-divider { height: 1px; background: #334155; margin: 20px 0; }
    .footer-legal { font-size: 12px; color: #64748b; }
    .social-links { margin: 16px 0; }
    .social-links a { display: inline-block; width: 36px; height: 36px; background: #334155; border-radius: 50%; margin: 0 6px; line-height: 36px; color: #94a3b8; text-decoration: none; }
  </style>
`;

const emailHeader = (icon = '🏥', title = 'MediCare+') => `
  <div class="header">
    <div class="header-logo">
      <span style="font-size: 40px;">${icon}</span>
    </div>
    <h1>${title}</h1>
    <p class="header-tagline">Your Health, Our Priority</p>
  </div>
`;

const emailFooter = () => `
  <div class="footer">
    <div class="footer-brand">${HOSPITAL_NAME}</div>
    <div class="footer-contact">
      📍 ${HOSPITAL_ADDRESS}<br>
      📞 <a href="tel:${HOSPITAL_PHONE}">${HOSPITAL_PHONE}</a> | 
      ✉️ <a href="mailto:${HOSPITAL_EMAIL}">${HOSPITAL_EMAIL}</a><br>
      🌐 <a href="https://${HOSPITAL_WEBSITE}">${HOSPITAL_WEBSITE}</a>
    </div>
    <div class="social-links">
      <a href="#">f</a>
      <a href="#">in</a>
      <a href="#">𝕏</a>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-legal">
      © ${new Date().getFullYear()} ${HOSPITAL_NAME}. All rights reserved.<br>
      This email contains confidential medical information. If you received this in error, please delete it.
    </div>
  </div>
`;

/**
 * Appointment Confirmation Email
 */
const appointmentConfirmation = ({ patientName, doctorName, department, date, timeSlot, visitType, duration, reason, location }) => ({
  subject: `✅ Appointment Confirmed – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('✅', 'Appointment Confirmed')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Your appointment with <strong>Dr. ${doctorName}</strong> has been successfully scheduled.</p>
          
          <span class="status-badge status-confirmed">✓ Confirmed</span>
          
          <div class="details-card">
            <div class="details-title">Appointment Details</div>
            <div class="detail-row">
              <span class="detail-icon">👨‍⚕️</span>
              <span class="detail-label">Doctor</span>
              <span class="detail-value">Dr. ${doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🏥</span>
              <span class="detail-label">Department</span>
              <span class="detail-value">${department || 'General'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span class="detail-label">Time</span>
              <span class="detail-value">${formatTime(timeSlot)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Visit Type</span>
              <span class="detail-value">${visitType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏱️</span>
              <span class="detail-label">Duration</span>
              <span class="detail-value">${duration} minutes</span>
            </div>
            ${reason ? `
            <div class="detail-row">
              <span class="detail-icon">📝</span>
              <span class="detail-label">Reason</span>
              <span class="detail-value">${reason}</span>
            </div>` : ''}
          </div>
          
          <div class="location-card">
            <div class="location-title">📍 Hospital Location</div>
            <div class="location-address">${location || HOSPITAL_ADDRESS}</div>
          </div>
          
          <div class="alert-box alert-info">
            <span class="alert-icon">💡</span>
            <div class="alert-content">
              <div class="alert-title">Please arrive 10 minutes early</div>
              <div class="alert-text">This allows time for check-in and any necessary paperwork.</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">View Appointment</a>
            <a href="#" class="btn btn-secondary">Add to Calendar</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Appointment Reminder Email
 */
const appointmentReminder = ({ patientName, doctorName, department, date, timeSlot, visitType, hoursUntil }) => ({
  subject: `⏰ Reminder: Your Appointment ${hoursUntil <= 24 ? 'Tomorrow' : 'is Coming Up'} – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('⏰', 'Appointment Reminder')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">This is a friendly reminder about your upcoming appointment.</p>
          
          <span class="status-badge status-reminder">📅 ${hoursUntil <= 24 ? 'Tomorrow' : `In ${Math.ceil(hoursUntil / 24)} days`}</span>
          
          <div class="details-card">
            <div class="details-title">Appointment Details</div>
            <div class="detail-row">
              <span class="detail-icon">👨‍⚕️</span>
              <span class="detail-label">Doctor</span>
              <span class="detail-value">Dr. ${doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🏥</span>
              <span class="detail-label">Department</span>
              <span class="detail-value">${department || 'General'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span class="detail-label">Time</span>
              <span class="detail-value">${formatTime(timeSlot)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Visit Type</span>
              <span class="detail-value">${visitType}</span>
            </div>
          </div>
          
          <div class="alert-box alert-warning">
            <span class="alert-icon">📋</span>
            <div class="alert-content">
              <div class="alert-title">What to Bring</div>
              <div class="alert-text">
                • Valid ID and insurance card<br>
                • List of current medications<br>
                • Relevant medical records or test results<br>
                • Any referral letters (if applicable)
              </div>
            </div>
          </div>
          
          <div class="location-card">
            <div class="location-title">📍 Hospital Location</div>
            <div class="location-address">${HOSPITAL_ADDRESS}</div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">Confirm Attendance</a>
            <a href="#" class="btn btn-secondary">Need to Reschedule?</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Appointment Cancellation Email
 */
const appointmentCancellation = ({ patientName, doctorName, department, date, timeSlot, cancelledBy, reason }) => ({
  subject: `❌ Appointment Cancelled – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
      <style>.header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; }</style>
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('❌', 'Appointment Cancelled')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Your appointment has been cancelled. We apologize for any inconvenience.</p>
          
          <span class="status-badge status-cancelled">✕ Cancelled</span>
          
          <div class="details-card">
            <div class="details-title">Cancelled Appointment</div>
            <div class="detail-row">
              <span class="detail-icon">👨‍⚕️</span>
              <span class="detail-label">Doctor</span>
              <span class="detail-value">Dr. ${doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🏥</span>
              <span class="detail-label">Department</span>
              <span class="detail-value">${department || 'General'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span class="detail-label">Time</span>
              <span class="detail-value">${formatTime(timeSlot)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">👤</span>
              <span class="detail-label">Cancelled By</span>
              <span class="detail-value">${cancelledBy}</span>
            </div>
            ${reason ? `
            <div class="detail-row">
              <span class="detail-icon">📝</span>
              <span class="detail-label">Reason</span>
              <span class="detail-value">${reason}</span>
            </div>` : ''}
          </div>
          
          <div class="alert-box alert-info">
            <span class="alert-icon">💡</span>
            <div class="alert-content">
              <div class="alert-title">Need to rebook?</div>
              <div class="alert-text">You can easily schedule a new appointment through our booking portal.</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">Book New Appointment</a>
            <a href="#" class="btn btn-secondary">Contact Support</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Appointment Rescheduled Email
 */
const appointmentRescheduled = ({ patientName, doctorName, department, oldDate, oldTime, newDate, newTime, visitType }) => ({
  subject: `🔄 Appointment Rescheduled – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
      <style>.header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important; }</style>
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('🔄', 'Appointment Rescheduled')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Your appointment has been rescheduled. Please review the new details below.</p>
          
          <div class="alert-box alert-warning">
            <span class="alert-icon">❌</span>
            <div class="alert-content">
              <div class="alert-title">Previous Appointment (Cancelled)</div>
              <div class="alert-text" style="text-decoration: line-through;">${formatDate(oldDate)} at ${formatTime(oldTime)}</div>
            </div>
          </div>
          
          <div class="details-card">
            <div class="details-title">✅ New Appointment Details</div>
            <div class="detail-row">
              <span class="detail-icon">👨‍⚕️</span>
              <span class="detail-label">Doctor</span>
              <span class="detail-value">Dr. ${doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🏥</span>
              <span class="detail-label">Department</span>
              <span class="detail-value">${department || 'General'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(newDate)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span class="detail-label">Time</span>
              <span class="detail-value">${formatTime(newTime)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Visit Type</span>
              <span class="detail-value">${visitType}</span>
            </div>
          </div>
          
          <div class="location-card">
            <div class="location-title">📍 Hospital Location</div>
            <div class="location-address">${HOSPITAL_ADDRESS}</div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">View Appointment</a>
            <a href="#" class="btn btn-secondary">Add to Calendar</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Waitlist Notification Email
 */
const waitlistNotification = ({ patientName, doctorName, department, date, timeSlot, visitType, expiresIn }) => ({
  subject: `🎉 Slot Available – Book Now! – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
      <style>.header { background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; }</style>
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('🎉', 'Slot Available!')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Great news! A slot has opened up for your waitlisted appointment.</p>
          
          <span class="status-badge status-success">🎯 Available Now</span>
          
          <div class="details-card">
            <div class="details-title">Available Slot Details</div>
            <div class="detail-row">
              <span class="detail-icon">👨‍⚕️</span>
              <span class="detail-label">Doctor</span>
              <span class="detail-value">Dr. ${doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🏥</span>
              <span class="detail-label">Department</span>
              <span class="detail-value">${department || 'General'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span class="detail-label">Time</span>
              <span class="detail-value">${formatTime(timeSlot)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Visit Type</span>
              <span class="detail-value">${visitType}</span>
            </div>
          </div>
          
          <div class="alert-box alert-warning">
            <span class="alert-icon">⚠️</span>
            <div class="alert-content">
              <div class="alert-title">Act Fast!</div>
              <div class="alert-text">This slot will expire in <strong>${expiresIn}</strong>. Book now to secure your appointment.</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary" style="font-size: 18px; padding: 16px 32px;">Book This Slot Now</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Doctor Schedule Change Email
 */
const doctorScheduleChange = ({ patientName, doctorName, changeType, affectedDate, newSchedule }) => ({
  subject: `📋 Schedule Update – Dr. ${doctorName} – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
      <style>.header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important; }</style>
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('📋', 'Schedule Update')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">There has been a change to Dr. ${doctorName}'s schedule that may affect your appointment.</p>
          
          <div class="alert-box alert-warning">
            <span class="alert-icon">📢</span>
            <div class="alert-content">
              <div class="alert-title">${changeType}</div>
              <div class="alert-text">
                Affected date: <strong>${formatDate(affectedDate)}</strong>
                ${newSchedule ? `<br>New schedule: ${newSchedule}` : ''}
              </div>
            </div>
          </div>
          
          <p>If you have an appointment on this date, please check your appointment status and reschedule if necessary.</p>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">Check My Appointments</a>
            <a href="#" class="btn btn-secondary">Contact Support</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Report Upload Confirmation Email
 */
const reportUploadConfirmation = ({ patientName, reportType, uploadDate, fileName, status }) => ({
  subject: `📄 Report Uploaded Successfully – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
      <style>.header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important; }</style>
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('📄', 'Report Uploaded')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Your medical report has been successfully uploaded to our system.</p>
          
          <span class="status-badge status-confirmed">✓ Upload Complete</span>
          
          <div class="details-card">
            <div class="details-title">Upload Details</div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Report Type</span>
              <span class="detail-value">${reportType || 'Medical Report'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📁</span>
              <span class="detail-label">File Name</span>
              <span class="detail-value">${fileName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Upload Date</span>
              <span class="detail-value">${formatDate(uploadDate)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">✅</span>
              <span class="detail-label">Status</span>
              <span class="detail-value">${status || 'Processing'}</span>
            </div>
          </div>
          
          <div class="alert-box alert-info">
            <span class="alert-icon">🔍</span>
            <div class="alert-content">
              <div class="alert-title">AI Analysis Available</div>
              <div class="alert-text">Use our AI Report Summarizer to get instant insights from your medical report.</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">View AI Summary</a>
            <a href="#" class="btn btn-secondary">View All Reports</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Welcome Email for New Patients
 */
const welcomeEmail = ({ patientName, email }) => ({
  subject: `Welcome to ${HOSPITAL_NAME}! 🎉`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('👋', 'Welcome!')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Welcome to ${HOSPITAL_NAME}! We're thrilled to have you as part of our healthcare family.</p>
          
          <div class="alert-box alert-success">
            <span class="alert-icon">✨</span>
            <div class="alert-content">
              <div class="alert-title">Your account is ready!</div>
              <div class="alert-text">You can now access all our digital health services.</div>
            </div>
          </div>
          
          <div class="details-card">
            <div class="details-title">What You Can Do</div>
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Book Appointments</span>
              <span class="detail-value">Schedule visits with specialists</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🤖</span>
              <span class="detail-label">AI Symptom Check</span>
              <span class="detail-value">Get instant health assessments</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Medical Records</span>
              <span class="detail-value">Access your health history</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📊</span>
              <span class="detail-label">Report Analysis</span>
              <span class="detail-value">AI-powered report summaries</span>
            </div>
          </div>
          
          <div class="location-card">
            <div class="location-title">📍 Visit Us</div>
            <div class="location-address">${HOSPITAL_ADDRESS}</div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">Book Your First Appointment</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `
});

/**
 * Diagnosis/Prescription Completion Email
 * Sent to patient when doctor finalizes their medical record
 */
const diagnosisComplete = ({ patientName, doctorName, department, diagnosis, prescription, recordType, visitDate, followUpNotes }) => ({
  subject: `✅ Your Medical Record is Ready – ${HOSPITAL_NAME}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-wrapper">
        ${emailHeader('📋', 'Medical Record Update')}
        <div class="content">
          <p class="greeting">Dear ${patientName},</p>
          <p class="intro-text">Your doctor has completed and finalized your medical record from your recent visit. You can now view the details in your patient portal.</p>
          
          <span class="status-badge status-success">✅ Record Finalized</span>
          
          <div class="details-card">
            <div class="details-title">Visit Details</div>
            <div class="detail-row">
              <span class="detail-icon">👨‍⚕️</span>
              <span class="detail-label">Attending Doctor</span>
              <span class="detail-value">Dr. ${doctorName}</span>
            </div>
            ${department ? `
            <div class="detail-row">
              <span class="detail-icon">🏥</span>
              <span class="detail-label">Department</span>
              <span class="detail-value">${department}</span>
            </div>` : ''}
            <div class="detail-row">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Visit Date</span>
              <span class="detail-value">${formatDate(visitDate || new Date())}</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-label">Record Type</span>
              <span class="detail-value">${recordType || 'Prescription'}</span>
            </div>
          </div>

          <div class="details-card" style="border-left: 4px solid #f59e0b;">
            <div class="details-title">📝 Diagnosis / Symptoms</div>
            <p style="color: #374151; font-size: 15px; margin-top: 12px; line-height: 1.7;">${diagnosis || 'See your patient portal for details'}</p>
          </div>

          ${prescription ? `
          <div class="details-card" style="border-left: 4px solid #10b981;">
            <div class="details-title">💊 Prescribed Medication</div>
            <p style="color: #374151; font-size: 15px; margin-top: 12px; line-height: 1.7; white-space: pre-line;">${prescription}</p>
          </div>` : ''}

          ${followUpNotes ? `
          <div class="alert-box alert-info">
            <span class="alert-icon">📌</span>
            <div class="alert-content">
              <div class="alert-title">Follow-up Instructions</div>
              <div class="alert-text">${followUpNotes}</div>
            </div>
          </div>` : ''}

          <div class="alert-box alert-warning">
            <span class="alert-icon">⚠️</span>
            <div class="alert-content">
              <div class="alert-title">Important</div>
              <div class="alert-text">Please follow the prescribed medication schedule. If you experience any adverse effects or have questions, contact us immediately.</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="#" class="btn btn-primary">View Full Record</a>
            <a href="#" class="btn btn-secondary">Book Follow-up</a>
          </div>
        </div>
        ${emailFooter()}
      </div>
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
