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
        message: 'Authentication required. Please log in. / पुढे जाण्यासाठी लॉगिन करा.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token format. / अवैध अधिकृतता टोकन प्रारूप.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again. / तुमचे सत्र संपले आहे. कृपया पुन्हा लॉगिन करा.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token. / अवैध प्रमाणीकरण टोकन.',
      });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists. / वापरकर्ता खाते अस्तित्वात नाही.',
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

/**
 * Fine-grained module permission middleware.
 * Owners have unrestricted access. Staff must have the requested permission in user.permissions.
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.role === 'owner') {
      return next();
    }
    if (req.user.role === 'staff') {
      const userPerms = Array.isArray(req.user.permissions)
        ? req.user.permissions
        : ['orders_view', 'orders_status', 'stock_manage'];
      if (userPerms.includes(permission)) {
        return next();
      }
    }
    return res.status(403).json({
      success: false,
      message: `Access denied: missing permission "${permission}".`,
    });
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireOwnerOrStaff,
  requireOwnerOnly,
  requirePermission,
};
