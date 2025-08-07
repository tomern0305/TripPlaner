const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * User Registration Endpoint
 * 
 * POST /api/register
 * 
 * Creates a new user account with the provided credentials.
 * The password is securely hashed before storage, and a JWT token
 * is immediately issued for automatic login after registration.
 * 
 * Request Body:
 * - name: User's full name (required)
 * - email: User's email address (required, must be unique)
 * - password: User's password (required, will be hashed)
 * 
 * Response:
 * - 201: User created successfully with JWT token
 * - 400: Email already exists or validation error
 * - 500: Server error during registration
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Normalize email to lowercase to prevent duplicate accounts with different casing
  const normalizedEmail = email.toLowerCase();
  
  try {
    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email already exists',
        error: 'An account with this email address already exists'
      });
    }

    // Hash the password using bcrypt with a salt rounds of 10
    // This provides a good balance between security and performance
    const hashed = await bcrypt.hash(password, 10);
    
    // Create and save the new user
    const user = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashed 
    });
    await user.save();

    // Generate JWT token for immediate authentication
    // Use environment variable for secret, with fallback for development
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    
    // Create token with user information and 2-hour expiration
    const token = jwt.sign({ 
      id: user._id, 
      userId: user._id, 
      email: user.email 
    }, jwtSecret, { expiresIn: '2h' });
    
    // Return success response with token and user name
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
 * User Login Endpoint
 * 
 * POST /api/login
 * 
 * Authenticates a user with their email and password.
 * If credentials are valid, a JWT token is issued for session management.
 * 
 * Request Body:
 * - email: User's email address (required)
 * - password: User's password (required)
 * 
 * Response:
 * - 200: Login successful with JWT token
 * - 401: Invalid credentials
 * - 500: Server error during authentication
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Normalize email to ensure consistent lookups
  const normalizedEmail = email.toLowerCase();
  
  try {
    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ 
        message: 'Email not found',
        error: 'No account found with this email address'
      });
    }

    // Compare the provided password with the hashed password in the database
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ 
        message: 'Invalid password',
        error: 'Incorrect password. Please try again.'
      });
    }

    // Generate JWT token for authenticated session
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    
    // Create token with user information and 2-hour expiration
    const token = jwt.sign({ 
      id: user._id, 
      userId: user._id, 
      email: user.email 
    }, jwtSecret, { expiresIn: '2h' });
    
    // Return success response with token and user name
    res.json({ 
      token, 
      name: user.name,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: 'Authentication failed. Please try again.'
    });
  }
});

const authMiddleware = require('../middleware/auth');

/**
 * Get Current User Information
 * 
 * GET /api/me
 * 
 * Retrieves the current user's profile information based on the JWT token.
 * This endpoint is protected and requires valid authentication.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN> (required)
 * 
 * Response:
 * - 200: User information retrieved successfully
 * - 401: Unauthorized (invalid or missing token)
 * - 404: User not found
 * - 500: Server error
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Find user by ID from the authenticated token
    const user = await User.findById(req.userId).select('name email');
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The authenticated user account no longer exists'
      });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Unable to retrieve user information'
    });
  }
});

module.exports = router;