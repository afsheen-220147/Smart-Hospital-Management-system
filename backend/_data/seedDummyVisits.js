const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MedicalRecord = require('../models/Visit');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedRecords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        // Find a patient to attach records to
        const patient = await User.findOne({ role: 'patient' });
        if (!patient) {
            console.log('No patient user found to seed records for.');
            process.exit();
        }

        const dummyRecords = [
            {
                patient: patient._id,
                title: 'Full Blood Count',
                description: 'Routine blood panel checkup. Results within normal ranges.',
                recordType: 'Lab Report',
                fileUrl: '/uploads/blood_test_report.pdf',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            },
            {
                patient: patient._id,
                title: 'Chest X-Ray',
                description: 'Clear lungs, no signs of infection or congestion.',
                recordType: 'X-Ray',
                fileUrl: '/uploads/chest_xray.jpg',
                date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
            },
            {
                patient: patient._id,
                title: 'Antibiotics Prescription',
                description: 'Amoxicillin 500mg for 5 days.',
                recordType: 'Prescription',
                fileUrl: '',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                patient: patient._id,
                title: 'Lipid Profile',
                description: 'Cholesterol levels slightly elevated. Advising diet control.',
                recordType: 'Lab Report',
                fileUrl: '/uploads/lipid_profile.pdf',
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
            }
        ];

        await MedicalRecord.insertMany(dummyRecords);
        console.log(`Successfully seeded ${dummyRecords.length} medical records for patient: ${patient.name}`);
        
        process.exit();
    } catch (err) {
        console.error('Error seeding records:', err);
        process.exit(1);
    }
};

seedRecords();
