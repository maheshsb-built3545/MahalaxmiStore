'use strict';

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    line: {
      type: String,
      required: [true, 'Address line is required.'],
      trim: true,
      maxlength: [200, 'Address line cannot exceed 200 characters.'],
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Landmark cannot exceed 100 characters.'],
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required.'],
      trim: true,
      match: [/^\d{6}$/, 'Pincode must be exactly 6 digits.'],
    },
    isDefault: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model('Address', addressSchema);
