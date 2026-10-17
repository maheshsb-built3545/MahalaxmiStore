'use strict';
const Category = require('../models/Category');

/**
 * GET /api/categories
 * Returns all active categories sorted by sortOrder.
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ sortOrder: 1, nameEn: 1 })
      .select('-__v');
    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};
