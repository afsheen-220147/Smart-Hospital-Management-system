const AdminDoctor = require('../models/AdminDoctor');
const asyncHandler = require('express-async-handler');

// @desc    Get all admin-approved doctor emails
// @route   GET /api/v1/admin-doctors
// @access  Private/Admin
exports.getAdminDoctors = asyncHandler(async (req, res) => {
  const doctors = await AdminDoctor.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: doctors.length, data: doctors });
});

// @desc    Add a doctor email to the approved list
// @route   POST /api/v1/admin-doctors
// @access  Private/Admin
exports.addAdminDoctor = asyncHandler(async (req, res) => {
  const { name, email, department } = req.body;

  if (!name || !email || !department) {
    res.status(400);
    throw new Error('Name, email and department are required');
  }

  // Enforce @rguktn.ac.in
  if (!email.toLowerCase().endsWith('@rguktn.ac.in')) {
    res.status(400);
    throw new Error('Email must end with @rguktn.ac.in');
  }

  // Duplicate check
  const exists = await AdminDoctor.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('This doctor email is already in the approved list');
  }

  const doctor = await AdminDoctor.create({
    name,
    email: email.toLowerCase(),
    department,
  });

  res.status(201).json({ success: true, data: doctor });
});

// @desc    Remove a doctor email from the approved list
// @route   DELETE /api/v1/admin-doctors/:id
// @access  Private/Admin
exports.removeAdminDoctor = asyncHandler(async (req, res) => {
  const doctor = await AdminDoctor.findById(req.params.id);

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found in the approved list');
  }

  await doctor.deleteOne();
  res.status(200).json({ success: true, message: 'Doctor removed from approved list' });
});

// @desc    Check if an email is in the admin doctor table (public, used during registration)
// @route   POST /api/v1/admin-doctors/verify
// @access  Public
exports.verifyDoctorEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const doctor = await AdminDoctor.findOne({ email: email.toLowerCase() });
  res.status(200).json({
    success: true,
    authorized: !!doctor,
    department: doctor ? doctor.department : null,
  });
});
