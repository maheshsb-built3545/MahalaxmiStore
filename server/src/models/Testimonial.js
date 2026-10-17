'use strict';
const mongoose = require('mongoose');

/**
 * R2 — Testimonial Schema (ADM-06, D11)
 * Authentic customer reviews managed by the store owner.
 * Any review with `sampleFlag: true` displays a visible "Sample / नमुना अभिप्राय" label on the site.
 */
const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      default: 'Yesgaon',
      trim: true,
    },
    textMr: {
      type: String,
      required: true,
      trim: true,
    },
    textEn: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    visible: {
      type: Boolean,
      default: true,
      index: true,
    },
    sampleFlag: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

testimonialSchema.index({ visible: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
