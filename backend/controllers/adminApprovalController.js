const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const adminApprovalService = require('../services/adminApprovalService');

const usersPath = path.join(__dirname, '../_data/users.json');
let admins = [];
let pendingActions = new Map();

const loadAdmins = () => {
  try {
    const data = fs.readFileSync(usersPath, 'utf8');
    const users = JSON.parse(data);
    admins = users.filter(u => u.role === 'admin').slice(0, 5);
    return admins;
  } catch (err) {
    console.error('Error loading admins:', err);
    return [];
  }
};

loadAdmins();

const getAdminById = (adminId) => {
  return admins.find(a => a.id === adminId);
};

const getAdminByEmailPassword = (email, password) => {
  return admins.find(a => a.email === email && a.password === password);
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const admin = getAdminByEmailPassword(email, password);
  
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ adminId: admin.id, name: admin.name, email: admin.email });
};

exports.initiateAction = (req, res) => {
  const { adminId, actionType, payload } = req.body;

  if (!adminId || !actionType) {
    return res.status(400).json({ error: 'adminId and actionType required' });
  }

  const admin = getAdminById(adminId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin not found' });
  }

  const actionId = 'action_' + crypto.randomBytes(8).toString('hex');
  
  const action = {
    id: actionId,
    type: actionType,
    payload: payload || {},
    initiatorId: adminId,
    approvals: [adminId],
    rejectedBy: null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  pendingActions.set(actionId, action);

  res.json({ 
    actionId, 
    status: 'pending',
    approvals: 1,
    approvalsNeeded: 3,
    initiator: admin.name
  });
};

exports.approveAction = (req, res) => {
  const { adminId, actionId } = req.body;

  if (!adminId || !actionId) {
    return res.status(400).json({ error: 'adminId and actionId required' });
  }

  const admin = getAdminById(adminId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin not found' });
  }

  const action = pendingActions.get(actionId);
  if (!action) {
    return res.status(404).json({ error: 'Action not found' });
  }

  if (action.status !== 'pending') {
    return res.status(400).json({ error: `Action is already ${action.status}` });
  }

  if (action.approvals.includes(adminId)) {
    return res.status(400).json({ error: 'Admin already approved this action' });
  }

  action.approvals.push(adminId);

  if (action.approvals.length >= 3) {
    action.status = 'approved';
    console.log(`✓ Action ${actionId} APPROVED by ${admin.name}. Executing...`);
    console.log(`  Type: ${action.type}`);
    console.log(`  Payload: ${JSON.stringify(action.payload)}`);
    console.log(`  Approvals: ${action.approvals.map(id => getAdminById(id).name).join(', ')}`);
    
    // Execute the action
    adminApprovalService.executeAction(action.type, action.payload)
      .then(result => {
        action.executionResult = result;
        console.log(`✓ Action execution completed:`, result);
      })
      .catch(err => {
        action.status = 'error';
        action.error = err.message;
        console.error(`✗ Action execution failed:`, err.message);
      });
  }

  res.json({
    actionId,
    status: action.status,
    approvals: action.approvals.length,
    approvalsNeeded: 3,
    approvedBy: action.approvals.map(id => {
      const a = getAdminById(id);
      return { id, name: a.name };
    })
  });
};

exports.rejectAction = (req, res) => {
  const { adminId, actionId } = req.body;

  if (!adminId || !actionId) {
    return res.status(400).json({ error: 'adminId and actionId required' });
  }

  const admin = getAdminById(adminId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin not found' });
  }

  const action = pendingActions.get(actionId);
  if (!action) {
    return res.status(404).json({ error: 'Action not found' });
  }

  if (action.status !== 'pending') {
    return res.status(400).json({ error: `Action is already ${action.status}` });
  }

  action.status = 'rejected';
  action.rejectedBy = adminId;

  console.log(`✗ Action ${actionId} REJECTED by ${admin.name}`);

  res.json({
    actionId,
    status: 'rejected',
    rejectedBy: { id: adminId, name: admin.name }
  });
};

exports.getActions = (req, res) => {
  const actions = Array.from(pendingActions.values()).map(action => ({
    id: action.id,
    type: action.type,
    status: action.status,
    initiator: {
      id: action.initiatorId,
      name: getAdminById(action.initiatorId).name
    },
    approvals: action.approvals.length,
    approvalsNeeded: 3,
    approvedBy: action.approvals.map(id => {
      const a = getAdminById(id);
      return { id, name: a.name };
    }),
    createdAt: action.createdAt,
    payload: action.payload
  }));

  res.json(actions);
};

exports.getActionById = (req, res) => {
  const { actionId } = req.params;

  const action = pendingActions.get(actionId);
  if (!action) {
    return res.status(404).json({ error: 'Action not found' });
  }

  const initiator = getAdminById(action.initiatorId);

  res.json({
    id: action.id,
    type: action.type,
    status: action.status,
    initiator: {
      id: action.initiatorId,
      name: initiator.name
    },
    approvals: action.approvals.length,
    approvalsNeeded: 3,
    approvedBy: action.approvals.map(id => {
      const a = getAdminById(id);
      return { id, name: a.name };
    }),
    createdAt: action.createdAt,
    payload: action.payload
  });
};

// Export pendingActions for use by other controllers
exports.getPendingActions = () => pendingActions;

// Create action externally (used by doctor deletion and other privileged actions)
exports.createPendingAction = (initiatorId, actionType, payload) => {
  const actionId = 'action_' + crypto.randomBytes(8).toString('hex');
  
  const action = {
    id: actionId,
    type: actionType,
    payload: payload || {},
    initiatorId: initiatorId,
    approvals: [initiatorId],
    rejectedBy: null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  pendingActions.set(actionId, action);
  return action;
};

// Get all pending actions summary for admins
exports.getPendingActionsSummary = (req, res) => {
  const pendingList = Array.from(pendingActions.values())
    .filter(a => a.status === 'pending')
    .map(action => {
      const initiator = getAdminById(action.initiatorId);
      const pendingAdmins = admins
        .filter(admin => !action.approvals.includes(admin.id))
        .map(admin => ({ id: admin.id, name: admin.name }));

      return {
        id: action.id,
        type: action.type,
        initiator: { id: action.initiatorId, name: initiator.name },
        status: action.status,
        approvals: action.approvals.length,
        approvalsNeeded: 3,
        approvalsRemaining: 3 - action.approvals.length,
        approvedBy: action.approvals.map(id => {
          const a = getAdminById(id);
          return { id, name: a.name };
        }),
        pendingApprovals: pendingAdmins,
        createdAt: action.createdAt,
        payload: action.payload
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    totalPending: pendingList.length,
    actions: pendingList
  });
};

// Get actions pending THIS admin's approval
exports.getActionsPendingMyApproval = (req, res) => {
  const { adminId } = req.params;

  const admin = getAdminById(adminId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin not found' });
  }

  const pendingForThisAdmin = Array.from(pendingActions.values())
    .filter(
      a => a.status === 'pending' && !a.approvals.includes(adminId)
    )
    .map(action => {
      const initiator = getAdminById(action.initiatorId);
      const otherAdmins = admins
        .filter(a => a.id !== adminId && !action.approvals.includes(a.id))
        .map(a => ({ id: a.id, name: a.name }));

      return {
        id: action.id,
        type: action.type,
        initiator: { id: action.initiatorId, name: initiator.name },
        status: action.status,
        approvals: action.approvals.length,
        approvalsNeeded: 3,
        approvalsRemaining: 3 - action.approvals.length,
        approvedBy: action.approvals.map(id => {
          const a = getAdminById(id);
          return { id, name: a.name };
        }),
        stillNeedApprovalFrom: otherAdmins,
        createdAt: action.createdAt,
        payload: action.payload
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    adminId,
    adminName: admin.name,
    actionsPendingApproval: pendingForThisAdmin,
    count: pendingForThisAdmin.length
  });
};

// Get admin dashboard (full stats)
exports.getAdminDashboard = (req, res) => {
  const { adminId } = req.params;

  const admin = getAdminById(adminId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin not found' });
  }

  const allActions = Array.from(pendingActions.values());
  const pendingActions_arr = allActions.filter(a => a.status === 'pending');
  const approvedActions = allActions.filter(a => a.status === 'approved');
  const rejectedActions = allActions.filter(a => a.status === 'rejected');

  const actionsInitiatedByMe = allActions.filter(a => a.initiatorId === adminId);
  const actionsApprovedByMe = allActions.filter(a => a.approvals.includes(adminId));
  const actionsPendingMyApproval = pendingActions_arr.filter(
    a => !a.approvals.includes(adminId)
  );

  res.json({
    adminId,
    adminName: admin.name,
    stats: {
      totalActions: allActions.length,
      pendingActions: pendingActions_arr.length,
      approvedActions: approvedActions.length,
      rejectedActions: rejectedActions.length,
      actionsInitiatedByMe: actionsInitiatedByMe.length,
      actionsApprovedByMe: actionsApprovedByMe.length,
      actionsPendingMyApproval: actionsPendingMyApproval.length
    },
    myActions: {
      initiated: actionsInitiatedByMe.map(a => ({
        id: a.id,
        type: a.type,
        status: a.status,
        approvals: a.approvals.length,
        createdAt: a.createdAt
      })),
      approved: actionsApprovedByMe.map(a => ({
        id: a.id,
        type: a.type,
        status: a.status,
        initiator: getAdminById(a.initiatorId).name,
        createdAt: a.createdAt
      })),
      pendingMyApproval: actionsPendingMyApproval.map(a => {
        const initiator = getAdminById(a.initiatorId);
        const pendingCount = 3 - a.approvals.length;
        return {
          id: a.id,
          type: a.type,
          initiator: { id: a.initiatorId, name: initiator.name },
          approvals: a.approvals.length,
          approvalsRemaining: pendingCount,
          createdAt: a.createdAt
        };
      })
    }
  });
};
