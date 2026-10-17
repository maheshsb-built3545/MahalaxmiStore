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
      type: mongoose.Schema.Types.Mixed, // { id, name, role } or string
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      default: 'owner',
    },
    action: {
      type: String, // e.g. 'product.update', 'order.status_change', 'stock.adjust'
      required: true,
      trim: true,
    },
    target: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    targetModel: {
      type: String, // e.g. 'Product', 'Order', 'User'
      trim: true,
      default: '',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    summary: {
      type: String, // human-readable one-liner
      trim: true,
      maxlength: 500,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    before: {
      type: mongoose.Schema.Types.Mixed, // snapshot before change
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed, // snapshot after change
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.pre('validate', function (next) {
  if (typeof this.actor === 'string') {
    this.actor = { name: this.actor, role: this.actorRole || 'owner' };
  } else if (this.actor && typeof this.actor === 'object') {
    if (!this.actor.name && this.actor.id) {
      this.actor.name = 'User';
    }
    if (this.actor.id && !this.actorId) {
      this.actorId = this.actor.id;
    }
    if (this.actor.role && !this.actorRole) {
      this.actorRole = this.actor.role;
    }
  }
  if (this.note && !this.summary) {
    this.summary = this.note;
  }
  if (this.target && typeof this.target === 'object') {
    if (!this.targetModel && this.target.collection) {
      this.targetModel = this.target.collection;
    }
    if (!this.targetId && this.target.id) {
      this.targetId = this.target.id;
    }
  }
  next();
});

// Recent audit entries per actor
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.name': 1, createdAt: -1 });
// Recent entries on a specific target
auditLogSchema.index({ targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
