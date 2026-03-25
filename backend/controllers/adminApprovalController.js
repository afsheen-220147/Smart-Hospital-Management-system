const asyncHandler = require('express-async-handler');
const adminApprovalService = require('../services/adminApprovalService');
const AdminAction = require('../models/AdminAction');

/**
 * @desc    Initiate a privileged admin action (requires 3 approvals to execute)
 * @route   POST /api/v1/admin/actions/initiate
 * @access  Private/Admin
 */
exports.initiateAction = asyncHandler(async (req, res) => {
  const { actionType, description, payload, targetEntity } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  if (!actionType || !description) {
    res.status(400);
    throw new Error('Action type and description are required');
  }

  // Validate action type
  const validActions = [
    'doctor_add',
    'doctor_update',
    'doctor_delete',
    'patient_add',
    'patient_update',
    'patient_delete',
    'user_delete',
    'admin_add',
    'admin_remove'
  ];

  if (!validActions.includes(actionType)) {
    res.status(400);
    throw new Error(`Invalid action type: ${actionType}`);
  }

  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    actionType,
    description,
    payload,
    targetEntity
  );

  res.status(201).json({
    success: true,
    data: {
      actionId: action._id,
      actionType: action.actionType,
      description: action.description,
      status: action.status,
      approvals: action.approvals.length,
      approvalsNeeded: adminApprovalService.REQUIRED_APPROVALS,
      approvalsRemaining: adminApprovalService.REQUIRED_APPROVALS - action.approvals.length,
      message: `Action initiated. Requires approvals from ${adminApprovalService.REQUIRED_APPROVALS - 1} more admins.`,
      createdAt: action.createdAt
    }
  });
});

/**
 * @desc    Approve a pending action
 * @route   POST /api/v1/admin/actions/:actionId/approve
 * @access  Private/Admin
 */
exports.approveAction = asyncHandler(async (req, res) => {
  const { actionId } = req.params;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const action = await adminApprovalService.approveAction(actionId, adminId, adminName);

  // Check if action is now fully approved
  const isFullyApproved = action.approvals.length >= adminApprovalService.REQUIRED_APPROVALS;

  // If fully approved, execute the action
  if (isFullyApproved && action.status === 'approved') {
    try {
      await adminApprovalService.executeAction(actionId);

      const updatedAction = await adminApprovalService.getActionById(actionId);

      return res.status(200).json({
        success: true,
        data: {
          actionId: updatedAction._id,
          actionType: updatedAction.actionType,
          status: updatedAction.status,
          approvals: updatedAction.approvals.length,
          approvalsNeeded: adminApprovalService.REQUIRED_APPROVALS,
          message: `Action fully approved and executed successfully!`,
          executionResult: updatedAction.executionResult
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Action approved but execution failed',
        error: error.message
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      actionId: action._id,
      actionType: action.actionType,
      status: action.status,
      approvals: action.approvals.length,
      approvalsNeeded: adminApprovalService.REQUIRED_APPROVALS,
      approvalsRemaining: adminApprovalService.REQUIRED_APPROVALS - action.approvals.length,
      message: `Approved by ${adminName}. Requires ${adminApprovalService.REQUIRED_APPROVALS - action.approvals.length} more approvals.`,
      approvedBy: action.approvals.map(a => ({
        id: a.adminId,
        name: a.adminName,
        approvedAt: a.approvedAt
      }))
    }
  });
});

/**
 * @desc    Reject a pending action
 * @route   POST /api/v1/admin/actions/:actionId/reject
 * @access  Private/Admin
 */
exports.rejectAction = asyncHandler(async (req, res) => {
  const { actionId } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const action = await adminApprovalService.rejectAction(
    actionId,
    adminId,
    adminName,
    reason || 'No reason provided'
  );

  res.status(200).json({
    success: true,
    data: {
      actionId: action._id,
      actionType: action.actionType,
      status: action.status,
      message: `Action rejected by ${adminName}`,
      rejectedBy: {
        id: adminId,
        name: adminName,
        reason: reason || 'No reason provided'
      },
      rejectionCount: action.rejections.length
    }
  });
});

/**
 * @desc    Get all pending actions for current admin
 * @route   GET /api/v1/admin/actions/pending
 * @access  Private/Admin
 */
exports.getPendingActions = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  const pendingActions = await adminApprovalService.getPendingForAdmin(adminId);

  res.status(200).json({
    success: true,
    count: pendingActions.length,
    data: pendingActions.map(action => ({
      actionId: action._id,
      actionType: action.actionType,
      description: action.description,
      initiator: {
        id: action.initiatedBy._id,
        name: action.initiatedBy.name
      },
      status: action.status,
      approvals: action.approvals.length,
      approvalsRemaining: adminApprovalService.REQUIRED_APPROVALS - action.approvals.length,
      approvedBy: action.approvals.map(a => a.adminName),
      createdAt: action.createdAt,
      expiresAt: action.expiresAt
    }))
  });
});

/**
 * @desc    Get action details by ID
 * @route   GET /api/v1/admin/actions/:actionId
 * @access  Private/Admin
 */
exports.getActionById = asyncHandler(async (req, res) => {
  const { actionId } = req.params;

  const action = await adminApprovalService.getActionById(actionId);

  if (!action) {
    res.status(404);
    throw new Error('Action not found');
  }

  res.status(200).json({
    success: true,
    data: {
      actionId: action._id,
      actionType: action.actionType,
      description: action.description,
      status: action.status,
      initiator: {
        id: action.initiatedBy._id,
        name: action.initiatedBy.name
      },
      approvals: action.approvals.map(a => ({
        id: a.adminId._id,
        name: a.adminId.name,
        approvedAt: a.approvedAt
      })),
      rejections: action.rejections.map(r => ({
        id: r.adminId._id,
        name: r.adminId.name,
        reason: r.reason,
        rejectedAt: r.rejectedAt
      })),
      approvalsCount: action.approvals.length,
      approvalsNeeded: adminApprovalService.REQUIRED_APPROVALS,
      approvalsRemaining: adminApprovalService.REQUIRED_APPROVALS - action.approvals.length,
      payload: action.payload,
      executionResult: action.executionResult,
      auditLog: action.auditLog,
      createdAt: action.createdAt,
      expiresAt: action.expiresAt,
      isExpired: action.isExpired()
    }
  });
});

/**
 * @desc    Get all pending actions (admin dashboard)
 * @route   GET /api/v1/admin/actions
 * @access  Private/Admin
 */
exports.getAllPendingActions = asyncHandler(async (req, res) => {
  const { actionType, status } = req.query;
  
  let filter = {};
  if (actionType) filter.actionType = actionType;
  if (status) filter.status = status;

  const allPending = await AdminAction.find(filter)
    .populate('initiatedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    totalPending: allPending.length,
    data: allPending.map(action => ({
      actionId: action._id,
      actionType: action.actionType,
      description: action.description,
      initiator: {
        id: action.initiatedBy._id,
        name: action.initiatedBy.name
      },
      status: action.status,
      approvals: action.approvals.length,
      approvalsNeeded: 3,
      approvalsRemaining: 3 - action.approvals.length,
      approvedBy: action.approvals.map(a => a.adminName),
      payload: action.payload,
      createdAt: action.createdAt,
      expiresAt: action.expiresAt
    }))
  });
});

/**
 * @desc    Get actions initiated by current admin
 * @route   GET /api/v1/admin/actions/initiated
 * @access  Private/Admin
 */
exports.getMyInitiatedActions = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  const actions = await adminApprovalService.getActionsByInitiator(adminId);

  res.status(200).json({
    success: true,
    count: actions.length,
    data: actions.map(action => ({
      actionId: action._id,
      actionType: action.actionType,
      description: action.description,
      status: action.status,
      approvals: action.approvals.length,
      approvalsNeeded: adminApprovalService.REQUIRED_APPROVALS,
      createdAt: action.createdAt
    }))
  });
});

/**
 * @desc    Cancel a pending action (only initiator can cancel)
 * @route   DELETE /api/v1/admin/actions/:actionId
 * @access  Private/Admin
 */
exports.cancelAction = asyncHandler(async (req, res) => {
  const { actionId } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const action = await adminApprovalService.cancelAction(
    actionId,
    adminId,
    adminName,
    reason || 'Cancelled by initiator'
  );

  res.status(200).json({
    success: true,
    message: 'Action cancelled successfully',
    data: {
      actionId: action._id,
      status: action.status
    }
  });
});

/**
 * @desc    Get action summary/stats
 * @route   GET /api/v1/admin/actions/stats
 * @access  Private/Admin
 */
exports.getActionStats = asyncHandler(async (req, res) => {
  const allActions = await AdminAction.find();
  const pendingActions = await AdminAction.find({ status: 'pending' });
  const approvedActions = await AdminAction.find({ status: 'approved' });
  const executedActions = await AdminAction.find({ status: 'executed' });
  const rejectedActions = await AdminAction.find({ status: 'rejected' });

  // Stats by action type
  const statsByType = {};
  allActions.forEach(action => {
    if (!statsByType[action.actionType]) {
      statsByType[action.actionType] = {
        total: 0,
        pending: 0,
        approved: 0,
        executed: 0,
        rejected: 0
      };
    }
    statsByType[action.actionType].total++;
    statsByType[action.actionType][action.status]++;
  });

  res.status(200).json({
    success: true,
    stats: {
      total: allActions.length,
      pending: pendingActions.length,
      approved: approvedActions.length,
      executed: executedActions.length,
      rejected: rejectedActions.length,
      byActionType: statsByType
    }
  });
});

/**
 * @desc    Notify admin of pending approvals
 * @route   GET /api/v1/admin/actions/pending-count
 * @access  Private/Admin
 */
exports.getPendingApprovalCount = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  const count = await AdminAction.countDocuments({
    status: 'pending',
    'approvals.adminId': { $ne: adminId },
    expiresAt: { $gt: new Date() }
  });

  res.status(200).json({
    success: true,
    pendingCount: count,
    message: count > 0
      ? `You have ${count} pending action${count !== 1 ? 's' : ''} to approve`
      : 'No pending actions to approve'
  });
});

/**
 * @desc    Get dashboard summary for admin
 * @route   GET /api/v1/admin/actions/dashboard
 * @access  Private/Admin
 */
exports.getActionDashboard = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  const [
    pendingForMe,
    myInitiated,
    myApprovals,
    allPending,
    stats
  ] = await Promise.all([
    AdminAction.find({
      status: 'pending',
      'approvals.adminId': { $ne: adminId },
      expiresAt: { $gt: new Date() }
    }).select('_id actionType description initiatedBy createdAt'),

    AdminAction.find({ initiatedBy: adminId }).select('_id actionType status createdAt'),

    AdminAction.find({ 'approvals.adminId': adminId }).select('_id actionType status'),

    AdminAction.find({ status: 'pending', expiresAt: { $gt: new Date() } }).select('_id'),

    AdminAction.find({}).select('status')
  ]);

  const statusCounts = {};
  stats.forEach(action => {
    statusCounts[action.status] = (statusCounts[action.status] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    dashboard: {
      pendingForMyApproval: pendingForMe.length,
      actionsInitiatedByMe: myInitiated.length,
      actionsApprovedByMe: myApprovals.length,
      totalPendingInSystem: allPending.length,
      recentPendingActions: pendingForMe.slice(0, 5).map(a => ({
        id: a._id,
        type: a.actionType,
        description: a.description,
        initiator: a.initiatedBy.name,
        createdAt: a.createdAt
      })),
      stats: {
        ...statusCounts,
        total: stats.length
      }
    }
  });
});
