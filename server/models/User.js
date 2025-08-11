const mongoose = require('mongoose');

/**
 * User Schema
 * Defines data structure for user accounts with secure authentication and data normalization.
 */
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  
  password: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true
});

/**
 * Pre-save middleware for email normalization
 * Ensures email addresses are stored in lowercase format to prevent case-sensitivity issues.
 */
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
