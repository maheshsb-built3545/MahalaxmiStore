'use strict';
const mongoose = require('mongoose');

/**
 * R2 — Notification Schema (MSG-01)
 * Supports in-website inboxes for both customers and store owners/staff.
 *
 * Fields:
 * - recipient:     ObjectId ref to User (null for broadcast or owner group)
 * - recipientRole: 'customer' | 'owner' | 'staff' | 'all_admin'
 * - type:          'order_new' | 'order_status' | 'order_cancelled' | 'low_stock' | 'udhar_request' | 'udhar_status' | 'announcement'
 * - title:         Notification headline (bilingual or localized)
 * - body:          Notification message content
 * - link:          In-app URL target (e.g. /orders.html?id=... or /admin/orders.html?search=...)
 * - readAt:        Timestamp when recipient viewed/read the notification (null = unread)
 * - dedupeKey:     Idempotency key to prevent repeat alerts (e.g. low_stock_productId) (MSG-04)
 * - metadata:      Arbitrary payload (orderId, productId, etc.)
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['customer', 'owner', 'staff', 'all_admin'],
      default: 'customer',
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'order_new',
        'order_status',
        'order_cancelled',
        'low_stock',
        'udhar_request',
        'udhar_status',
        'announcement',
        'substitute_proposed',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    dedupeKey: {
      type: String,
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for fast inbox listing and unread count calculations
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
