'use strict';

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    nameEn: {
      type: String,
      required: true,
    },
    nameMr: {
      type: String,
      required: true,
    },
    packSize: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: String,
      enum: ['customer', 'owner', 'system'],
      default: 'customer',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const substitutionSchema = new mongoose.Schema(
  {
    originalProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    originalNameEn: { type: String, required: true },
    originalNameMr: { type: String, required: true },
    originalPackSize: { type: String, default: '' },
    originalPrice: { type: Number, required: true },
    originalQty: { type: Number, required: true },
    proposedProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    proposedNameEn: { type: String, required: true },
    proposedNameMr: { type: String, required: true },
    proposedPackSize: { type: String, default: '' },
    proposedPrice: { type: Number, required: true },
    proposedQty: { type: Number, required: true },
    priceDiff: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    proposedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      line: { type: String, required: true },
      landmark: { type: String, default: '' },
      pincode: { type: String, required: true },
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        (arr) => Array.isArray(arr) && arr.length > 0 && arr.length <= 50,
        'Order must contain between 1 and 50 items.',
      ],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['upi_qr', 'cod', 'udhar'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'paid_pending_verification'],
      default: 'pending',
    },
    paymentRef: {
      type: String,
      trim: true,
      maxlength: [20, 'Payment reference cannot exceed 20 characters.'],
      default: '',
    },
    slot: {
      type: String,
      required: true,
    },
    deliveryDate: {
      type: String,
      enum: ['today', 'tomorrow'],
      default: 'today',
    },
    // R2: customer order note and optional landmark / map link (ORD-07)
    note: {
      type: String,
      trim: true,
      default: '',
    },
    locationPin: {
      type: String,
      trim: true,
      default: '',
    },
    // R2/R3: order channel (website vs ai_box) (ORD-08)
    channel: {
      type: String,
      enum: ['website', 'ai_box'],
      default: 'website',
    },
    status: {
      type: String,
      enum: ['new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'new',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    // R5: Owner-proposed item substitutions (ORD-06)
    substitutions: {
      type: [substitutionSchema],
      default: [],
    },
    // R1: prevents double stock restore on double-click cancel (INV-03)
    stockRestored: {
      type: Boolean,
      default: false,
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

// Compound indexes for user order queries & status filters
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
