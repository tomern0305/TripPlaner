const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trip');

const app = express();

/**
 * Server Configuration and Middleware Setup
 * 
 * This Express server provides the backend API for the Trip Planner application.
 * It handles user authentication, trip planning, and data persistence.
 */

// Enable Cross-Origin Resource Sharing (CORS) to allow requests from the client-side application.
// This is essential for a decoupled front-end/back-end architecture where the client
// runs on a different port/domain than the server.
app.use(cors());

// Parse incoming JSON payloads in request bodies
app.use(express.json());

// API Route Registration
// All authentication-related endpoints are prefixed with '/api'
app.use('/api', authRoutes);

// All trip-related endpoints are prefixed with '/api/trip'
app.use('/api/trip', tripRoutes);

/**
 * Database Connection and Server Startup
 * 
 * The server connects to MongoDB using the connection string from environment variables.
 * Only after a successful database connection does the server start listening for requests.
 * This ensures data persistence is available before accepting client connections.
 */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // Start the Express server only after a successful database connection.
    // This prevents the server from running without database access.
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process if database connection fails
  });
