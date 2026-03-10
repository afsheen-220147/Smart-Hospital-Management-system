const mongoose = require('mongoose');

const adminDoctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add doctor name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add doctor email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@rguktn\.ac\.in$/,
        'Email must be an @rguktn.ac.in address',
      ],
    },
    department: {
      type: String,
      required: [true, 'Please add department/specialization'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminDoctor', adminDoctorSchema);
