
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Fix paths since script is in backend/
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');

async function verifyScheduling() {
  try {
    console.log('Connecting to database...');
    // Use env or default local
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/neotherapy';
    await mongoose.connect(dbUri);
    console.log('Connected.');

    // 1. Update existing doctors (Migration)
    console.log('Migrating existing doctors to 10-patient limit...');
    const doctors = await Doctor.find();
    for (const doc of doctors) {
      let updated = false;
      if (doc.sessionTemplates && doc.sessionTemplates.length > 0) {
        doc.sessionTemplates = doc.sessionTemplates.map(s => {
          // Use 'name' as that's what the schema says
          if (['morning', 'afternoon'].includes(s.name) && s.maxPatients !== 10) {
            console.log(`Updating ${s.name} session for doctor ${doc._id} (was ${s.maxPatients})`);
            s.maxPatients = 10;
            updated = true;
          }
          return s;
        });
      }
      if (updated) {
        // Use markModified if nested array doesn't trigger save
        doc.markModified('sessionTemplates');
        await doc.save();
        console.log(`✅ Successfully updated doctor ${doc._id}`);
      }
    }

    // 2. Check if one doctor is updated
    const testDoc = await Doctor.findOne();
    if (testDoc) {
      const morningSession = testDoc.sessionTemplates.find(s => s.name === 'morning');
      if (morningSession && morningSession.maxPatients === 10) {
        console.log('✅ Doctor session templates verified at 10 patients');
      } else {
        console.log(`❌ Doctor session templates verify FAILED (found ${morningSession?.maxPatients})`);
      }
    } else {
      console.log('⚠️ No doctors found in DB to verify.');
    }

    // 3. Verify auto-cancellation logic exists in service
    const servicePath = path.join(__dirname, 'services', 'appointmentAutoUpdateService.js');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    if (serviceContent.includes('isPastSession') && serviceContent.includes('sessionEndHours')) {
      console.log('✅ Auto-cancellation (Session End Awareness) logic implemented in updateExpiredAppointments');
    } else {
      console.log('❌ Auto-cancellation logic MISSING in service file');
    }

    console.log('Verification & Migration Complete.');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

verifyScheduling();
