'use strict';
const mongoose = require('mongoose');
const Product  = require('../models/Product');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escape regex special characters so user input is always literal. */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Return true only for a 24-char hex string (MongoDB ObjectId). */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/products
 *
 * Query params:
 *   category  – ObjectId string – filter by category
 *   search    – string          – bilingual case-insensitive search (nameEn or nameMr)
 *   inStock   – "true"/"false"  – filter by stock status
 *   ids       – comma-separated ObjectIds – fetch specific products (used by cart stale-guard)
 *   page      – integer ≥ 1     – default 1
 *   limit     – integer 1-500   – default 200 (returns all products for now)
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, inStock, ids, page = '1', limit = '200' } = req.query;

    const query = { active: true };

    // ── Filter: category ────────────────────────────────────────────────────
    if (category !== undefined) {
      if (!isValidObjectId(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category ID.' });
      }
      query.categoryId = category;
    }

    // ── Filter: ids (comma-separated) – for cart stale-guard ────────────────
    if (ids !== undefined) {
      const idList   = ids.split(',').map((s) => s.trim()).filter(Boolean);
      const validIds = idList.filter(isValidObjectId);

      if (validIds.length === 0) {
        // All provided IDs are invalid – return empty list, not an error
        return res.json({ success: true, count: 0, total: 0, page: 1, pages: 0, data: [] });
      }

      query._id = { $in: validIds };
    }

    // ── Filter: inStock ──────────────────────────────────────────────────────
    if (inStock !== undefined) {
      query.inStock = inStock === 'true';
    }

    // ── Filter: bilingual search ─────────────────────────────────────────────
    if (search && search.trim()) {
      const safe = escapeRegex(search.trim());
      const re   = { $regex: safe, $options: 'i' };
      query.$or  = [{ nameEn: re }, { nameMr: re }];
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 200));
    const skip     = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'nameEn nameMr emoji')
        .sort({ sortOrder: 1, nameEn: 1 })
        .skip(skip)
        .limit(limitNum)
        .select('-__v'),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      count:   products.length,
      total,
      page:    pageNum,
      pages:   Math.ceil(total / limitNum),
      data:    products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 * Returns a single active product; 400 for invalid ID, 404 if not found.
 */
exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const product = await Product.findOne({ _id: id, active: true })
      .populate('categoryId', 'nameEn nameMr emoji')
      .select('-__v');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/bestsellers
 * R2 (CAT-07): Computed from the last 30 days of orders and shown on storefront.
 * Fallback to popular products if 30-day history is small.
 */
exports.getBestSellers = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate top ordered products in the last 30 days
    const topItems = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.qty' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 8 },
    ]);

    const topIds = topItems.map((item) => item._id).filter(Boolean);

    let products = [];
    if (topIds.length > 0) {
      products = await Product.find({ _id: { $in: topIds }, active: true })
        .populate('categoryId', 'nameEn nameMr emoji')
        .select('-__v');
      // Sort according to topIds order
      products.sort((a, b) => topIds.indexOf(a._id.toString()) - topIds.indexOf(b._id.toString()));
    }

    // Fallback: If store is new or has fewer than 4 order-derived items, pad with top active products
    if (products.length < 4) {
      const existingIds = products.map((p) => p._id);
      const fallback = await Product.find({ _id: { $nin: existingIds }, active: true })
        .populate('categoryId', 'nameEn nameMr emoji')
        .sort({ sortOrder: 1, nameEn: 1 })
        .limit(8 - products.length)
        .select('-__v');
      products = products.concat(fallback);
    }

    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/offers
 * R2 (CAT-06): Offers and Mega Deals driven by owner-set offer values and optional end time.
 */
exports.getOffers = async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
      active: true,
      offerPercent: { $gt: 0 },
      $or: [
        { offerEndTime: null },
        { offerEndTime: { $exists: false } },
        { offerEndTime: { $gt: now } },
      ],
    };

    const products = await Product.find(query)
      .populate('categoryId', 'nameEn nameMr emoji')
      .sort({ offerPercent: -1, sortOrder: 1 })
      .limit(12)
      .select('-__v');

    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
};
