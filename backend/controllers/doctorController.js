const Doctor = require('../models/Doctor');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const adminApprovalController = require('./adminApprovalController');

// @desc    Get all doctors
// @route   GET /api/v1/doctors
// @access  Public
exports.getDoctors = asyncHandler(async (req, res, next) => {
  const doctors = await Doctor.find().populate({
    path: 'user',
    select: 'name email'
  });

  res.status(200).json({
    success: true,
    count: doctors.length,
    data: doctors
  });
});

// @desc    Get single doctor
// @route   GET /api/v1/doctors/:id
// @access  Public
exports.getDoctor = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id).populate({
    path: 'user',
    select: 'name email'
  });

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  res.status(200).json({
    success: true,
    data: doctor
  });
});

// @desc    Create doctor profile
// @route   POST /api/v1/doctors
// @access  Private/Admin
exports.createDoctor = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.body.user);
  if (!user || user.role !== 'doctor') {
    res.status(400);
    throw new Error('User must be a doctor to create a doctor profile');
  }

  const doctor = await Doctor.create(req.body);

  res.status(201).json({
    success: true,
    data: doctor
  });
});

// @desc    Get current doctor profile
// @route   GET /api/v1/doctors/me
// @access  Private/Doctor
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  let doctor = await Doctor.findOne({ user: req.user.id }).populate('user', 'name email');

  // Auto-create doctor profile if not found (for newly registered doctors)
  if (!doctor) {
    doctor = await Doctor.create({
      user: req.user.id,
      specialization: 'General',
      experience: 1, // Changed from 0 to 1 to pass validation
      fees: 100, // Changed from 0 to 100
      about: 'General practice',
      image: ''
    });
    doctor = await Doctor.findById(doctor._id).populate('user', 'name email');
  }

  res.status(200).json({
    success: true,
    data: doctor
  });
});

// @desc    Update doctor profile
// @route   PUT /api/v1/doctors/:id
// @access  Private/Doctor/Admin
exports.updateDoctor = asyncHandler(async (req, res, next) => {
  let doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: doctor
  });
});

// @desc    Delete doctor profile (requires 3 admin approvals)
// @route   DELETE /api/v1/doctors/:id
// @access  Private/Admin
exports.deleteDoctor = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  // Get admin from users.json (not MongoDB)
  // For now, use a fixed admin ID - in production, map from MongoDB user to admin
  const adminId = req.body.adminId || 'admin_001';
  
  if (!adminId) {
    res.status(401);
    throw new Error('Admin authentication required');
  }

  // Create a pending approval action instead of direct deletion
  const action = adminApprovalController.createPendingAction(
    adminId,
    'doctor_deletion',
    {
      doctorId: req.params.id,
      reason: req.body?.reason || 'Admin requested deletion'
    }
  );

  res.status(201).json({
    success: true,
    actionId: action.id,
    message: 'Doctor deletion initiated. Requires approvals from 3 admins.',
    details: {
      doctorId: req.params.id,
      status: 'pending',
      approvals: 1,
      approvalsNeeded: 3
    }
  });
});
