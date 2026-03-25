const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  doctorName: {
    type: String
  },
  date: {
    type: Date,
    required: [true, 'Please add a date']
  },
  timeSlot: {
    type: String,
    required: [true, 'Please add a time slot']
  },
  endTime: {
    type: String // Calculated based on duration
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  reason: {
    type: String,
    required: [true, 'Please add a reason for appointment']
  },
  notes: String,
  reportUrl: {
    type: String,
    default: null
  },
  // Smart Scheduling Fields
  visitType: {
    type: String,
    enum: ['First Consultation', 'Follow-up', 'Emergency', 'Routine Checkup', 'Other'],
    default: 'First Consultation'
  },
  duration: {
    type: Number, // Duration in minutes
    default: 30
  },
  noShowProbability: {
    type: Number, // Percentage 0-100
    default: 0
  },
  isOverbooking: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: Date,
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: Date,
  actualStartTime: Date,
  actualEndTime: Date,
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  cancelledAt: Date,
  cancellationReason: String,
  bookedVia: {
    type: String,
    enum: ['manual', 'waitlist', 'ai-suggestion'],
    default: 'manual'
  },
  // Consultation State Tracking
  consultationState: {
    type: String,
    enum: ['not_started', 'active', 'paused', 'completed'],
    default: 'not_started'
  },
  pausedAt: Date,
  resumedAt: Date,
  estimatedStartTime: Date,
  estimatedEndTime: Date,
  queuePosition: {
    type: Number,
    default: null
  },
  delayInMinutes: {
    type: Number,
    default: 0
  },
  consultationType: {
    type: String,
    enum: ['in-person', 'video', 'online'],
    default: 'in-person'
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    default: 'morning'
  },
  meetingRoomId: {
    type: String
  },
  // Feature 2 & 5: Cancellation Tracking (who cancelled and why)
  cancelledBy: {
    type: String,
    // Include patient for backward-compatible cancellations initiated by patients
    enum: ['patient', 'doctor', 'system', 'admin', null],
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  },
  // Feature 3: Waitlist tracking
  isWaitlisted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-populate names and meeting room ID before saving
appointmentSchema.pre('save', async function () {
  // Auto-generate meeting room ID for online consultations
  if (this.consultationType === 'online' && !this.meetingRoomId) {
    this.meetingRoomId = `medicarepro${this._id.toString()}`;
  }

  // Auto-populate patient name
  if (!this.patientName && this.patient) {
    const User = mongoose.model('User');
    const user = await User.findById(this.patient).select('name').lean();
    if (user) this.patientName = user.name;
  }

  // Auto-populate doctor name
  if (!this.doctorName && this.doctor) {
    const Doctor = mongoose.model('Doctor');
    const doc = await Doctor.findById(this.doctor).select('user').lean();
    if (doc) {
      const User = mongoose.model('User');
      const user = await User.findById(doc.user).select('name').lean();
      if (user) this.doctorName = user.name;
    }
  }
});

// Index for efficient queries
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, status: 1 });

// Index to help prevent double-booking (doctor can't have overlapping appointments on same date)
appointmentSchema.index({ doctor: 1, date: 1, timeSlot: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
