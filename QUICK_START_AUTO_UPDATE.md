# Quick Start: Appointment Auto-Update Setup

## ✅ What's Been Implemented

Your system now has:

1. ✅ Automatic appointment status updates (every 2 minutes)
2. ✅ NO_SHOW marking for expired appointments
3. ✅ Email notifications to patients
4. ✅ Disabled cancel button for past appointments
5. ✅ Admin API endpoints for manual triggers

## 🚀 Quick Start

### Step 1: Installation (Already Done!)

```bash
# node-cron installed
npm list node-cron
# Should show: node-cron@X.X.X
```

### Step 2: Server Initialization (Already Done!)

The cron job starts automatically when the backend server starts.

```bash
# Start your backend in development
cd backend
npm run dev

# You should see in logs:
# ✅ Appointment auto-update job started (runs every 2 minutes)
```

### Step 3: Verify Installation

#### Check Server Logs

```
✅ Appointment auto-update job started (runs every 2 minutes)
[2026-03-24T...] Running appointment auto-update check...
Found X appointments to check for expiration...
✅ Appointment auto-update completed: X updated, X errors
```

#### Test Admin Endpoints

```bash
# Trigger manual update (requires admin auth)
curl -X POST \
  http://localhost:5000/api/v1/admin/appointments/trigger-update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check status
curl -X GET \
  http://localhost:5000/api/v1/admin/appointments/auto-update-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Test Frontend

1. Open patient dashboard
2. Look for appointments in the past
3. Should show "Passed" badge
4. Cancel button should be disabled with tooltip

## 📝 Configuration

### Cron Frequency

Edit `/backend/services/appointmentAutoUpdateService.js` - Line ~140:

```javascript
// Current: Every 2 minutes
cronJob = cron.schedule("*/2 * * * *", async () => {
  await updateExpiredAppointments();
});

// To change to every 5 minutes:
cronJob = cron.schedule("*/5 * * * *", async () => {
  await updateExpiredAppointments();
});
```

### Email Settings

Email uses existing setup. Verify `.env` has:

```env
# Your email credentials (already configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## 🧪 Testing Checklist

### Manual Test (Create Expired Appointment)

1. **Create appointment with past time:**

   ```bash
   POST /api/v1/appointments
   {
     "date": "2026-03-24",          # Today
     "timeSlot": "09:00",           # Past time
     "status": "confirmed",
     "doctorId": "...",
     "patientId": "...",
     "reason": "Test",
     "duration": 30
   }
   ```

2. **Wait for cron job (up to 2 minutes)** or manually trigger:

   ```bash
   POST /api/v1/admin/appointments/trigger-update
   ```

3. **Verify changes:**
   - Status changed to "no-show"
   - Email sent to patient
   - Logs show success message

### Frontend Test

1. Dashboard shows appointment with "Passed" badge ✓
2. Cancel button is greyed out ✓
3. Hover over cancel button shows tooltip ✓
4. Status updates on refresh ✓

## 📊 Monitoring

### View Logs

```bash
# Real-time logs
npm run dev

# Look for:
[timestamp] Running appointment auto-update check...
Found X appointments to check...
Updating appointment X to NO_SHOW...
✅ NO_SHOW notification email sent...
✅ Appointment auto-update completed...
```

### Debug Issues

**Cron not running?**

- Check server console for "Appointment auto-update job started" message
- Verify no errors during initialization

**Appointments not updating?**

- Verify appointment status is "confirmed" or "pending"
- Check appointment date/time is in the past
- Verify patient didn't check in (`checkedIn != true`)

**Emails not sending?**

- Check `.env` email credentials
- Verify patient email is valid
- Check console for email errors

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    APPOINTMENT LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

Patient Books
     ↓
Status: CONFIRMED
     ↓
[EVERY 2 MINUTES: Auto-Check Cron Job Runs]
     ↓
Is appointment time passed AND not checked in?
     ├─→ YES: Update status to NO_SHOW
     │        Send email to patient
     │        ✓ COMPLETE
     │
     └─→ NO: Patient checks in
              Doctor starts consultation
              Status: IN_PROGRESS
              ↓
              Doctor ends consultation
              Status: COMPLETED
              ✓ COMPLETE

Alternative Flow:
     ↓
Patient cancels before time
Status: CANCELLED (cancelledBy: patient)
✓ COMPLETE (Skipped by auto-update)
```

## 🎯 Key Features

### ✅ Automatic Status Updates

- Runs in background automatically
- No manual intervention needed
- Runs every 2 minutes (configurable)

### ✅ Smart Detection

- Only marks no-show if patient didn't check in
- Checks appointment end time (start + duration)
- Avoids updating already processed appointments

### ✅ Email Notifications

- Patient automatically notified
- Uses professional email template
- Includes appointment details

### ✅ Frontend Integration

- Cancel button disabled for past appointments
- Visual "Passed" indicator
- Helpful tooltip on hover

### ✅ Admin Control

- Manual trigger endpoint for testing
- Status health check
- Configurable cron schedule

## 🐛 Common Issues & Solutions

| Issue                     | Solution                                 |
| ------------------------- | ---------------------------------------- |
| Cron job not starting     | Check server logs, restart backend       |
| Appointments not updating | Verify appointment status is 'confirmed' |
| Emails not sending        | Check .env email credentials             |
| Cancel button still shows | Verify frontend is updated               |
| Status not reflecting     | Refresh browser (polling every 15s)      |

## 📚 Documentation

For detailed information, see:

- [APPOINTMENT_AUTO_UPDATE_GUIDE.md](./APPOINTMENT_AUTO_UPDATE_GUIDE.md) - Full technical details
- [Backend Services](./backend/services/appointmentAutoUpdateService.js)
- [Frontend Component](./frontend/src/components/appointments/AppointmentCard.jsx)

## ⚙️ Maintenance

### Ongoing

- Monitor cron job logs
- Verify emails are sending
- Check frontend shows correct status

### Optional Enhancements

- Add SMS notifications
- Implement email retry logic
- Add timezone support
- Create analytics dashboard

## 🚨 Production Deployment

1. **Update cron frequency** if needed (default 2 min is fine)
2. **Test in staging** with real email
3. **Monitor logs** after deployment
4. **Setup alerts** for cron job failures
5. **Backup database** before deployment

## 🤝 Need Help?

1. Check logs for error messages
2. Review APPOINTMENT_AUTO_UPDATE_GUIDE.md
3. Verify all files are in place
4. Test with manual trigger endpoint
5. Check database for appointment records

---

**Status:** ✅ Ready to Deploy  
**Last Updated:** 2026-03-24
