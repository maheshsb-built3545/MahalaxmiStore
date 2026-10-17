'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Normalise phone for rate limiter key
 */
const getAuthKey = (req) => {
  const phone =
    req.body && typeof req.body.phone === 'string'
      ? req.body.phone.replace(/[^0-9]/g, '').slice(-10)
      : '';
  return `${req.ip}_${phone}`;
};

/**
 * Strict rate limiter for register & login:
 * Counts only failed attempts (skipSuccessfulRequests: true)
 * Keyed by IP + normalized phone
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts (Playbook 1.1)
  skipSuccessfulRequests: true,
  keyGenerator: getAuthKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    });
  },
});

/**
 * Rate limit for order creation: 10 per hour per user
 */
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skipFailedRequests: true,
  keyGenerator: (req) => (req.user ? req.user._id.toString() : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Order creation limit reached (maximum 10 orders per hour). Please try again later.',
    });
  },
});

/**
 * Rate limit for admin routes: 600 requests per 15 minutes per IP
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many admin requests. Please wait a few moments before trying again.',
    });
  },
});

/**
 * Rate limit for AI order box: 60 requests per 15 minutes per IP (AI-06)
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'AI request limit reached. Please wait a few moments before trying again. / AI विनंती मर्यादा गाठली आहे.',
    });
  },
});

module.exports = { authLimiter, orderLimiter, adminLimiter, aiLimiter };
