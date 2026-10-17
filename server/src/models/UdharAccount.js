'use strict';

const mongoose = require('mongoose');

/**
 * R4 — UdharAccount Schema (UDH-01, UDH-02, UDH-06)
 * Tracks customer credit facility, credit limit, and running outstanding balance.
 */
const udharAccountSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'paused', 'revoked'],
      default: 'pending',
      index: true,
    },
    creditLimit: {
      type: Number,
      default: 2000,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UdharAccount', udharAccountSchema);
