const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phone: String,
  address: String,
  dateOfBirth: Date,
  weight: Number,
  height: Number,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  emergencyContact: String,
  // Smart Scheduling Fields - No-Show Prediction
  attendanceHistory: {
    totalAppointments: { type: Number, default: 0 },
    completedAppointments: { type: Number, default: 0 },
    cancelledAppointments: { type: Number, default: 0 },
    noShowAppointments: { type: Number, default: 0 },
    lastAppointmentDate: Date,
    averageNoShowRate: { type: Number, default: 0 } // Percentage
  },
  // Location for distance-based no-show prediction
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  distanceFromClinic: Number, // in km, calculated when coordinates are updated
  // Notification preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    reminderHoursBefore: { type: Number, default: 24 }
  }
}, {
  timestamps: true
});

// Method to update attendance history
patientSchema.methods.updateAttendanceHistory = async function(status) {
  this.attendanceHistory.totalAppointments += 1;
  
  if (status === 'completed') {
    this.attendanceHistory.completedAppointments += 1;
  } else if (status === 'cancelled') {
    this.attendanceHistory.cancelledAppointments += 1;
  } else if (status === 'no-show') {
    this.attendanceHistory.noShowAppointments += 1;
  }
  
  // Calculate average no-show rate
  if (this.attendanceHistory.totalAppointments > 0) {
    this.attendanceHistory.averageNoShowRate = 
      (this.attendanceHistory.noShowAppointments / this.attendanceHistory.totalAppointments) * 100;
  }
  
  this.attendanceHistory.lastAppointmentDate = new Date();
  await this.save();
};

module.exports = mongoose.model('Patient', patientSchema);
