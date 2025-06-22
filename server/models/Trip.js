const mongoose = require('mongoose');

// Defines the schema for a 'Trip' document in the MongoDB database.
// This model stores all the information related to a single trip plan.
const tripSchema = new mongoose.Schema({
  // A reference to the User who created the trip.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The email of the user, denormalized for easier querying of trip history.
  userEmail: {
    type: String,
    required: true
  },
  // A custom, unique identifier for the trip.
  tripId: {
    type: String,
    required: true,
    unique: true
  },
  // The country of the trip.
  country: {
    type: String,
    required: true
  },
  // The city of the trip.
  city: {
    type: String,
    required: true
  },

  // The type of trip, restricted to either 'bike' or 'trek'.
  tripType: {
    type: String,
    enum: ['bike', 'trek'],
    required: true
  },
  // The date of the trip.
  tripDate: {
    type: String,
    required: true
  },
  // The URL of the country's flag image.
  countryFlag: {
    type: String
  },
  // The detailed trip plan data, including daily itineraries.
  // This is a nested object containing arrays of daily plans.
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
  // A timestamp for when the trip document was created.
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trip', tripSchema); 