const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  tripId: {
    type: String,
    required: true,
    unique: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  tripType: {
    type: String,
    enum: ['bike', 'trek'],
    required: true
  },
  tripDate: {
    type: String,
    required: true
  },
  countryFlag: {
    type: String
  },
  tripData: {
    days: [{
      day: Number,
      cities: [{
        name: String,
        coordinates: [Number, Number]
      }],
      distances: [String],
      totalDistance: String,
      estimatedTime: String
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trip', tripSchema); 