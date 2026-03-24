/**
 * MIGRATION VERIFICATION SCRIPT
 * 
 * Verifies that the migration completed successfully
 * and all data is in correct state
 * 
 * Usage: npm run migrate:verify
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-hospital');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const verifyMigration = async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              MIGRATION VERIFICATION REPORT            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const Appointment = require('../models/Appointment');

    // Test 1: All cancelled appointments have cancelledBy
    console.log('🔍 Test 1: Checking cancelledBy field...');
    const cancelledWithoutBy = await Appointment.find({
      status: 'cancelled',
      $or: [
        { cancelledBy: { $exists: false } },
        { cancelledBy: null }
      ]
    });

    if (cancelledWithoutBy.length === 0) {
      console.log('   ✅ All cancelled appointments have cancelledBy field');
    } else {
      console.error(`   ❌ Found ${cancelledWithoutBy.length} appointments without cancelledBy`);
      cancelledWithoutBy.slice(0, 3).forEach(apt => {
        console.error(`      - ${apt._id}: status=${apt.status}, cancelledBy=${apt.cancelledBy}`);
      });
    }

    // Test 2: All cancelled appointments have cancelReason
    console.log('\n🔍 Test 2: Checking cancelReason field...');
    const cancelledWithoutReason = await Appointment.find({
      status: 'cancelled',
      $or: [
        { cancelReason: { $exists: false } },
        { cancelReason: null }
      ]
    });

    if (cancelledWithoutReason.length === 0) {
      console.log('   ✅ All cancelled appointments have cancelReason field');
    } else {
      console.error(`   ❌ Found ${cancelledWithoutReason.length} appointments without cancelReason`);
    }

    // Test 3: No past confirmed appointments
    console.log('\n🔍 Test 3: Checking for past confirmed appointments...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastConfirmed = await Appointment.find({
      date: { $lt: today },
      status: 'confirmed'
    });

    if (pastConfirmed.length === 0) {
      console.log('   ✅ No past appointments in confirmed state');
    } else {
      console.warn(`   ⚠️  Found ${pastConfirmed.length} past appointments still confirmed`);
      pastConfirmed.slice(0, 3).forEach(apt => {
        console.warn(`      - ${apt._id}: date=${apt.date.toDateString()}`);
      });
    }

    // Test 4: Validate cancelledBy enum values
    console.log('\n🔍 Test 4: Checking cancelledBy enum values...');
    const invalidCancelledBy = await Appointment.find({
      status: 'cancelled',
      cancelledBy: { $nin: ['patient', 'doctor', 'admin', 'system'] }
    });

    if (invalidCancelledBy.length === 0) {
      console.log('   ✅ All cancelledBy values are valid (patient|doctor|admin|system)');
    } else {
      console.error(`   ❌ Found ${invalidCancelledBy.length} appointments with invalid cancelledBy`);
      invalidCancelledBy.forEach(apt => {
        console.error(`      - ${apt._id}: cancelledBy=${apt.cancelledBy}`);
      });
    }

    // Statistics
    console.log('\n📊 STATISTICS:');
    const stats = {
      total: await Appointment.countDocuments(),
      cancelled: await Appointment.countDocuments({ status: 'cancelled' }),
      cancelledBySystem: await Appointment.countDocuments({ status: 'cancelled', cancelledBy: 'system' }),
      cancelledByDoctor: await Appointment.countDocuments({ status: 'cancelled', cancelledBy: 'doctor' }),
      cancelledByPatient: await Appointment.countDocuments({ status: 'cancelled', cancelledBy: 'patient' }),
      cancelledByAdmin: await Appointment.countDocuments({ status: 'cancelled', cancelledBy: 'admin' }),
      confirmed: await Appointment.countDocuments({ status: 'confirmed' }),
      pending: await Appointment.countDocuments({ status: 'pending' }),
      completed: await Appointment.countDocuments({ status: 'completed' })
    };

    console.log(`   Total appointments: ${stats.total}`);
    console.log(`   Cancelled:          ${stats.cancelled}`);
    console.log(`   ├─ by system:       ${stats.cancelledBySystem}`);
    console.log(`   ├─ by doctor:       ${stats.cancelledByDoctor}`);
    console.log(`   ├─ by patient:      ${stats.cancelledByPatient}`);
    console.log(`   └─ by admin:        ${stats.cancelledByAdmin}`);
    console.log(`   Confirmed:          ${stats.confirmed}`);
    console.log(`   Pending:            ${stats.pending}`);
    console.log(`   Completed:          ${stats.completed}`);

    // Final result
    console.log('\n╔════════════════════════════════════════════════════════╗');
    
    if (cancelledWithoutBy.length === 0 && 
        cancelledWithoutReason.length === 0 && 
        pastConfirmed.length === 0 &&
        invalidCancelledBy.length === 0) {
      console.log('║              ✅ ALL VERIFICATION TESTS PASSED         ║');
      console.log('║              Migration is successful!                ║');
    } else {
      console.log('║           ⚠️  SOME VERIFICATION TESTS FAILED           ║');
      console.log('║              See details above                       ║');
    }
    
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  connectDB().then(() => verifyMigration());
}

module.exports = { verifyMigration };
