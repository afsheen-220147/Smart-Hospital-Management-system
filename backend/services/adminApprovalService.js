const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AdminAction = require('../models/AdminAction');

const REQUIRED_APPROVALS = 3;

/**
 * Action Executors - These handle the actual execution of approved actions
 * Each executor receives the payload and must return { success, message, details }
 */
const actionExecutors = {
  doctor_delete: async (payload, actionId) => {
    const { doctorId } = payload;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    const userId = doctor.user;

    // Cancel all pending/scheduled appointments
    const appointmentResult = await Appointment.deleteMany({
      doctor: doctorId,
      status: { $in: ['scheduled', 'pending', 'confirmed'] }
    });

    // Delete doctor record
    await Doctor.findByIdAndDelete(doctorId);

    // Delete associated user
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    const message = `Doctor deleted successfully. Cancelled ${appointmentResult.deletedCount} appointments.`;
    console.log(`✓ ${message}`);

    return {
      success: true,
      message,
      details: {
        doctorId,
        userId,
        appointmentsCancelled: appointmentResult.deletedCount
      }
    };
  },

  doctor_add: async (payload, actionId) => {
    const { userId, specialization, licenseNumber, department } = payload;

    const user = await User.findById(userId);
    if (!user || user.role !== 'doctor') {
      throw new Error('User must be a doctor to create doctor profile');
    }

    const doctorData = {
      user: userId,
      specialization: specialization || 'General Practice',
      licenseNumber: licenseNumber || 'N/A',
      department: department || 'General',
      status: 'active'
    };

    const doctor = await Doctor.create(doctorData);

    console.log(`✓ Doctor ${userId} created successfully with ID: ${doctor._id}`);

    return {
      success: true,
      message: 'Doctor added successfully',
      details: {
        doctorId: doctor._id,
        userId,
        specialization
      }
    };
  },

  doctor_update: async (payload, actionId) => {
    const { doctorId, updateData } = payload;

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    console.log(`✓ Doctor ${doctorId} updated successfully`);

    return {
      success: true,
      message: 'Doctor updated successfully',
      details: {
        doctorId,
        updatedFields: Object.keys(updateData)
      }
    };
  },

  patient_delete: async (payload, actionId) => {
    const { patientId } = payload;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const userId = patient.user;

    // Cancel all appointments
    const appointmentResult = await Appointment.deleteMany({
      patient: patientId
    });

    // Delete patient record
    await Patient.findByIdAndDelete(patientId);

    // Delete associated user
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    const message = `Patient deleted successfully. Cancelled ${appointmentResult.deletedCount} appointments.`;
    console.log(`✓ ${message}`);

    return {
      success: true,
      message,
      details: {
        patientId,
        userId,
        appointmentsCancelled: appointmentResult.deletedCount
      }
    };
  },

  patient_add: async (payload, actionId) => {
    const { userId, bloodType, allergies, medicalHistory } = payload;

    const user = await User.findById(userId);
    if (!user || user.role !== 'patient') {
      throw new Error('User must be a patient to create patient profile');
    }

    const patientData = {
      user: userId,
      bloodType: bloodType || 'Unknown',
      allergies: allergies || [],
      medicalHistory: medicalHistory || '',
      status: 'active'
    };

    const patient = await Patient.create(patientData);

    console.log(`✓ Patient ${userId} created successfully with ID: ${patient._id}`);

    return {
      success: true,
      message: 'Patient added successfully',
      details: {
        patientId: patient._id,
        userId,
        bloodType
      }
    };
  },

  patient_update: async (payload, actionId) => {
    const { patientId, updateData } = payload;

    const patient = await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!patient) {
      throw new Error('Patient not found');
    }

    console.log(`✓ Patient ${patientId} updated successfully`);

    return {
      success: true,
      message: 'Patient updated successfully',
      details: {
        patientId,
        updatedFields: Object.keys(updateData)
      }
    };
  },

  user_delete: async (payload, actionId) => {
    const { userId } = payload;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If user is a doctor, delete doctor record
    if (user.role === 'doctor') {
      await Doctor.findOneAndDelete({ user: userId });
    }

    // If user is a patient, delete patient record
    if (user.role === 'patient') {
      await Patient.findOneAndDelete({ user: userId });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    console.log(`✓ User ${userId} deleted successfully`);

    return {
      success: true,
      message: 'User deleted successfully',
      details: { userId, role: user.role }
    };
  }
};

/**
 * Create a new admin action request
 */
exports.createAction = async (
  initiatorId,
  initiatorName,
  actionType,
  description,
  payload,
  targetEntity = null
) => {
  try {
    const actionData = {
      actionType,
      actionNamespace: actionType.split('_')[0],
      description,
      payload,
      initiatedBy: initiatorId,
      initiatorName,
      targetEntity,
      approvals: [
        {
          adminId: initiatorId,
          adminName: initiatorName
        }
      ]
    };

    const action = await AdminAction.create(actionData);

    console.log(
      `[ADMIN ACTION] New action created: ${actionType} (ID: ${action._id}) by ${initiatorName}`
    );

    return action;
  } catch (error) {
    console.error('Error creating admin action:', error.message);
    throw error;
  }
};

/**
 * Approve an action (admin approval)
 */
exports.approveAction = async (actionId, adminId, adminName) => {
  try {
    const action = await AdminAction.findById(actionId);

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'pending') {
      throw new Error(`Cannot approve action with status: ${action.status}`);
    }

    if (action.isExpired()) {
      action.status = 'expired';
      await action.save();
      throw new Error('Action has expired');
    }

    // Check if admin is the initiator (self-approval not allowed)
    if (action.initiatedBy.toString() === adminId.toString()) {
      throw new Error('Admin cannot approve their own action');
    }

    // Check if admin already approved
    if (action.hasAdminApproved(adminId)) {
      throw new Error('Admin has already approved this action');
    }

    // Check if admin already rejected
    if (action.hasAdminRejected(adminId)) {
      throw new Error('Admin has already rejected this action');
    }

    // Add approval
    action.approvals.push({
      adminId,
      adminName,
      approvedAt: new Date()
    });

    // Log audit
    action.auditLog.push({
      action: 'approved',
      adminId,
      adminName,
      details: `Approved by ${adminName}`
    });

    // Check if action is fully approved
    if (action.approvals.length >= REQUIRED_APPROVALS) {
      action.status = 'approved';

      console.log(
        `[ADMIN ACTION] Action ${actionId} FULLY APPROVED. Ready for execution.`
      );
    }

    await action.save();

    return action;
  } catch (error) {
    console.error('Error approving action:', error.message);
    throw error;
  }
};

/**
 * Reject an action (admin rejection)
 */
exports.rejectAction = async (actionId, adminId, adminName, reason = 'No reason provided') => {
  try {
    const action = await AdminAction.findById(actionId);

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'pending') {
      throw new Error(`Cannot reject action with status: ${action.status}`);
    }

    // Check if admin already rejected
    if (action.hasAdminRejected(adminId)) {
      throw new Error('Admin has already rejected this action');
    }

    // Add rejection
    action.rejections.push({
      adminId,
      adminName,
      reason,
      rejectedAt: new Date()
    });

    // Log audit
    action.auditLog.push({
      action: 'rejected',
      adminId,
      adminName,
      details: `Rejected: ${reason}`
    });

    // Any rejection cancels the action
    action.status = 'rejected';

    console.log(
      `[ADMIN ACTION] Action ${actionId} REJECTED by ${adminName}. Reason: ${reason}`
    );

    await action.save();

    return action;
  } catch (error) {
    console.error('Error rejecting action:', error.message);
    throw error;
  }
};

/**
 * Execute an approved action
 */
exports.executeAction = async (actionId) => {
  try {
    const action = await AdminAction.findById(actionId);

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'approved') {
      throw new Error(`Cannot execute action with status: ${action.status}`);
    }

    const executor = actionExecutors[action.actionType];

    if (!executor) {
      throw new Error(`No executor found for action type: ${action.actionType}`);
    }

    const result = await executor(action.payload, actionId);

    action.status = 'executed';
    action.executionResult = {
      success: result.success,
      message: result.message,
      details: result.details,
      executedAt: new Date()
    };

    action.auditLog.push({
      action: 'executed',
      details: `Action executed successfully: ${result.message}`
    });

    await action.save();

    console.log(`[ADMIN ACTION] Action ${actionId} EXECUTED successfully`);

    return action;
  } catch (error) {
    console.error('Error executing action:', error.message);

    // Update action status to error
    const action = await AdminAction.findById(actionId);
    if (action) {
      action.status = 'error';
      action.executionResult = {
        success: false,
        error: error.message
      };
      await action.save();
    }

    throw error;
  }
};

/**
 * Get pending actions for an admin
 */
exports.getPendingForAdmin = async (adminId) => {
  return await AdminAction.getPendingForAdmin(adminId);
};

/**
 * Get all pending actions
 */
exports.getAllPending = async () => {
  return await AdminAction.getAllPending();
};

/**
 * Get action by ID with full details
 */
exports.getActionById = async (actionId) => {
  return await AdminAction.findById(actionId)
    .populate('initiatedBy', 'name email')
    .populate('approvals.adminId', 'name email')
    .populate('rejections.adminId', 'name email');
};

/**
 * Get all actions by initiator
 */
exports.getActionsByInitiator = async (adminId) => {
  return await AdminAction.find({ initiatedBy: adminId })
    .populate('initiatedBy', 'name email')
    .populate('approvals.adminId', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Get actions approved by admin
 */
exports.getActionsByApprover = async (adminId) => {
  return await AdminAction.find({ 'approvals.adminId': adminId })
    .populate('initiatedBy', 'name email')
    .populate('approvals.adminId', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Cancel a pending action
 */
exports.cancelAction = async (actionId, adminId, adminName, reason = 'Cancelled by admin') => {
  const action = await AdminAction.findById(actionId);

  if (!action) {
    throw new Error('Action not found');
  }

  if (action.status !== 'pending') {
    throw new Error(`Cannot cancel action with status: ${action.status}`);
  }

  if (action.initiatedBy.toString() !== adminId.toString()) {
    throw new Error('Only the initiator can cancel the action');
  }

  action.status = 'cancelled';
  action.auditLog.push({
    action: 'cancelled',
    adminId,
    adminName,
    details: reason
  });

  await action.save();

  console.log(`[ADMIN ACTION] Action ${actionId} CANCELLED by ${adminName}`);

  return action;
};

exports.actionExecutors = actionExecutors;
exports.REQUIRED_APPROVALS = REQUIRED_APPROVALS;
