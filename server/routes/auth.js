const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * User Registration
 * POST /api/register
 * Creates a new user account with secure password hashing and automatic JWT token generation.
 * @param {string} name - User's full name
 * @param {string} email - User's email address (must be unique)
 * @param {string} password - User's password (will be hashed)
 * @returns {Object} JWT token and user information
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  const normalizedEmail = email.toLowerCase();
  
  try {
    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email already exists',
        error: 'An account with this email address already exists'
      });
    }

    // Hash password with bcrypt
    const hashed = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashed 
    });
    await user.save();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = jwt.sign({ 
      id: user._id, 
      userId: user._id, 
      email: user.email 
    }, jwtSecret, { expiresIn: '2h' });
    
    res.status(201).json({ 
      token, 
      name: user.name,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      message: 'Registration failed',
      error: 'Unable to create account. Please try again.'
    });
  }
});

/**
 * User Login
 * POST /api/login
 * Authenticates user credentials and issues JWT token for session management.
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Object} JWT token and user information
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        message: 'Email not found',
        error: 'No account found with this email address'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid password',
        error: 'Incorrect password. Please try again.'
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = jwt.sign({ 
      id: user._id, 
      userId: user._id, 
      email: user.email 
    }, jwtSecret, { expiresIn: '2h' });
    
    res.json({ 
      token, 
      name: user.name,
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      message: 'Login failed',
      error: 'Unable to authenticate. Please try again.'
    });
  }
});

/**
 * Get Current User
 * GET /api/me
 * Retrieves current user information using JWT token.
 * @returns {Object} Current user information
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Access token required',
      error: 'Please provide a valid authentication token'
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        message: 'Invalid token',
        error: 'The provided token is invalid or expired'
      });
    }

    try {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found',
          error: 'User account no longer exists'
        });
      }
      
      res.json({ 
        user,
        message: 'User information retrieved successfully'
      });
    } catch (err) {
      console.error('User retrieval error:', err);
      res.status(500).json({ 
        message: 'Unable to retrieve user information',
        error: 'Please try again later'
      });
    }
  });
});

module.exports = router;