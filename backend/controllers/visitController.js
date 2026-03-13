const Visit = require('../models/Visit');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const asyncHandler = require('express-async-handler');
const sendEmail = require('../utils/sendEmail');
const { diagnosisComplete } = require('../utils/emailTemplates');

// @desc    Get all visits/medical records
// @route   GET /api/v1/visits
// @access  Private
exports.getVisits = asyncHandler(async (req, res, next) => {
  let query;

  if (req.user.role === 'patient') {
    query = Visit.find({ patient: req.user.id });
  } else if (req.user.role === 'doctor') {
    // Find the doctor's profile first to get the Doctor document _id
    const doctorProfile = await Doctor.findOne({ user: req.user.id });
    if (!doctorProfile) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    query = Visit.find({ doctor: doctorProfile._id });
  } else {
    query = Visit.find();
  }

  const visits = await query
    .populate('patient', 'name email')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email' }
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: visits.length,
    data: visits
  });
});

// @desc    Create a visit/medical record
// @route   POST /api/v1/visits
// @access  Private/Doctor
exports.createVisit = asyncHandler(async (req, res, next) => {
  // Find the doctor's profile to get the proper Doctor document ID
  const doctorProfile = await Doctor.findOne({ user: req.user.id }).populate('user', 'name email');
  
  if (!doctorProfile) {
    res.status(404);
    throw new Error('Doctor profile not found. Please complete your profile setup.');
  }

  req.body.doctor = doctorProfile._id;

  const visit = await Visit.create(req.body);

  // Auto-mark the linked appointment as completed
  if (req.body.appointment) {
    try {
      await Appointment.findByIdAndUpdate(req.body.appointment, { status: 'completed' });
    } catch (apptErr) {
      console.warn('Could not update appointment status:', apptErr.message);
    }
  }

  // Populate before returning so the response is useful
  const populatedVisit = await Visit.findById(visit._id)
    .populate('patient', 'name email')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email' }
    });

  // Send email notification to patient
  try {
    if (populatedVisit.patient?.email) {
      const emailTemplate = diagnosisComplete({
        patientName: populatedVisit.patient.name || 'Patient',
        doctorName: doctorProfile.user?.name || 'Your Doctor',
        department: doctorProfile.department || doctorProfile.specialty || 'General',
        diagnosis: populatedVisit.title || populatedVisit.description,
        prescription: populatedVisit.description,
        recordType: populatedVisit.recordType || 'Prescription',
        visitDate: populatedVisit.createdAt,
        followUpNotes: req.body.followUpNotes
      });

      await sendEmail({
        to: populatedVisit.patient.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    }
  } catch (emailError) {
    console.error('Failed to send diagnosis email notification:', emailError.message);
    // Don't throw - visit was created successfully, email is secondary
  }

  res.status(201).json({
    success: true,
    data: populatedVisit
  });
});

// @desc    Get single visit
// @route   GET /api/v1/visits/:id
// @access  Private
exports.getVisit = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id)
    .populate('patient', 'name email')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email' }
    });

  if (!visit) {
    res.status(404);
    throw new Error('Visit record not found');
  }

  res.status(200).json({
    success: true,
    data: visit
  });
});

// @desc    Get visits for a specific patient (by patient ID)
// @route   GET /api/v1/visits/patient/:patientId
// @access  Private (Doctor/Admin)
exports.getPatientVisits = asyncHandler(async (req, res, next) => {
  const visits = await Visit.find({ patient: req.params.patientId })
    .populate('patient', 'name email')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email' }
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: visits.length,
    data: visits
  });
});
