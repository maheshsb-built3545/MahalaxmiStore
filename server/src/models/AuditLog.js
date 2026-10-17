'use strict';

const mongoose = require('mongoose');

/**
 * R0 — AuditLog
 * Records significant owner and staff actions for accountability.
 * Examples: price change, stock edit, order status change, credit change.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: String,       // user's name
      required: true,
      trim: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      enum: ['owner', 'staff', 'system'],
      default: 'owner',
    },
    action: {
      type: String,       // e.g. 'product.update', 'order.status_change', 'stock.adjust'
      required: true,
      trim: true,
    },
    targetModel: {
      type: String,       // e.g. 'Product', 'Order', 'User'
      trim: true,
      default: '',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    summary: {
      type: String,       // human-readable one-liner
      trim: true,
      maxlength: 500,
      default: '',
    },
    before: {
      type: mongoose.Schema.Types.Mixed,  // snapshot before change (subset of fields)
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,  // snapshot after change
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Recent audit entries per actor
auditLogSchema.index({ actorId: 1, createdAt: -1 });
// Recent entries on a specific target
auditLogSchema.index({ targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
