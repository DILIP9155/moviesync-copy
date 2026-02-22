const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    User.findById(decoded.userId)
      .then((user) => {
        if (!user || !user.isActive) {
          return res.status(401).json({ error: 'Invalid or inactive user' });
        }
        req.user = user;
        next();
      })
      .catch(() => res.status(401).json({ error: 'Invalid token' }));
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    User.findById(decoded.userId).then((user) => {
      if (user && user.isActive) req.user = user;
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}

module.exports = { authMiddleware, optionalAuth, JWT_SECRET };
