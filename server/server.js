const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trip');

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) to allow requests from the client-side application.
// This is essential for a decoupled front-end/back-end architecture.
app.use(cors());

app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/trip', tripRoutes);

// Connect to MongoDB using the connection string from environment variables.
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // Start the Express server only after a successful database connection.
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
