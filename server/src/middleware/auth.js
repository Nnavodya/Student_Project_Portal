const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject tokens not intended for access (email verification, refresh, or admin flow tokens)
    if (
      decoded.isRefreshToken ||
      decoded.purpose === 'email_verification' ||
      decoded.purpose === 'refresh' ||
      decoded.adminFlow ||
      (decoded.purpose && decoded.purpose !== 'access')
    ) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, message: 'Invalid token purpose.' });
    }

    if (!decoded.id) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, message: 'Invalid token payload.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Skip if token is not an access token
    if (
      decoded.isRefreshToken ||
      decoded.purpose === 'email_verification' ||
      decoded.purpose === 'refresh' ||
      decoded.adminFlow ||
      (decoded.purpose && decoded.purpose !== 'access') ||
      !decoded.id
    ) {
      return next();
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (result.rows.length) {
      req.user = result.rows[0];
    }
  } catch {
    // Invalid token — proceed without auth
  }
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
