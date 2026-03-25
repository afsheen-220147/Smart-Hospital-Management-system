const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('express-async-handler');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private (Admin)
exports.getAppointments = asyncHandler(async (req, res, next) => {
  // ✅ OPTIMIZATION: Use lean() and field selection for admin dashboard
  const appointments = await Appointment.find()
    .populate('patient', 'name email') // Select only needed fields
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name' }
    })
    .lean() // ✅ Read-only performance boost
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Get appointments for a patient
// @route   GET /api/v1/appointments/patient/:patientId
// @access  Private
exports.getPatientAppointments = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'patient' && req.user.id !== req.params.patientId) {
    res.status(401);
    throw new Error('Not authorized to see others appointments');
  }

  // ✅ OPTIMIZATION: Use lean() for faster read-only queries
  const appointments = await Appointment.find({ patient: req.params.patientId })
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name' }
    })
    .lean() // ✅ Performance boost for read-only
    .sort({ date: -1 }); // Sort by most recent first

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Book appointment
// @route   POST /api/v1/appointments
// @access  Private
exports.bookAppointment = asyncHandler(async (req, res, next) => {
  req.body.patient = req.user.id;

  const { doctor, date, timeSlot, duration = 30 } = req.body;
  const offDutyService = require('../services/offDutyService');

  // Validate doctor exists
  const doctorData = await Doctor.findById(doctor);
  if (!doctorData) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  // Validate appointment date is in the future
  const appointmentDate = new Date(date);
  if (appointmentDate < new Date()) {
    res.status(400);
    throw new Error('Cannot book appointment in the past');
  }

  // ===== BOOKING CONSTRAINT: Only today or tomorrow =====
  const availability = offDutyService.isAppointmentDateAvailable(appointmentDate);
  if (!availability.available) {
    res.status(400);
    throw new Error(availability.reason);
  }

  // ===== Check if doctor is off-duty for this appointment =====
  const appointmentSession = offDutyService.getSessionFromTimeSlot(timeSlot);
  if (appointmentSession) {
    const doctorOffDutyStatus = await offDutyService.getDoctorOffDutyStatus(
      doctor,
      appointmentDate,
      appointmentSession
    );

    if (doctorOffDutyStatus) {
      res.status(400);
      throw new Error(`Dr. ${doctorData.user?.name || 'This doctor'} is unavailable for ${appointmentSession} session on ${new Date(appointmentDate).toLocaleDateString()}. Please choose a different date or time.`);
    }
  }

  // Calculate end time
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const startTime = new Date(appointmentDate);
  startTime.setHours(hours, minutes, 0);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  const endTimeSlot = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

  // Check for double booking - look for overlapping appointments with same doctor
  const existingAppointments = await Appointment.find({
    doctor: doctor,
    date: {
      $gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
      $lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1)
    },
    status: { $in: ['pending', 'confirmed', 'in-progress'] }
  });

  // Check for time slot conflicts
  const hasConflict = existingAppointments.some(apt => {
    const aptStart = apt.timeSlot;
    const aptEnd = apt.endTime || apt.timeSlot;
    
    // Check if new appointment overlaps with existing
    return !(endTimeSlot <= aptStart || timeSlot >= aptEnd);
  });

  if (hasConflict) {
    res.status(409);
    throw new Error(`Time slot ${timeSlot} is already booked with doctor. Please choose another time.`);
  }

  // FEATURE 1: Check if patient already has ANY appointment at this time slot across ALL doctors
  const patientTimeSlotConflict = await Appointment.find({
    patient: req.user.id,
    date: {
      $gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
      $lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1)
    },
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    _id: { $ne: null } // Get all appointments
  }).populate({
    path: 'doctor',
    populate: { path: 'user', select: 'name' }
  });

  // Check if requested time slot overlaps with ANY of patient's appointments
  const conflictingAppt = patientTimeSlotConflict.find(apt => {
    const aptStart = apt.timeSlot;
    const aptEnd = apt.endTime || apt.timeSlot;
    return !(endTimeSlot <= aptStart || timeSlot >= aptEnd);
  });

  if (conflictingAppt) {
    const conflictingDoctorName = conflictingAppt.doctor?.user?.name || 'a doctor';
    res.status(400);
    throw new Error(`You already have an appointment with Dr. ${conflictingDoctorName} at this time. Please change the timings.`);
  }

  // Check if patient already has confirmed appointment with same doctor on same date
  const patientAppointmentCheck = await Appointment.findOne({
    patient: req.user.id,
    doctor: doctor,
    date: {
      $gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
      $lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1)
    },
    status: { $in: ['pending', 'confirmed'] }
  });

  if (patientAppointmentCheck) {
    res.status(409);
    throw new Error('You already have an appointment scheduled with this doctor on this date');
  }

  // Create appointment with calculated end time
  req.body.endTime = endTimeSlot;
  req.body.duration = duration;

  const appointment = await Appointment.create(req.body);

  // Populate references for response
  await appointment.populate([
    { path: 'patient', select: 'name email' },
    { path: 'doctor', populate: { path: 'user', select: 'name' } }
  ]);

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: appointment
  });
});

// @desc    Get appointments for a doctor
// @route   GET /api/v1/appointments/doctor/:doctorId
// @access  Private
exports.getDoctorAppointments = asyncHandler(async (req, res, next) => {
  const { calculateDelay } = require('../utils/delayCalculator');
  
  const query = { doctor: req.params.doctorId };

  // Filter by status if provided (comma-separated, e.g. ?status=pending,confirmed,in-progress)
  if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim());
    query.status = { $in: statuses };
  }

  // Filter by date if provided
  if (req.query.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (req.query.date === 'today') {
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: today, $lte: endOfDay };
    } else if (req.query.date === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      query.date = { $gte: tomorrow, $lte: endOfTomorrow };
    } else if (req.query.date === 'previous') {
      query.date = { $lt: today };
    } else {
      // Specific date
      const startDay = new Date(req.query.date);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(startDay);
      endDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startDay, $lte: endDay };
    }
  }

  // ✅ OPTIMIZATION: Use lean() for faster query + batch lookup instead of N+1
  let appointments = await Appointment.find(query)
    .populate('patient', 'name email')
    .lean() // ✅ Use lean for read-only performance boost
    .sort({ date: 1, timeSlot: 1 });

  // ✅ BATCH LOOKUP: Get all patient IDs and fetch demographics once
  const patientUserIds = appointments
    .filter(apt => apt.patient?._id)
    .map(apt => apt.patient._id);
  
  const patientDetailsMap = new Map();
  if (patientUserIds.length > 0) {
    const patientRecords = await Patient.find({ user: { $in: patientUserIds } }).lean();
    // Create map for O(1) lookup
    patientRecords.forEach(p => {
      patientDetailsMap.set(p.user.toString(), p);
    });
  }

  // Helper function to calculate age from dateOfBirth
  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // ✅ ENRICHMENT: Merge demographics WITHOUT async calls (data already fetched)
  const enrichedAppointments = appointments.map((apt) => {
    const patientDetails = patientDetailsMap.get(apt.patient._id.toString());
    
    apt.patientDetails = {
      name: apt.patient.name,
      email: apt.patient.email,
      phone: patientDetails?.phone || null,
      gender: patientDetails?.gender || null,
      dateOfBirth: patientDetails?.dateOfBirth || null,
      age: calculateAge(patientDetails?.dateOfBirth)
    };
    
    // Calculate real-time delay for ongoing/completed appointments
    if (apt.estimatedStartTime) {
      const referenceTime = apt.actualStartTime || new Date();
      apt.delayInMinutes = calculateDelay(apt.estimatedStartTime, referenceTime);
    }
    
    return apt;
  });

  res.status(200).json({
    success: true,
    count: enrichedAppointments.length,
    data: enrichedAppointments
  });
});

// @desc    Update appointment status
// @route   PUT /api/v1/appointments/:id
// @access  Private
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
  let appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  const { status, cancellationReason, notes, consultationType } = req.body;

  // ── Handle consultation type update only (no status change) ──
  if (!status && consultationType) {
    if (!['in-person', 'online'].includes(consultationType)) {
      res.status(400);
      throw new Error('Invalid consultation type. Must be in-person or online');
    }
    // Only allow updating for pending/confirmed appointments
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      res.status(400);
      throw new Error('Can only change consultation type for pending or confirmed appointments');
    }
    appointment.consultationType = consultationType;
    // Auto-generate meetingRoomId for online consultations
    if (consultationType === 'online' && !appointment.meetingRoomId) {
      appointment.meetingRoomId = `medicarepro${appointment._id.toString()}`;
    }
    appointment = await appointment.save();
    return res.status(200).json({
      success: true,
      message: `Consultation type updated to ${consultationType}`,
      data: appointment
    });
  }

  // Permission check
  if (req.user.role === 'patient') {
    if (appointment.patient.toString() !== req.user.id) {
       res.status(401);
       throw new Error('Not authorized to modify this appointment');
    }
    // Patients can only cancel or update consultation type
    if (status !== 'cancelled') {
        res.status(400);
        throw new Error('Patients can only cancel appointments');
    }
  }

  // FIXED: Doctor check - allow cancellation but verify it's their own appointment
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
      res.status(403);
      throw new Error('You can only cancel your own appointments');
    }
    
    // Doctors can cancel confirmed/in-progress appointments
    if (status === 'cancelled') {
      if (!['confirmed', 'in-progress'].includes(appointment.status)) {
        res.status(400);
        throw new Error(`Cannot cancel appointment with status: ${appointment.status}`);
      }
      
      // Require cancellation reason from doctors
      if (!cancellationReason || typeof cancellationReason !== 'string' || cancellationReason.trim().length === 0) {
        res.status(400);
        throw new Error('Cancellation reason is required');
      }
    }
  }

  // Validate status transitions
  const validTransitions = {
    pending: ['confirmed', 'cancelled', 'no-show'],
    confirmed: ['in-progress', 'cancelled', 'no-show'],
    'in-progress': ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    'no-show': ['pending'] // Allow re-booking
  };

  if (!validTransitions[appointment.status]?.includes(status)) {
    res.status(400);
    throw new Error(`Cannot transition from ${appointment.status} to ${status}`);
  }

  // Handle cancellation
  if (status === 'cancelled') {
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = cancellationReason || 'Cancelled by user';
    
    // FEATURES 2 & 5: Track who cancelled the appointment
    if (req.user.role === 'patient') {
      appointment.cancelledBy = 'patient';
      appointment.cancelReason = cancellationReason || 'Cancelled by patient';
    } else if (req.user.role === 'doctor') {
      appointment.cancelledBy = 'doctor';
      appointment.cancelReason = cancellationReason || 'Cancelled by doctor';
    } else if (req.user.role === 'admin') {
      appointment.cancelledBy = 'admin';
      appointment.cancelReason = cancellationReason || 'Cancelled by admin';
    }
  }

  // Update appointment status
  appointment.status = status;
  
  // Add notes if provided
  if (notes) {
    appointment.notes = (appointment.notes ? appointment.notes + '\n' : '') + `[${new Date().toISOString()}] ${notes}`;
  }

  // Handle check-in for in-progress status
  if (status === 'in-progress') {
    appointment.checkedIn = true;
    appointment.checkedInAt = new Date();
    appointment.actualStartTime = new Date();
  }

  // Handle completion
  if (status === 'completed') {
    appointment.actualEndTime = new Date();
  }

  appointment = await appointment.save();

  // FEATURE 3: Promote waitlisted patient if appointment is cancelled
  let waitlistPromotion = null;
  if (status === 'cancelled') {
    try {
      const waitlistService = require('../services/waitlistService');
      waitlistPromotion = await waitlistService.promoteWaitlistedPatient(
        appointment.doctor,
        appointment.date,
        appointment.timeSlot
      );
    } catch (err) {
      console.error('Error promoting waitlisted patient:', err.message);
      // Don't fail the response, just log the error
    }

    // ✅ SEND PROFESSIONAL CANCELLATION EMAIL
    try {
      const notificationService = require('../services/notificationService');
      const cancelledByLabel = appointment.cancelledBy === 'patient' ? 'Patient' : 
                               appointment.cancelledBy === 'doctor' ? 'Doctor' : 
                               appointment.cancelledBy === 'admin' ? 'Admin' : 
                               'System';
      
      await notificationService.sendCancellationNotice(
        appointment._id,
        cancelledByLabel,
        appointment.cancelReason || ''
      );
    } catch (err) {
      console.error('Error sending cancellation email:', err.message);
      // Don't fail the response if email fails
    }
  }

  res.status(200).json({
    success: true,
    message: `Appointment status updated to ${status}`,
    data: {
      appointment,
      waitlistPromotion: waitlistPromotion || null
    }
  });
});

// @desc    Reschedule appointment
// @route   PUT /api/v1/appointments/:id/reschedule
// @access  Private
exports.rescheduleAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only pending or confirmed appointments can be rescheduled
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    res.status(400);
    throw new Error(`Cannot reschedule appointment with status: ${appointment.status}`);
  }

  // Check permissions
  if (req.user.role === 'patient' && appointment.patient.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Not authorized to reschedule this appointment');
  }

  const { date, timeSlot, duration = appointment.duration } = req.body;

  if (!date || !timeSlot) {
    res.status(400);
    throw new Error('Please provide new date and time slot');
  }

  // Validate new date is in the future
  const newDate = new Date(date);
  if (newDate < new Date()) {
    res.status(400);
    throw new Error('Cannot reschedule to a past date');
  }

  // Calculate new end time
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const startTime = new Date(newDate);
  startTime.setHours(hours, minutes, 0);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  const endTimeSlot = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

  // Check for conflicts with new time slot
  const existingAppointments = await Appointment.find({
    _id: { $ne: appointment._id },
    doctor: appointment.doctor,
    date: {
      $gte: new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()),
      $lt: new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate() + 1)
    },
    status: { $in: ['pending', 'confirmed', 'in-progress'] }
  });

  const hasConflict = existingAppointments.some(apt => {
    const aptEnd = apt.endTime || apt.timeSlot;
    return !(endTimeSlot <= apt.timeSlot || timeSlot >= aptEnd);
  });

  if (hasConflict) {
    res.status(409);
    throw new Error(`Time slot ${timeSlot} is already booked on that date`);
  }

  // Update appointment
  appointment.date = newDate;
  appointment.timeSlot = timeSlot;
  appointment.endTime = endTimeSlot;
  appointment.duration = duration;

  await appointment.save();

  await appointment.populate([
    { path: 'patient', select: 'name email' },
    { path: 'doctor', populate: { path: 'user', select: 'name' } }
  ]);

  res.status(200).json({
    success: true,
    message: 'Appointment rescheduled successfully',
    data: appointment
  });
});

// @desc    Get available slots for a doctor
// @route   GET /api/v1/appointments/doctor/:doctorId/available-slots
// @access  Private
exports.getAvailableSlots = asyncHandler(async (req, res, next) => {
  const { doctorId, date } = req.query;

  // Validate required parameters
  if (!doctorId || !date) {
    res.status(400);
    throw new Error('doctorId and date are required');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    res.status(400);
    throw new Error('Date must be in YYYY-MM-DD format');
  }

  try {
    // Find all non-cancelled appointments for that doctor on that date
    const parsedDate = new Date(date);
    const nextDate = new Date(parsedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const appointments = await Appointment.find({
      doctor: doctorId,
      date: {
        $gte: parsedDate,
        $lt: nextDate
      },
      status: { $ne: 'cancelled' }
    }).select('timeSlot');

    // ✅ CORRECT WORKING HOURS:
    // Morning: 9:00 AM - 12:00 PM
    // Afternoon: 1:00 PM (13:00) - 5:00 PM (17:00)
    const ALL_SLOTS = [
      // Morning Session: 9 AM - 12 PM
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '12:00 PM',
      // Afternoon Session: 1 PM - 5 PM
      '01:00 PM',
      '01:30 PM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
      '04:00 PM',
      '04:30 PM',
      '05:00 PM'
    ];

    // Extract booked slots from appointments
    const bookedSlots = appointments
      .map(apt => apt.timeSlot)
      .filter(Boolean); // Filter out any null/undefined

    // Calculate available slots
    const availableSlots = ALL_SLOTS.filter(slot => !bookedSlots.includes(slot));

    // Group slots by session for frontend
    const MORNING_SLOTS = ALL_SLOTS.slice(0, 7);  // First 7 slots
    const AFTERNOON_SLOTS = ALL_SLOTS.slice(7);   // Remaining slots

    const bookedMorning = bookedSlots.filter(slot => MORNING_SLOTS.includes(slot));
    const bookedAfternoon = bookedSlots.filter(slot => AFTERNOON_SLOTS.includes(slot));

    res.status(200).json({
      success: true,
      data: {
        date,
        doctorId,
        allSlots: ALL_SLOTS,
        bookedSlots,
        availableSlots,
        sessions: {
          morning: {
            label: 'Morning (9:00 AM - 12:00 PM)',
            slots: MORNING_SLOTS,
            booked: bookedMorning,
            available: MORNING_SLOTS.filter(slot => !bookedMorning.includes(slot))
          },
          afternoon: {
            label: 'Afternoon (1:00 PM - 5:00 PM)',
            slots: AFTERNOON_SLOTS,
            booked: bookedAfternoon,
            available: AFTERNOON_SLOTS.filter(slot => !bookedAfternoon.includes(slot))
          }
        },
        summary: {
          totalSlots: ALL_SLOTS.length,
          bookedCount: bookedSlots.length,
          availableCount: availableSlots.length,
          occupancyPercent: Math.round((bookedSlots.length / ALL_SLOTS.length) * 100)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500);
    throw new Error(`Failed to fetch available slots: ${error.message}`);
  }
});

// @desc    Delete appointment (soft delete / cancellation)
// @route   DELETE /api/v1/appointments/:id
// @access  Private
exports.deleteAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check permissions
  if (req.user.role === 'patient' && appointment.patient.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Not authorized to delete this appointment');
  }

  appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: req.body.status }, {
    returnDocument: 'after',
    runValidators: true
  });
});

// @desc    Get appointment details
// @route   GET /api/v1/appointments/:id
// @access  Private
exports.getAppointmentDetails = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email age gender')
    .populate('doctor', 'specialization experience rating')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name' }
    });

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check permissions
  if (req.user.role === 'patient' && appointment.patient._id.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Not authorized to view this appointment');
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});

// @desc    Start consultation for an appointment
// @route   POST /api/v1/appointments/:id/start
// @access  Private (Doctor/Admin)
exports.startConsultation = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
    res.status(401);
    throw new Error('Not authorized to start consultation');
  }

  // Verify doctor owns this appointment
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
      res.status(401);
      throw new Error('Not authorized to start this consultation');
    }
  }

  // Validate appointment is confirmed
  if (appointment.status !== 'confirmed') {
    res.status(400);
    throw new Error(`Cannot start consultation. Appointment status is ${appointment.status}`);
  }

  // Check if another consultation is running for this doctor
  const doctor = await Doctor.findById(appointment.doctor);
  if (doctor.currentConsultationId && doctor.currentConsultationId.toString() !== appointment._id.toString()) {
    const existingConsultation = await Appointment.findById(doctor.currentConsultationId);
    if (existingConsultation && existingConsultation.consultationState === 'active') {
      res.status(409);
      throw new Error('Another consultation is already in progress for this doctor');
    }
  }

  // Update appointment
  appointment.consultationState = 'active';
  appointment.status = 'in-progress';
  appointment.actualStartTime = new Date();
  await appointment.save();

  // Update doctor's current consultation
  doctor.currentConsultationId = appointment._id;
  doctor.availabilityStatus = 'busy';
  await doctor.save();

  res.status(200).json({
    success: true,
    message: 'Consultation started successfully',
    data: appointment
  });
});

// @desc    End consultation for an appointment
// @route   POST /api/v1/appointments/:id/end
// @access  Private (Doctor/Admin)
exports.endConsultation = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
    res.status(401);
    throw new Error('Not authorized to end consultation');
  }

  // Verify doctor owns this appointment
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
      res.status(401);
      throw new Error('Not authorized to end this consultation');
    }
  }

  // Validate consultation is in progress (or paused)
  if (!['active', 'paused'].includes(appointment.consultationState)) {
    res.status(400);
    throw new Error(`Consultation cannot be ended. Current state: ${appointment.consultationState}`);
  }

  // Calculate actual delay
  const { calculateDelay, updateDelayFactorEMA } = require('../utils/delayCalculator');
  const delayMinutes = calculateDelay(appointment.estimatedStartTime, appointment.actualStartTime);

  // Update appointment
  appointment.consultationState = 'completed';
  appointment.status = 'completed';
  appointment.actualEndTime = new Date();
  appointment.delayInMinutes = delayMinutes;
  await appointment.save();

  // Update doctor's delay factor and clear current consultation
  const doctor = await Doctor.findById(appointment.doctor);
  doctor.delayFactor = updateDelayFactorEMA(doctor.delayFactor, delayMinutes);
  doctor.currentConsultationId = null;
  doctor.availabilityStatus = 'available';
  await doctor.save();

  res.status(200).json({
    success: true,
    message: 'Consultation ended successfully',
    data: {
      appointment,
      delayInMinutes,
      doctorDelayFactor: doctor.delayFactor
    }
  });
});

// @desc    Upload medical report for an appointment
// @route   POST /api/v1/appointments/:id/upload-report
// @access  Private (Doctor/Admin)
exports.uploadMedicalReport = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  appointment.reportUrl = req.file.path;
  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Report uploaded successfully',
    data: appointment
  });
});

// FEATURE 6: Doctor can cancel appointment for missed patient with waitlist promotion
// @desc    Cancel appointment by doctor (e.g., patient did not show up)
// @route   POST /api/v1/appointments/:id/cancel-by-doctor
// @access  Private (Doctor)
exports.cancelAppointmentByDoctor = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only doctors can use this endpoint
  if (req.user.role !== 'doctor') {
    res.status(403);
    throw new Error('Only doctors can cancel appointments through this endpoint');
  }

  // Verify doctor owns this appointment
  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
    res.status(401);
    throw new Error('Not authorized to cancel this appointment');
  }

  // Can only cancel confirmed or in-progress appointments
  if (!['confirmed', 'in-progress'].includes(appointment.status)) {
    res.status(400);
    throw new Error(`Cannot cancel appointment with status: ${appointment.status}`);
  }

  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    res.status(400);
    throw new Error('Please provide a cancellation reason');
  }

  // FEATURES 2 & 5: Mark appointment as cancelled by doctor
  appointment.status = 'cancelled';
  appointment.cancelledBy = 'doctor';
  appointment.cancelReason = reason;
  appointment.cancelledAt = new Date();
  appointment.cancellationReason = reason; // Keep for backward compatibility
  await appointment.save();

  // FEATURE 3: Promote the next waitlisted patient
  const waitlistService = require('../services/waitlistService');
  const promotionResult = await waitlistService.promoteWaitlistedPatient(
    appointment.doctor,
    appointment.date,
    appointment.timeSlot
  );

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: {
      appointment,
      waitlistPromotion: promotionResult
    }
  });
});

// FEATURE 2: Auto-cancel appointments for no-show patients at session end
// @desc    Auto-cancel appointments for sessions where patient did not attend
// @route   POST /api/v1/appointments/auto-cancel-no-shows
// @access  Private (Admin/Doctor)
// @body    { session: 'morning' | 'afternoon' | 'evening', date: 'YYYY-MM-DD' }
exports.autoCancelNoShows = asyncHandler(async (req, res, next) => {
  // Only admin and doctors can trigger this
  if (!['admin', 'doctor'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized to trigger auto-cancellation');
  }

  const { session = 'morning', date } = req.body;

  if (!date) {
    res.status(400);
    throw new Error('Please provide a date');
  }

  // Define session times
  const sessionTimes = {
    morning: { start: 9, end: 13 },    // 9 AM - 1 PM
    afternoon: { start: 14, end: 18 },  // 2 PM - 6 PM
    evening: { start: 19, end: 21 }     // 7 PM - 9 PM
  };

  if (!sessionTimes[session]) {
    res.status(400);
    throw new Error('Invalid session. Must be morning, afternoon, or evening');
  }

  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(appointmentDate);
  endDate.setHours(23, 59, 59, 999);

  // Find all confirmed appointments for this date and session
  const startTime = sessionTimes[session].start;
  const endTime = sessionTimes[session].end;

  const appointmentsToCheck = await Appointment.find({
    date: { $gte: appointmentDate, $lte: endDate },
    session: session,
    status: 'confirmed',
    checkedIn: false // Patient did not check in
  });

  const cancelledAppointments = [];

  for (const appointment of appointmentsToCheck) {
    // Check if session time has passed
    const appointmentTime = new Date(appointment.date);
    const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
    appointmentTime.setHours(hours, minutes + (appointment.duration || 30), 0);

    // Only auto-cancel if session has ended and we're past the appointment time
    const now = new Date();
    if (now > appointmentTime) {
      // Mark as cancelled
      appointment.status = 'cancelled';
      appointment.cancelledBy = 'system';
      appointment.cancelReason = 'Patient did not attend';
      appointment.cancelledAt = new Date();
      appointment.cancellationReason = 'Patient did not attend'; // Backward compatibility
      await appointment.save();

      // ✅ SEND PROFESSIONAL SYSTEM CANCELLATION EMAIL
      try {
        const notificationService = require('../services/notificationService');
        await notificationService.sendCancellationNotice(
          appointment._id,
          'System',
          'Patient did not attend the appointment'
        );
      } catch (emailErr) {
        console.error('Error sending cancellation email:', emailErr.message);
        // Don't fail the auto-cancel if email fails
      }

      // FEATURE 3: Promote next waitlisted patient
      const waitlistService = require('../services/waitlistService');
      try {
        await waitlistService.promoteWaitlistedPatient(
          appointment.doctor,
          appointment.date,
          appointment.timeSlot
        );
      } catch (err) {
        console.error('Error promoting waitlist:', err.message);
      }

      cancelledAppointments.push({
        appointmentId: appointment._id,
        patientId: appointment.patient,
        reason: 'No-show'
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `Auto-cancelled ${cancelledAppointments.length} no-show appointments`,
    data: {
      session,
      date: appointmentDate.toISOString().split('T')[0],
      cancelledCount: cancelledAppointments.length,
      cancelledAppointments
    }
  });
});

// @desc    Pause an in-progress appointment
// @route   POST /api/v1/appointments/:id/pause
// @access  Private (Doctor)
exports.pauseAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only in-progress appointments can be paused
  if (appointment.status !== 'in-progress') {
    res.status(400);
    throw new Error(`Cannot pause appointment with status: ${appointment.status}`);
  }

  // Check doctor authorization
  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
    res.status(403);
    throw new Error('You can only pause your own consultations');
  }

  // Update consultation state to paused
  appointment.consultationState = 'paused';
  appointment.pausedAt = new Date();
  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Consultation paused successfully',
    data: appointment
  });
});

// @desc    Resume a paused appointment
// @route   POST /api/v1/appointments/:id/resume
// @access  Private (Doctor)
exports.resumeAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  // Only in-progress appointments that are paused can be resumed
  if (appointment.status !== 'in-progress' || appointment.consultationState !== 'paused') {
    res.status(400);
    throw new Error('Can only resume paused consultations');
  }

  // Check doctor authorization
  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
    res.status(403);
    throw new Error('You can only resume your own consultations');
  }

  // Update consultation state back to active
  appointment.consultationState = 'active';
  appointment.resumedAt = new Date();
  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Consultation resumed successfully',
    data: appointment
  });
});
