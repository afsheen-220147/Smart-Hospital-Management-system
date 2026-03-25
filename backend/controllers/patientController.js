const Patient = require('../models/Patient');
const asyncHandler = require('express-async-handler');
const adminApprovalController = require('./adminApprovalController');

// @desc    Get all patients
// @route   GET /api/v1/patients
// @access  Private/Admin
exports.getPatients = asyncHandler(async (req, res, next) => {
  const patients = await Patient.find().populate('user', 'name email');

  res.status(200).json({
    success: true,
    count: patients.length,
    data: patients
  });
});

// @desc    Get single patient
// @route   GET /api/v1/patients/:id
// @access  Private
exports.getPatient = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findById(req.params.id).populate('user', 'name email');

  if (!patient) {
    res.status(404);
    throw new Error('Patient not found');
  }

  res.status(200).json({
    success: true,
    data: patient
  });
});

// @desc    Create or Update patient profile
// @route   POST /api/v1/patients
// @access  Private
exports.updatePatientProfile = asyncHandler(async (req, res, next) => {
  let patient = await Patient.findOne({ user: req.user.id });

  if (patient) {
    // Update
    patient = await Patient.findOneAndUpdate(
      { user: req.user.id },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
  } else {
    // Create
    req.body.user = req.user.id;
    patient = await Patient.create(req.body);
  }

  res.status(200).json({
    success: true,
    data: patient
  });
});

// @desc    Get current user patient profile
// @route   GET /api/v1/patients/me
// @access  Private
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  let patient = await Patient.findOne({ user: req.user.id }).populate('user', 'name email');

  if (!patient) {
    // Return empty profile object instead of error to allow frontend to handle "new profile" state
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
        phone: '',
        address: '',
        dateOfBirth: null,
        weight: null,
        height: null,
        bloodGroup: '',
        emergencyContact: ''
      }
    });
  }

  res.status(200).json({
    success: true,
    data: patient
  });
});

// @desc    Delete a patient profile (requires 3 admin approvals)
// @route   DELETE /api/v1/patients/:id
// @access  Private/Admin
exports.deletePatient = asyncHandler(async (req, res, next) => {
  // Get admin from users.json (not MongoDB)
  // For now, use a fixed admin ID - in production, map from MongoDB user to admin
  const adminId = req.body.adminId || 'admin_001';
  
  if (!adminId) {
    res.status(401);
    throw new Error('Admin authentication required');
  }

  // Create a pending approval action instead of direct deletion
  const adminApprovalService = require('../services/adminApprovalService');
  const patient = await Patient.findById(req.params.id).populate('user', 'name');

  if (!patient) {
    res.status(404);
    throw new Error('Patient not found');
  }
  const action = await adminApprovalService.createAction(
    adminId,
    req.user.name,
    'patient_delete',
    `Delete patient: ${patient?.user?.name || req.params.id}`,
    {
      patientId: req.params.id,
      reason: req.body?.reason || 'Admin requested deletion'
    },
    {
      type: 'patient',
      entityId: req.params.id,
      entityName: patient?.user?.name || 'Unknown Patient'
    }
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    message: 'Patient deletion initiated. Requires approvals from 3 admins.',
    details: {
      patientId: req.params.id,
      status: 'pending',
      approvals: 1,
      approvalsNeeded: 3
    }
  });
});
