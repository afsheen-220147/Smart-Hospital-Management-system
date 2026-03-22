/**
 * One-time migration script to backfill patientName and doctorName
 * on existing appointments in the database.
 *
 * Usage: node backfillAppointmentNames.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const appointments = await Appointment.find({
    $or: [{ patientName: { $exists: false } }, { doctorName: { $exists: false } }, { patientName: null }, { doctorName: null }]
  }).lean();

  console.log(`Found ${appointments.length} appointments to backfill`);

  let updated = 0;
  for (const appt of appointments) {
    const updates = {};

    if (!appt.patientName && appt.patient) {
      const user = await User.findById(appt.patient).select('name').lean();
      if (user) updates.patientName = user.name;
    }

    if (!appt.doctorName && appt.doctor) {
      const doc = await Doctor.findById(appt.doctor).select('user').lean();
      if (doc) {
        const user = await User.findById(doc.user).select('name').lean();
        if (user) updates.doctorName = user.name;
      }
    }

    if (Object.keys(updates).length > 0) {
      await Appointment.updateOne({ _id: appt._id }, { $set: updates });
      updated++;
      console.log(`Updated appointment ${appt._id}: ${JSON.stringify(updates)}`);
    }
  }

  console.log(`\nDone! Updated ${updated} appointments.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
