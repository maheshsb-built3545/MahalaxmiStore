'use strict';

/**
 * R1 — Order Controller (updated)
 *
 * Key R1 changes:
 *   createOrder  — atomic stock deduction with conditional update (INV-02)
 *                  If any item is short, nothing is deducted and the customer
 *                  sees what is available.
 *   cancelOrder  — atomic stock restore, exactly once, guarded by stockRestored flag (INV-03)
 *
 * writeStockLog is imported from inventoryController so every stock change
 * is recorded in a single place.
 */

const mongoose = require('mongoose');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Address = require('../models/Address');
const Settings = require('../models/Settings');
const UdharAccount = require('../models/UdharAccount'); // R4
const UdharEntry = require('../models/UdharEntry');     // R4
const { writeStockLog } = require('./inventoryController');
const { createNotification } = require('./notificationController');
const { ensureString }  = require('../utils/helpers');

/**
 * Generate human-readable order number in Asia/Kolkata time zone:
 * Format: MK-YYMMDD-XXXX (e.g. MK-261001-4821)
 */
function generateOrderNumber() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const yy   = parts.find((p) => p.type === 'year').value;
  const mm   = parts.find((p) => p.type === 'month').value;
  const dd   = parts.find((p) => p.type === 'day').value;
  const rand = Math.floor(1000 + Math.random() * 9000);

  return `MK-${yy}${mm}${dd}-${rand}`;
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
/**
 * Create a new order.
 * R1: atomically deducts stock from each product.
 *     If any product is short, the ENTIRE order is rejected (nothing deducted).
 */
const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (req.user && req.user.blocked) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact store owner.',
      });
    }

    // Check store open status before processing order
    let settings = await Settings.findOne().session(session);
    if (!settings) settings = new Settings();

    if (settings.isStoreOpen === false) {
      await session.abortTransaction();
      session.endSession();
      const reason = settings.closureReason ? ` (${settings.closureReason})` : '';
      return res.status(403).json({
        success: false,
        message: `दुकान सध्या बंद आहे${reason} / Store is currently closed${reason}. नवीन ऑर्डर्स तात्पुरत्या बंद आहेत.`,
        code: 'STORE_CLOSED',
      });
    }

    const rawAddressId     = ensureString(req.body.addressId);
    const rawSlot          = ensureString(req.body.slot);
    const rawDeliveryDate  = ensureString(req.body.deliveryDate);
    const rawPaymentMethod = ensureString(req.body.paymentMethod);
    const rawPaymentRef    = ensureString(req.body.paymentRef) || '';
    const rawNote          = ensureString(req.body.note) || '';
    const rawLocationPin   = ensureString(req.body.locationPin) || '';
    const rawChannel       = ensureString(req.body.channel) === 'ai_box' ? 'ai_box' : 'website';
    const rawItems         = req.body.items;

    // 1. Validate items array
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }

    if (rawItems.length > 50) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Order cannot contain more than 50 items.' });
    }

    // 2. Validate and merge duplicate product IDs
    const mergedItems = new Map();
    for (const item of rawItems) {
      const pid = ensureString(item.productId);
      if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'One or more items contain an invalid product ID.' });
      }

      const qty = parseFloat(item.qty);
      if (isNaN(qty) || qty <= 0 || qty > 50) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'Quantity for each item must be between 0.1 and 50.' });
      }

      const existingQty = mergedItems.get(pid) || 0;
      mergedItems.set(pid, Math.min(50, existingQty + qty));
    }

    // 3. Validate address
    if (!rawAddressId || !mongoose.Types.ObjectId.isValid(rawAddressId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Please select a valid delivery address.' });
    }

    const address = await Address.findOne({ _id: rawAddressId, userId: req.user._id }).session(session);
    if (!address) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Selected address does not exist or does not belong to you.' });
    }

    // 5. Validate service pincode
    if (!settings.servicePincodes.includes(address.pincode)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Delivery is currently not available to pincode ${address.pincode}. Serviceable pincodes: ${settings.servicePincodes.join(', ')}.`,
      });
    }

    // 6. Validate fixed delivery slot ID (morning, afternoon, evening) & deliveryDate (today, tomorrow)
    const ALLOWED_SLOT_IDS = ['morning', 'afternoon', 'evening'];

    // Map/normalize slot ID (accepts 'morning', 'afternoon', 'evening' or legacy strings containing keywords)
    let slotId = (rawSlot || '').toLowerCase().trim();
    if (!ALLOWED_SLOT_IDS.includes(slotId)) {
      if (slotId.includes('morning') || slotId.includes('सकाळ')) {
        slotId = 'morning';
      } else if (slotId.includes('afternoon') || slotId.includes('दुपार')) {
        slotId = 'afternoon';
      } else if (slotId.includes('evening') || slotId.includes('संध्याकाळ')) {
        slotId = 'evening';
      } else {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Invalid slot ID. Allowed slot IDs are: ${ALLOWED_SLOT_IDS.join(', ')}.`,
        });
      }
    }

    // Validate deliveryDate: today or tomorrow only
    let deliveryDate = (rawDeliveryDate || '').toLowerCase().trim();
    if (!deliveryDate) {
      if (rawSlot.toLowerCase().includes('tomorrow') || rawSlot.toLowerCase().includes('उद्या')) {
        deliveryDate = 'tomorrow';
      } else {
        deliveryDate = 'today';
      }
    }

    // Accept 'today', 'tomorrow', or IST date string matching today or tomorrow
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const pad = (n) => String(n).padStart(2, '0');
    const todayIST = `${nowIST.getFullYear()}-${pad(nowIST.getMonth() + 1)}-${pad(nowIST.getDate())}`;

    const tomorrowObj = new Date(nowIST);
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowIST = `${tomorrowObj.getFullYear()}-${pad(tomorrowObj.getMonth() + 1)}-${pad(tomorrowObj.getDate())}`;

    if (deliveryDate === todayIST) deliveryDate = 'today';
    if (deliveryDate === tomorrowIST) deliveryDate = 'tomorrow';

    if (!['today', 'tomorrow'].includes(deliveryDate)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid deliveryDate. Only "today" or "tomorrow" are permitted.',
      });
    }

    // Server-side IST cutoff check when deliveryDate is today
    if (deliveryDate === 'today') {
      const istTimeStr = new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const [istH, istM] = istTimeStr.split(':').map(Number);
      const currentMinsIST = istH * 60 + istM;

      let cutoffMins = 21 * 60; // 9:00 PM cutoff for evening
      if (slotId === 'morning') {
        cutoffMins = 11 * 60; // 11:00 AM cutoff for morning
      } else if (slotId === 'afternoon') {
        cutoffMins = 16 * 60; // 4:00 PM cutoff for afternoon
      }

      if (currentMinsIST >= cutoffMins) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Cutoff time for ${slotId} delivery slot has passed (cutoff time has passed for today). Please select a later slot or choose tomorrow.`,
        });
      }
    }

    // 7. Validate payment method (supports upi_qr, cod, and udhar - UDH-01)
    let udharAccount = null;
    if (rawPaymentMethod === 'udhar') {
      udharAccount = await UdharAccount.findOne({ customer: req.user._id }).session(session);
      if (!udharAccount || !udharAccount.approved || udharAccount.status !== 'active') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'आपल्या खात्यावर उधारी सुविधा सुरू नाही. कृपया Cash किंवा UPI निवडा. / Udhar credit is not active for your account.',
        });
      }
    } else if (!['upi_qr', 'cod'].includes(rawPaymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Payment method must be "upi_qr", "cod", or "udhar".' });
    }

    if (rawPaymentRef.length > 20) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Payment reference cannot exceed 20 characters.' });
    }

    // 8. Load products and check availability + stock (within session for read concern)
    const productIds = Array.from(mergedItems.keys());
    const products   = await Product.find({ _id: { $in: productIds } }).session(session);
    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const invalidItems       = [];
    const validatedOrderItems = [];
    let subtotal = 0;

    for (const [pid, qty] of mergedItems.entries()) {
      const p = productMap.get(pid);
      if (!p) {
        invalidItems.push({ productId: pid, nameEn: 'Unknown Item', reason: 'not_found' });
      } else if (!p.active || p.unavailableFlag) {
        invalidItems.push({ productId: pid, nameEn: p.nameEn, reason: 'inactive' });
      } else if (p.stockQuantity <= 0) {
        invalidItems.push({ productId: pid, nameEn: p.nameEn, reason: 'out_of_stock', stockQuantity: 0 });
      } else if (p.stockQuantity < qty) {
        // Partial stock — tell customer how many are available
        invalidItems.push({
          productId: pid,
          nameEn: p.nameEn,
          nameMr: p.nameMr,
          reason: 'insufficient_stock',
          available: p.stockQuantity,
          requested: qty,
        });
      } else {
        const itemPrice = p.price; // ALWAYS use server DB price
        subtotal += itemPrice * qty;
        validatedOrderItems.push({
          productId:  p._id,
          nameEn:     p.nameEn,
          nameMr:     p.nameMr,
          packSize:   p.packSize,
          price:      itemPrice,
          qty,
        });
      }
    }

    // R1: If ANY item fails, abort — nothing is deducted
    if (invalidItems.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Some items in your cart are no longer available.',
        invalidItems,
      });
    }

    // 9. Enforce minimum order
    if (subtotal < settings.minOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${settings.minOrder}. Your current subtotal is ₹${subtotal}.`,
      });
    }

    // 10. Calculate delivery charge
    const deliveryCharge = subtotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryCharge;
    const total          = subtotal + deliveryCharge;

    // R4: Enforce Udhar credit limit (UDH-02)
    if (rawPaymentMethod === 'udhar' && udharAccount) {
      if (udharAccount.balance + total > udharAccount.creditLimit) {
        const availableCredit = Math.max(0, udharAccount.creditLimit - udharAccount.balance);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `उधारी मर्यादा ओलांडली आहे. शिल्लक मर्यादा: ₹${availableCredit}. (Credit limit ₹${udharAccount.creditLimit} exceeded).`,
        });
      }
    }

    // 11. R1: Atomic stock deduction for EVERY item using conditional update.
    //     If any product's stock has changed since we read it (race condition),
    //     the update will affect 0 docs and we abort the whole order.
    for (const item of validatedOrderItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stockQuantity: { $gte: item.qty },
          unavailableFlag: false,
          active: true,
        },
        { $inc: { stockQuantity: -item.qty } },
        { session, new: true }
      );

      if (!updatedProduct) {
        // Stock changed or insufficient — abort transaction and whole order
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          success: false,
          message: `Stock for "${item.nameEn}" changed while your order was being placed. Please refresh your cart and try again.`,
        });
      }
    }

    // 12. Create order (with retry for duplicate order number)
    let order     = null;
    let attempts  = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts && !order) {
      attempts++;
      const orderNumber = generateOrderNumber();
      try {
        order = await Order.create(
          [
            {
              orderNumber,
              userId:         req.user._id,
              customerName:   req.user.name,
              customerPhone:  req.user.phone,
              address: {
                line:     address.line,
                landmark: address.landmark,
                pincode:  address.pincode,
              },
              items:         validatedOrderItems,
              subtotal,
              deliveryCharge,
              total,
              paymentMethod:  rawPaymentMethod,
              paymentStatus:  (rawPaymentMethod === 'upi_qr' && (Boolean(req.body.customerMarkedPaid) || rawPaymentRef)) ? 'paid_pending_verification' : 'pending',
              slot:           slotId,
              deliveryDate,
              note:           rawNote,
              locationPin:    rawLocationPin,
              channel:        rawChannel,
              status:         'new',
              statusHistory: [
                {
                  status:    'new',
                  changedAt: new Date(),
                  changedBy: 'customer',
                  note:      'Order placed by customer.',
                },
              ],
            },
          ],
          { session }
        );
        order = order[0]; // Model.create with array + session returns array
      } catch (err) {
        if (err.code === 11000 && attempts < maxAttempts) {
          continue; // retry on duplicate order number
        }
        throw err;
      }
    }

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ success: false, message: 'Failed to generate a unique order number. Please try again.' });
    }

    // 13. Write stock log entries for every deducted item
    for (const item of validatedOrderItems) {
      const updatedProduct = await Product.findById(item.productId).session(session);
      await writeStockLog({
        productId:    item.productId,
        type:         'order',
        quantity:     -item.qty,
        balanceAfter: updatedProduct ? updatedProduct.stockQuantity : 0,
        note:         `Order ${order.orderNumber}`,
        actor:        req.user.name,
        actorId:      req.user._id,
        orderId:      order._id,
        session,
      });
    }

    // R4: Update Udhar Account and create UdharEntry if paid via Udhar (UDH-03)
    if (rawPaymentMethod === 'udhar' && udharAccount) {
      const newBal = udharAccount.balance + total;
      await UdharAccount.updateOne(
        { _id: udharAccount._id },
        { $set: { balance: newBal } },
        { session }
      );
      await UdharEntry.create(
        [
          {
            account: udharAccount._id,
            customer: req.user._id,
            type: 'purchase',
            amount: total,
            balanceAfter: newBal,
            order: order._id,
            paymentMethod: 'order_credit',
            note: `Order ${order.orderNumber}`,
            actor: { id: req.user._id, name: req.user.name, role: req.user.role },
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // 14. R2: Trigger asynchronous notifications (MSG-01, MSG-02, MSG-04)
    (async () => {
      try {
        // Owner/staff inbox notification
        await createNotification({
          recipientRole: 'all_admin',
          type: 'order_new',
          title: `🔔 नवीन ऑर्डर #${order.orderNumber} / New Order`,
          body: `₹${order.total} — ${order.customerName} (${order.customerPhone})`,
          link: `/admin/orders.html?search=${encodeURIComponent(order.orderNumber)}`,
          metadata: { orderId: order._id, orderNumber: order.orderNumber, total: order.total },
        });

        // Customer inbox notification
        await createNotification({
          recipient: req.user._id,
          recipientRole: 'customer',
          type: 'order_status',
          title: `ऑर्डर यशस्वीरीत्या नोंदवली! #${order.orderNumber}`,
          body: `तुमची ₹${order.total} ची ऑर्डर नोंदवली गेली आहे. आम्ही लवकरच पॅक करू.`,
          link: `/orders.html?id=${order._id}`,
          metadata: { orderId: order._id, orderNumber: order.orderNumber, total: order.total },
        });

        // Low-stock check for all ordered products (MSG-04: deduplicated)
        for (const item of validatedOrderItems) {
          const pDoc = await Product.findById(item.productId).select('nameMr nameEn stockQuantity reorderLevel');
          if (pDoc && pDoc.stockQuantity <= pDoc.reorderLevel) {
            await createNotification({
              recipientRole: 'all_admin',
              type: 'low_stock',
              title: `⚠️ कमी साठा इशारा / Low Stock Alert`,
              body: `${pDoc.nameMr} (${pDoc.nameEn}) शिल्लक: ${pDoc.stockQuantity} (पुनर्क्रम पातळी: ${pDoc.reorderLevel})`,
              link: '/admin/low-stock.html',
              dedupeKey: `low_stock_${pDoc._id}`,
              metadata: { productId: pDoc._id, stockQuantity: pDoc.stockQuantity },
            });
          }
        }
      } catch (notifyErr) {
        console.warn('Notification trigger warning:', notifyErr.message);
      }
    })();

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    try {
      await session.abortTransaction();
      session.endSession();
    } catch (_) { /* session may already be ended */ }

    if (
      err.code === 112 ||
      (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')) ||
      (err.message && err.message.includes('Write conflict'))
    ) {
      return res.status(409).json({
        success: false,
        message: 'A stock update conflict occurred while processing your order. Please retry.',
      });
    }

    next(err);
  }
};

// ─── GET /api/orders ──────────────────────────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/orders/:id ─────────────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOne({ _id: id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/orders/:id/cancel ────────────────────────────────────────────
/**
 * R1: Cancellation restores stock EXACTLY ONCE.
 * Guarded by a stockRestored flag on the order to prevent double-restores
 * even if the customer double-clicks.
 */
const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const cancelReason = req.body && typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const cancelNote = cancelReason ? `Order cancelled by customer: ${cancelReason}` : 'Order cancelled by customer.';

    // Atomic: only cancel if status is new|confirmed AND stock not yet restored
    const order = await Order.findOneAndUpdate(
      {
        _id:           id,
        userId:        req.user._id,
        status:        { $in: ['new', 'confirmed'] },
        stockRestored: { $ne: true },   // idempotency guard (INV-03)
      },
      {
        $set: {
          status:        'cancelled',
          stockRestored: true,          // mark so a retry cannot double-restore
        },
        $push: {
          statusHistory: {
            status:    'cancelled',
            changedAt: new Date(),
            changedBy: 'customer',
            note:      cancelNote,
          },
        },
      },
      { new: true, session }
    );

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled. It may have already been packed, delivered, or does not exist.',
      });
    }

    // Restore stock for every item
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stockQuantity: item.qty } },
        { session }
      );

      const updatedProduct = await Product.findById(item.productId).session(session);
      await writeStockLog({
        productId:    item.productId,
        type:         'cancel',
        quantity:     +item.qty,
        balanceAfter: updatedProduct ? updatedProduct.stockQuantity : item.qty,
        note:         `Cancelled order ${order.orderNumber}`,
        actor:        req.user.name,
        actorId:      req.user._id,
        orderId:      order._id,
        session,
      });
    }

    // R4: Refund Udhar balance if order was placed via Udhar
    if (order.paymentMethod === 'udhar') {
      const account = await UdharAccount.findOne({ customer: order.userId }).session(session);
      if (account) {
        const newBal = Math.max(0, account.balance - order.total);
        await UdharAccount.updateOne(
          { _id: account._id },
          { $set: { balance: newBal } },
          { session }
        );
        await UdharEntry.create(
          [
            {
              account: account._id,
              customer: order.userId,
              type: 'adjustment',
              amount: order.total,
              balanceAfter: newBal,
              order: order._id,
              paymentMethod: 'adjustment',
              note: `Refund on cancellation of order ${order.orderNumber}`,
              actor: { id: req.user._id, name: req.user.name, role: req.user.role },
            },
          ],
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    // R2: Trigger notification to owner about customer cancellation
    (async () => {
      try {
        const reasonSnippet = cancelReason ? ` कारण: ${cancelReason}.` : '';
        await createNotification({
          recipientRole: 'all_admin',
          type: 'order_cancelled',
          title: `❌ ग्राहकाकडून ऑर्डर रद्द #${order.orderNumber}`,
          body: `ग्राहक ${order.customerName} ने ऑर्डर रद्द केली.${reasonSnippet} साठा पूर्ववत करण्यात आला आहे.`,
          link: `/admin/orders.html?search=${encodeURIComponent(order.orderNumber)}`,
          metadata: { orderId: order._id, orderNumber: order.orderNumber, reason: cancelReason },
        });
      } catch (notifyErr) {
        console.warn('Cancel notification warning:', notifyErr.message);
      }
    })();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: order,
    });
  } catch (err) {
    try {
      await session.abortTransaction();
      session.endSession();
    } catch (_) { /* session may already be ended */ }
    next(err);
  }
};

// ─── GET /api/orders/:id/reorder ─────────────────────────────────────────────
/**
 * Check current availability and prices for reorder.
 * R1: uses stockQuantity instead of inStock boolean.
 */
const reorderOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOne({ _id: id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const productIds  = order.items.map((i) => i.productId);
    const liveProducts = await Product.find({ _id: { $in: productIds } });
    const liveMap     = new Map();
    liveProducts.forEach((p) => liveMap.set(p._id.toString(), p));

    const available   = [];
    const unavailable = [];

    for (const item of order.items) {
      const live = liveMap.get(item.productId.toString());
      if (!live || !live.active || live.unavailableFlag) {
        unavailable.push({ productId: item.productId, nameEn: item.nameEn, nameMr: item.nameMr, reason: 'discontinued' });
      } else if (live.stockQuantity <= 0) {
        unavailable.push({ productId: item.productId, nameEn: item.nameEn, nameMr: item.nameMr, reason: 'out_of_stock' });
      } else {
        const priceChanged = live.price !== item.price;
        available.push({
          productId:     live._id,
          nameEn:        live.nameEn,
          nameMr:        live.nameMr,
          packSize:      live.packSize,
          price:         live.price,
          originalPrice: item.price,
          priceChanged,
          mrp:           live.mrp,
          qty:           item.qty,
          stockQuantity: live.stockQuantity,
          inStock:       live.inStock,
          unitType:      live.unitType,
        });
      }
    }

    res.status(200).json({ success: true, available, unavailable });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/orders/:id/substitutions/:subId/respond ──────────────────────
/**
 * Customer responds to an owner-proposed item substitution (accept | reject).
 * R5 (ORD-06, MSG-06):
 * If accepted: atomically swaps inventory, replaces item in order, recalculates
 * total, adjusts Udhar ledger if applicable, and notifies owner.
 */
const respondSubstitution = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id, subId } = req.params;
    const { action } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "accept" or "reject".' });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(subId)) {
      return res.status(400).json({ success: false, message: 'Invalid order or substitution ID.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Verify ownership
    const isOwnerOrStaff = req.user && ['owner', 'staff'].includes(req.user.role);
    if (!isOwnerOrStaff && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to respond to this substitution.' });
    }

    const sub = order.substitutions.id(subId);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Substitution proposal not found.' });
    }

    if (sub.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This substitution has already been ${sub.status}.`,
      });
    }

    if (action === 'reject') {
      sub.status = 'rejected';
      sub.respondedAt = new Date();
      order.statusHistory.push({
        status: order.status,
        changedBy: 'customer',
        note: `वस्तू बदल नाकारला: ${sub.originalNameEn} ऐवजी ${sub.proposedNameEn}`,
      });
      await order.save();

      // Notify owner/staff
      createNotification({
        recipientRole: 'all_admin',
        type: 'order_status',
        title: `बदल नाकारला #${order.orderNumber} / Substitution Rejected`,
        body: `ग्राहकाने #${order.orderNumber} वरील ${sub.originalNameMr || sub.originalNameEn} ऐवजी ${sub.proposedNameMr || sub.proposedNameEn} बदल नाकारला आहे.`,
        link: '/admin/orders.html',
      }).catch((e) => console.warn('Sub notify error:', e.message));

      return res.status(200).json({
        success: true,
        message: 'Substitution proposal rejected.',
        data: order,
      });
    }

    // action === 'accept'
    session.startTransaction();

    // Check live stock of proposed product
    const proposedProd = await Product.findById(sub.proposedProductId).session(session);
    if (!proposedProd || proposedProd.stockQuantity < sub.proposedQty) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'The proposed replacement item is currently out of stock.',
      });
    }

    // 1. Deduct proposed product stock
    proposedProd.stockQuantity -= sub.proposedQty;
    await proposedProd.save({ session });
    await writeStockLog({
      productId: proposedProd._id,
      type: 'order',
      quantity: -sub.proposedQty,
      balanceAfter: proposedProd.stockQuantity,
      note: `Substitution accepted in order #${order.orderNumber}`,
      actor: req.user.name || 'customer',
      actorId: req.user._id,
      orderId: order._id,
      session,
    });

    // 2. Restore original product stock
    const origProd = await Product.findById(sub.originalProductId).session(session);
    if (origProd) {
      origProd.stockQuantity += sub.originalQty;
      await origProd.save({ session });
      await writeStockLog({
        productId: origProd._id,
        type: 'cancel',
        quantity: sub.originalQty,
        balanceAfter: origProd.stockQuantity,
        note: `Item replaced by substitution in order #${order.orderNumber}`,
        actor: req.user.name || 'customer',
        actorId: req.user._id,
        orderId: order._id,
        session,
      });
    }

    // 3. Update order items array
    const itemIdx = order.items.findIndex(
      (it) => it.productId.toString() === sub.originalProductId.toString()
    );
    if (itemIdx !== -1) {
      order.items[itemIdx].productId = sub.proposedProductId;
      order.items[itemIdx].nameEn    = sub.proposedNameEn;
      order.items[itemIdx].nameMr    = sub.proposedNameMr;
      order.items[itemIdx].packSize  = sub.proposedPackSize;
      order.items[itemIdx].price     = sub.proposedPrice;
      order.items[itemIdx].qty       = sub.proposedQty;
    }

    // 4. Recalculate totals
    order.subtotal = order.items.reduce((sum, it) => sum + (it.price * it.qty), 0);
    order.total = order.subtotal + (order.deliveryCharge || 0);

    // 5. Update Udhar account if order was paid with credit
    if (order.paymentMethod === 'udhar' && sub.priceDiff !== 0) {
      const udharAcc = await UdharAccount.findOne({ customer: order.userId }).session(session);
      if (udharAcc) {
        udharAcc.balance = Math.max(0, udharAcc.balance + sub.priceDiff);
        await udharAcc.save({ session });

        await UdharEntry.create(
          [
            {
              account: udharAcc._id,
              type: sub.priceDiff > 0 ? 'purchase' : 'adjustment',
              amount: Math.abs(sub.priceDiff),
              balanceAfter: udharAcc.balance,
              note: `ऑर्डर #${order.orderNumber} वस्तू बदल (${sub.priceDiff > 0 ? '+' : '-'}₹${Math.abs(sub.priceDiff)})`,
              order: order._id,
              actor: 'customer',
            },
          ],
          { session }
        );
      }
    }

    // 6. Finalize substitution subdoc
    sub.status = 'accepted';
    sub.respondedAt = new Date();
    order.statusHistory.push({
      status: order.status,
      changedBy: 'customer',
      note: `वस्तू बदल स्वीकारला: ${sub.originalNameEn} → ${sub.proposedNameEn} (फरक: ₹${sub.priceDiff})`,
    });

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    // 7. Notify owner/staff
    createNotification({
      recipientRole: 'all_admin',
      type: 'order_status',
      title: `बदल स्वीकारला! #${order.orderNumber} / Substitution Accepted`,
      body: `ग्राहकाने #${order.orderNumber} वरील ${sub.originalNameMr || sub.originalNameEn} ऐवजी ${sub.proposedNameMr || sub.proposedNameEn} स्वीकारला आहे. नवीन एकूण: ₹${order.total}.`,
      link: '/admin/orders.html',
    }).catch((e) => console.warn('Sub notify error:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Substitution accepted and order successfully updated.',
      data: order,
    });
  } catch (err) {
    try {
      await session.abortTransaction();
      session.endSession();
    } catch (_) {}
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  reorderOrder,
  respondSubstitution,
};
