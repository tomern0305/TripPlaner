const mongoose = require('mongoose');

/**
 * User Schema Definition
 * 
 * Defines the data structure for user accounts in the Trip Planner application.
 * This schema includes basic user information and implements data normalization
 * to ensure consistent email handling across the application.
 */
const userSchema = new mongoose.Schema({
  // User's full name - required for personalization and display purposes
  name: { 
    type: String, 
    required: true,
    trim: true // Remove leading/trailing whitespace
  },
  
  // User's email address - serves as the unique identifier for login
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true // Automatically convert to lowercase
  },
  
  // Hashed password for secure authentication
  password: { 
    type: String, 
    required: true 
  }
}, {
  // Add timestamps for user creation and updates
  timestamps: true
});

/**
 * Pre-save Middleware: Email Normalization
 * 
 * This middleware ensures that all email addresses are stored in lowercase format
 * before saving to the database. This prevents case-sensitivity issues during
 * login and registration processes, ensuring consistent user experience.
 * 
 * Design Choice: Email normalization at the database level ensures data consistency
 * regardless of how the email is entered by users or processed by the application.
 */
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
