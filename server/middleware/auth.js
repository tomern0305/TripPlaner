const jwt = require('jsonwebtoken');

// This middleware function is used to protect routes that require authentication.
// It verifies the JWT token provided in the 'Authorization' header of the request.
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  // The token is expected to be in the format 'Bearer <token>'.
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token format' });

  try {
    // The token is verified using the secret key.
    // If successful, the decoded payload is attached to the request object.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    // If verification fails (e.g., due to an invalid signature or expiration),
    // an error response is sent.
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
