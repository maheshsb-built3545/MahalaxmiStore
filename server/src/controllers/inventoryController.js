'use strict';

/**
 * R1 — Inventory Controller
 *
 * Routes handled:
 *   GET  /api/inventory/low-stock        — low-stock list (owner/staff)
 *   GET  /api/inventory/stock-log/:id    — stock history for a product (owner/staff)
 *   POST /api/inventory/stock-in         — add stock (owner/staff)
 *   POST /api/inventory/adjust           — stock adjustment with note (owner/staff)
 *   PATCH /api/inventory/unavailable/:id — toggle unavailableFlag (owner/staff)
 */

const mongoose = require('mongoose');
const Product  = require('../models/Product');
const StockLog = require('../models/StockLog');
const { clearDedupeNotification } = require('./notificationController');

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Write a single StockLog entry.
 * Exported so orderController can call it during order creation & cancellation.
 */
async function writeStockLog({ productId, type, quantity, balanceAfter, note, actor, actorId, orderId, session }) {
  const entry = new StockLog({
    product:     productId,
    type,
    quantity,
    balanceAfter,
    note:        note   || '',
    actor:       actor  || 'system',
    actorId:     actorId || null,
    orderId:     orderId || null,
  });
  if (session) {
    await entry.save({ session });
  } else {
    await entry.save();
  }
  return entry;
}

// ─── GET /api/inventory/low-stock ─────────────────────────────────────────────
/**
 * Returns all active products where stockQuantity <= reorderLevel OR stockQuantity === 0.
 * Also returns the count so the dashboard badge can display it.
 */
const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      active: true,
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
    })
      .populate('categoryId', 'nameEn nameMr emoji')
      .sort({ stockQuantity: 1, nameEn: 1 })
      .select('nameEn nameMr stockQuantity reorderLevel unitType packSize categoryId imageUrl unavailableFlag');

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/inventory/stock-log/:productId ──────────────────────────────────
const getStockLog = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      StockLog.find({ product: productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockLog.countDocuments({ product: productId }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/inventory/stock-in ─────────────────────────────────────────────
/**
 * Fast stock-in screen: owner/staff searches product and adds quantity.
 * Body: { productId, quantity, note? }
 */
const stockIn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const productId = typeof req.body.productId === 'string' ? req.body.productId.trim() : null;
    const quantity  = Number(req.body.quantity);
    const note      = typeof req.body.note === 'string' ? req.body.note.trim() : '';

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    if (isNaN(quantity) || quantity <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
    }

    const updateOps = { $inc: { stockQuantity: quantity } };
    const setOps = {};
    if (req.body.expiryDate) {
      setOps.expiryDate = new Date(req.body.expiryDate);
    }
    if (req.body.costPrice !== undefined && !isNaN(Number(req.body.costPrice)) && Number(req.body.costPrice) >= 0) {
      setOps.costPrice = Number(req.body.costPrice);
    }
    if (Object.keys(setOps).length > 0) {
      updateOps.$set = setOps;
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, active: true },
      updateOps,
      { new: true, session }
    );

    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const metaParts = [];
    if (req.body.supplier) metaParts.push(`पुरवठादार: ${req.body.supplier}`);
    if (req.body.invoiceNo) metaParts.push(`बिल क्र.: ${req.body.invoiceNo}`);
    if (req.body.costPrice) metaParts.push(`दर: ₹${req.body.costPrice}`);
    const metaNote = metaParts.length > 0 ? metaParts.join(' | ') : '';
    const fullNote = note ? (metaNote ? `${note} (${metaNote})` : note) : (metaNote || `Stock added by ${req.user.name}`);

    await writeStockLog({
      productId: product._id,
      type: 'in',
      quantity: +quantity,
      balanceAfter: product.stockQuantity,
      note: fullNote,
      actor: req.user.name,
      actorId: req.user._id,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // R2 (MSG-04): Clear low-stock alert dedupe key if stock is now healthy
    if (product.stockQuantity > product.reorderLevel) {
      clearDedupeNotification(`low_stock_${product._id}`);
    }

    res.json({
      success: true,
      message: `Added ${quantity} to ${product.nameEn}. New stock: ${product.stockQuantity}.`,
      data: {
        productId: product._id,
        nameEn: product.nameEn,
        nameMr: product.nameMr,
        stockQuantity: product.stockQuantity,
        reorderLevel: product.reorderLevel,
        unitType: product.unitType,
        inStock: product.inStock,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// ─── POST /api/inventory/adjust ──────────────────────────────────────────────
/**
 * Manual stock adjustment (can be + or -) with a required note.
 * Body: { productId, newQuantity, note }
 */
const adjustStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const productId   = typeof req.body.productId === 'string' ? req.body.productId.trim() : null;
    const newQuantity = Number(req.body.newQuantity);
    const note        = typeof req.body.note === 'string' ? req.body.note.trim() : '';

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    if (isNaN(newQuantity) || newQuantity < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'New quantity must be a non-negative number.' });
    }

    if (!note) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'A reason note is required for stock adjustments.' });
    }

    const oldProduct = await Product.findById(productId).session(session);
    if (!oldProduct) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const delta = newQuantity - oldProduct.stockQuantity;

    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: { stockQuantity: newQuantity } },
      { new: true, session }
    );

    await writeStockLog({
      productId: product._id,
      type: 'adjustment',
      quantity: delta,
      balanceAfter: newQuantity,
      note: `${note} (adjusted by ${req.user.name})`,
      actor: req.user.name,
      actorId: req.user._id,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // R2 (MSG-04): Clear low-stock alert dedupe key if adjusted above reorder level
    if (product.stockQuantity > product.reorderLevel) {
      clearDedupeNotification(`low_stock_${product._id}`);
    }

    res.json({
      success: true,
      message: `Stock adjusted for ${product.nameEn}. New stock: ${product.stockQuantity}.`,
      data: {
        productId: product._id,
        nameEn: product.nameEn,
        nameMr: product.nameMr,
        stockQuantity: product.stockQuantity,
        reorderLevel: product.reorderLevel,
        unitType: product.unitType,
        inStock: product.inStock,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// ─── PATCH /api/inventory/unavailable/:id ────────────────────────────────────
/**
 * Toggle unavailableFlag for a product.
 * When true, product appears out-of-stock to customers regardless of stockQuantity.
 * Body: { unavailable: boolean }
 */
const setUnavailable = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const flagValue = req.body.unavailable !== undefined
      ? Boolean(req.body.unavailable)
      : undefined;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.unavailableFlag = flagValue !== undefined ? flagValue : !product.unavailableFlag;
    await product.save();

    res.json({
      success: true,
      message: `${product.nameEn} marked as ${product.unavailableFlag ? 'temporarily unavailable' : 'available'}.`,
      data: {
        productId: product._id,
        nameEn: product.nameEn,
        stockQuantity: product.stockQuantity,
        unavailableFlag: product.unavailableFlag,
        inStock: product.inStock,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/inventory/near-expiry ──────────────────────────────────────────
/**
 * Returns active products expiring within 30 days or already expired.
 * R5 (INV-08)
 */
const getNearExpiry = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const products = await Product.find({
      active: true,
      expiryDate: { $ne: null, $lte: thirtyDaysFromNow },
    })
      .populate('categoryId', 'nameEn nameMr emoji')
      .sort({ expiryDate: 1 })
      .select('nameEn nameMr packSize stockQuantity unitType price mrp expiryDate categoryId unavailableFlag');

    const mapped = products.map((p) => {
      const exp = new Date(p.expiryDate);
      const diffMs = exp.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        _id: p._id,
        nameEn: p.nameEn,
        nameMr: p.nameMr,
        packSize: p.packSize,
        stockQuantity: p.stockQuantity,
        unitType: p.unitType,
        price: p.price,
        mrp: p.mrp,
        category: p.categoryId,
        expiryDate: p.expiryDate,
        daysUntilExpiry: diffDays,
        isExpired: diffDays <= 0,
        unavailableFlag: p.unavailableFlag,
      };
    });

    res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLowStock,
  getNearExpiry,
  getStockLog,
  stockIn,
  adjustStock,
  setUnavailable,
  writeStockLog,   // exported for use in orderController
};
