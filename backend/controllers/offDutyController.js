const asyncHandler = require('express-async-handler');
const offDutyService = require('../services/offDutyService');
const DoctorOffDutyRequest = require('../models/DoctorOffDutyRequest');
const Appointment = require('../models/Appointment');

/**
 * @desc    Create off-duty request (Doctor action)
 * @route   POST /api/v1/doctor/off-duty/request
 * @access  Private/Doctor
 */
exports.createOffDutyRequest = asyncHandler(async (req, res) => {
  const { date, session, reason } = req.body;

  // Validate required fields
  if (!date || !session) {
    res.status(400);
    throw new Error('Please provide date and session');
  }

  if (!['morning', 'afternoon'].includes(session)) {
    res.status(400);
    throw new Error('Session must be either "morning" or "afternoon"');
  }

  // Get doctor ID from token (doctor's doctorId stored in req.user)
  const Doctor = require('../models/Doctor');
  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor) {
    res.status(404);
    throw new Error('Doctor profile not found');
  }

  // Create off-duty request
  const offDutyRequest = await offDutyService.createOffDutyRequest(
    doctor._id,
    date,
    session,
    reason || 'Doctor Unavailable'
  );

  // MANUALLY POPULATE DOCTOR NAME - FORCE SYNC
  const User = require('../models/User');
  const user = await User.findById(req.user.id);
  if (user) {
    offDutyRequest.doctorName = user.name;
    await offDutyRequest.save();
  }

  res.status(201).json({
    success: true,
    data: offDutyRequest,
    message: 'Off-duty request submitted for admin approval'
  });
});

/**
 * @desc    Get all off-duty requests (Admin view)
 * @route   GET /api/v1/admin/off-duty/requests
 * @access  Private/Admin
 */
exports.getAllOffDutyRequests = asyncHandler(async (req, res) => {
  const { status, doctor, startDate, endDate } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (doctor) filters.doctor = doctor;
  if (startDate && endDate) {
    filters.startDate = startDate;
    filters.endDate = endDate;
  }

  const requests = await offDutyService.getOffDutyRequests(filters);

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests
  });
});

/**
 * @desc    Get off-duty request details
 * @route   GET /api/v1/admin/off-duty/request/:id
 * @access  Private/Admin
 */
exports.getOffDutyRequest = asyncHandler(async (req, res) => {
  const request = await DoctorOffDutyRequest.findById(req.params.id)
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email' }
    })
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .populate('rescheduledAppointments');

  if (!request) {
    res.status(404);
    throw new Error('Off-duty request not found');
  }

  // Get affected appointments count
  const affectedAppointments = await offDutyService.findAffectedAppointments(
    request.doctor._id,
    request.date,
    request.session
  );

  res.status(200).json({
    success: true,
    data: {
      request,
      potentiallyAffectedCount: affectedAppointments.length,
      affectedAppointments
    }
  });
});

/**
 * @desc    Approve off-duty request
 * @route   POST /api/v1/admin/off-duty/request/:id/approve
 * @access  Private/Admin
 */
exports.approveOffDutyRequest = asyncHandler(async (req, res) => {
  const { remarks } = req.body;

  const result = await offDutyService.approveOffDutyRequest(
    req.params.id,
    req.user.id,
    remarks
  );

  res.status(200).json({
    success: true,
    data: result,
    message: result.message
  });
});

/**
 * @desc    Reject off-duty request
 * @route   POST /api/v1/admin/off-duty/request/:id/reject
 * @access  Private/Admin
 */
exports.rejectOffDutyRequest = asyncHandler(async (req, res) => {
  const { remarks } = req.body;

  if (!remarks) {
    res.status(400);
    throw new Error('Rejection remarks are required');
  }

  const request = await offDutyService.rejectOffDutyRequest(
    req.params.id,
    req.user.id,
    remarks
  );

  res.status(200).json({
    success: true,
    data: request,
    message: 'Off-duty request rejected'
  });
});

/**
 * @desc    Get off-duty statistics
 * @route   GET /api/v1/admin/off-duty/stats
 * @access  Private/Admin
 */
exports.getOffDutyStats = asyncHandler(async (req, res) => {
  const stats = await offDutyService.getOffDutyStats();

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Get doctor's pending off-duty requests
 * @route   GET /api/v1/doctor/off-duty/my-requests
 * @access  Private/Doctor
 */
exports.getDoctorOffDutyRequests = asyncHandler(async (req, res) => {
  const Doctor = require('../models/Doctor');
  const doctor = await Doctor.findOne({ user: req.user.id });

  if (!doctor) {
    res.status(404);
    throw new Error('Doctor profile not found');
  }

  const { status = 'all' } = req.query;
  const filter = { doctor: doctor._id };

  if (status !== 'all') {
    filter.status = status;
  }

  const requests = await DoctorOffDutyRequest.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests
  });
});

/**
 * @desc    Get doctor's off-duty status for a specific date/session
 * @route   GET /api/v1/doctor/off-duty/status/:doctorId/:date/:session
 * @access  Public
 */
exports.getDoctorOffDutyStatus = asyncHandler(async (req, res) => {
  const { doctorId, date, session } = req.params;

  if (!['morning', 'afternoon'].includes(session)) {
    res.status(400);
    throw new Error('Session must be either "morning" or "afternoon"');
  }

  const offDutyStatus = await offDutyService.getDoctorOffDutyStatus(
    doctorId,
    new Date(date),
    session
  );

  res.status(200).json({
    success: true,
    data: {
      isOffDuty: !!offDutyStatus,
      reason: offDutyStatus?.reason || null,
      offDutyRequest: offDutyStatus
    }
  });
});

/**
 * @desc    Check appointment date availability (Today/Tomorrow only)
 * @route   GET /api/v1/appointments/date-availability/:date
 * @access  Public
 */
exports.checkAppointmentDateAvailability = asyncHandler(async (req, res) => {
  const { date } = req.params;

  const availability = offDutyService.isAppointmentDateAvailable(new Date(date));

  res.status(200).json({
    success: true,
    data: availability
  });
});
