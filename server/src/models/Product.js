'use strict';
const mongoose = require('mongoose');

/**
 * R1 — Extended Product Schema
 * - stockQuantity: numeric (decimal for loose items like 2.5 kg)
 * - reorderLevel:  owner-set threshold that triggers low-stock alert
 * - unitType:      piece | kg | g | litre | ml | pack
 * - aliases:       search synonyms across scripts (e.g. 'sakhar', 'sugar', 'साखर')
 * - nameHi:        optional Hindi name
 * - unavailableFlag: owner can mark temporarily unavailable regardless of stock
 * - inStock:       virtual — true when stockQuantity > 0 AND !unavailableFlag
 */
const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    nameEn:          { type: String, required: true, trim: true },
    nameMr:          { type: String, required: true, trim: true },
    nameHi:          { type: String, trim: true, default: '' },
    aliases:         { type: [String], default: [] },
    search_keywords: { type: [String], default: [] },
    packSize:        { type: String, required: true, trim: true },
    unitType:        {
      type: String,
      enum: ['piece', 'kg', 'g', 'litre', 'ml', 'pack'],
      default: 'piece',
    },
    price:           { type: Number, required: true, min: 0 },
    mrp:             { type: Number, required: true, min: 0 },
    costPrice:       { type: Number, default: 0, min: 0 },
    imageUrl:        { type: String, default: '' },
    offerPercent:    { type: Number, default: 0, min: 0, max: 100 },
    offerEndTime:    { type: Date, default: null }, // R2: optional end time for deals (CAT-06)
    // ── Inventory (R1) ─────────────────────────────────────────────────────
    stockQuantity:   { type: Number, default: 0, min: 0 },
    reorderLevel:    { type: Number, default: 5, min: 0 },
    unavailableFlag: { type: Boolean, default: false }, // owner override regardless of stock
    expiryDate:      { type: Date, default: null, index: true }, // R5: batch expiry tracking (INV-08)
    // ── Status ─────────────────────────────────────────────────────────────
    active:          { type: Boolean, default: true, index: true },
    sortOrder:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Virtual: inStock (derived — backward compat with all existing code) ────────
productSchema.virtual('inStock').get(function () {
  return this.stockQuantity > 0 && !this.unavailableFlag;
});

// Include virtuals when converting to JSON / Object
productSchema.set('toJSON',   { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound index for fast bilingual search queries
productSchema.index({ nameEn: 1, nameMr: 1 });
// Low-stock list query: active products where stockQuantity <= reorderLevel
productSchema.index({ active: 1, stockQuantity: 1, reorderLevel: 1 });
// Aliases text search
productSchema.index({ aliases: 1 });

module.exports = mongoose.model('Product', productSchema);
