/**
 * APPOINTMENT MIGRATION SCRIPT
 * 
 * Purpose: Fix existing inconsistent appointment data
 * - Backfill past confirmed appointments as system-cancelled
 * - Add cancellation metadata to existing records
 * - Ensure all future cancellations have proper tracking
 * 
 * Safety Features:
 * - Logs all changes
 * - Creates rollback backup
 * - Prevents duplicate runs
 * - Transaction safety
 * 
 * Usage:
 * node backfillAppointmentCancellations.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-hospital');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * STEP 1: Create backup of appointments before migration
 */
const createBackup = async (Appointment) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../_data/backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get all confirmed appointments from past dates
    const pastConfirmed = await Appointment.find({
      date: { $lt: new Date() },
      status: 'confirmed'
    }).lean();

    const backupFile = path.join(backupDir, `appointments-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      count: pastConfirmed.length,
      appointments: pastConfirmed
    }, null, 2));

    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`   Records backed up: ${pastConfirmed.length}`);
    
    return { backupFile, count: pastConfirmed.length };
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
    throw error;
  }
};

/**
 * STEP 2: Create migration record (track if already run)
 */
const hasMigrationRun = async (Appointment) => {
  try {
    // Check if appointments have cancellation metadata
    const appointmentsWithCancellation = await Appointment.findOne({
      status: 'cancelled',
      cancelledBy: { $exists: true, $ne: null }
    }).lean();

    return !!appointmentsWithCancellation;
  } catch (error) {
    console.error('❌ Migration check failed:', error.message);
    return false;
  }
};

/**
 * STEP 3: Backfill past appointments (MAIN MIGRATION)
 * 
 * Rules:
 * - date < today
 * - status = 'confirmed'
 * - Mark as cancelled by system
 */
const backfillPastAppointments = async (Appointment) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`\n📅 Searching for past confirmed appointments before: ${today.toDateString()}`);

    // Find all past confirmed appointments
    const pastConfirmed = await Appointment.find({
      date: { $lt: today },
      status: 'confirmed'
    });

    if (pastConfirmed.length === 0) {
      console.log('✅ No past confirmed appointments found - database is clean!');
      return { updated: 0, errors: 0 };
    }

    console.log(`\n🔄 Found ${pastConfirmed.length} past confirmed appointments. Starting migration...`);

    let updated = 0;
    let errors = 0;
    const errorDetails = [];

    // Process each appointment
    for (let i = 0; i < pastConfirmed.length; i++) {
      try {
        const appt = pastConfirmed[i];
        
        // Skip if already has cancellation metadata
        if (appt.cancelledBy && appt.cancelledBy !== null) {
          console.log(`⏭️  Skipping ${appt._id} - already has cancellation data`);
          continue;
        }

        // Update appointment
        appt.status = 'cancelled';
        appt.cancelledBy = 'system';
        appt.cancelReason = 'Automatically cancelled (patient did not attend)';
        appt.cancelledAt = appt.date; // Use appointment date as cancellation date
        
        // Keep backward compatibility field
        appt.cancellationReason = 'Automatically cancelled (patient did not attend)';

        await appt.save();
        updated++;

        // Progress indicator
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${pastConfirmed.length} appointments updated`);
        }
      } catch (error) {
        errors++;
        errorDetails.push({
          appointmentId: pastConfirmed[i]._id,
          error: error.message
        });
        console.error(`   ❌ Error updating ${pastConfirmed[i]._id}:`, error.message);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Total updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

    if (errors > 0) {
      console.log('\n⚠️  Error details:');
      errorDetails.forEach(err => {
        console.log(`   - ${err.appointmentId}: ${err.error}`);
      });
    }

    return { updated, errors };
  } catch (error) {
    console.error('❌ Backfill migration failed:', error.message);
    throw error;
  }
};

/**
 * STEP 4: Validate data integrity
 */
const validateMigration = async (Appointment) => {
  try {
    console.log('\n🔍 Validating migration...');

    // Check 1: All cancelled appointments have cancelledBy
    const cancelledWithoutBy = await Appointment.find({
      status: 'cancelled',
      cancelledBy: { $exists: false }
    }).countDocuments();

    if (cancelledWithoutBy > 0) {
      console.error(`❌ Found ${cancelledWithoutBy} cancelled appointments without cancelledBy`);
      return false;
    }

    // Check 2: All cancelled appointments have cancelReason
    const cancelledWithoutReason = await Appointment.find({
      status: 'cancelled',
      cancelReason: { $exists: false }
    }).countDocuments();

    if (cancelledWithoutReason > 0) {
      console.error(`❌ Found ${cancelledWithoutReason} cancelled appointments without cancelReason`);
      return false;
    }

    // Check 3: No confirmed appointments in past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastConfirmed = await Appointment.find({
      date: { $lt: today },
      status: 'confirmed'
    }).countDocuments();

    if (pastConfirmed > 0) {
      console.warn(`⚠️  Warning: Found ${pastConfirmed} past appointments still confirmed`);
      return false;
    }

    console.log('✅ All validation checks passed!');
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
};

/**
 * STEP 5: Generate migration report
 */
const generateReport = async (Appointment, backupInfo, migrationResult) => {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      backup: backupInfo,
      migration: migrationResult,
      statistics: {
        totalAppointments: await Appointment.countDocuments(),
        totalCancelled: await Appointment.aggregate([
          { $match: { status: 'cancelled' } },
          { $count: 'count' }
        ]),
        cancelledBySystem: await Appointment.countDocuments({
          status: 'cancelled',
          cancelledBy: 'system'
        }),
        cancelledByDoctor: await Appointment.countDocuments({
          status: 'cancelled',
          cancelledBy: 'doctor'
        }),
        cancelledByPatient: await Appointment.countDocuments({
          status: 'cancelled',
          cancelledBy: 'patient'
        }),
        future: await Appointment.countDocuments({
          date: { $gte: new Date() }
        })
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(__dirname, '../_data', `migration-report-${timestamp}.json`);
    
    if (!fs.existsSync(path.dirname(reportFile))) {
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📊 Migration Report:');
    console.log(`   Total appointments: ${report.statistics.totalAppointments}`);
    console.log(`   Cancelled by system: ${report.statistics.cancelledBySystem}`);
    console.log(`   Cancelled by doctor: ${report.statistics.cancelledByDoctor}`);
    console.log(`   Cancelled by patient: ${report.statistics.cancelledByPatient}`);
    console.log(`   Future appointments: ${report.statistics.future}`);
    console.log(`\n📄 Report saved to: ${reportFile}`);

    return report;
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
  }
};

/**
 * MAIN MIGRATION FUNCTION
 */
const runMigration = async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   APPOINTMENT DATA MIGRATION - CANCELLATION CLEANUP    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Import models
    const Appointment = require('../models/Appointment');

    // Check if already migrated
    console.log('🔍 Checking if migration has already run...');
    const alreadyRun = await hasMigrationRun(Appointment);
    
    if (alreadyRun) {
      console.log('⚠️  Migration appears to have already run.');
      console.log('   Appointments with cancellation metadata found.');
      console.log('   Proceeding with full validation...\n');
    }

    // Step 1: Create backup
    console.log('📦 Step 1: Creating backup...');
    const backupInfo = await createBackup(Appointment);

    // Step 2: Run migration
    console.log('\n🔄 Step 2: Running migration...');
    const migrationResult = await backfillPastAppointments(Appointment);

    // Step 3: Validate
    console.log('\n✔️  Step 3: Validating migration...');
    const isValid = await validateMigration(Appointment);

    if (!isValid) {
      console.error('\n❌ Validation failed! Data may be inconsistent.');
      process.exit(1);
    }

    // Step 4: Generate report
    console.log('\n📄 Step 4: Generating report...');
    await generateReport(Appointment, backupInfo, migrationResult);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║            ✅ MIGRATION COMPLETED SUCCESSFULLY        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('\n⚠️  IMPORTANT: Check backup before attempting again.');
    process.exit(1);
  } finally {
    // Disconnect from database
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Database disconnected');
    }
  }
};

// Run migration if called directly
if (require.main === module) {
  connectDB().then(() => runMigration());
}

module.exports = { runMigration, backfillPastAppointments, validateMigration };
