'use strict';

/**
 * R2 — Notification Controller (MSG-01, MSG-02, MSG-04, MSG-05)
 * Manages in-website inboxes for customers and store owners/staff.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

/**
 * Programmatic helper to create notifications across the server.
 * Handles de-duplication (MSG-04: one low-stock alert until restocked).
 */
async function createNotification({
  recipient = null,
  recipientRole = 'customer',
  type,
  title,
  body,
  link = '',
  dedupeKey = null,
  metadata = {},
}) {
  try {
    if (dedupeKey) {
      // Check if an unread notification with this dedupeKey already exists
      const existing = await Notification.findOne({
        dedupeKey,
        readAt: null,
      });
      if (existing) {
        // Notification already pending; update timestamp & message without duplicate inbox item
        existing.body = body;
        existing.createdAt = new Date();
        await existing.save();
        return existing;
      }
    }

    const doc = await Notification.create({
      recipient,
      recipientRole,
      type,
      title,
      body,
      link,
      dedupeKey,
      metadata,
      createdAt: new Date(),
    });

    return doc;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Clear/resolve a deduplicated notification key (e.g. when product is restocked)
 */
async function clearDedupeNotification(dedupeKey) {
  try {
    if (!dedupeKey) return;
    await Notification.updateMany(
      { dedupeKey, readAt: null },
      { $set: { readAt: new Date() } }
    );
  } catch (err) {
    console.error('Failed to clear dedupe notification:', err.message);
  }
}

/**
 * GET /api/notifications
 * Returns notifications for current user or admin inbox.
 */
const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    const isStaffOrOwner = req.user && (req.user.role === 'owner' || req.user.role === 'staff');

    // Build filter based on role
    const filter = {};
    if (isStaffOrOwner) {
      filter.$or = [
        { recipientRole: { $in: ['owner', 'staff', 'all_admin'] } },
        { recipient: req.user._id },
      ];
    } else {
      filter.recipient = req.user._id;
    }

    if (unreadOnly) {
      filter.readAt = null;
    }

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        ...(isStaffOrOwner
          ? {
              $or: [
                { recipientRole: { $in: ['owner', 'staff', 'all_admin'] } },
                { recipient: req.user._id },
              ],
            }
          : { recipient: req.user._id }),
        readAt: null,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/unread-count
 * Fast counter for navbar bell badge.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const isStaffOrOwner = req.user && (req.user.role === 'owner' || req.user.role === 'staff');

    const filter = {
      ...(isStaffOrOwner
        ? {
            $or: [
              { recipientRole: { $in: ['owner', 'staff', 'all_admin'] } },
              { recipient: req.user._id },
            ],
          }
        : { recipient: req.user._id }),
      readAt: null,
    };

    const count = await Notification.countDocuments(filter);
    res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const isStaffOrOwner = req.user && (req.user.role === 'owner' || req.user.role === 'staff');
    const filter = { _id: id };

    if (!isStaffOrOwner) {
      filter.recipient = req.user._id;
    }

    const notification = await Notification.findOneAndUpdate(
      filter,
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user/admin.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const isStaffOrOwner = req.user && (req.user.role === 'owner' || req.user.role === 'staff');

    const filter = {
      ...(isStaffOrOwner
        ? {
            $or: [
              { recipientRole: { $in: ['owner', 'staff', 'all_admin'] } },
              { recipient: req.user._id },
            ],
          }
        : { recipient: req.user._id }),
      readAt: null,
    };

    const result = await Notification.updateMany(filter, {
      $set: { readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/subscribe
 * Register Web Push subscription (MSG-05)
 */
const subscribePush = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription details.' });
    }

    const role = req.user ? req.user.role : 'customer';
    const userId = req.user ? req.user._id : null;

    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: userId,
        role,
        endpoint,
        keys,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  clearDedupeNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribePush,
};
