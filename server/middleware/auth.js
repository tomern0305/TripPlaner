const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * 
 * This middleware function protects routes that require user authentication.
 * It verifies the JWT token provided in the 'Authorization' header and
 * attaches the decoded user information to the request object for use
 * in subsequent route handlers.
 * 
 * Security Features:
 * - Token format validation (Bearer scheme)
 * - JWT signature verification
 * - Token expiration checking
 * - Graceful error handling for invalid tokens
 * 
 * Usage: Apply this middleware to any route that requires authentication
 */
function authMiddleware(req, res, next) {
  // Extract the Authorization header from the request
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'No authorization token provided',
      message: 'Please log in to access this resource'
    });
  }

  // Validate the token format (Bearer <token>)
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Invalid token format',
      message: 'Token must be provided in format: Bearer <token>'
    });
  }

  try {
    // Verify the JWT token using the secret key from environment variables
    // This validates the token's signature and checks for expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Attach the decoded user information to the request object
    // This makes user data available to subsequent middleware and route handlers
    req.userId = decoded.id;
    req.user = decoded; // Store full decoded token for additional user data
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Handle different types of JWT verification errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or corrupted.'
      });
    } else {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Unable to verify your identity. Please log in again.'
      });
    }
  }
}

module.exports = authMiddleware;
