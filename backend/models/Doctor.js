const mongoose = require('mongoose');

// Working hours schema for smart scheduling
const workingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  isWorking: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: String, // Format: "09:00"
    default: '09:00'
  },
  endTime: {
    type: String, // Format: "17:00"
    default: '17:00'
  },
  breakStart: {
    type: String, // Format: "12:00"
    default: '12:00'
  },
  breakEnd: {
    type: String, // Format: "13:00"
    default: '13:00'
  }
}, { _id: false });

// Consultation type schema for different visit durations
const consultationTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  description: String,
  fee: Number
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialization: {
    type: String,
    required: [true, 'Please add specialization']
  },
  experience: {
    type: Number,
    required: [true, 'Please add years of experience']
  },
  fees: {
    type: Number,
    required: [true, 'Please add consultation fees']
  },
  about: {
    type: String,
    maxlength: [500, 'About cannot be more than 500 characters']
  },
  image: {
    type: String,
    default: ''
  },
  availability: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  ratings: {
    type: Number,
    default: 4.5
  },
  totalPatients: {
    type: Number,
    default: 0
  },
  // New profile fields
  phone: {
    type: String,
    default: ''
  },
  qualification: {
    type: String,
    default: ''
  },
  licenseNumber: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  availabilityStatus: {
    type: String,
    enum: ['available', 'busy', 'on-leave'],
    default: 'available'
  },
  // Smart Scheduling Fields
  workingHours: {
    type: [workingHoursSchema],
    default: [
      { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
      { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
      { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
      { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
      { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
      { day: 'Saturday', isWorking: false, startTime: '09:00', endTime: '13:00', breakStart: null, breakEnd: null },
      { day: 'Sunday', isWorking: false, startTime: null, endTime: null, breakStart: null, breakEnd: null }
    ]
  },
  consultationTypes: {
    type: [consultationTypeSchema],
    default: [
      { name: 'First Consultation', duration: 30, description: 'Initial visit for new patients', fee: 500 },
      { name: 'Follow-up', duration: 15, description: 'Follow-up visit for existing patients', fee: 300 },
      { name: 'Emergency', duration: 20, description: 'Urgent consultation', fee: 700 },
      { name: 'Routine Checkup', duration: 20, description: 'Regular health checkup', fee: 400 }
    ]
  },
  defaultSlotDuration: {
    type: Number,
    default: 30 // Default slot duration in minutes
  },
  maxOverbookingLimit: {
    type: Number,
    default: 2 // Max overbooking slots per day for high no-show prediction
  },
  clinicAddress: {
    type: String,
    default: ''
  },
  clinicCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  // Real-time Queue Management
  delayFactor: {
    type: Number,
    default: 0 // Current delay in minutes (Exponential Moving Average)
  },
  currentConsultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null // ID of appointment currently being treated
  },
  sessionTemplates: {
    type: [{
      name: String,
      maxPatients: Number
    }],
    default: [
      { name: 'morning', maxPatients: 15 },
      { name: 'afternoon', maxPatients: 15 },
      { name: 'evening', maxPatients: 10 }
    ]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);
