'use strict';

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Settings = require('../models/Settings');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const AuditLog = require('../models/AuditLog');  // R0
const Notification = require('../models/Notification'); // R2
const UdharAccount = require('../models/UdharAccount'); // R4
const UdharEntry = require('../models/UdharEntry');     // R4
const StockLog = require('../models/StockLog');         // R1
const { createNotification } = require('./notificationController'); // R2
const { writeStockLog } = require('./inventoryController'); // R1
const { ensureString, normalizePhone } = require('../utils/helpers');

// Configure Cloudinary from environment variables (values trimmed and sanitized)
const cleanCloudinaryVar = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, '').trim() : '');

cloudinary.config({
  cloud_name: cleanCloudinaryVar(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: cleanCloudinaryVar(process.env.CLOUDINARY_API_KEY),
  api_secret: cleanCloudinaryVar(process.env.CLOUDINARY_API_SECRET),
  secure: true,
});

/**
 * Validate that an image URL is a secure HTTPS link hosted on the configured Cloudinary cloud
 */
function isValidCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return true; // optional/empty is allowed
  if (url.startsWith('/images/')) return true; // allow seeded local SVG and placeholder paths
  const cloudName =
    cleanCloudinaryVar(process.env.CLOUDINARY_CLOUD_NAME) ||
    cloudinary.config().cloud_name ||
    '[a-zA-Z0-9_-]+';
  const pattern = new RegExp(`^https://res\\.cloudinary\\.com/${cloudName}/.+`, 'i');
  return pattern.test(url);
}

/**
 * Compute IST day start and end Date objects (+05:30 offset)
 */
function getISTDayRange(dateInput = new Date()) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(dateInput.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = istTime.getUTCMonth();
  const date = istTime.getUTCDate();

  const startUtc = new Date(Date.UTC(year, month, date) - istOffset);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { startUtc, endUtc };
}

// ─── DASHBOARD & POLLING ───────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/stats
 */
const getStats = async (req, res, next) => {
  try {
    const { startUtc, endUtc } = getISTDayRange();

    // 1. Today's orders count
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startUtc, $lte: endUtc },
    });

    // 2. Today's sales breakdown (excluding cancelled)
    // 2a. Delivered/collected sales strictly where paymentStatus === 'paid' (excludes unverified UPI)
    const collectedAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startUtc, $lte: endUtc },
          status: { $ne: 'cancelled' },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]);
    const collectedSales = collectedAgg.length > 0 ? collectedAgg[0].total : 0;

    // 2b. Pending payment (COD + unverified UPI paid_pending_verification)
    const pendingPaymentAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startUtc, $lte: endUtc },
          status: { $ne: 'cancelled' },
          paymentStatus: { $ne: 'paid' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]);
    const pendingPaymentSales = pendingPaymentAgg.length > 0 ? pendingPaymentAgg[0].total : 0;

    const todaySales = collectedSales + pendingPaymentSales;

    // 3. Pending count (new + confirmed + packed)
    const pendingCount = await Order.countDocuments({
      status: { $in: ['new', 'confirmed', 'packed'] },
    });

    // 4. To deliver count (packed + out_for_delivery)
    const toDeliverCount = await Order.countDocuments({
      status: { $in: ['packed', 'out_for_delivery'] },
    });

    // 5. New orders count (new)
    const newOrdersCount = await Order.countDocuments({
      status: 'new',
    });

    // 6. Latest order timestamp
    const latestOrder = await Order.findOne().sort({ createdAt: -1 }).select('createdAt');
    const latestOrderTimestamp = latestOrder ? latestOrder.createdAt.toISOString() : null;

    // 7. R1: Low-stock count (active products where stockQty <= reorderLevel)
    const lowStockCount = await Product.countDocuments({
      active: true,
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
    });

    // 8. R2: Unread notifications for admin inbox (ADM-05)
    const unreadMessagesCount = await Notification.countDocuments({
      recipientRole: { $in: ['owner', 'staff', 'all_admin'] },
      readAt: null,
    });

    // 9. R4: Live Udhar total outstanding balance across all accounts (ADM-05, UDH-05)
    const udharAgg = await UdharAccount.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } },
    ]);
    const udharOutstanding = udharAgg.length > 0 ? udharAgg[0].totalBalance : 0;

    res.status(200).json({
      success: true,
      data: {
        todayOrders,
        todaySales,
        collectedSales,
        pendingPaymentSales,
        pendingCount,
        toDeliverCount,
        newOrdersCount,
        latestOrderTimestamp,
        lowStockCount,       // R1
        unreadMessagesCount, // R2 (ADM-05)
        udharOutstanding,    // R4 (ADM-05, UDH-05)
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/dashboard/check-new?since=<ISOString>
 */
const checkNewOrders = async (req, res, next) => {
  try {
    const { since } = req.query;
    const query = { status: 'new' };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    const count = await Order.countDocuments(query);
    const latest = await Order.findOne().sort({ createdAt: -1 }).select('createdAt');

    res.status(200).json({
      success: true,
      hasNew: count > 0,
      count,
      latestTimestamp: latest ? latest.createdAt.toISOString() : since || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── ORDERS MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const { status, date, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // Status filter
    if (status && status !== 'all') {
      const validStatuses = ['new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
      if (validStatuses.includes(status)) {
        filter.status = status;
      }
    }

    // Date filter in IST
    if (date && date !== 'all') {
      const { startUtc, endUtc } = getISTDayRange();
      if (date === 'today') {
        filter.createdAt = { $gte: startUtc, $lte: endUtc };
      } else if (date === 'yesterday') {
        const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yRange = getISTDayRange(yesterdayDate);
        filter.createdAt = { $gte: yRange.startUtc, $lte: yRange.endUtc };
      } else if (date === 'week') {
        const weekStart = new Date(startUtc.getTime() - 6 * 24 * 60 * 60 * 1000);
        filter.createdAt = { $gte: weekStart, $lte: endUtc };
      }
    }

    // Search filter
    if (search && typeof search === 'string') {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: safeSearch, $options: 'i' } },
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerPhone: { $regex: safeSearch, $options: 'i' } },
        { 'address.line': { $regex: safeSearch, $options: 'i' } },
        { 'address.landmark': { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: orders,
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
 * GET /api/admin/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 * Forward progression only: new -> confirmed -> packed -> out_for_delivery -> delivered
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentStatus, nextStatus, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const NEXT_STATUS = {
      new: 'confirmed',
      confirmed: 'packed',
      packed: 'out_for_delivery',
      out_for_delivery: 'delivered',
    };

    if (!currentStatus || !nextStatus || nextStatus !== NEXT_STATUS[currentStatus]) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${currentStatus}" to "${nextStatus}". Status must advance one step at a time.`,
      });
    }

    // Atomic update with status in query to prevent race conditions
    const order = await Order.findOneAndUpdate(
      { _id: id, status: currentStatus },
      {
        $set: { status: nextStatus },
        $push: {
          statusHistory: {
            status: nextStatus,
            changedAt: new Date(),
            changedBy: 'owner',
            note: typeof note === 'string' ? note.trim() : '',
          },
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Status has already changed or order was cancelled by customer.',
      });
    }

    // R2: Trigger customer inbox notification on status change (MSG-01, MSG-02)
    const STATUS_MESSAGES = {
      confirmed: {
        title: `ऑर्डर निश्चित झाली! #${order.orderNumber} / Order Confirmed`,
        body: `तुमची ऑर्डर #${order.orderNumber} निश्चित झाली आहे. आम्ही पॅक करत आहोत.`,
      },
      packed: {
        title: `ऑर्डर पॅक झाली! #${order.orderNumber} / Order Packed`,
        body: `तुमची ऑर्डर #${order.orderNumber} पॅक झाली असून डिलिव्हरीसाठी तयार आहे.`,
      },
      out_for_delivery: {
        title: `डिलिव्हरीसाठी निघाली! #${order.orderNumber} / Out for Delivery`,
        body: `तुमची ऑर्डर #${order.orderNumber} डिलिव्हरीसाठी निघाली आहे. कृपया तयार राहा.`,
      },
      delivered: {
        title: `डिलिव्हरी पूर्ण! #${order.orderNumber} / Delivered`,
        body: `तुमची ऑर्डर #${order.orderNumber} यशस्वीरित्या पोहोचवली गेली आहे. महालक्ष्मी किराणामधून खरेदी केल्याबद्दल धन्यवाद!`,
      },
    };

    if (STATUS_MESSAGES[nextStatus]) {
      createNotification({
        recipient: order.userId,
        recipientRole: 'customer',
        type: 'order_status',
        title: STATUS_MESSAGES[nextStatus].title,
        body: STATUS_MESSAGES[nextStatus].body,
        link: `/orders.html?id=${order._id}`,
        metadata: { orderId: order._id, orderNumber: order.orderNumber, status: nextStatus },
      }).catch((e) => console.warn('Customer status notify error:', e.message));
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    // Atomic update: only allow cancel if not already delivered or cancelled
    const order = await Order.findOneAndUpdate(
      { _id: id, status: { $nin: ['delivered', 'cancelled'] } },
      {
        $set: { status: 'cancelled' },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: 'owner',
            note: typeof note === 'string' ? note.trim() : 'Cancelled by store owner.',
          },
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled. It may already be delivered or cancelled.',
      });
    }

    // R1+R2: Restore stock if not already restored, and write stock logs (INV-03)
    if (!order.stockRestored) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stockQuantity: item.qty } }
        );
        const updatedProd = await Product.findById(item.productId);
        await writeStockLog({
          productId: item.productId,
          type: 'cancel',
          quantity: +item.qty,
          balanceAfter: updatedProd ? updatedProd.stockQuantity : item.qty,
          note: `Owner cancelled order ${order.orderNumber}: ${note || ''}`,
          actor: req.user ? req.user.name : 'Owner',
          actorId: req.user ? req.user._id : null,
          orderId: order._id,
        });
      }
      order.stockRestored = true;
      await order.save();
    }

    // R4: Refund Udhar balance if order was placed on credit
    if (order.paymentMethod === 'udhar') {
      const account = await UdharAccount.findOne({ customer: order.userId });
      if (account) {
        const newBal = Math.max(0, account.balance - order.total);
        account.balance = newBal;
        await account.save();
        await UdharEntry.create({
          account: account._id,
          customer: order.userId,
          type: 'adjustment',
          amount: order.total,
          balanceAfter: newBal,
          order: order._id,
          paymentMethod: 'adjustment',
          note: `Admin cancelled order ${order.orderNumber}: ${note || ''}`,
          actor: { id: req.user._id, name: req.user.name, role: req.user.role },
        });
      }
    }

    // R2: Send cancellation notification to customer
    createNotification({
      recipient: order.userId,
      recipientRole: 'customer',
      type: 'order_cancelled',
      title: `ऑर्डर रद्द करण्यात आली #${order.orderNumber} / Order Cancelled`,
      body: `दुकानदाराकडून ऑर्डर रद्द झाली. कारण: ${note || 'अपरिहार्य कारणास्तव रद्द करण्यात आली'}`,
      link: `/orders.html?id=${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber, reason: note },
    }).catch((e) => console.warn('Customer cancel notify error:', e.message));

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/orders/:id/payment
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Rule 11: Reject marking cancelled orders as paid
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark payment on a cancelled order.',
      });
    }

    order.paymentStatus = paymentStatus === 'paid' ? 'paid' : 'pending';
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/orders/packing-list
 * Combines items for selected orders (filtered strictly to new, confirmed, or packed)
 */
const getPackingList = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one order for the packing list.',
      });
    }

    const validIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid order IDs provided.' });
    }

    // Rule 3: Server-side filter strictly to new, confirmed, and packed
    const orders = await Order.find({
      _id: { $in: validIds },
      status: { $in: ['new', 'confirmed', 'packed'] },
    });

    const itemMap = new Map();

    for (const ord of orders) {
      for (const item of ord.items) {
        const key = item.productId.toString();
        if (itemMap.has(key)) {
          const existing = itemMap.get(key);
          existing.totalQty += item.qty;
          if (!existing.orderNumbers.includes(ord.orderNumber)) {
            existing.orderNumbers.push(ord.orderNumber);
          }
        } else {
          itemMap.set(key, {
            productId: item.productId,
            nameEn: item.nameEn,
            nameMr: item.nameMr,
            packSize: item.packSize,
            totalQty: item.qty,
            orderNumbers: [ord.orderNumber],
          });
        }
      }
    }

    const aggregatedItems = Array.from(itemMap.values()).sort((a, b) =>
      a.nameEn.localeCompare(b.nameEn)
    );

    res.status(200).json({
      success: true,
      data: {
        ordersCount: orders.length,
        orderNumbers: orders.map((o) => o.orderNumber),
        items: aggregatedItems,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PRODUCTS MANAGEMENT ───────────────────────────────────────────────────────

/**
 * GET /api/admin/products
 */
const getProducts = async (req, res, next) => {
  try {
    const { search, category, inStock, active } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const filter = {};

    if (active !== undefined && active !== '') {
      filter.active = active === 'true';
    }

    if (inStock !== undefined && inStock !== '') {
      filter.inStock = inStock === 'true';
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.categoryId = category;
    }

    if (search && typeof search === 'string') {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { nameEn: { $regex: safeSearch, $options: 'i' } },
        { nameMr: { $regex: safeSearch, $options: 'i' } },
        { nameHi: { $regex: safeSearch, $options: 'i' } },
        { aliases: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('categoryId', 'nameEn nameMr emoji')
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: products,
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
 * GET /api/admin/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID / अमान्य उत्पादन आयडी' });
    }
    const product = await Product.findById(id).populate('categoryId', 'nameEn nameMr emoji');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found / उत्पादन आढळले नाही' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/products
 */
const createProduct = async (req, res, next) => {
  try {
    const nameEn          = ensureString(req.body.nameEn);
    const nameMr          = ensureString(req.body.nameMr);
    const nameHi          = ensureString(req.body.nameHi) || '';
    const packSize        = ensureString(req.body.packSize);
    const categoryId      = ensureString(req.body.categoryId);
    const imageUrl        = ensureString(req.body.imageUrl) || '';
    const price           = Number(req.body.price);
    const mrp             = Number(req.body.mrp);
    const costPrice       = req.body.costPrice !== undefined && !isNaN(Number(req.body.costPrice)) && Number(req.body.costPrice) >= 0 ? Number(req.body.costPrice) : 0;
    const offerPercent    = Number(req.body.offerPercent) || 0;
    const sortOrder       = Number(req.body.sortOrder) || 0;
    const stockQuantity   = req.body.stockQuantity !== undefined && !isNaN(Number(req.body.stockQuantity)) ? Number(req.body.stockQuantity) : 0;
    const reorderLevel    = req.body.reorderLevel !== undefined && !isNaN(Number(req.body.reorderLevel)) ? Number(req.body.reorderLevel) : 5;
    const unitType        = ensureString(req.body.unitType) || 'piece';
    const unavailableFlag = Boolean(req.body.unavailableFlag) || false;
    const expiryDate      = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
    const rawKeywords     = req.body.search_keywords || req.body.aliases;
    const search_keywords = Array.isArray(rawKeywords)
      ? rawKeywords.map((a) => String(a).trim()).filter(Boolean)
      : [];
    const aliases         = Array.isArray(req.body.aliases)
      ? req.body.aliases.map((a) => String(a).trim()).filter(Boolean)
      : search_keywords;

    if (!nameEn || !nameMr || !packSize) {
      return res.status(400).json({ success: false, message: 'Name (EN/MR) and pack size are required.' });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Valid category is required.' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
    }

    if (isNaN(mrp) || mrp < price) {
      return res.status(400).json({ success: false, message: 'MRP must be greater than or equal to selling price.' });
    }

    const validUnitTypes = ['piece', 'kg', 'g', 'litre', 'ml', 'pack'];
    if (!validUnitTypes.includes(unitType)) {
      return res.status(400).json({ success: false, message: `Unit type must be one of: ${validUnitTypes.join(', ')}.` });
    }

    if (isNaN(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative number.' });
    }

    // Rule 4: Validate Cloudinary image URL
    if (imageUrl && !isValidCloudinaryUrl(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL. Images must be hosted on Cloudinary (res.cloudinary.com).',
      });
    }

    const product = await Product.create({
      nameEn,
      nameMr,
      nameHi,
      aliases,
      search_keywords: search_keywords.length ? search_keywords : aliases,
      packSize,
      unitType,
      categoryId,
      imageUrl,
      price,
      mrp,
      costPrice,
      offerPercent,
      stockQuantity,
      reorderLevel,
      unavailableFlag,
      expiryDate,
      sortOrder,
      active: true,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const nameEn          = ensureString(req.body.nameEn);
    const nameMr          = ensureString(req.body.nameMr);
    const nameHi          = ensureString(req.body.nameHi);
    const packSize        = ensureString(req.body.packSize);
    const categoryId      = ensureString(req.body.categoryId);
    const imageUrl        = ensureString(req.body.imageUrl);
    const price           = Number(req.body.price);
    const mrp             = Number(req.body.mrp);
    const offerPercent    = Number(req.body.offerPercent);
    const unitType        = ensureString(req.body.unitType);
    const aliases         = Array.isArray(req.body.aliases)
      ? req.body.aliases.map((a) => String(a).trim()).filter(Boolean)
      : undefined;

    if (!nameEn || !nameMr || !packSize) {
      return res.status(400).json({ success: false, message: 'Name (EN/MR) and pack size are required.' });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'Valid category is required.' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
    }

    if (isNaN(mrp) || mrp < price) {
      return res.status(400).json({ success: false, message: 'MRP must be greater than or equal to selling price.' });
    }

    const validUnitTypes = ['piece', 'kg', 'g', 'litre', 'ml', 'pack'];
    if (unitType && !validUnitTypes.includes(unitType)) {
      return res.status(400).json({ success: false, message: `Unit type must be one of: ${validUnitTypes.join(', ')}.` });
    }

    // Rule 4: Validate Cloudinary image URL
    if (imageUrl && !isValidCloudinaryUrl(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL. Images must be hosted on Cloudinary (res.cloudinary.com).',
      });
    }

    const updateFields = {
      nameEn,
      nameMr,
      packSize,
      categoryId,
      price,
      mrp,
      sortOrder: Number(req.body.sortOrder) || 0,
    };

    if (nameHi   !== null)   updateFields.nameHi   = nameHi || '';
    if (aliases !== undefined) updateFields.aliases = aliases;
    if (req.body.search_keywords !== undefined) {
      updateFields.search_keywords = Array.isArray(req.body.search_keywords)
        ? req.body.search_keywords.map((a) => String(a).trim()).filter(Boolean)
        : [];
    } else if (aliases !== undefined) {
      updateFields.search_keywords = aliases;
    }
    if (unitType)              updateFields.unitType = unitType;
    if (!isNaN(offerPercent))  updateFields.offerPercent = Math.max(0, Math.min(100, offerPercent));
    if (req.body.costPrice !== undefined && !isNaN(Number(req.body.costPrice)) && Number(req.body.costPrice) >= 0) {
      updateFields.costPrice = Number(req.body.costPrice);
    }
    if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
    if (req.body.active    !== undefined) updateFields.active    = Boolean(req.body.active);
    if (req.body.unavailableFlag !== undefined) updateFields.unavailableFlag = Boolean(req.body.unavailableFlag);
    // Note: stockQuantity is NOT updated here — use /api/inventory/stock-in or /adjust
    if (req.body.reorderLevel !== undefined) {
      const rl = Number(req.body.reorderLevel);
      if (!isNaN(rl) && rl >= 0) updateFields.reorderLevel = rl;
    }
    if (req.body.expiryDate !== undefined) {
      updateFields.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
    }

    const product = await Product.findByIdAndUpdate(id, updateFields, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/products/:id/toggle-stock
 * R1: toggles unavailableFlag instead of a boolean inStock field.
 * This is the "temporarily unavailable" override (INV-09).
 */
const toggleStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Toggle or explicitly set unavailableFlag (idempotent when parameter is provided)
    let newFlag;
    if (req.body.unavailableFlag !== undefined) {
      newFlag = Boolean(req.body.unavailableFlag);
    } else if (req.body.inStock !== undefined) {
      newFlag = !Boolean(req.body.inStock);
    } else {
      newFlag = !product.unavailableFlag;
    }

    product.unavailableFlag = newFlag;
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/products/:id - Soft delete (active: false)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    // Soft delete: never remove document
    const product = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Product archived successfully.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

// ─── CATEGORIES MANAGEMENT ─────────────────────────────────────────────────────

/**
 * GET /api/admin/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, nameEn: 1 });

    // Attach product count to each category
    const catCounts = await Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(catCounts.map((c) => [c._id.toString(), c.count]));

    const result = categories.map((cat) => ({
      ...cat.toObject(),
      productCount: countMap.get(cat._id.toString()) || 0,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const nameEn = ensureString(req.body.nameEn);
    const nameMr = ensureString(req.body.nameMr);
    const emoji = ensureString(req.body.emoji) || '🛒';
    const sortOrder = Number(req.body.sortOrder) || 0;
    const active = req.body.active !== false;

    if (!nameEn || !nameMr) {
      return res.status(400).json({ success: false, message: 'English and Marathi category names are required.' });
    }

    // Guard against duplicate category names (case-insensitive)
    const existing = await Category.findOne({
      nameEn: new RegExp('^' + nameEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `A category named "${nameEn}" already exists.` });
    }

    const iconKey = req.body.iconKey ? String(req.body.iconKey).trim() : null;
    const category = await Category.create({ nameEn, nameMr, emoji, iconKey, sortOrder, active });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }
    next(err);
  }
};

/**
 * PUT /api/admin/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }

    const nameEn = ensureString(req.body.nameEn);
    const nameMr = ensureString(req.body.nameMr);
    const emoji = ensureString(req.body.emoji) || '🛒';
    const sortOrder = Number(req.body.sortOrder) || 0;

    if (!nameEn || !nameMr) {
      return res.status(400).json({ success: false, message: 'English and Marathi category names are required.' });
    }

    // Guard against duplicate category names when renaming
    const existing = await Category.findOne({
      _id: { $ne: id },
      nameEn: new RegExp('^' + nameEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `A category named "${nameEn}" already exists.` });
    }

    const updateFields = { nameEn, nameMr, emoji, sortOrder };
    if (req.body.iconKey !== undefined) updateFields.iconKey = req.body.iconKey ? String(req.body.iconKey).trim() : null;
    if (req.body.active !== undefined) updateFields.active = Boolean(req.body.active);

    const category = await Category.findByIdAndUpdate(id, updateFields, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }
    next(err);
  }
};

/**
 * PATCH /api/admin/categories/:id/toggle-active
 */
const toggleCategoryActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    category.active = !category.active;
    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }

    const productCount = await Product.countDocuments({ categoryId: id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `या वर्गामध्ये ${productCount} उत्पादने आहेत, म्हणून हा वर्ग हटवता येणार नाही. आधी उत्पादने दुसऱ्या वर्गात हलवा.\nCannot delete category containing ${productCount} products. Reassign them first.`,
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── SETTINGS MANAGEMENT ───────────────────────────────────────────────────────

/**
 * GET /api/admin/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const minOrder = Number(req.body.minOrder);
    const deliveryCharge = Number(req.body.deliveryCharge);
    const freeDeliveryAbove = Number(req.body.freeDeliveryAbove);
    const storeHours = ensureString(req.body.storeHours);
    const upiMobile = ensureString(req.body.upiMobile);
    const storeWhatsapp = ensureString(req.body.storeWhatsapp);
    const upiQrImage = ensureString(req.body.upiQrImage);
    const rawPincodes = req.body.servicePincodes;
    const rawSlots = req.body.slots;

    // Rule 13: Numeric validations
    if (isNaN(minOrder) || minOrder < 0) {
      return res.status(400).json({ success: false, message: 'Minimum order amount must be a number >= 0.' });
    }
    if (isNaN(deliveryCharge) || deliveryCharge < 0) {
      return res.status(400).json({ success: false, message: 'Delivery charge must be a number >= 0.' });
    }
    if (isNaN(freeDeliveryAbove) || freeDeliveryAbove < 0) {
      return res.status(400).json({ success: false, message: 'Free delivery threshold must be a number >= 0.' });
    }

    // Pincodes validation (non-empty array, 6 digits each)
    if (!Array.isArray(rawPincodes) || rawPincodes.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one serviceable pincode is required.' });
    }
    const cleanPincodes = [];
    for (const pin of rawPincodes) {
      const p = String(pin).trim();
      if (!/^\d{6}$/.test(p)) {
        return res.status(400).json({ success: false, message: `Invalid pincode "${p}". Must be exactly 6 digits.` });
      }
      cleanPincodes.push(p);
    }

    // Slots validation (non-empty array)
    if (!Array.isArray(rawSlots) || rawSlots.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one delivery slot is required.' });
    }
    const cleanSlots = rawSlots.map((s) => String(s).trim()).filter(Boolean);
    if (cleanSlots.length === 0) {
      return res.status(400).json({ success: false, message: 'Slots array cannot contain empty strings.' });
    }

    // upiMobile validation (10 digits)
    if (!upiMobile || !/^\d{10}$/.test(upiMobile.replace(/[^0-9]/g, '').slice(-10))) {
      return res.status(400).json({ success: false, message: 'UPI Mobile number must be a valid 10-digit phone number.' });
    }

    // storeWhatsapp validation
    const cleanWhatsapp = (storeWhatsapp || '').replace(/[^0-9]/g, '');
    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      return res.status(400).json({ success: false, message: 'Store WhatsApp number must be at least 10 digits.' });
    }

    // upiQrImage validation (Cloudinary or default placeholder)
    if (upiQrImage && !upiQrImage.startsWith('/images/') && !isValidCloudinaryUrl(upiQrImage)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI QR image URL. Must be hosted on Cloudinary or be a valid static image path.',
      });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    const beforeState = {
      minOrder: settings.minOrder,
      deliveryCharge: settings.deliveryCharge,
      freeDeliveryAbove: settings.freeDeliveryAbove,
      isStoreOpen: settings.isStoreOpen,
    };

    settings.minOrder = minOrder;
    settings.deliveryCharge = deliveryCharge;
    settings.freeDeliveryAbove = freeDeliveryAbove;
    settings.servicePincodes = cleanPincodes;
    settings.slots = cleanSlots;
    if (storeHours) settings.storeHours = storeHours;
    settings.upiMobile = upiMobile.replace(/[^0-9]/g, '').slice(-10);
    if (req.body.upiId) settings.upiId = String(req.body.upiId).trim();
    settings.storeWhatsapp = cleanWhatsapp;
    if (upiQrImage) settings.upiQrImage = upiQrImage;

    if (typeof req.body.isStoreOpen === 'boolean') {
      settings.isStoreOpen = req.body.isStoreOpen;
    }
    if (req.body.closureReason !== undefined) {
      settings.closureReason = String(req.body.closureReason).trim();
    }
    if (req.body.reopenAt !== undefined) {
      settings.reopenAt = req.body.reopenAt ? new Date(req.body.reopenAt) : null;
    }
    if (req.body.slotCapacity && typeof req.body.slotCapacity === 'object') {
      settings.slotCapacity = req.body.slotCapacity;
    }

    await settings.save();

    // Log to AuditLog (Rule ADM-02)
    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'store_settings_updated',
      target: { collection: 'Settings', id: settings._id, name: 'Store Settings' },
      before: beforeState,
      after: {
        minOrder: settings.minOrder,
        deliveryCharge: settings.deliveryCharge,
        freeDeliveryAbove: settings.freeDeliveryAbove,
        isStoreOpen: settings.isStoreOpen,
      },
      note: 'Updated store rules, delivery thresholds or operating status',
    });

    res.status(200).json({ success: true, data: settings, message: 'Settings saved successfully!' });
  } catch (err) {
    next(err);
  }
};

// ─── CUSTOMERS MANAGEMENT ──────────────────────────────────────────────────────

/**
 * GET /api/admin/customers
 * Supports search, pagination, segment filters, and lifetime metrics.
 */
const getCustomers = async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const segment = typeof req.query.segment === 'string' ? req.query.segment.trim() : '';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: 'customer' };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (segment === 'blocked') {
      filter.blocked = true;
    } else if (segment === 'new') {
      filter.createdAt = { $gte: thirtyDaysAgo };
    } else if (segment === 'udhar') {
      const udharCusts = await UdharAccount.distinct('customer', { status: { $in: ['active', 'pending'] } });
      filter._id = { $in: udharCusts };
    } else if (segment === 'regular') {
      const regularCusts = await Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
      ]);
      filter._id = { $in: regularCusts.map((r) => r._id) };
    } else if (segment === 'dormant') {
      const activeRecentCusts = await Order.distinct('userId', {
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: 'cancelled' },
      });
      filter._id = { $nin: activeRecentCusts };
    }

    const [total, customers] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const customerIds = customers.map((c) => c._id);

    // Aggregate lifetime stats from non-cancelled orders
    const orderStats = await Order.aggregate([
      { $match: { userId: { $in: customerIds }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          lifetimeSpend: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);
    const statsMap = new Map(orderStats.map((s) => [s._id.toString(), s]));

    // Fetch active udhar accounts if any
    const udharAccounts = await UdharAccount.find({ customer: { $in: customerIds } }).lean();
    const udharMap = new Map(udharAccounts.map((u) => [u.customer.toString(), u]));

    // Fetch latest addresses
    const latestOrders = await Order.find({ userId: { $in: customerIds } })
      .sort({ createdAt: -1 })
      .select('userId address')
      .lean();
    const addressMap = new Map();
    latestOrders.forEach((o) => {
      const uid = o.userId.toString();
      if (!addressMap.has(uid) && o.address) {
        addressMap.set(uid, o.address);
      }
    });

    const result = customers.map((c) => {
      const cid = c._id.toString();
      const st = statsMap.get(cid) || { orderCount: 0, lifetimeSpend: 0, lastOrderDate: null };
      const udhar = udharMap.get(cid) || null;
      const addr = addressMap.get(cid) || null;
      return {
        ...c,
        orderCount: st.orderCount,
        lifetimeSpend: st.lifetimeSpend,
        lastOrderDate: st.lastOrderDate,
        address: addr,
        village: addr?.line || 'Yesgaon',
        udharAccount: udhar ? { balance: udhar.balance, creditLimit: udhar.creditLimit, status: udhar.status } : null,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/customers/:id/orders
 * Returns recent order history, favorite items, and addresses for customer profile drawer.
 */
const getCustomerOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID.' });
    }

    const [orders, udharAccount] = await Promise.all([
      Order.find({ userId: id }).sort({ createdAt: -1 }).limit(30).lean(),
      UdharAccount.findOne({ customer: id }).lean(),
    ]);

    const itemMap = new Map();
    const addresses = [];
    const addressKeys = new Set();

    orders.forEach((o) => {
      if (o.address && o.address.line) {
        const key = `${o.address.line}|${o.address.pincode}`;
        if (!addressKeys.has(key)) {
          addressKeys.add(key);
          addresses.push(o.address);
        }
      }
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const pid = (it.productId || it.nameEn || 'item').toString();
          const prev = itemMap.get(pid) || {
            nameEn: it.nameEn,
            nameMr: it.nameMr,
            count: 0,
            packSize: it.packSize,
            price: it.price,
          };
          prev.count += it.quantity || 1;
          itemMap.set(pid, prev);
        });
      }
    });

    const favoriteItems = Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        orders,
        favoriteItems,
        addresses,
        udharAccount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/customers/:id/block
 */
const toggleBlockCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID.' });
    }

    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Safety guard: cannot block owner
    if (user.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot block store owner account.' });
    }

    user.blocked = req.body.blocked !== undefined ? Boolean(req.body.blocked) : !user.blocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Customer ${user.blocked ? 'blocked' : 'unblocked'} successfully.`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ─── IMAGE UPLOAD (CLOUDINARY) ─────────────────────────────────────────────────

/**
 * POST /api/admin/upload
 */
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file received.' });
    }

    const hasUrl = Boolean(process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.includes('replace_with'));
    const cloudName = cleanCloudinaryVar(process.env.CLOUDINARY_CLOUD_NAME);
    const apiKey = cleanCloudinaryVar(process.env.CLOUDINARY_API_KEY);
    const apiSecret = cleanCloudinaryVar(process.env.CLOUDINARY_API_SECRET);

    const isConfigured = hasUrl || (
      cloudName &&
      apiKey &&
      apiSecret &&
      !cloudName.includes('replace_with') &&
      !apiKey.includes('replace_with') &&
      !apiSecret.includes('replace_with')
    );

    if (!isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'Image upload failed. Cloudinary credentials are not configured in server .env.',
      });
    }

    // Stream buffer directly to Cloudinary with transformation (Rule 6)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mahalaxmi_kirana',
        allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
        // Playbook 2.1: resize to max 800px, convert to WebP for mobile perf
        transformation: [{ width: 800, crop: 'limit', quality: 'auto', fetch_format: 'webp' }],
        format: 'webp',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error.message);
          return res.status(400).json({
            success: false,
            message: error.message ? `Image upload failed: ${error.message}` : 'Image upload failed. Please verify Cloudinary credentials.',
          });
        }
        res.status(200).json({
          success: true,
          url: result.secure_url,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.on('error', (streamErr) => {
      console.error('Cloudinary stream error:', streamErr.message);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          message: streamErr.message ? `Image upload stream error: ${streamErr.message}` : 'Image upload stream failed.',
        });
      }
    });

    uploadStream.end(req.file.buffer);
  } catch (err) {
    next(err);
  }
};

// ─── R4: STAFF MANAGEMENT (ADM-01) ────────────────────────────────────────────

/**
 * GET /api/admin/staff
 */
const getStaff = async (_req, res, next) => {
  try {
    const staffMembers = await User.find({ role: 'staff' })
      .select('_id name phone preferredLanguage blocked permissions createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: staffMembers });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/staff
 * Owner creates a staff account (ADM-01)
 */
const createStaff = async (req, res, next) => {
  try {
    const rawName = ensureString(req.body.name);
    const rawPhone = ensureString(req.body.phone);
    const rawPassword = ensureString(req.body.password);
    const rawLang = ['mr', 'hi', 'en'].includes(req.body.preferredLanguage) ? req.body.preferredLanguage : 'mr';
    const permissions = Array.isArray(req.body.permissions)
      ? req.body.permissions
      : ['orders_view', 'orders_status', 'stock_manage'];

    if (!rawName || rawName.length < 2 || rawName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters.' });
    }

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    if (!rawPassword || rawPassword.length < 6 || rawPassword.length > 100) {
      return res.status(400).json({ success: false, message: 'Password must be between 6 and 100 characters.' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user account with this mobile number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const staffUser = await User.create({
      name: rawName,
      phone,
      passwordHash,
      role: 'staff',
      preferredLanguage: rawLang,
      permissions,
    });

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'staff_created',
      target: { collection: 'User', id: staffUser._id, name: staffUser.name },
      note: `Owner created staff account for ${staffUser.name} (${staffUser.phone}) with permissions: [${permissions.join(', ')}]`,
    });

    res.status(201).json({
      success: true,
      message: `Staff account created successfully for ${staffUser.name}.`,
      data: {
        _id: staffUser._id,
        name: staffUser.name,
        phone: staffUser.phone,
        role: staffUser.role,
        permissions: staffUser.permissions,
        preferredLanguage: staffUser.preferredLanguage,
        createdAt: staffUser.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/staff/:id/permissions
 */
const updateStaffPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID.' });
    }

    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions array is required.' });
    }

    const staffUser = await User.findOne({ _id: id, role: 'staff' });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const beforePerms = staffUser.permissions || [];
    staffUser.permissions = permissions;
    await staffUser.save();

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'staff_permissions_updated',
      target: { collection: 'User', id: staffUser._id, name: staffUser.name },
      before: { permissions: beforePerms },
      after: { permissions },
      note: `Updated permissions for staff ${staffUser.name}: [${permissions.join(', ')}]`,
    });

    res.status(200).json({
      success: true,
      message: `Permissions updated for ${staffUser.name}.`,
      data: staffUser,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/staff/:id
 */
const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID.' });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'owner') {
      const ownerCount = await User.countDocuments({ role: 'owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last store owner account.' });
      }
    }

    await User.findByIdAndDelete(id);

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'staff_deleted',
      target: { collection: 'User', id: targetUser._id, name: targetUser.name },
      note: `Owner removed ${targetUser.role} account ${targetUser.name} (${targetUser.phone})`,
    });

    res.status(200).json({ success: true, message: `Account for ${targetUser.name} removed successfully.` });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/staff/:id/toggle-block
 */
const toggleStaffBlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID.' });
    }

    const staffUser = await User.findOne({ _id: id, role: 'staff' });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    staffUser.blocked = !staffUser.blocked;
    await staffUser.save();

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: staffUser.blocked ? 'staff_blocked' : 'staff_unblocked',
      target: { collection: 'User', id: staffUser._id, name: staffUser.name },
      note: `Staff ${staffUser.name} is now ${staffUser.blocked ? 'blocked' : 'active'}`,
    });

    res.status(200).json({
      success: true,
      message: `Staff member is now ${staffUser.blocked ? 'blocked' : 'active'}.`,
      data: staffUser,
    });
  } catch (err) {
    next(err);
  }
};

// ─── R4: AUDIT LOG VIEWER (ADM-02) ───────────────────────────────────────────

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.actor) {
      filter['actor.name'] = { $regex: req.query.actor.trim(), $options: 'i' };
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── R4: COMPREHENSIVE REPORTS & ANALYTICS (ADM-03) ──────────────────────────

/**
 * GET /api/admin/reports
 */
const getReports = async (req, res, next) => {
  try {
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    if (isNaN(startDate.getTime())) startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (isNaN(endDate.getTime())) endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const matchDate = { createdAt: { $gte: startDate, $lte: endDate } };

    // 1. Order status metrics
    const ordersAgg = await Order.aggregate([
      { $match: matchDate },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalGross: { $sum: '$total' },
          subtotal: { $sum: '$subtotal' },
          deliveryFees: { $sum: '$deliveryCharge' },
        },
      },
    ]);

    let totalOrders = 0;
    let grossRevenue = 0;
    let netRevenue = 0;
    let totalDeliveryFees = 0;
    const statusCounts = {};

    ordersAgg.forEach((group) => {
      totalOrders += group.count;
      grossRevenue += group.totalGross;
      statusCounts[group._id] = group.count;
      if (group._id !== 'cancelled') {
        netRevenue += group.totalGross;
        totalDeliveryFees += group.deliveryFees;
      }
    });

    // 2. Payment method breakdown
    const paymentAgg = await Order.aggregate([
      { $match: { ...matchDate, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]);

    const paymentSplit = {
      cod: { count: 0, amount: 0 },
      upi_qr: { count: 0, amount: 0 },
      udhar: { count: 0, amount: 0 },
    };
    paymentAgg.forEach((p) => {
      if (paymentSplit[p._id]) {
        paymentSplit[p._id] = { count: p.count, amount: p.totalAmount };
      }
    });

    // 3. Channel breakdown (Website vs AI Box)
    const channelAgg = await Order.aggregate([
      { $match: { ...matchDate, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
          amount: { $sum: '$total' },
        },
      },
    ]);
    const channelSplit = {
      website: 0,
      ai_box: 0,
    };
    channelAgg.forEach((c) => {
      channelSplit[c._id || 'website'] = c.count;
    });

    // 4. Sales by Slot
    const slotAgg = await Order.aggregate([
      { $match: { ...matchDate, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $ifNull: ['$deliverySlot', '$slot'] },
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    const slotBreakdown = slotAgg.map((s) => ({
      slot: s._id || 'Standard Delivery',
      count: s.count,
      revenue: s.revenue,
    }));

    // 5. Daily timeline breakdown (IST) for real SVG line charts
    const dailyAgg = await Order.aggregate([
      { $match: { ...matchDate, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const dailyStats = dailyAgg.map((d) => ({
      date: d._id,
      revenue: d.revenue,
      orders: d.orders,
    }));

    // 6. Real Profit Math: Sold COGS, Gross Profit & Margins via Product.costPrice
    const soldItemsAgg = await Order.aggregate([
      { $match: { ...matchDate, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      {
        $project: {
          qty: '$items.qty',
          price: '$items.price',
          costPrice: { $ifNull: [{ $arrayElemAt: ['$productDoc.costPrice', 0] }, 0] },
          category: { $ifNull: [{ $arrayElemAt: ['$productDoc.category', 0] }, 'General'] },
          nameEn: '$items.nameEn',
          nameMr: '$items.nameMr',
        },
      },
    ]);

    let totalCogs = 0;
    let missingCostItemsCount = 0;
    const categoryProfitMap = new Map();

    soldItemsAgg.forEach((it) => {
      const revenue = it.qty * it.price;
      const cost = it.qty * it.costPrice;
      totalCogs += cost;
      if (!it.costPrice || it.costPrice === 0) missingCostItemsCount++;

      const catKey = it.category.toString();
      const prev = categoryProfitMap.get(catKey) || { category: catKey, revenue: 0, cost: 0, units: 0 };
      prev.revenue += revenue;
      prev.cost += cost;
      prev.units += it.qty;
      categoryProfitMap.set(catKey, prev);
    });

    const grossProfit = Math.max(0, netRevenue - totalCogs);
    const grossMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0;

    const categoryBreakdown = Array.from(categoryProfitMap.values()).map((cp) => ({
      ...cp,
      profit: Math.max(0, cp.revenue - cp.cost),
      marginPercent: cp.revenue > 0 ? Math.round(((cp.revenue - cp.cost) / cp.revenue) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // 7. Top 10 selling products
    const topProductsAgg = await Order.aggregate([
      { $match: { ...matchDate, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          nameEn: { $first: '$items.nameEn' },
          nameMr: { $first: '$items.nameMr' },
          totalUnits: { $sum: '$items.qty' },
          totalRevenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
        },
      },
      { $sort: { totalUnits: -1 } },
      { $limit: 10 },
    ]);

    // 8. Slow-moving products
    const soldProductIds = await Order.distinct('items.productId', {
      ...matchDate,
      status: { $ne: 'cancelled' },
    });
    const slowProducts = await Product.find({
      _id: { $nin: soldProductIds },
      active: true,
    })
      .select('nameEn nameMr stockQuantity price packSize')
      .limit(10)
      .lean();

    // 9. Current warehouse stock inventory valuation (at real cost)
    const stockValuationAgg = await Product.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: null,
          totalStockUnits: { $sum: '$stockQuantity' },
          totalCostValuation: { $sum: { $multiply: ['$stockQuantity', { $ifNull: ['$costPrice', 0] }] } },
          totalSellingValuation: { $sum: { $multiply: ['$stockQuantity', '$price'] } },
          totalMrpValuation: { $sum: { $multiply: ['$stockQuantity', '$mrp'] } },
          missingCostCount: {
            $sum: {
              $cond: [{ $or: [{ $eq: ['$costPrice', null] }, { $eq: ['$costPrice', 0] }] }, 1, 0],
            },
          },
        },
      },
    ]);
    const stockValuation = stockValuationAgg.length > 0 ? stockValuationAgg[0] : {
      totalStockUnits: 0,
      totalCostValuation: 0,
      totalSellingValuation: 0,
      totalMrpValuation: 0,
      missingCostCount: 0,
    };

    // 10. Udhar Aging
    const udharAccounts = await UdharAccount.find({ status: { $in: ['active', 'paused'] }, balance: { $gt: 0 } }).lean();
    let agingUnder30 = 0;
    let aging30to60 = 0;
    let agingOver60 = 0;
    const nowTs = Date.now();
    udharAccounts.forEach((u) => {
      const ageDays = (nowTs - new Date(u.updatedAt || u.createdAt).getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays <= 30) agingUnder30 += (u.balance || 0);
      else if (ageDays <= 60) aging30to60 += (u.balance || 0);
      else agingOver60 += (u.balance || 0);
    });

    // 11. Comparison with previous period
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - durationMs);
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevOrdersAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    const prevRevenue = prevOrdersAgg.length > 0 ? prevOrdersAgg[0].revenue : 0;
    const prevOrders = prevOrdersAgg.length > 0 ? prevOrdersAgg[0].count : 0;
    const revenueGrowthPercent = prevRevenue > 0 ? Math.round(((netRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const ordersGrowthPercent = prevOrders > 0 ? Math.round(((totalOrders - prevOrders) / prevOrders) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        totalOrders,
        netRevenue,
        grossRevenue,
        totalDeliveryFees,
        averageOrderValue: totalOrders > 0 ? Math.round(netRevenue / Math.max(1, totalOrders - (statusCounts.cancelled || 0))) : 0,
        statusCounts,
        paymentSplit,
        channelSplit,
        slotBreakdown,
        dailyStats,
        profitMetrics: {
          grossProfit,
          totalCogs,
          grossMarginPercent,
          missingCostItemsCount,
          categoryBreakdown,
        },
        udharAging: {
          totalOutstanding: agingUnder30 + aging30to60 + agingOver60,
          under30Days: agingUnder30,
          between30and60Days: aging30to60,
          over60Days: agingOver60,
        },
        comparison: {
          prevRevenue,
          prevOrders,
          revenueGrowthPercent,
          ordersGrowthPercent,
        },
        topProducts: topProductsAgg,
        slowProducts,
        inventoryValuation: {
          totalStockUnits: stockValuation.totalStockUnits,
          costValuation: stockValuation.totalCostValuation,
          sellingValuation: stockValuation.totalSellingValuation,
          mrpValuation: stockValuation.totalMrpValuation,
          potentialMargin: Math.max(0, stockValuation.totalSellingValuation - stockValuation.totalCostValuation),
          customerSavings: Math.max(0, stockValuation.totalMrpValuation - stockValuation.totalSellingValuation),
          missingCostCount: stockValuation.missingCostCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/reports/daily-settlement (WA-04)
 */
const getDailySettlement = async (_req, res, next) => {
  try {
    const { startUtc, endUtc } = getISTDayRange();

    const orders = await Order.find({
      createdAt: { $gte: startUtc, $lte: endUtc },
    }).lean();

    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let udharSales = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    orders.forEach((o) => {
      if (o.status === 'cancelled') {
        cancelledCount++;
        return;
      }
      if (o.status === 'delivered') deliveredCount++;
      else pendingCount++;

      totalSales += o.total;
      if (o.paymentMethod === 'cod') cashSales += o.total;
      else if (o.paymentMethod === 'upi_qr') upiSales += o.total;
      else if (o.paymentMethod === 'udhar') udharSales += o.total;
    });

    const dateStr = new Date().toLocaleDateString('mr-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const waSummary = `🏪 *महालक्ष्मी किराणा स्टोअर्स — दैनिक हिशोब (${dateStr})*\n\n` +
      `📦 एकूण ऑर्डर्स: ${orders.length}\n` +
      `✅ पूर्ण डिलीव्हरी: ${deliveredCount}\n` +
      `⏳ चालू / प्रलंबित: ${pendingCount}\n` +
      `❌ रद्द ऑर्डर्स: ${cancelledCount}\n\n` +
      `💰 *एकूण विक्री: ₹${totalSales}*\n` +
      `💵 रोख (Cash): ₹${cashSales}\n` +
      `📱 UPI: ₹${upiSales}\n` +
      `📝 उधारी (Udhar): ₹${udharSales}\n\n` +
      `— किरण गायकवाड (येसगाव, कोपरगाव)`;

    res.status(200).json({
      success: true,
      data: {
        date: dateStr,
        orderCount: orders.length,
        deliveredCount,
        pendingCount,
        cancelledCount,
        totalSales,
        cashSales,
        upiSales,
        udharSales,
        waSummary,
        waUrl: `https://wa.me/919860924504?text=${encodeURIComponent(waSummary)}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── R4: CSV EXPORTS (ADM-04) ─────────────────────────────────────────────────

/**
 * GET /api/admin/export/orders.csv
 */
const exportOrdersCsv = async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mahalaxmi-orders.csv"');

    let csv = '\uFEFFOrder Number,Date,Customer Name,Phone,Address,Payment Method,Channel,Status,Subtotal,Delivery,Total\n';
    orders.forEach((o) => {
      const dt = new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/,/g, '');
      const addr = (o.address ? `${o.address.line} ${o.address.landmark || ''} ${o.address.pincode}` : '').replace(/,/g, ' ');
      csv += `"${o.orderNumber}","${dt}","${o.customerName || ''}","${o.customerPhone || ''}","${addr}","${o.paymentMethod}","${o.channel || 'website'}","${o.status}",${o.subtotal},${o.deliveryCharge},${o.total}\n`;
    });

    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/export/stock-log.csv
 */
const exportStockLogsCsv = async (_req, res, next) => {
  try {
    const logs = await StockLog.find()
      .populate('product', 'nameEn nameMr packSize')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mahalaxmi-stock-log.csv"');

    let csv = '\uFEFFDate,Product English,Product Marathi,Pack Size,Type,Quantity Change,Balance After,Actor,Note\n';
    logs.forEach((l) => {
      const dt = new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/,/g, '');
      const pEn = l.product ? l.product.nameEn : 'Unknown';
      const pMr = l.product ? l.product.nameMr : '';
      const pPack = l.product ? l.product.packSize : '';
      const note = (l.note || '').replace(/,/g, ' ');
      csv += `"${dt}","${pEn}","${pMr}","${pPack}","${l.type}",${l.quantity},${l.balanceAfter},"${l.actor}","${note}"\n`;
    });

    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/export/udhar-ledger.csv
 */
const exportUdharLedgerCsv = async (_req, res, next) => {
  try {
    const entries = await UdharEntry.find()
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mahalaxmi-udhar-ledger.csv"');

    let csv = '\uFEFFDate,Customer Name,Phone,Transaction Type,Amount,Balance After,Payment Method,Actor,Note\n';
    entries.forEach((e) => {
      const dt = new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/,/g, '');
      const cName = e.customer ? e.customer.name : 'Unknown';
      const cPhone = e.customer ? e.customer.phone : '';
      const note = (e.note || '').replace(/,/g, ' ');
      const actorName = e.actor ? e.actor.name : 'System';
      csv += `"${dt}","${cName}","${cPhone}","${e.type}",${e.amount},${e.balanceAfter},"${e.paymentMethod}","${actorName}","${note}"\n`;
    });

    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

// ─── R4: AI MISS ALIAS EXPANSION (AI-08) ──────────────────────────────────────

/**
 * POST /api/admin/ai/add-alias
 * Add unmatched customer search phrase directly as alias to a product
 */
const addAliasFromAiMiss = async (req, res, next) => {
  try {
    const { productId, aliasPhrase } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    if (!aliasPhrase || typeof aliasPhrase !== 'string' || !aliasPhrase.trim()) {
      return res.status(400).json({ success: false, message: 'Alias phrase is required.' });
    }

    const cleanAlias = aliasPhrase.trim().toLowerCase();
    const product = await Product.findByIdAndUpdate(
      productId,
      { $addToSet: { aliases: cleanAlias } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'product_alias_added',
      target: { collection: 'Product', id: product._id, name: product.nameEn },
      note: `Added alias "${cleanAlias}" to ${product.nameEn} (${product.nameMr})`,
    });

    res.status(200).json({
      success: true,
      message: `Alias "${cleanAlias}" successfully added to ${product.nameEn}!`,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/ai/ignore-miss
 * Ignore / remove a missed phrase from the AI misses log
 */
const ignoreAiMiss = async (req, res, next) => {
  try {
    const { phrase } = req.body;
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({ success: false, message: 'Phrase is required.' });
    }

    const cleanPhrase = phrase.trim().toLowerCase();
    const AiLog = require('../models/AiLog');
    await AiLog.updateMany(
      { unmatchedPhrases: { $regex: new RegExp(`^${cleanPhrase}$`, 'i') } },
      { $pull: { unmatchedPhrases: { $regex: new RegExp(`^${cleanPhrase}$`, 'i') } } }
    );

    res.status(200).json({
      success: true,
      message: `Phrase "${cleanPhrase}" ignored from AI misses.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/orders/:id/substitutions/propose
 * Propose replacement of an unavailable item in a new/confirmed order.
 * R5 (ORD-06, MSG-06)
 */
const proposeSubstitution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { originalProductId, proposedProductId, proposedQty, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(originalProductId) || !mongoose.Types.ObjectId.isValid(proposedProductId)) {
      return res.status(400).json({ success: false, message: 'Invalid order, original product, or proposed product ID.' });
    }

    const qty = parseFloat(proposedQty);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Proposed quantity must be a positive number.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!['new', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Substitutions can only be proposed while order is new or confirmed.',
      });
    }

    const originalItem = order.items.find((it) => it.productId.toString() === originalProductId.toString());
    if (!originalItem) {
      return res.status(400).json({ success: false, message: 'Original item not found in order items.' });
    }

    const proposedProduct = await Product.findById(proposedProductId);
    if (!proposedProduct || !proposedProduct.active) {
      return res.status(400).json({ success: false, message: 'Proposed replacement product is inactive or not found.' });
    }

    if (proposedProduct.stockQuantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Proposed product only has ${proposedProduct.stockQuantity} in stock. Cannot propose ${qty}.`,
      });
    }

    const priceDiff = (proposedProduct.price * qty) - (originalItem.price * originalItem.qty);

    order.substitutions.push({
      originalProductId: originalItem.productId,
      originalNameEn: originalItem.nameEn,
      originalNameMr: originalItem.nameMr,
      originalPackSize: originalItem.packSize,
      originalPrice: originalItem.price,
      originalQty: originalItem.qty,
      proposedProductId: proposedProduct._id,
      proposedNameEn: proposedProduct.nameEn,
      proposedNameMr: proposedProduct.nameMr,
      proposedPackSize: proposedProduct.packSize,
      proposedPrice: proposedProduct.price,
      proposedQty: qty,
      priceDiff,
      status: 'pending',
      proposedAt: new Date(),
      note: typeof note === 'string' ? note.trim() : '',
    });

    await order.save();

    // Log in AuditLog
    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'order_substitution_proposed',
      target: { collection: 'Order', id: order._id, name: order.orderNumber },
      note: `Proposed ${proposedProduct.nameEn} (${qty}) to replace ${originalItem.nameEn} (${originalItem.qty}). Price diff: ₹${priceDiff}`,
    });

    // Notify customer in-app inbox
    createNotification({
      recipient: order.userId,
      recipientRole: 'customer',
      type: 'order_status',
      title: `वस्तू बदल पर्याय! #${order.orderNumber} / Item Substitution`,
      body: `ऑर्डर #${order.orderNumber} मधील "${originalItem.nameMr || originalItem.nameEn}" ऐवजी "${proposedProduct.nameMr || proposedProduct.nameEn}" सुचवले आहे (फरक: ${priceDiff >= 0 ? '+' : ''}₹${priceDiff}). कृपया तपासा.`,
      link: `/orders.html`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    }).catch((e) => console.warn('Customer sub notify error:', e.message));

    res.status(200).json({
      success: true,
      message: 'Substitution proposed to customer successfully.',
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/backup/export
 * Owner-only: Dumps full store database to a downloadable JSON snapshot.
 * R6 (SYS-01, SYS-02)
 */
const exportBackup = async (req, res, next) => {
  try {
    const Category = require('../models/Category');
    const StockLog = require('../models/StockLog');
    const Settings = require('../models/Settings');

    const [
      products,
      categories,
      orders,
      users,
      udharAccounts,
      udharEntries,
      stockLogs,
      notifications,
      auditLogs,
      settings,
    ] = await Promise.all([
      Product.find({}).lean(),
      Category.find({}).lean(),
      Order.find({}).lean(),
      User.find({}, '-password').lean(),
      UdharAccount.find({}).lean(),
      UdharEntry.find({}).lean(),
      StockLog.find({}).sort({ createdAt: -1 }).limit(5000).lean(),
      Notification.find({}).sort({ createdAt: -1 }).limit(2000).lean(),
      AuditLog.find({}).sort({ createdAt: -1 }).limit(2000).lean(),
      Settings.findOne({}).lean(),
    ]);

    const backupData = {
      exportDate: new Date().toISOString(),
      shopName: 'Mahalaxmi Kirana Store, Yesgaon',
      version: 'PRD-2.0',
      exportedBy: { id: req.user._id, name: req.user.name, role: req.user.role },
      recordCounts: {
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        users: users.length,
        udharAccounts: udharAccounts.length,
        udharEntries: udharEntries.length,
        stockLogs: stockLogs.length,
        notifications: notifications.length,
        auditLogs: auditLogs.length,
      },
      collections: {
        products,
        categories,
        orders,
        users,
        udharAccounts,
        udharEntries,
        stockLogs,
        notifications,
        auditLogs,
        settings,
      },
    };

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'database_backup_exported',
      target: { collection: 'System', name: 'Full Database Backup' },
      note: `Database backup exported (${products.length} products, ${orders.length} orders)`,
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mahalaxmi-backup-${dateStr}.json"`);
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/notifications/cleanup-old
 * Auto-archive/delete notifications older than 90 days.
 * R6 (MSG-07)
 */
const cleanupOldNotifications = async (req, res, next) => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });

    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: 'notifications_cleanup',
      target: { collection: 'Notification', name: 'Old Notifications' },
      note: `Cleaned up ${result.deletedCount} notifications older than 90 days`,
    });

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deletedCount} notifications older than 90 days.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  checkNewOrders,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  updatePaymentStatus,
  getPackingList,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleStock,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
  getSettings,
  updateSettings,
  getCustomers,
  getCustomerOrders,
  toggleBlockCustomer,
  uploadImage,
  // R4: Staff & Power Tools
  getStaff,
  createStaff,
  deleteStaff,
  toggleStaffBlock,
  updateStaffPermissions,
  getAuditLogs,
  getReports,
  getDailySettlement,
  exportOrdersCsv,
  exportStockLogsCsv,
  exportUdharLedgerCsv,
  addAliasFromAiMiss,
  ignoreAiMiss,
  // R5 & R6
  proposeSubstitution,
  exportBackup,
  cleanupOldNotifications,
};

