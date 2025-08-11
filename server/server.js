const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trip');

const app = express();

/**
 * Trip Planner API Server
 * Express server providing backend API for the Trip Planner application.
 * Handles user authentication, trip management, and data persistence with MongoDB integration.
 */

// Enable CORS for cross-origin requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// API route registration
app.use('/api', authRoutes);
app.use('/api/trip', tripRoutes);

/**
 * Database Connection and Server Startup
 * 
 * Connects to MongoDB and starts the server only after successful
 * database connection to ensure data persistence availability.
 */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
