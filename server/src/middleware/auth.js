'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: verify JWT from Authorization: Bearer <token>
 * Attaches req.user (without passwordHash).
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token format.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    if (user.blocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact store owner.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: require a specific role (e.g. 'owner')
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions.',
      });
    }
    next();
  };
};

/**
 * R1 — Middleware: require owner OR staff role.
 * Staff have the same permissions as owner except:
 *   - Cannot add/remove staff accounts
 *   - Cannot change owner credentials
 * All staff actions must be audited with req.user.name.
 */
const requireOwnerOrStaff = (req, res, next) => {
  if (!req.user || !['owner', 'staff'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: insufficient permissions.',
    });
  }
  next();
};

/**
 * R1 — Middleware: require strictly 'owner' (for staff-management and credential routes).
 * Alias for requireRole('owner') with a clearer semantic name.
 */
const requireOwnerOnly = requireRole('owner');

module.exports = { verifyToken, requireRole, requireOwnerOrStaff, requireOwnerOnly };
