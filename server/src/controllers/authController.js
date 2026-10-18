'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { normalizePhone, ensureString } = require('../utils/helpers');

/**
 * Generate 7-day JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const rawName = ensureString(req.body.name);
    const rawPhone = ensureString(req.body.phone);
    const rawPassword = ensureString(req.body.password);

    if (!rawName || rawName.length < 2 || rawName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters.',
      });
    }

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.',
      });
    }

    if (!rawPassword || rawPassword.length < 8 || rawPassword.length > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 72 characters.',
      });
    }

    // Check if phone already registered
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered. Please log in instead.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const user = await User.create({
      name: rawName,
      phone,
      passwordHash,
      role: 'customer',
      blocked: false,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const rawPhone = ensureString(req.body.phone);
    const rawPassword = ensureString(req.body.password);

    // Rule 9: Constant login failure message
    const INVALID_CREDENTIALS_MSG = 'Invalid phone or password.';

    const phone = normalizePhone(rawPhone);
    if (!phone || !rawPassword || rawPassword.length < 8 || rawPassword.length > 72) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    // Explicit string query prevents NoSQL injection
    const user = await User.findOne({ phone }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    if (user.blocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact store owner.',
      });
    }

    const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      role: req.user.role,
    },
  });
};

/**
 * PUT /api/auth/profile
 * Update logged-in user profile (name, optional password update)
 */
const updateProfile = async (req, res, next) => {
  try {
    const rawName = ensureString(req.body.name);
    if (!rawName || rawName.length < 2 || rawName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters / नाव २ ते १०० अक्षरांचे असावे.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.name = rawName;

    if (req.body.password) {
      const rawPassword = ensureString(req.body.password);
      if (rawPassword.length < 8 || rawPassword.length > 72) {
        return res.status(400).json({
          success: false,
          message: 'Password must be between 8 and 72 characters / पासवर्ड ८ ते ७२ अक्षरांचा असावा.',
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(rawPassword, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully / प्रोफाईल यशस्वीरीत्या अपडेट केले.',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile };
