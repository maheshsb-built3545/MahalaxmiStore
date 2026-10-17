'use strict';
const mongoose = require('mongoose');

/**
 * R2 — PushSubscription Schema (MSG-05)
 * Stores W3C Web Push subscriptions for browser notifications (Android Chrome, iOS PWA, desktop).
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ['customer', 'owner', 'staff'],
      default: 'customer',
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
