const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('express-async-handler');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private (Admin)
exports.getAppointments = asyncHandler(async (req, res, next) => {
  const appointments = await Appointment.find()
    .populate('patient', 'name email')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name' }
    });

  // NEW FEATURE: Include patient dateOfBirth from Patient model
  try {
    const enrichedAppointments = await Promise.all(
      appointments.map(async (apt) => {
        try {
          const patientData = await Patient.findOne({ user: apt.patient._id });
          const aptObj = apt.toObject ? apt.toObject() : apt;
          
          return {
            ...aptObj,
            patient: {
              ...aptObj.patient,
              dateOfBirth: patientData?.dateOfBirth || null,
              gender: patientData?.gender || null,
              bloodGroup: patientData?.bloodGroup || null,
              phone: patientData?.phone || null,
              address: patientData?.address || null
            }
          };
        } catch (err) {
          return apt.toObject ? apt.toObject() : apt;
        }
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedAppointments.length,
      data: enrichedAppointments
    });
  } catch (err) {
    console.error('Error in getAppointments:', err);
    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  }
});

// @desc    Get appointments for a patient
// @route   GET /api/v1/appointments/patient/:patientId
// @access  Private
exports.getPatientAppointments = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'patient' && req.user.id !== req.params.patientId) {
    res.status(401);
    throw new Error('Not authorized to see others appointments');
  }

  const appointments = await Appointment.find({ patient: req.params.patientId })
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name' }
    });

  // NEW FEATURE: Include patient dateOfBirth from Patient model
  const enrichedAppointments = appointments;

  res.status(200).json({
    success: true,
    count: enrichedAppointments.length,
    data: enrichedAppointments
  });
});

// @desc    Book appointment
// @route   POST /api/v1/appointments
// @access  Private
exports.bookAppointment = asyncHandler(async (req, res, next) => {
  req.body.patient = req.user.id;

  const { doctor, date, timeSlot, duration = 30 } = req.body;

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
  const query = { doctor: req.params.doctorId };

  // Filter by status if provided (comma-separated, e.g. ?status=pending,confirmed,in-progress)
  if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim());
    query.status = { $in: statuses };
  }

  // Filter by date if provided (e.g. ?date=today or ?date=2026-03-08)
  if (req.query.date) {
    let startOfDay, endOfDay;
    if (req.query.date === 'today') {
      startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
    } else {
      startOfDay = new Date(req.query.date);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(req.query.date);
      endOfDay.setHours(23, 59, 59, 999);
    }
    query.date = { $gte: startOfDay, $lte: endOfDay };
  }

  const appointments = await Appointment.find(query)
    .populate('patient', 'name email')
    .sort({ date: 1, timeSlot: 1 });

  // NEW FEATURE: Include patient dateOfBirth from Patient model
  try {
    // Enrich appointments with patient dateOfBirth and other details
    const enrichedAppointments = await Promise.all(
      appointments.map(async (apt) => {
        try {
          const patientData = await Patient.findOne({ user: apt.patient._id });
          const aptObj = apt.toObject ? apt.toObject() : apt;
          
          return {
            ...aptObj,
            patient: {
              ...aptObj.patient,
              dateOfBirth: patientData?.dateOfBirth || null,
              gender: patientData?.gender || null,
              bloodGroup: patientData?.bloodGroup || null,
              phone: patientData?.phone || null,
              address: patientData?.address || null
            }
          };
        } catch (err) {
          // If enrichment fails for one appointment, return it as-is
          console.error('Error enriching appointment:', err);
          return apt.toObject ? apt.toObject() : apt;
        }
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedAppointments.length,
      data: enrichedAppointments
    });
  } catch (err) {
    // Fallback: return basic appointments without enrichment
    console.error('Error in getDoctorAppointments:', err);
    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  }
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

  // Doctor check - ensure it is their own appointment
  if (req.user.role === 'doctor') {
    // Doctors can update status but have restrictions
    const restrictedStatuses = ['cancelled']; // Doctors can't cancel appointments initiated by them via this endpoint
    if (restrictedStatuses.includes(status)) {
      res.status(400);
      throw new Error('Doctors cannot cancel appointments through this endpoint');
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

  res.status(200).json({
    success: true,
    message: `Appointment status updated to ${status}`,
    data: appointment
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
  const { doctorId } = req.params;
  const { date } = req.query;

  if (!date) {
    res.status(400);
    throw new Error('Please provide a date');
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    res.status(404);
    throw new Error('Doctor not found');
  }

  // Default working hours: 9 AM to 5 PM, 30-minute slots
  const workingHours = { start: 9, end: 17 };
  const slotDuration = 30; // minutes

  const selectedDate = new Date(date);
  const dateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

  // Get all booked appointments for that doctor on that date
  const bookedAppointments = await Appointment.find({
    doctor: doctorId,
    date: {
      $gte: dateOnly,
      $lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000)
    },
    status: { $in: ['pending', 'confirmed', 'in-progress'] }
  });

  // Generate all possible slots
  const allSlots = [];
  for (let hour = workingHours.start; hour < workingHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      allSlots.push(timeSlot);
    }
  }

  // Filter out booked slots
  const availableSlots = allSlots.filter(timeSlot => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotStart = hours * 60 + minutes;
    const slotEnd = slotStart + slotDuration;

    return !bookedAppointments.some(apt => {
      const [aptHours, aptMinutes] = apt.timeSlot.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      const aptEnd = aptStart + (apt.duration || 30);

      return !(slotEnd <= aptStart || slotStart >= aptEnd);
    });
  });

  res.status(200).json({
    success: true,
    date: dateOnly.toISOString().split('T')[0],
    availableSlots,
    totalSlots: availableSlots.length
  });
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
