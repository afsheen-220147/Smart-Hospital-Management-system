const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');

async function seedTestUsers() {
  await connectDB();
  console.log('DB Connected');

  try {
    // Drop existing if any
    await User.deleteOne({ email: 'patient_test@example.com' });
    await User.deleteOne({ email: 'doctor_test@example.com' });

    // 1. Patient
    const patientUser = await User.create({
      name: 'Test Patient',
      email: 'patient_test@example.com',
      password: 'password123',
      role: 'patient',
      authProvider: ['local']
    });
    await Patient.create({
      user: patientUser._id,
      gender: 'Male',
      bloodGroup: 'O+'
    });
    console.log('✅ Patient created');

    // 2. Doctor
    const doctorUser = await User.create({
      name: 'Test Doctor',
      email: 'doctor_test@example.com',
      password: 'password123',
      role: 'doctor',
      authProvider: ['local']
    });
    await Doctor.create({
      user: doctorUser._id,
      specialization: 'General',
      experience: 5,
      fees: 500,
      availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: [
        { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        { day: 'Saturday', isWorking: false, startTime: null, endTime: null, breakStart: null, breakEnd: null },
        { day: 'Sunday', isWorking: false, startTime: null, endTime: null, breakStart: null, breakEnd: null }
      ]
    });
    console.log('✅ Doctor created');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    process.exit(0);
  }
}

seedTestUsers();
