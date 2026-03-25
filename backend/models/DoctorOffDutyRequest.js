const mongoose = require('mongoose');

const doctorOffDutyRequestSchema = new mongoose.Schema({
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
    required: [true, 'Please add a date for off-duty'],
    set: (val) => {
      // Normalize date to start of day IST
      const d = new Date(val);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon'],
    required: [true, 'Please specify session (morning/afternoon)']
  },
  reason: {
    type: String,
    default: 'Doctor Unavailable'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  rejectedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin user who approved
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin user who rejected
    default: null
  },
  adminRemarks: {
    type: String,
    default: null
  },
  // Rescheduling details
  affectedAppointmentsCount: {
    type: Number,
    default: 0
  },
  rescheduledAppointments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }],
  notificationsCount: {
    type: Number,
    default: 0
  },
  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-populate doctor name before saving
doctorOffDutyRequestSchema.pre('save', async function () {
  if (!this.doctorName && this.doctor) {
    const Doctor = mongoose.model('Doctor');
    try {
      const doctor = await Doctor.findById(this.doctor).populate('user', 'name').lean();
      if (doctor && doctor.user) {
        this.doctorName = doctor.user.name;
      }
    } catch (err) {
      console.error('Error auto-populating doctor name:', err);
    }
  }
});

// Index for efficient querying
doctorOffDutyRequestSchema.index({ doctor: 1, date: 1, session: 1 });
doctorOffDutyRequestSchema.index({ status: 1, date: 1 });
doctorOffDutyRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DoctorOffDutyRequest', doctorOffDutyRequestSchema);
