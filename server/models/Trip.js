const mongoose = require('mongoose');

/**
 * Trip Schema
 * Defines the data structure for trip plans with comprehensive itinerary information and user association.
 */
const tripSchema = new mongoose.Schema({
  // User association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  
  // Trip identification
  tripId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Trip metadata
  tripName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  tripDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  country: {
    type: String,
    required: true,
    trim: true
  },
  
  city: {
    type: String,
    required: true,
    trim: true
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
  
  // Detailed itinerary data
  tripData: {
    days: [{
      day: {
        type: Number,
        required: true
      },
      cities: [{
        name: {
          type: String,
          required: true
        },
        coordinates: {
          type: [Number], // [latitude, longitude]
          required: true,
          validate: {
            validator: function(coords) {
              return coords.length === 2 && 
                     coords[0] >= -90 && coords[0] <= 90 && 
                     coords[1] >= -180 && coords[1] <= 180;
            },
            message: 'Coordinates must be valid [latitude, longitude] pairs'
          }
        }
      }],
      distances: [String],
      totalDistance: String,
      estimatedTime: String
    }]
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

/**
 * Compound index for efficient trip queries
 * Optimizes queries by user email with chronological sorting.
 */
tripSchema.index({ userEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Trip', tripSchema); 