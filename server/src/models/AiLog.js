'use strict';

const mongoose = require('mongoose');

/**
 * R3 — AiLog Schema (PRD Section 6, AI-08)
 * Stores AI grocery list requests, matches, and unmatched phrases.
 * The owner uses unmatched phrases to add product aliases (CAT-08, AI-08).
 * Note: Per PRD NFR Section 8, audio is never stored.
 */
const aiLogSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    inputText: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    matchedItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        rawPhrase: String,
        quantity: Number,
        unit: String,
        confidence: Number,
        accepted: { type: Boolean, default: false },
      },
    ],
    unmatchedPhrases: {
      type: [String],
      default: [],
      index: true,
    },
    source: {
      type: String,
      enum: ['typed', 'voice'],
      default: 'typed',
    },
    usedFallback: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

aiLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AiLog', aiLogSchema);
