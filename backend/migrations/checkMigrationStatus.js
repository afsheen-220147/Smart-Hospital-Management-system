/**
 * MIGRATION STATUS CHECK
 * 
 * Quick check to see if migration has been run
 * Shows current state of appointment data
 * 
 * Usage: npm run migrate:status
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-hospital');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const checkStatus = async () => {
  try {
    const Appointment = require('../models/Appointment');

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           MIGRATION STATUS CHECK                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Get current stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      pastConfirmed: await Appointment.countDocuments({
        date: { $lt: today },
        status: 'confirmed'
      }),
      cancelledTotal: await Appointment.countDocuments({ status: 'cancelled' }),
      cancelledWithoutBy: await Appointment.countDocuments({
        status: 'cancelled',
        $or: [{ cancelledBy: { $exists: false } }, { cancelledBy: null }]
      }),
      cancelledWithoutReason: await Appointment.countDocuments({
        status: 'cancelled',
        $or: [{ cancelReason: { $exists: false } }, { cancelReason: null }]
      })
    };

    // Determine migration status
    const migrationStatus = stats.pastConfirmed === 0 && 
                           stats.cancelledWithoutBy === 0 && 
                           stats.cancelledWithoutReason === 0;

    console.log('STATUS:', migrationStatus ? '✅ MIGRATION COMPLETED' : '⚠️  MIGRATION NEEDED');
    console.log('\nDETAILS:');
    console.log(`  Past confirmed appointments: ${stats.pastConfirmed}`);
    console.log(`    ${stats.pastConfirmed > 0 ? '❌ Need to migrate' : '✅ All migrated'}`);

    console.log(`\n  Cancelled without cancelledBy: ${stats.cancelledWithoutBy}`);
    console.log(`    ${stats.cancelledWithoutBy > 0 ? '❌ Incomplete data' : '✅ All have metadata'}`);

    console.log(`\n  Cancelled without cancelReason: ${stats.cancelledWithoutReason}`);
    console.log(`    ${stats.cancelledWithoutReason > 0 ? '❌ Missing reasons' : '✅ All have reasons'}`);

    if (migrationStatus) {
      console.log('\n✅ Database is in clean state. No migration needed.');
    } else {
      console.log('\n⚠️  Database needs migration. Run: npm run migrate:appointments');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  connectDB().then(() => checkStatus());
}

module.exports = { checkStatus };
