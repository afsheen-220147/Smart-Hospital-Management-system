/**
 * Utility functions for accurate appointment delay calculation
 */

/**
 * Calculate delay in minutes
 * @param {Date} estimatedStartTime - When appointment was scheduled to start
 * @param {Date} actualStartTime - When appointment actually started (optional, defaults to now)
 * @returns {number} Delay in minutes (negative if early, positive if late)
 */
const calculateDelay = (estimatedStartTime, actualStartTime = null) => {
  if (!estimatedStartTime) return 0;

  const now = actualStartTime || new Date();
  const estimated = new Date(estimatedStartTime);
  
  // Delay in milliseconds
  const delayMs = now.getTime() - estimated.getTime();
  
  // Convert to minutes and round
  const delayMinutes = Math.round(delayMs / (1000 * 60));
  
  return delayMinutes;
};

/**
 * Get delay status string
 * @param {number} delayMinutes - Delay in minutes
 * @returns {string} Human-readable delay status
 */
const getDelayStatus = (delayMinutes) => {
  if (delayMinutes < 0) {
    return `Running ${Math.abs(delayMinutes)} min early`;
  }
  if (delayMinutes === 0) {
    return 'On Time';
  }
  return `Running ${delayMinutes} min late`;
};

/**
 * Update doctor's delay factor using Exponential Moving Average (EMA)
 * EMA = α × newValue + (1 - α) × oldValue
 * @param {number} oldDelayFactor - Previous EMA value
 * @param {number} newDelaMinutes - New measured delay
 * @param {number} alpha - Smoothing factor (0-1, default 0.3)
 * @returns {number} Updated EMA delay factor
 */
const updateDelayFactorEMA = (oldDelayFactor = 0, newDelayMinutes = 0, alpha = 0.3) => {
  const newEMA = alpha * newDelayMinutes + (1 - alpha) * oldDelayFactor;
  return Math.max(0, Math.round(newEMA)); // Prevent negative values
};

/**
 * Calculate next queue position for a doctor
 * @param {Array} appointments - Array of confirmed appointments for the day
 * @returns {number} Next queue position
 */
const calculateNextQueuePosition = (appointments = []) => {
  if (!appointments || appointments.length === 0) return 1;
  
  const maxPosition = Math.max(...appointments.map(a => a.queuePosition || 0));
  return maxPosition + 1;
};

/**
 * Format appointment time for display
 * @param {string|Date} timeSlot - Time slot from appointment
 * @returns {string} Formatted time (HH:MM)
 */
const formatTimeSlot = (timeSlot) => {
  if (!timeSlot) return '--:--';
  
  if (typeof timeSlot === 'string') {
    // Already formatted (e.g., "10:30")
    if (timeSlot.includes(':')) {
      return timeSlot;
    }
    // Try to parse as time
    try {
      const date = new Date(`2000-01-01T${timeSlot}`);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  }
  
  if (timeSlot instanceof Date) {
    return timeSlot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  
  return '--:--';
};

module.exports = {
  calculateDelay,
  getDelayStatus,
  updateDelayFactorEMA,
  calculateNextQueuePosition,
  formatTimeSlot
};
