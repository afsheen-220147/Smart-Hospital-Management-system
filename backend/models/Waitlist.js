const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  requestedDate: {
    type: Date,
    required: [true, 'Please specify a preferred date']
  },
  alternativeDates: [{
    type: Date
  }],
  preferredTimeRange: {
    start: { type: String }, // Format: "09:00"
    end: { type: String }    // Format: "12:00"
  },
  visitType: {
    type: String,
    enum: ['First Consultation', 'Follow-up', 'Emergency', 'Routine Checkup', 'Other'],
    default: 'First Consultation'
  },
  reason: {
    type: String,
    required: [true, 'Please add a reason']
  },
  priority: {
    type: Number,
    default: 1, // 1 = normal, 2 = high, 3 = urgent
    min: 1,
    max: 3
  },
  status: {
    type: String,
    enum: ['waiting', 'notified', 'booked', 'expired', 'cancelled'],
    default: 'waiting'
  },
  notifiedAt: Date,
  bookedAppointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
waitlistSchema.index({ doctor: 1, requestedDate: 1, status: 1 });
waitlistSchema.index({ patient: 1, status: 1 });
waitlistSchema.index({ status: 1, priority: -1, createdAt: 1 }); // For queue ordering

// Static method to get next patient in queue for a specific date
waitlistSchema.statics.getNextInQueue = async function(doctorId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.findOne({
    doctor: doctorId,
    status: 'waiting',
    $or: [
      { requestedDate: { $gte: startOfDay, $lte: endOfDay } },
      { alternativeDates: { $elemMatch: { $gte: startOfDay, $lte: endOfDay } } }
    ],
    expiresAt: { $gt: new Date() }
  })
  .sort({ priority: -1, createdAt: 1 })
  .populate('patient', 'name email');
};

module.exports = mongoose.model('Waitlist', waitlistSchema);
