'use strict';
/**
 * Automated Test Runner for Playbook Fixes
 * 
 * Tests:
 *  - Test 1 (Item 5): MONGODB_URI_TEST isolation & production URI safety check.
 *  - Test 2 (Item 2): Dashboard separates Collected Sales (paid) and Pending Payment (unverified UPI & COD).
 *  - Test 3 (Item 3): Atomic findOneAndUpdate prevents overselling; 5 parallel requests for 1 unit yields exactly 1 success.
 *  - Test 4 (Item 3): Order cancellation restores stock.
 *  - Test 5 (Item 6): Fixed slot IDs (morning, afternoon, evening) & deliveryDate (today/tomorrow) validation with IST cutoff.
 */

const http = require('http');
const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// ── Item 5 Safety Guard ────────────────────────────────────────────────────────
const testMongoUri = process.env.MONGODB_URI_TEST || process.env.MONGO_URI_TEST;
const prodMongoUri = process.env.MONGO_URI;

function verifyTestUriSafety(testUri, prodUri) {
  if (!testUri) {
    throw new Error('SAFETY ERROR: MONGODB_URI_TEST is required to run automated tests.');
  }
  if (testUri.trim() === (prodUri || '').trim()) {
    throw new Error('CRITICAL SAFETY REFUSAL: MONGODB_URI_TEST equals production MONGO_URI! Refusing to run tests against production database.');
  }
  return true;
}

// Ensure the guard works
verifyTestUriSafety(testMongoUri, prodMongoUri);

// Point MONGO_URI to test database so server.js connects directly to test DB
process.env.MONGO_URI = testMongoUri;
const app = require('../src/server');

const User = require('../src/models/User');
const Address = require('../src/models/Address');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Category = require('../src/models/Category');
const Settings = require('../src/models/Settings');
const StockLog = require('../src/models/StockLog');

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

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING AUTOMATED PLAYBOOK VERIFICATION TEST SUITE');
  console.log('======================================================================\n');

  // Wait until connected to the test database
  while (mongoose.connection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 200));
  }

  const currentDb = mongoose.connection.db.databaseName;
  console.log(`✓ Connected to Test DB: "${currentDb}" (Isolated from production)`);

  // Start test HTTP server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`✓ Ephemeral test server active on ${baseUrl}\n`);

  // Ensure test settings
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      minOrder: 100,
      deliveryCharge: 30,
      freeDeliveryAbove: 1000,
      servicePincodes: ['423601', '423602'],
      slots: ['Morning (7:00 AM – 11:00 AM)', 'Afternoon (12:00 PM – 4:00 PM)', 'Evening (5:00 PM – 9:00 PM)'],
    });
  }

  // Ensure test category
  let category = await Category.findOne({ nameEn: 'Playbook Test Category' });
  if (!category) {
    category = await Category.create({
      nameEn: 'Playbook Test Category',
      nameMr: 'चाचणी श्रेणी',
      emoji: '🛒',
      sortOrder: 10,
      active: true,
    });
  }

  // Ensure test users
  await User.deleteMany({ phone: { $in: ['9999900010', '9999900011'] } });
  const jwtSecret = process.env.JWT_SECRET || 'testsecret123456789012345678901234';

  const customer = await User.create({
    name: 'Customer Test',
    phone: '9999900010',
    role: 'customer',
    passwordHash: 'dummyhash',
  });

  const owner = await User.create({
    name: 'Owner Test',
    phone: '9999900011',
    role: 'owner',
    passwordHash: 'dummyhash',
  });

  const customerToken = jwt.sign(
    { id: customer._id, phone: customer.phone, role: 'customer' },
    jwtSecret,
    { expiresIn: '2h' }
  );

  const ownerToken = jwt.sign(
    { id: owner._id, phone: owner.phone, role: 'owner' },
    jwtSecret,
    { expiresIn: '2h' }
  );

  const testAddress = await Address.create({
    userId: customer._id,
    line: '123 Market Road',
    pincode: '423601',
    landmark: 'Opp Bus Stand',
    isDefault: true,
  });

  const cleanup = {
    products: [],
    orders: [],
  };

  const results = [];
  function record(id, title, pass, details = {}) {
    results.push({ id, title, pass, details });
    const mark = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | [${id}] ${title}`);
    if (!pass) console.log('       Details:', details);
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1 (Item 5): MONGODB_URI_TEST Isolation & Refusal on Match
    // ═══════════════════════════════════════════════════════════════════════
    {
      let refusalTriggered = false;
      try {
        // Attempt safety check with identical URI
        verifyTestUriSafety(prodMongoUri, prodMongoUri);
      } catch (err) {
        if (err.message.includes('CRITICAL SAFETY REFUSAL')) {
          refusalTriggered = true;
        }
      }

      const isIsolatedDb = currentDb.includes('test');
      record(
        'Item 5',
        'Tests refuse to run if MONGODB_URI_TEST equals production MONGO_URI, and run in isolated test DB',
        refusalTriggered && isIsolatedDb,
        { refusalTriggered, currentDb }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2 (Item 2): Dashboard separates Delivered/Collected Sales & Pending Payment
    // ═══════════════════════════════════════════════════════════════════════
    {
      const prodDash = await Product.create({
        nameEn: 'Dashboard Rice 5kg',
        nameMr: 'डॅशबोर्ड तांदूळ ५ किलो',
        categoryId: category._id,
        price: 300,
        mrp: 350,
        packSize: '5 kg',
        stockQuantity: 100,
        active: true,
      });
      cleanup.products.push(prodDash._id);

      // Order A: Paid (e.g. cash on delivery collected or verified)
      const orderPaid = await Order.create({
        orderNumber: 'TEST-PAID-01',
        userId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        address: { line: testAddress.line, pincode: testAddress.pincode },
        items: [{ productId: prodDash._id, nameEn: prodDash.nameEn, nameMr: prodDash.nameMr, packSize: prodDash.packSize, price: 300, qty: 1 }],
        subtotal: 300,
        deliveryCharge: 30,
        total: 330,
        paymentMethod: 'cod',
        paymentStatus: 'paid', // Verified paid!
        slot: 'morning',
        deliveryDate: 'today',
        status: 'delivered',
      });
      cleanup.orders.push(orderPaid._id);

      // Order B: Unverified UPI (paymentStatus: 'paid_pending_verification')
      const orderUnverified = await Order.create({
        orderNumber: 'TEST-UNVER-02',
        userId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        address: { line: testAddress.line, pincode: testAddress.pincode },
        items: [{ productId: prodDash._id, nameEn: prodDash.nameEn, nameMr: prodDash.nameMr, packSize: prodDash.packSize, price: 300, qty: 1 }],
        subtotal: 300,
        deliveryCharge: 30,
        total: 330,
        paymentMethod: 'upi_qr',
        paymentStatus: 'paid_pending_verification', // Unverified!
        slot: 'afternoon',
        deliveryDate: 'today',
        status: 'new',
      });
      cleanup.orders.push(orderUnverified._id);

      // Order C: Pending COD (paymentStatus: 'pending')
      const orderPendingCod = await Order.create({
        orderNumber: 'TEST-COD-03',
        userId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        address: { line: testAddress.line, pincode: testAddress.pincode },
        items: [{ productId: prodDash._id, nameEn: prodDash.nameEn, nameMr: prodDash.nameMr, packSize: prodDash.packSize, price: 300, qty: 1 }],
        subtotal: 300,
        deliveryCharge: 30,
        total: 330,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        slot: 'evening',
        deliveryDate: 'today',
        status: 'new',
      });
      cleanup.orders.push(orderPendingCod._id);

      const statsRes = await api('GET', '/admin/dashboard/stats', null, ownerToken);
      const stats = statsRes.data?.data;

      // collectedSales must include ONLY orderPaid (330)
      // pendingPaymentSales must include orderUnverified (330) + orderPendingCod (330) = 660
      const isCollectedAccurate = stats && stats.collectedSales >= 330;
      const isPendingAccurate = stats && stats.pendingPaymentSales >= 660;
      const unverifiedExcludedFromCollected = stats && (stats.collectedSales < 660);

      record(
        'Item 2',
        'Dashboard separates Collected Sales (paid) and Pending Payment (unverified UPI excluded from collected)',
        statsRes.status === 200 && isCollectedAccurate && isPendingAccurate && unverifiedExcludedFromCollected,
        {
          collectedSales: stats?.collectedSales,
          pendingPaymentSales: stats?.pendingPaymentSales,
          todaySales: stats?.todaySales,
        }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3 (Item 3): Atomic findOneAndUpdate Concurrency (5 parallel for 1 unit)
    // ═══════════════════════════════════════════════════════════════════════
    let lastWinnerOrderId = null;
    let singleStockProd = null;
    {
      singleStockProd = await Product.create({
        nameEn: 'Last Pack of Ghee 500g',
        nameMr: 'तूप ५०० ग्रॅम (शेवटचा डबा)',
        categoryId: category._id,
        price: 350,
        mrp: 400,
        packSize: '500 g',
        stockQuantity: 1, // EXACTLY 1 REMAINING UNIT
        active: true,
        unavailableFlag: false,
      });
      cleanup.products.push(singleStockProd._id);

      const createPayload = () => ({
        addressId: testAddress._id.toString(),
        slot: 'evening',
        deliveryDate: 'tomorrow',
        paymentMethod: 'cod',
        items: [{ productId: singleStockProd._id.toString(), qty: 1 }],
      });

      // Fire 5 simultaneous orders competing for 1 unit
      const promises = [
        api('POST', '/orders', createPayload(), customerToken),
        api('POST', '/orders', createPayload(), customerToken),
        api('POST', '/orders', createPayload(), customerToken),
        api('POST', '/orders', createPayload(), customerToken),
        api('POST', '/orders', createPayload(), customerToken),
      ];

      const responses = await Promise.all(promises);

      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409 || r.status === 400);

      // Record created order for cleanup
      if (successes.length > 0 && successes[0].data?.data?._id) {
        lastWinnerOrderId = successes[0].data.data._id;
        cleanup.orders.push(lastWinnerOrderId);
      }

      const prodAfterRace = await Product.findById(singleStockProd._id);

      const racePassed =
        successes.length === 1 &&
        conflicts.length === 4 &&
        prodAfterRace.stockQuantity === 0;

      record(
        'Item 3',
        'Atomic findOneAndUpdate: 5 parallel orders for 1 remaining unit yields exactly 1 success (201) and 4 conflicts (409)',
        racePassed,
        {
          successCount: successes.length,
          conflictCount: conflicts.length,
          finalStock: prodAfterRace?.stockQuantity,
        }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4 (Item 3): Stock Restoration on Order Cancellation
    // ═══════════════════════════════════════════════════════════════════════
    {
      if (lastWinnerOrderId && singleStockProd) {
        // Customer cancels the winning order
        const cancelRes = await api('PATCH', `/orders/${lastWinnerOrderId}/cancel`, null, customerToken);
        const prodAfterCancel = await Product.findById(singleStockProd._id);

        const cancelPassed = cancelRes.status === 200 && prodAfterCancel.stockQuantity === 1;

        record(
          'Item 3',
          'Order cancellation automatically restores product stockQuantity to previous balance',
          cancelPassed,
          {
            cancelHttpStatus: cancelRes.status,
            restoredStock: prodAfterCancel?.stockQuantity,
          }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5 (Item 6): Fixed Slot IDs & deliveryDate (today/tomorrow only) with IST Cutoff
    // ═══════════════════════════════════════════════════════════════════════
    {
      const prodSlot = await Product.create({
        nameEn: 'Slot Test Sugar 1kg',
        nameMr: 'साखर १ किलो',
        categoryId: category._id,
        price: 45,
        mrp: 50,
        packSize: '1 kg',
        stockQuantity: 50,
        active: true,
      });
      cleanup.products.push(prodSlot._id);

      // 5a. Fixed valid slot ID ('morning', 'afternoon', 'evening') + 'tomorrow' succeeds
      const validTomorrowOrder = await api(
        'POST',
        '/orders',
        {
          addressId: testAddress._id.toString(),
          slot: 'morning',
          deliveryDate: 'tomorrow',
          paymentMethod: 'cod',
          items: [{ productId: prodSlot._id.toString(), qty: 3 }],
        },
        customerToken
      );
      if (validTomorrowOrder.data?.data?._id) cleanup.orders.push(validTomorrowOrder.data.data._id);
      const isTomorrowValid = validTomorrowOrder.status === 201;

      // 5b. Invalid deliveryDate ('next_week') is rejected with 400
      const invalidDateOrder = await api(
        'POST',
        '/orders',
        {
          addressId: testAddress._id.toString(),
          slot: 'morning',
          deliveryDate: 'next_week',
          paymentMethod: 'cod',
          items: [{ productId: prodSlot._id.toString(), qty: 3 }],
        },
        customerToken
      );
      const isInvalidDateRejected =
        invalidDateOrder.status === 400 &&
        invalidDateOrder.data?.message?.includes('Invalid deliveryDate');

      // 5c. Invalid slot ID ('midnight_special') is rejected with 400
      const invalidSlotOrder = await api(
        'POST',
        '/orders',
        {
          addressId: testAddress._id.toString(),
          slot: 'midnight_special',
          deliveryDate: 'tomorrow',
          paymentMethod: 'cod',
          items: [{ productId: prodSlot._id.toString(), qty: 3 }],
        },
        customerToken
      );
      const isInvalidSlotRejected =
        invalidSlotOrder.status === 400 &&
        invalidSlotOrder.data?.message?.includes('Invalid slot ID');

      // 5d. Same-day slot past cutoff in IST rejected with 400
      const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
      Date.prototype.toLocaleTimeString = function (locale, options) {
        if (options && options.timeZone === 'Asia/Kolkata') {
          return '15:00'; // 3:00 PM IST (past 11:00 AM morning cutoff)
        }
        return origToLocaleTimeString.call(this, locale, options);
      };

      let isCutoffRejected = false;
      try {
        const cutoffOrder = await api(
          'POST',
          '/orders',
          {
            addressId: testAddress._id.toString(),
            slot: 'morning',
            deliveryDate: 'today',
            paymentMethod: 'cod',
            items: [{ productId: prodSlot._id.toString(), qty: 3 }],
          },
          customerToken
        );
        isCutoffRejected =
          cutoffOrder.status === 400 &&
          cutoffOrder.data?.message?.includes('Cutoff time for morning delivery slot has passed');
      } finally {
        Date.prototype.toLocaleTimeString = origToLocaleTimeString;
      }

      record(
        'Item 6',
        'Fixed slot IDs (morning, afternoon, evening) & deliveryDate (today/tomorrow only) enforced with IST cutoff',
        isTomorrowValid && isInvalidDateRejected && isInvalidSlotRejected && isCutoffRejected,
        {
          isTomorrowValid,
          isInvalidDateRejected,
          isInvalidSlotRejected,
          isCutoffRejected,
        }
      );
    }

    console.log('\n======================================================================');
    const allPassed = results.every((r) => r.pass);
    console.log(allPassed ? '🎉 ALL PLAYBOOK VERIFICATION TESTS PASSED!' : '⚠️ SOME TESTS FAILED');
    console.log('======================================================================\n');

  } finally {
    console.log('🧹 Cleaning up test artifacts...');
    if (cleanup.orders.length > 0) {
      await StockLog.deleteMany({ orderId: { $in: cleanup.orders } });
      await Order.deleteMany({ _id: { $in: cleanup.orders } });
    }
    if (cleanup.products.length > 0) {
      await Product.deleteMany({ _id: { $in: cleanup.products } });
    }
    await Address.deleteMany({ userId: customer._id });
    await User.deleteMany({ phone: { $in: ['9999900010', '9999900011'] } });
    await Category.deleteMany({
      $or: [
        { _id: category?._id },
        { nameEn: 'Playbook Test Category' }
      ]
    });
    console.log('✓ Cleanup complete.');

    if (server) server.close();
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
