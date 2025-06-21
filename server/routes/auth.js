const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Normalize email to lowercase to prevent duplicate accounts with different casing.
  const normalizedEmail = email.toLowerCase();
  
  try {
    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash the password before saving it to the database for security.
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email: normalizedEmail, password: hashed });
    await user.save();

    // Use a fallback JWT secret for development if not set in environment variables.
    // In production, a strong, unique secret must be set.
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    
    // Sign a new JWT token for the registered user.
    // The token contains user identifiers and is set to expire in 2 hours.
    const token = jwt.sign({ 
      id: user._id, 
      userId: user._id, 
      email: user.email 
    }, jwtSecret, { expiresIn: '2h' });
    res.status(201).json({ token, name: user.name });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Normalize email to ensure consistent lookups.
  const normalizedEmail = email.toLowerCase();
  
  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: 'Email not found' });

    // Compare the provided password with the hashed password in the database.
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid password' });

    // Use a fallback JWT secret for development if not set in environment variables.
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    
    // Sign a new JWT token for the logged-in user.
    const token = jwt.sign({ 
      id: user._id, 
      userId: user._id, 
      email: user.email 
    }, jwtSecret, { expiresIn: '2h' });
    res.json({ token, name: user.name });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const authMiddleware = require('../middleware/auth');

// This route provides a way for the client to get the current user's details
// based on the provided JWT token. It uses the authMiddleware to protect the route.
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('name email');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});