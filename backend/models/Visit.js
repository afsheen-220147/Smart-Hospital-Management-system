const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  title: {
    type: String,
    required: [true, 'Please add a title for the record']
  },
  description: String,
  fileUrl: {
    type: String,
    required: false
  },
  recordType: {
    type: String,
    enum: ['Prescription', 'Lab Report', 'X-Ray', 'Other'],
    default: 'Other'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
