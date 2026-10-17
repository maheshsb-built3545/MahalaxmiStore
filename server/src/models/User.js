'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number.'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'owner', 'staff'],
      default: 'customer',
    },
    preferredLanguage: {
      type: String,
      enum: ['mr', 'hi', 'en'],
      default: 'mr',  // Marathi default per LNG-01
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [String],
      default: ['orders_view', 'orders_status', 'stock_manage'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('User', userSchema);
