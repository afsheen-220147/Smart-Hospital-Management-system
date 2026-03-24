# Automatic Appointment Status Update Implementation

## Overview

This implementation adds automatic appointment status updates to the Smart Hospital Management System. The system automatically marks appointments as "NO_SHOW" if:

1. Appointment scheduled time has passed
2. Appointment status is still "confirmed" or "pending"
3. Patient did not check in

## 📋 Components Implemented

### Backend Components

#### 1. **appointmentAutoUpdateService.js**

Location: `/backend/services/appointmentAutoUpdateService.js`

**Features:**

- Runs a cron job every 2 minutes
- Queries all confirmed/pending appointments with passed times
- Updates status to "no-show" if appointment time has passed
- Sends email notification to patient
- Includes timezone handling
- Graceful error handling (doesn't block on email failures)

**Key Functions:**

```javascript
// Initialize and start the cron job
startAppointmentAutoUpdateJob();

// Manually update appointments (for testing/admin)
triggerManualUpdate();

// Stop the cron job (graceful shutdown)
stopAppointmentAutoUpdateJob();
```

**Logic Flow:**

```
1. Query appointments with status IN ['confirmed', 'pending']
2. For each appointment:
   - Parse timeSlot (e.g., "14:30")
   - Calculate appointment end time = appointment time + duration
   - If current time > end time AND not checked in:
     - Update status to "no-show"
     - Set cancelledBy = "system"
     - Set cancelledAt = now
     - Send email to patient
```

#### 2. **appointmentAutoUpdateController.js**

Location: `/backend/controllers/appointmentAutoUpdateController.js`

Admin endpoints:

- `POST /api/v1/admin/appointments/trigger-update` - Manual trigger
- `GET /api/v1/admin/appointments/auto-update-status` - Health check

#### 3. **Server Integration**

Updated `server.js`:

- Starts cron job on server initialization
- Graceful shutdown on SIGTERM
- Stops cron job before server closes

#### 4. **Admin Routes**

Updated `/backend/routes/adminRoutes.js`:

- Added new appointment management endpoints

### Frontend Components

#### 1. **AppointmentCard.jsx** Updates

Location: `/frontend/src/components/appointments/AppointmentCard.jsx`

**Changes:**

- Added `isAppointmentExpired()` function to check if appointment time passed
- Disabled cancel button for expired appointments
- Shows "Passed" badge on expired appointments
- Tooltip explains why cancel is disabled
- Visual feedback (grayed out button for expired)

**Logic:**

```javascript
const isAppointmentExpired = () => {
  // Parse appointment date + time
  // Add duration to get end time
  // Check if current time > end time
  return new Date() > appointmentEndTime;
};

// Disable cancel button if expired
const canCancel =
  ["confirmed", "pending"].includes(status) && !appointmentExpired;
```

## 🔧 Configuration

### Cron Job Schedule

Default: Every 2 minutes (`*/2 * * * *`)

To change frequency, edit `appointmentAutoUpdateService.js`:

```javascript
// Run every 5 minutes instead
cronJob = cron.schedule("*/5 * * * *", async () => {
  await updateExpiredAppointments();
});
```

**Cron Expression Reference:**

- `*/1 * * * *` - Every 1 minute
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight

### Environment Setup

Required packages already installed:

- ✅ `node-cron` - Scheduling
- ✅ `nodemailer` - Email sending
- ✅ Existing email templates

## 📧 Email Notification

When an appointment is marked as NO_SHOW:

1. Uses existing `appointmentCancellation` email template
2. Sends to patient email
3. Includes:
   - Appointment date & time
   - Doctor name
   - Department
   - Cancellation reason: "Appointment not attended - marked as no-show after scheduled time passed"

**Email flow:**

```
updateExpiredAppointments()
  → Found expired appointment
  → Update status to "no-show"
  → Send email via notificationService
  → Log success/failure
```

## 🗄️ Database Schema

### Appointment Model Fields Used

```javascript
{
  date: Date,                    // Appointment date
  timeSlot: String,              // Time as "HH:MM" format
  duration: Number,              // Duration in minutes
  status: String,                // 'confirmed', 'pending', 'no-show', etc.
  checkedIn: Boolean,            // Whether patient checked in
  cancelledBy: String,           // 'system', 'patient', 'doctor', 'admin'
  cancelledAt: Date,             // When it was cancelled
  cancelReason: String,          // Reason for cancellation
  timestamps: true               // createdAt, updatedAt
}
```

### No Schema Changes Required

The current schema already supports all needed fields!

## 🚀 How It Works - Step by Step

### Backend Flow

```
Server starts
  ↓
Initialize cron job (every 2 minutes)
  ↓
Query: Find appointments where:
  - status ∈ ['confirmed', 'pending']
  - date < now
  - cancelledBy = null
  - !checkedIn (optional check)
  ↓
For each expired appointment:
  - Update status → "no-show"
  - Set cancelledBy → "system"
  - Set cancelledAt → now
  - Send email to patient
  ↓
Log results & continue
```

### Frontend Flow

```
User loads appointment card
  ↓
Check if appointment time has passed:
  - Parse time from appointment.date + appointment.timeSlot
  - Add duration to get end time
  - Compare with current time
  ↓
If expired:
  - Show "Passed" badge
  - Disable cancel button
  - Show tooltip on hover
  ↓
If not expired:
  - Show cancel button normally
  - Allow cancellation
```

## 📊 API Endpoints

### Admin Endpoints

#### Trigger Manual Update

```bash
POST /api/v1/admin/appointments/trigger-update
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "message": "Appointment auto-update job triggered successfully",
  "data": {
    "updated": 3,
    "errors": 0
  }
}
```

#### Check Job Status

```bash
GET /api/v1/admin/appointments/auto-update-status
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "message": "Appointment auto-update job is running",
  "data": {
    "status": "active",
    "schedule": "Every 2 minutes",
    "lastCheck": "2026-03-24T12:45:38.000Z",
    "notes": "Automatically marks confirmed appointments as no-show if time has passed..."
  }
}
```

## 🧪 Testing

### Manual Testing

#### 1. Create Test Appointment (Past Time)

```bash
# Create appointment with date/time in the past
{
  "date": "2026-03-24",
  "timeSlot": "10:00",
  "status": "confirmed",
  "duration": 30
  // Current time is > 10:30
}
```

#### 2. Trigger Manual Update

```bash
curl -X POST \
  http://localhost:5000/api/v1/admin/appointments/trigger-update \
  -H "Authorization: Bearer {admin_token}"
```

#### 3. Verify Changes

- Check appointment status changed to "no-show"
- Verify email sent to patient
- Check logs for success message

### Monitoring Logs

```javascript
// Look for these in server console:
"[2026-03-24T...] Running appointment auto-update check...";
"Found 3 appointments to check for expiration...";
"Updating appointment _id to NO_SHOW...";
"✅ NO_SHOW notification email sent to patient@email.com";
"✅ Appointment auto-update completed: 3 updated, 0 errors";
```

## ⚠️ Important Considerations

### 1. Timezone Handling

- Current implementation uses server timezone
- For multi-timezone support, store timezone with appointment
- Parse timeSlot in appointment's timezone before comparing

```javascript
// TODO future enhancement
const appointmentTZ = appointment.timezone || "UTC";
const appointmentDate = new Date(appointment.date).toLocaleString("en-US", {
  timeZone: appointmentTZ,
});
```

### 2. Duplicate Email Prevention

- Cron job only processes appointments with `cancelledBy = null`
- Once marked as "no-show", it won't be processed again
- Safe to run multiple times or at different intervals

### 3. Performance Optimization

- Uses `.lean()` for read-only queries (no schema validation)
- Batch processes all expired appointments in one run
- Indexes recommended for optimized queries:

```javascript
// Add to Appointment model
appointmentSchema.index({ status: 1, date: 1, cancelledBy: 1 });
appointmentSchema.index({ date: 1 });
```

### 4. Email Failure Handling

- If email sending fails, appointment status **still updated**
- Failed emails logged but don't block process
- Can implement retry mechanism if needed

## 📈 Scaling Considerations

### For High-Volume Systems

1. **Increase Cron Frequency**: Run more often (every 1 minute)
2. **Batch Processing**: Process appointments in smaller batches
3. **Database Indexing**: Add indexes for fast queries

```javascript
// Batch processing example
const batchSize = 100;
for (let i = 0; i < expiredAppointments.length; i += batchSize) {
  const batch = expiredAppointments.slice(i, i + batchSize);
  await processBatch(batch);
}
```

### For Distributed Systems

1. Use Redis to track which appointments have been processed
2. Implement job queue (BullMQ, RabbitMQ)
3. Add job idempotency keys

```javascript
// Redis tracking
const processedKey = `appointment_processed:${appointmentId}`;
if (await redis.exists(processedKey)) continue;
// Process...
await redis.setex(processedKey, 86400, '1');
```

## 🔒 Security & Validation

### Input Validation

✅ Appointment data validated before processing  
✅ Email addresses sanitized before sending  
✅ Admin-only endpoints protected with role middleware

### Error Handling

✅ Try-catch blocks on all async operations  
✅ Non-blocking error handling (email failures don't break updates)  
✅ Comprehensive logging for debugging

## 🐛 Troubleshooting

### Cron Job Not Running

**Solution:** Check server logs for initialization messages

```bash
# Look for:
✅ Appointment auto-update job started (runs every 2 minutes)
```

### Appointments Not Being Updated

**Possible Issues:**

1. Appointment status not "confirmed" or "pending"
2. Appointment time in future
3. `checkedIn` = true (skips update)
4. `cancelledBy` already set (already processed)

**Debug:**

```javascript
// Add logging before update
console.log("Appointment:", {
  status: appointment.status,
  date: appointment.date,
  timeSlot: appointment.timeSlot,
  checkedIn: appointment.checkedIn,
  cancelledBy: appointment.cancelledBy,
});
```

### Emails Not Sending

**Check:**

1. Email credentials in .env file
2. Patient email address valid
3. Nodemailer configured correctly
4. Check error logs for details

```javascript
// Add error details
console.error("Email error:", {
  error: emailError.message,
  patientEmail: appointment.patient.email,
  subject: template.subject,
});
```

## 📝 Future Enhancements

1. **Timezone Support**: Store timezone with appointment
2. **Flexible Status Updates**: Configurable status (COMPLETED, RESCHEDULED, etc.)
3. **SMS Notifications**: Add SMS alerts in addition to email
4. **Analytics Dashboard**: Track no-show rates, patterns
5. **Retry Mechanism**: Automatic email retry on failure
6. **Webhook Integration**: Notify external systems of status changes
7. **Appointment Reminder**: Send reminder before appointment
8. **Custom Rules**: Configurable rules for different appointment types

## ✅ Checklist

- [x] Backend: appointmentAutoUpdateService.js created
- [x] Backend: appointmentAutoUpdateController.js created
- [x] Backend: Admin routes updated
- [x] Backend: Server initialization updated
- [x] Backend: Graceful shutdown handling
- [x] Frontend: AppointmentCard.jsx updated
- [x] Frontend: Cancel button disabled for expired
- [x] Database: No schema changes needed
- [x] Email: Using existing template
- [x] Testing: Manual endpoints provided
- [x] Documentation: This guide

## 🤝 Support

For issues or questions:

1. Check troubleshooting section above
2. Review logs for error messages
3. Test with manual trigger endpoint
4. Verify appointment data in database

---

**Last Updated:** 2026-03-24  
**Status:** ✅ Production Ready
