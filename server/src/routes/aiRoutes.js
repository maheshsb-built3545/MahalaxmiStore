'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { parseList, getSubstitutes, getAiMisses } = require('../controllers/aiController');
const { aiLimiter } = require('../middleware/rateLimiter');
const { verifyToken, requireOwnerOrStaff } = require('../middleware/auth');

/**
 * Optional token extractor: if authorization header is provided and valid, attaches req.user
 * without failing if guest user.
 */
const optionalToken = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-passwordHash');
          if (user && !user.blocked) {
            req.user = user;
          }
        } catch {
          // Ignore invalid/expired token for guest parsing
        }
      }
    }
    next();
  } catch {
    next();
  }
};

// Customer facing routes
router.post('/parse-list', aiLimiter, optionalToken, parseList);
router.get('/substitutes/:productId', getSubstitutes);

// Owner / staff power tool routes (AI-08 miss analysis)
router.get('/misses', verifyToken, requireOwnerOrStaff, getAiMisses);

module.exports = router;
