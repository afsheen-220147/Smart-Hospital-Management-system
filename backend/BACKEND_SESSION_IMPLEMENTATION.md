/\*\*

- IMPLEMENTATION GUIDE: Session-Based Diagnosis Access Control
-
- This guide shows how to integrate session validation into your existing
- appointment and diagnosis controllers.
-
- Follow these steps to implement strict session checking on the backend.
  \*/

// ================ STEP 1: Update Appointment Model ================
/\*\*

- File: backend/models/Appointment.js
-
- Add these fields to your appointment schema:
  \*/

/\*
// Add to appointmentSchema:
{
// ... existing fields ...

// Session field (auto-calculated from timeSlot)
session: {
type: String,
enum: ['MORNING', 'AFTERNOON', 'OFF_HOURS'],
default: 'MORNING',
index: true // For filtering by session
},

// Actual appointment date (for validation)
appointmentDate: {
type: Date,
required: true,
index: true
},

// ISO timestamp for server-side session detection
createdAtIST: {
type: Date,
default: () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}
}
\*/

// ================ STEP 2: Import Session Helper ================
/\*\*

- File: backend/controllers/appointmentController.js
  \*/

const {
getCurrentSession,
validateDiagnosisAccess,
getAppointmentSession,
enrichAppointmentWithSession,
getTodayIST
} = require('../utils/sessionHelper');

const Appointment = require('../models/Appointment');

// ================ STEP 3: Get Appointments with Session Info ================
/\*\*

- Endpoint: GET /api/v1/appointments/doctor/:doctorId
-
- Updated to include session info and today's appointments only
  \*/

exports.getDoctorAppointmentsForDashboard = asyncHandler(async (req, res) => {
const { doctorId } = req.params;
const { includeHistory = false } = req.query; // Default: today only

try {
const todayIST = getTodayIST();

    // Build query: today's appointments by default
    const query = {
      doctor: doctorId,
      // dateRange based on flag
      ...(includeHistory
        ? {}
        : {
            appointmentDate: {
              $gte: new Date(todayIST),
              $lt: new Date(new Date(todayIST).getTime() + 24 * 60 * 60 * 1000)
            }
          }
      )
    };

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email gender')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    // Enrich each appointment with session info and diagnosis access check
    const enrichedAppointments = appointments.map(apt =>
      enrichAppointmentWithSession(apt.toObject())
    );

    res.status(200).json({
      success: true,
      count: enrichedAppointments.length,
      currentSession: getCurrentSession(),
      data: enrichedAppointments
    });

} catch (error) {
res.status(500).json({
success: false,
message: 'Failed to fetch appointments',
error: error.message
});
}
});

// ================ STEP 4: Diagnosis Access Validation ================
/\*\*

- Endpoint: POST /api/v1/appointments/:appointmentId/diagnosis/start (PROTECTED)
-
- STRICT SESSION VALIDATION - Doctor can ONLY access current session patients
  \*/

exports.startDiagnosis = asyncHandler(async (req, res) => {
const { appointmentId } = req.params;
const doctorId = req.user.\_id;
const { notes = '' } = req.body;

try {
// 1. Fetch appointment
const appointment = await Appointment.findById(appointmentId)
.populate('patient', 'name email gender')
.populate('doctor', 'specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // 2. Verify doctor ownership
    if (appointment.doctor._id.toString() !== doctorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this appointment',
        code: 'UNAUTHORIZED'
      });
    }

    // 3. CRITICAL: Validate session access
    const currentSession = getCurrentSession();
    const validation = validateDiagnosisAccess(appointment, currentSession);

    if (!validation.allowed) {
      // Log security event
      console.warn(`[SECURITY] Doctor ${doctorId} attempted unauthorized diagnosis access:`, {
        appointmentId,
        code: validation.code,
        reason: validation.reason,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        success: false,
        message: validation.reason,
        code: validation.code,
        currentSession,
        appointmentSession: appointment.session,
        allowedSessions: [currentSession]
      });
    }

    // 4. Update appointment status
    appointment.status = 'in-progress';
    appointment.actualStartTime = new Date();
    appointment.notes = notes;
    await appointment.save();

    // 5. Create diagnosis/consultation session in DB
    // const DiagnosisSession = require('../models/DiagnosisSession');
    // const diagnosisSession = await DiagnosisSession.create({
    //   appointment: appointmentId,
    //   doctor: doctorId,
    //   patient: appointment.patient._id,
    //   startTime: new Date(),
    //   session: appointment.session
    // });

    res.status(200).json({
      success: true,
      message: 'Diagnosis session started',
      data: {
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          session: appointment.session,
          patient: appointment.patient
        },
        // diagnosisSession: diagnosisSession._id
      }
    });

} catch (error) {
res.status(500).json({
success: false,
message: 'Failed to start diagnosis',
error: error.message
});
}
});

// ================ STEP 5: End Diagnosis ================
/\*\*

- Endpoint: POST /api/v1/appointments/:appointmentId/diagnosis/end (PROTECTED)
-
- Complete diagnosis and save consultation data
  \*/

exports.endDiagnosis = asyncHandler(async (req, res) => {
const { appointmentId } = req.params;
const doctorId = req.user.\_id;
const { diagnosis, prescription, notes, followUp } = req.body;

try {
const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify doctor & session consistency
    if (appointment.doctor.toString() !== doctorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (appointment.status !== 'in-progress') {
      return res.status(409).json({
        success: false,
        message: `Cannot end diagnosis. Appointment status is ${appointment.status}`
      });
    }

    // Update appointment
    appointment.status = 'completed';
    appointment.actualEndTime = new Date();
    appointment.diagnosis = diagnosis;
    appointment.prescription = prescription;
    appointment.notes = notes;
    appointment.followUp = followUp;

    // Calculate duration
    const durationMs = appointment.actualEndTime - appointment.actualStartTime;
    appointment.consultationDurationMinutes = Math.round(durationMs / (1000 * 60));

    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Diagnosis completed',
      data: {
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          duration: appointment.consultationDurationMinutes
        }
      }
    });

} catch (error) {
res.status(500).json({
success: false,
message: 'Failed to end diagnosis',
error: error.message
});
}
});

// ================ STEP 6: Update Routes ================
/\*\*

- File: backend/routes/appointmentRoutes.js
-
- Add/Update these routes:
  \*/

/\*
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const appointmentController = require('../controllers/appointmentController');

// Dashboard with enriched session info
router.get(
'/doctor/:doctorId/dashboard',
authenticate,
authorize('doctor', 'admin'),
appointmentController.getDoctorAppointmentsForDashboard
);

// Diagnosis Access (STRICT SESSION VALIDATION)
router.post(
'/:appointmentId/diagnosis/start',
authenticate,
authorize('doctor', 'admin'),
appointmentController.startDiagnosis
);

router.post(
'/:appointmentId/diagnosis/end',
authenticate,
authorize('doctor', 'admin'),
appointmentController.endDiagnosis
);

module.exports = router;
\*/

// ================ STEP 7: Error Codes Reference ================
/\*\*

- Error codes returned when session validation fails:
-
- 'APPOINTMENT_NOT_FOUND' - Appointment doesn't exist
- 'NOT_TODAY_APPOINTMENT' - Appointment is not for today
- 'INVALID_STATUS' - Appointment status doesn't allow diagnosis
- 'OUTSIDE_WORKING_HOURS' - Doctor is outside working hours (6 AM - 6 PM IST)
- 'WRONG_SESSION' - Appointment belongs to different session
  \*/

// ================ STEP 8: Testing ================
/\*\*

- Test scenarios:
-
- 1.  Morning Doctor trying to diagnose Afternoon patient:
- - Current time: 9:00 AM IST
- - Appointment session: AFTERNOON
- - Expected: 403 with code 'WRONG_SESSION'
-
- 2.  Doctor after work hours trying to diagnose:
- - Current time: 7:00 PM IST
- - Expected: 403 with code 'OUTSIDE_WORKING_HOURS'
-
- 3.  Doctor trying to diagnose yesterday's patient:
- - Appointment date: Yesterday
- - Expected: 403 with code 'NOT_TODAY_APPOINTMENT'
-
- 4.  Correct scenario:
- - Current time: 10:00 AM IST
- - Appointment session: MORNING
- - Appointment date: Today
- - Status: 'confirmed' or 'pending'
- - Expected: 200 OK, diagnosis session created
    \*/

module.exports = {
// Export for use in routes
getDoctorAppointmentsForDashboard: exports.getDoctorAppointmentsForDashboard,
startDiagnosis: exports.startDiagnosis,
endDiagnosis: exports.endDiagnosis
};
