const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

const actionExecutors = {
  doctor_deletion: async (payload) => {
    const { doctorId } = payload;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    const userId = doctor.user;

    // Cancel all pending appointments
    await Appointment.deleteMany({
      doctor: doctorId,
      status: { $in: ['scheduled', 'pending'] }
    });

    // Delete doctor record
    await Doctor.findByIdAndDelete(doctorId);

    // Delete associated user
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    console.log(`✓ Doctor ${doctor.user} deleted along with all pending appointments`);
    return { success: true, message: 'Doctor deleted successfully' };
  },

  patient_deletion: async (payload) => {
    const { patientId } = payload;
    
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const userId = patient.user;

    // Cancel all appointments
    await Appointment.deleteMany({
      patient: patientId
    });

    // Delete patient record
    await Patient.findByIdAndDelete(patientId);

    // Delete associated user
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    console.log(`✓ Patient ${patientId} deleted along with all appointments`);
    return { success: true, message: 'Patient deleted successfully' };
  },

  user_deletion: async (payload) => {
    const { userId } = payload;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await User.findByIdAndDelete(userId);
    console.log(`✓ User ${userId} deleted`);
    return { success: true, message: 'User deleted successfully' };
  }
};

exports.executeAction = async (actionType, payload) => {
  const executor = actionExecutors[actionType];
  
  if (!executor) {
    throw new Error(`No executor found for action type: ${actionType}`);
  }

  return await executor(payload);
};

exports.actionExecutors = actionExecutors;
