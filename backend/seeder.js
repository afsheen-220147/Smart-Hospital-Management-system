const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI);

// Read JSON files
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
  try {
    // 1. Clear existing data
    await User.deleteMany();
    await Doctor.deleteMany();
    await Patient.deleteMany();
    console.log('Data Destroyed...');

    // 2. Import Users
    const createdUsers = await User.create(users);
    console.log('Users Imported...');

    // 3. Import Doctors
    const doctorUsers = createdUsers.filter(u => u.role === 'doctor');
    const doctors = [
      {
        user: doctorUsers[0]._id,
        specialization: 'Pediatrician',
        experience: 10,
        fees: 500,
        about: 'Dr. Sneha is a highly experienced pediatrician specializing in baby care and nutrition.',
        availability: ['Monday', 'Tuesday', 'Wednesday'],
        ratings: 4.7,
        totalPatients: 150
      },
      {
        user: doctorUsers[1]._id,
        specialization: 'Cardiologist',
        experience: 9,
        fees: 700,
        about: 'Dr. Suresh is an expert cardiologist with specialization in interventional cardiology.',
        availability: ['Thursday', 'Friday', 'Saturday'],
        ratings: 4.8,
        totalPatients: 200
      }
    ];
    await Doctor.create(doctors);
    console.log('Doctor Profiles Created...');

    // 4. Import Patients for Demo users
    const patientUsers = createdUsers.filter(u => u.role === 'patient');
    const patients = patientUsers.map(u => ({
      user: u._id,
      phone: '9876543210',
      address: 'Hyderabad, India',
      gender: 'Male',
      bloodGroup: 'B+',
      dateOfBirth: '1995-01-01'
    }));
    await Patient.create(patients);
    console.log('Patient Profiles Created...');

    console.log('Data Imported successfully!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Doctor.deleteMany();
    console.log('Data Destroyed...');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
}
