const mongoose = require('mongoose');

/**
 * Trip Schema Definition
 * 
 * Defines the data structure for trip plans in the Trip Planner application.
 * This schema stores comprehensive trip information including user association,
 * geographical details, route planning data, and metadata for trip management.
 * 
 * Design Philosophy:
 * - Denormalized user email for efficient querying without joins
 * - Unique trip identifiers for secure access control
 * - Flexible trip data structure to accommodate different trip types
 * - Comprehensive metadata for trip organization and display
 */
const tripSchema = new mongoose.Schema({
  // Reference to the User who created the trip
  // This establishes the ownership relationship between users and their trips
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Optimize queries by user
  },
  
  // Denormalized user email for efficient trip history queries
  // This eliminates the need for joins when fetching user-specific trips
  userEmail: {
    type: String,
    required: true,
    index: true // Optimize queries by email
  },
  
  // Unique identifier for the trip, used in URLs and API endpoints
  // Format: {userEmail}_{timestamp}_{randomString} for guaranteed uniqueness
  tripId: {
    type: String,
    required: true,
    unique: true,
    index: true // Optimize trip lookups
  },
  
  // Country where the trip takes place
  country: {
    type: String,
    required: true,
    trim: true
  },
  
  // City where the trip starts and ends
  city: {
    type: String,
    required: true,
    trim: true
  },

  // Type of trip activity - restricts to supported trip types
  tripType: {
    type: String,
    enum: ['bike', 'trek'], // Only these trip types are supported
    required: true
  },
  
  // Planned date for the trip
  tripDate: {
    type: String,
    required: true
  },
  
  // URL of the country's flag image for visual display
  countryFlag: {
    type: String
  },
  
  /**
   * Detailed trip plan data containing the complete itinerary
   * This nested structure stores daily routes with coordinates, distances, and timing
   * 
   * Structure:
   * - days: Array of daily itineraries
   *   - day: Day number (1, 2, etc.)
   *   - cities: Array of waypoints with names and coordinates
   *   - distances: Array of distances between consecutive points
   *   - totalDistance: Total distance for the day
   *   - estimatedTime: Estimated duration for the day
   */
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
                     coords[0] >= -90 && coords[0] <= 90 && // Latitude bounds
                     coords[1] >= -180 && coords[1] <= 180; // Longitude bounds
            },
            message: 'Coordinates must be valid [latitude, longitude] pairs'
          }
        }
      }],
      distances: [String], // Array of distance strings (e.g., "5.2 km")
      totalDistance: String, // Total daily distance
      estimatedTime: String // Estimated daily duration
    }]
  },
  
  // Timestamp for when the trip was created
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Optimize chronological queries
  }
}, {
  // Add timestamps for creation and updates
  timestamps: true
});

/**
 * Compound Index for Efficient Trip Queries
 * 
 * This index optimizes the most common query pattern: finding trips by user email
 * and sorting by creation date (most recent first).
 */
tripSchema.index({ userEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Trip', tripSchema); 