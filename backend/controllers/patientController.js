const Patient = require('../models/Patient');
const asyncHandler = require('express-async-handler');

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

// @desc    Delete a patient profile (admin only)
// @route   DELETE /api/v1/patients/:id
// @access  Private/Admin
exports.deletePatient = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    res.status(404);
    throw new Error('Patient not found');
  }

  await patient.deleteOne();

  res.status(200).json({ success: true, message: 'Patient removed' });
});
