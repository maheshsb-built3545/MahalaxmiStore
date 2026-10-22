'use strict';
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    nameEn:    { type: String, required: true, trim: true, unique: true },
    nameMr:    { type: String, required: true, trim: true },
    emoji:     { type: String, required: false, default: '' },
    iconKey:   { type: String, required: false, trim: true, default: null },
    sortOrder: { type: Number, default: 0 },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
