const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  initiateAction,
  approveAction,
  rejectAction,
  getPendingActions,
  getActionById,
  getAllPendingActions,
  getActionStats,
  getActionDashboard
} = require('../controllers/adminApprovalController');

const router = express.Router();

// Apply auth and admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// Action lifecycle
router.post('/action/initiate', initiateAction);
router.post('/action/:actionId/approve', approveAction);
router.post('/action/:actionId/reject', rejectAction);

// View actions
router.get('/actions', getAllPendingActions);
router.get('/actions/pending', getPendingActions);
router.get('/actions/:actionId', getActionById);
router.get('/dashboard', getActionDashboard);
router.get('/stats', getActionStats);

module.exports = router;
