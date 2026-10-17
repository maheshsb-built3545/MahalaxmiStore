'use strict';

const mongoose = require('mongoose');

/**
 * R1 — StockLog
 * Every stock change is recorded here: in, out, adjustment, order deduction, cancel restore.
 * Fields:
 *   product      – ref to Product
 *   type         – 'in' | 'out' | 'adjustment' | 'order' | 'cancel'
 *   quantity     – signed delta (positive = stock added, negative = stock removed)
 *   balanceAfter – stockQuantity after this entry
 *   note         – human-readable reason
 *   actor        – name of the user who made the change (or 'system')
 *   actorId      – userId ref (null for system)
 *   orderId      – Order ref when type is 'order' or 'cancel'
 *   createdAt    – UTC timestamp
 */
const stockLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment', 'order', 'cancel'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      // positive = added, negative = removed
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    actor: {
      type: String,
      trim: true,
      default: 'system',
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// For fetching a product's history in descending order
stockLogSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('StockLog', stockLogSchema);
