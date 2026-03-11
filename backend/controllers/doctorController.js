const Doctor = require('../models/Doctor');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

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
      experience: 0,
      fees: 0,
      about: '',
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
// 
