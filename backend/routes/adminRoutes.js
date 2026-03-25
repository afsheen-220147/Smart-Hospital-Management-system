const express = require('express');
const { getAdminStats, initiateDoctorDeletion, initiatePatientDeletion } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { 
  triggerAppointmentUpdate, 
  getAutoUpdateStatus 
} = require('../controllers/appointmentAutoUpdateController');
const {
  approveOffDutyRequest,
  rejectOffDutyRequest,
  getAllOffDutyRequests,
  getOffDutyStats
} = require('../controllers/adminDoctorOffDutyController');
const {
  initiateAction,
  approveAction,
  rejectAction,
  getPendingActions,
  getActionById,
  getAllPendingActions,
  getMyInitiatedActions,
  cancelAction,
  getActionStats,
  getPendingApprovalCount,
  getActionDashboard
} = require('../controllers/adminApprovalController');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);

// ==================== ADMIN APPROVAL SYSTEM (3-ADMIN APPROVAL REQUIRED) ====================

// Action initiation - Start a privileged action that requires approval
router.post('/actions/initiate', initiateAction);

// Action approval/rejection - Approve or reject pending actions
router.post('/actions/:actionId/approve', approveAction);
router.post('/actions/:actionId/reject', rejectAction);

// Action cancellation - Only initiator can cancel their action
router.delete('/actions/:actionId', cancelAction);

// View pending actions
router.get('/actions/pending', getPendingActions);                    // Pending for current admin
router.get('/actions', getAllPendingActions);                          // All pending actions
router.get('/actions/initiated', getMyInitiatedActions);               // My initiated actions
router.get('/actions/:actionId', getActionById);                       // Get specific action details

// Dashboard and statistics
router.get('/actions/dashboard', getActionDashboard);                 // Admin dashboard
router.get('/actions/pending-count', getPendingApprovalCount);        // Count of pending approvals
router.get('/actions/stats', getActionStats);                          // Stats and metrics

// ==================== LEGACY ENDPOINTS (DEPRECATED - Use /actions endpoints) ====================

// Doctor deletion with 3-admin approval
router.post('/doctor/delete-request', initiateDoctorDeletion);

// Patient deletion with 3-admin approval
router.post('/patient/delete-request', initiatePatientDeletion);

// ==================== OTHER ADMIN ENDPOINTS ====================

// Appointment auto-update endpoints
router.post('/appointments/trigger-update', triggerAppointmentUpdate);
router.get('/appointments/auto-update-status', getAutoUpdateStatus);

// Off-duty management endpoints
router.get('/off-duty/requests', getAllOffDutyRequests);
router.post('/off-duty/requests/:id/approve', approveOffDutyRequest);
router.post('/off-duty/requests/:id/reject', rejectOffDutyRequest);
router.get('/off-duty/stats', getOffDutyStats);

module.exports = router;
