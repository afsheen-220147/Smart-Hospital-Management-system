/**
 * Migration script to fix patients with hardcoded 'Male' gender
 * Run this once to clear the default gender so it shows as 'Not Specified' until patients update their profile
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../models/Patient');

const fixPatientGender = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Database connected');

    // Find all patients with gender 'Male' and no dateOfBirth (likely the default)
    const patientsToCheck = await Patient.find({ gender: 'Male' });
    console.log(`Found ${patientsToCheck.length} patients with 'Male' gender`);

    // Update: set gender to null for patients who don't have DOB (default registrations)
    // This way they'll show "Not Specified" until they update their profile
    const result = await Patient.updateMany(
      { 
        gender: 'Male',
        dateOfBirth: null  // Only update those with no DOB
      },
      { $unset: { gender: '' } }  // Remove the field
    );

    console.log(`✅ Updated ${result.modifiedCount} patient records`);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

fixPatientGender();
