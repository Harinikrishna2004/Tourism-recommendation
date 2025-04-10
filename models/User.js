const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],
  otp: { type: String }, // Stores OTP
  otpExpires: { type: Date } // OTP expiration time
});
module.exports = mongoose.model('User', UserSchema);