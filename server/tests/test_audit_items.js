'use strict';
/**
 * Automated Verification Suite for Audit Items 1, 3, 4, and 7
 * 
 * Tests:
 *  - Item 1: Database price recalculation & payload price tampering rejection.
 *  - Item 3: Rejection of inactive products, out-of-stock products, and delivery slots past IST cutoff.
 *  - Item 4: Owner/staff role enforcement on /api/admin/* (rejection of no token & customer token).
 *  - Item 7: paid_pending_verification handled as unpaid until admin verifies.
 */

const http = require('http');
const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const User = require('../src/models/User');
const Address = require('../src/models/Address');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Category = require('../src/models/Category');
const Settings = require('../src/models/Settings');

let server;
let baseUrl;

async function api(method, endpoint, body = null, token = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return { status: res.status, data };
}

async function runAuditTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING AUTOMATED AUDIT VERIFICATION SUITE (Items 1, 3, 4, 7)');
  console.log('======================================================================\n');

  if (mongoose.connection.readyState !== 1) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in server/.env');
    }
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  }

  // Wait until connected if in progress
  while (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.log('✓ Connected to MongoDB');

  // Start ephemeral server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`✓ Test API server listening on ${baseUrl}\n`);

  // Ensure test settings
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      minOrder: 200,
      deliveryCharge: 30,
      freeDeliveryAbove: 1000,
      servicePincodes: ['423601', '423602'],
      slots: [
        'Morning (7:00 AM – 11:00 AM)',
        'Afternoon (12:00 PM – 4:00 PM)',
        'Evening (5:00 PM – 9:00 PM)',
      ],
    });
  }

  // Ensure test category
  let category = await Category.findOne({ slug: 'audit-test-cat' });
  if (!category) {
    category = await Category.create({
      nameEn: 'Audit Test Cat',
      nameMr: 'ऑडिट टेस्ट कॅट',
      slug: 'audit-test-cat',
      emoji: '🍚',
      order: 999,
    });
  }

  // Create test customer & staff/owner tokens
  await User.deleteMany({ phone: { $in: ['9999900001', '9999900002'] } });
  const jwtSecret = process.env.JWT_SECRET || 'testsecret';
  const customerId = new mongoose.Types.ObjectId();
  const ownerId = new mongoose.Types.ObjectId();

  const customerUser = await User.create({
    _id: customerId,
    phone: '9999900001',
    name: 'Audit Customer',
    role: 'customer',
    passwordHash: 'dummyhash',
  });

  const ownerUser = await User.create({
    _id: ownerId,
    phone: '9999900002',
    name: 'Audit Owner',
    role: 'owner',
    passwordHash: 'dummyhash',
  });

  const customerToken = jwt.sign(
    { id: customerUser._id, phone: customerUser.phone, role: 'customer' },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const ownerToken = jwt.sign(
    { id: ownerUser._id, phone: ownerUser.phone, role: 'owner' },
    jwtSecret,
    { expiresIn: '1h' }
  );

  // Create valid test address
  const testAddress = await Address.create({
    userId: customerId,
    line: 'Shop 4, Station Road',
    pincode: '423601',
    landmark: 'Near Temple',
    isDefault: true,
  });

  // Create primary test product (Price: 150, Stock: 25)
  const productA = await Product.create({
    nameEn: 'Premium Basmati Rice 1kg',
    nameMr: 'बासमती तांदूळ १ किलो',
    categoryId: category._id,
    price: 150,
    mrp: 180,
    packSize: '1 kg',
    stockQuantity: 25,
    active: true,
    unavailableFlag: false,
  });

  const cleanupIds = {
    users: [customerId, ownerId],
    addresses: [testAddress._id],
    products: [productA._id],
    categories: [category._id],
    orders: [],
  };

  const results = [];
  function record(itemNum, testName, passed, details) {
    results.push({ itemNum, testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | Item ${itemNum}: ${testName}`);
    if (!passed) console.log('       Details:', details);
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // ITEM 1: DB Price Recalculation & Tampered Prices Ignored
    // ═══════════════════════════════════════════════════════════════════════
    {
      // Attempt price tampering: pass price: 1, subtotal: 2, deliveryCharge: 0, total: 2 for 2 items
      const tamperPayload = {
        addressId: testAddress._id.toString(),
        slot: 'Evening (5:00 PM – 9:00 PM) (उद्या / Tomorrow)',
        paymentMethod: 'cod',
        items: [
          {
            productId: productA._id.toString(),
            qty: 2,
            price: 1, // Tampered client price! DB price is 150
            nameEn: 'Fake cheap rice',
          },
        ],
        subtotal: 2,       // Tampered
        deliveryCharge: 0, // Tampered
        total: 2,          // Tampered
      };

      const res = await api('POST', '/orders', tamperPayload, customerToken);
      const order = res.data && (res.data.data || res.data.order);
      if (order && order._id) cleanupIds.orders.push(order._id);

      const expectedSubtotal = 150 * 2; // 300
      const expectedDelivery = expectedSubtotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryCharge;
      const expectedTotal = expectedSubtotal + expectedDelivery;

      const item1Pass =
        res.status === 201 &&
        order &&
        order.items[0].price === 150 &&
        order.subtotal === expectedSubtotal &&
        order.deliveryCharge === expectedDelivery &&
        order.total === expectedTotal;

      record(
        1,
        'orderController recomputes subtotal, deliveryCharge, and total from DB prices, ignoring client payload prices',
        item1Pass,
        {
          httpStatus: res.status,
          dbPrice: 150,
          returnedItemPrice: order?.items?.[0]?.price,
          returnedSubtotal: order?.subtotal,
          returnedDeliveryCharge: order?.deliveryCharge,
          returnedTotal: order?.total,
        }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ITEM 3: Rejection of Inactive, Out-of-Stock, and Delivery Slots Past Cutoff
    // ═══════════════════════════════════════════════════════════════════════
    {
      // 3a: Out-of-Stock Rejection
      await Product.updateOne({ _id: productA._id }, { $set: { stockQuantity: 0 } });
      const oosPayload = {
        addressId: testAddress._id.toString(),
        slot: 'Evening (5:00 PM – 9:00 PM) (उद्या / Tomorrow)',
        paymentMethod: 'cod',
        items: [{ productId: productA._id.toString(), qty: 2 }],
      };
      const resOos = await api('POST', '/orders', oosPayload, customerToken);
      const isOosRejected =
        resOos.status === 400 &&
        Array.isArray(resOos.data?.invalidItems) &&
        resOos.data.invalidItems.some((i) => i.reason === 'out_of_stock');

      record(
        3,
        'Server rejects out-of-stock products (HTTP 400 with reason: out_of_stock)',
        isOosRejected,
        resOos.data
      );

      // 3b: Inactive Product Rejection
      await Product.updateOne({ _id: productA._id }, { $set: { stockQuantity: 20, active: false } });
      const inactivePayload = {
        addressId: testAddress._id.toString(),
        slot: 'Evening (5:00 PM – 9:00 PM) (उद्या / Tomorrow)',
        paymentMethod: 'cod',
        items: [{ productId: productA._id.toString(), qty: 2 }],
      };
      const resInactive = await api('POST', '/orders', inactivePayload, customerToken);
      const isInactiveRejected =
        resInactive.status === 400 &&
        Array.isArray(resInactive.data?.invalidItems) &&
        resInactive.data.invalidItems.some((i) => i.reason === 'inactive');

      record(
        3,
        'Server rejects inactive/disabled products (HTTP 400 with reason: inactive)',
        isInactiveRejected,
        resInactive.data
      );

      // Restore product to active & in-stock
      await Product.updateOne({ _id: productA._id }, { $set: { stockQuantity: 20, active: true } });

      // 3c: Past Cutoff Slot Rejection (using Server IST time)
      // Simulate an order placed for Morning slot (cutoff 11:00 AM) when server IST time is 2:30 PM (14:30)
      const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
      Date.prototype.toLocaleTimeString = function (locale, options) {
        if (options && options.timeZone === 'Asia/Kolkata') {
          return '14:30'; // Mock server IST time past 11:00 AM morning cutoff
        }
        return origToLocaleTimeString.call(this, locale, options);
      };

      try {
        const pastCutoffPayload = {
          addressId: testAddress._id.toString(),
          slot: 'Morning (7:00 AM – 11:00 AM)', // Same-day morning slot when IST is 14:30
          paymentMethod: 'cod',
          items: [{ productId: productA._id.toString(), qty: 2 }],
        };
        const resCutoff = await api('POST', '/orders', pastCutoffPayload, customerToken);
        const isCutoffRejected =
          resCutoff.status === 400 &&
          typeof resCutoff.data?.message === 'string' &&
          resCutoff.data.message.includes('cutoff time has passed');

        record(
          3,
          'Server rejects same-day delivery slots past cutoff time using server IST (HTTP 400)',
          isCutoffRejected,
          resCutoff.data
        );
      } finally {
        Date.prototype.toLocaleTimeString = origToLocaleTimeString; // Restore
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ITEM 4: Owner/Staff Role Enforcement on /api/admin/*
    // ═══════════════════════════════════════════════════════════════════════
    {
      const endpoints = ['/admin/orders', '/admin/dashboard/stats', '/admin/products'];
      let allUnauthBlocked = true;
      let allCustomerBlocked = true;
      let allOwnerAllowed = true;

      for (const ep of endpoints) {
        const resNoToken = await api('GET', ep);
        if (resNoToken.status !== 401) allUnauthBlocked = false;

        const resCustomer = await api('GET', ep, null, customerToken);
        if (resCustomer.status !== 403) allCustomerBlocked = false;

        const resOwner = await api('GET', ep, null, ownerToken);
        if (resOwner.status !== 200) allOwnerAllowed = false;
      }

      record(
        4,
        'Every /api/admin/* route rejects unauthenticated requests (HTTP 401) and customer tokens (HTTP 403)',
        allUnauthBlocked && allCustomerBlocked && allOwnerAllowed,
        { allUnauthBlocked, allCustomerBlocked, allOwnerAllowed }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ITEM 7: paid_pending_verification Treated as Unpaid Everywhere
    // ═══════════════════════════════════════════════════════════════════════
    {
      // Create order with upi_qr and customerMarkedPaid: true
      const upiPayload = {
        addressId: testAddress._id.toString(),
        slot: 'Evening (5:00 PM – 9:00 PM) (उद्या / Tomorrow)',
        paymentMethod: 'upi_qr',
        paymentRef: 'UPI123456789',
        customerMarkedPaid: true,
        items: [{ productId: productA._id.toString(), qty: 2 }],
      };

      const resUpi = await api('POST', '/orders', upiPayload, customerToken);
      const createdOrder = resUpi.data && (resUpi.data.data || resUpi.data.order);
      if (createdOrder?._id) cleanupIds.orders.push(createdOrder._id);

      const hasPendingVerificationStatus =
        createdOrder && createdOrder.paymentStatus === 'paid_pending_verification';

      // Verify in Admin Orders list: isPaid check evaluates to false for 'paid_pending_verification'
      const adminOrdersRes = await api('GET', `/admin/orders`, null, ownerToken);
      const foundInAdmin = (adminOrdersRes.data?.data || []).find(
        (o) => o._id === createdOrder._id
      );

      // In admin UI: const isPaid = ord.paymentStatus === 'paid';
      const isTreatedAsPaidInAdmin = foundInAdmin?.paymentStatus === 'paid';

      // Now verify admin can mark as verified paid
      const updatePaymentRes = await api(
        'PATCH',
        `/admin/orders/${createdOrder._id}/payment`,
        { paymentStatus: 'paid' },
        ownerToken
      );

      const orderAfterVerify = await Order.findById(createdOrder._id);
      const isNowPaid = orderAfterVerify?.paymentStatus === 'paid';

      const item7Pass =
        hasPendingVerificationStatus && !isTreatedAsPaidInAdmin && isNowPaid;

      record(
        7,
        'paid_pending_verification is treated as unpaid until explicit admin verification',
        item7Pass,
        {
          initialStatus: createdOrder?.paymentStatus,
          isTreatedAsPaidBeforeVerification: isTreatedAsPaidInAdmin,
          statusAfterAdminVerification: orderAfterVerify?.paymentStatus,
        }
      );
    }

    console.log('\n======================================================================');
    const allPassed = results.every((r) => r.passed);
    console.log(allPassed ? '🎉 ALL AUDIT TESTS PASSED!' : '⚠️ SOME AUDIT TESTS FAILED');
    console.log('======================================================================');

  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test artifacts from database...');
    if (cleanupIds.orders.length > 0) {
      await Order.deleteMany({ _id: { $in: cleanupIds.orders } });
    }
    await Product.deleteMany({ _id: { $in: cleanupIds.products } });
    await Address.deleteMany({ _id: { $in: cleanupIds.addresses } });
    await User.deleteMany({ _id: { $in: cleanupIds.users } });
    await Category.deleteOne({ slug: 'audit-test-cat' });
    console.log('✓ Cleanup complete.');

    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runAuditTests().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runAuditTests };
