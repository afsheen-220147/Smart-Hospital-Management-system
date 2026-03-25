const express = require('express');
const router = express.Router();
const adminApprovalController = require('../controllers/adminApprovalController');

router.post('/login', adminApprovalController.login);
router.post('/action/initiate', adminApprovalController.initiateAction);
router.post('/action/approve', adminApprovalController.approveAction);
router.post('/action/reject', adminApprovalController.rejectAction);
router.get('/actions', adminApprovalController.getActions);
router.get('/actions/pending/summary', adminApprovalController.getPendingActionsSummary);
router.get('/actions/pending/:adminId', adminApprovalController.getActionsPendingMyApproval);
router.get('/dashboard/:adminId', adminApprovalController.getAdminDashboard);
router.get('/actions/:actionId', adminApprovalController.getActionById);

module.exports = router;
