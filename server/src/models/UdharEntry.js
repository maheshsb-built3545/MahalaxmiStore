'use strict';

const mongoose = require('mongoose');

/**
 * R4 — UdharEntry Schema (UDH-03)
 * Full transaction ledger recording credit purchases, payments, and adjustments.
 */
const udharEntrySchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UdharAccount',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'payment', 'adjustment'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'order_credit', 'adjustment'],
      default: 'order_credit',
    },
    paymentRef: {
      type: String,
      trim: true,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    actor: {
      id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'System' },
      role: { type: String, default: 'system' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UdharEntry', udharEntrySchema);
