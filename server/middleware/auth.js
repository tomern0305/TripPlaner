const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Protects routes requiring user authentication by verifying JWT tokens and attaching user information to request object.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'No authorization token provided',
      message: 'Please log in to access this resource'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Invalid token format',
      message: 'Token must be provided in format: Bearer <token>'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Attach user information to request object
    req.userId = decoded.id;
    req.user = decoded;
    
    next();
  } catch (error) {
    // Handle JWT verification errors
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
