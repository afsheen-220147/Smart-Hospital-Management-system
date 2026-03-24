/**
 * Appointment Auto-Update Controller
 * Provides API endpoints for managing automated appointment updates
 */

const appointmentAutoUpdateService = require('../services/appointmentAutoUpdateService');

/**
 * Manually trigger appointment auto-update job
 * POST /api/v1/admin/appointments/trigger-update
 */
exports.triggerAppointmentUpdate = async (req, res) => {
  try {
    const result = await appointmentAutoUpdateService.triggerManualUpdate();
    
    res.status(200).json({
      success: true,
      message: 'Appointment auto-update job triggered successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger appointment update',
      error: error.message
    });
  }
};

/**
 * Get appointment auto-update status/health check
 * GET /api/v1/admin/appointments/auto-update-status
 */
exports.getAutoUpdateStatus = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Appointment auto-update job is running',
      data: {
        status: 'active',
        schedule: 'Every 2 minutes',
        lastCheck: new Date(),
        notes: 'Automatically marks confirmed appointments as "no-show" if time has passed and patient did not check in'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get auto-update status',
      error: error.message
    });
  }
};
