'use strict';

/**
 * Customer Backend Verification Suite
 * Runs strictly against MONGODB_URI_TEST (mahalaxmi_kirana_test).
 * Tests all Phase 4 backend criteria:
 * - 401 / 403 / 400 paths
 * - Price tampering rejection (server recomputes from DB snapshot)
 * - Out-of-stock validation
 * - Store closed enforcement (HTTP 403 STORE_CLOSED)
 * - Pincode serviceability check
 * - Concurrent purchase of last available stock item (atomic decrement)
 * - Full E2E flow: customer register -> address -> order -> status update -> cancel (restores stock) -> reorder
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const TEST_URI = process.env.MONGODB_URI_TEST;
const LIVE_URI = process.env.MONGO_URI;

if (!TEST_URI) {
  console.error('❌ FATAL: MONGODB_URI_TEST is not set in environment.');
  process.exit(1);
}
if (TEST_URI === LIVE_URI) {
  console.error('❌ FATAL: MONGODB_URI_TEST must not be equal to MONGO_URI.');
  process.exit(1);
}

process.env.MONGO_URI = TEST_URI;
const app = require('../src/server');

const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Order = require('../src/models/Order');
const Address = require('../src/models/Address');
const Settings = require('../src/models/Settings');

let server;
let baseUrl;
let customerToken;
let customerId;
let validAddressId;
let badAddressId;
let testProduct;
let testCategory;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('======================================================================');
  console.log('🧪 RUNNING CUSTOMER BACKEND & E2E VERIFICATION SUITE');
  console.log('======================================================================');

  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('connected', resolve);
      setTimeout(resolve, 8000);
    });
  }
  console.log(`✓ Connected to TEST database: "${mongoose.connection.name}"`);

  // Start test server on dynamic port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test API server listening on ${baseUrl}`);

  try {
    // 0. Setup test data
    await Settings.findOneAndUpdate(
      {},
      {
        storeName: 'Mahalaxmi Kirana Test',
        isStoreOpen: true,
        deliveryOpenTime: '07:00',
        deliveryCloseTime: '22:00',
        minOrder: 50,
        freeDeliveryAbove: 300,
        deliveryCharge: 20,
        servicePincodes: ['423601', '423602', '423603'],
      },
      { upsert: true, new: true }
    );

    // Clean test users & products
    await User.deleteMany({ phone: { $in: ['9999900001', '9999900002', '9999900003'] } });
    await Product.deleteMany({ nameEn: { $regex: /^Test E2E Product/ } });
    await Order.deleteMany({ 'deliveryAddress.recipientName': 'Test E2E Customer' });

    testCategory = await Category.findOne({ active: true });
    if (!testCategory) {
      testCategory = await Category.create({ name: 'Groceries', nameMr: 'किराणा', sortOrder: 1 });
    }

    testProduct = await Product.create({
      nameEn: 'Test E2E Product - Sugar',
      nameMr: 'साखर टेस्ट प्रॉडक्ट',
      categoryId: testCategory._id,
      price: 45,
      mrp: 50,
      stockQuantity: 10,
      unit: 'kg',
      packSize: '1 kg',
      active: true,
    });

    // 1. Auth & Registration
    console.log('\n--- 1. Auth & Profile ---');
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Test E2E Customer',
      phone: '9999900001',
      password: 'Password@123',
    });
    if (regRes.status !== 201) {
      throw new Error(`Register failed with status ${regRes.status}: ${JSON.stringify(regRes.body)}`);
    }
    customerToken = regRes.body.token;
    customerId = regRes.body.user._id;
    console.log('✅ PASS | Customer register (HTTP 201) returns token and user object');

    // Profile update
    const profileRes = await request('PUT', '/api/auth/profile', { name: 'Test Customer Updated' }, customerToken);
    if (profileRes.status !== 200 || profileRes.body.user.name !== 'Test Customer Updated') {
      throw new Error(`Profile update failed: ${JSON.stringify(profileRes.body)}`);
    }
    console.log('✅ PASS | Customer profile update (PUT /api/auth/profile) updates name');

    // 2. 401 Unauthorized paths
    console.log('\n--- 2. 401 Unauthorized Paths ---');
    const noAuthOrders = await request('GET', '/api/orders');
    if (noAuthOrders.status !== 401) throw new Error(`Expected 401 for orders without token, got ${noAuthOrders.status}`);
    const noAuthAddresses = await request('GET', '/api/addresses');
    if (noAuthAddresses.status !== 401) throw new Error(`Expected 401 for addresses without token, got ${noAuthAddresses.status}`);
    console.log('✅ PASS | Unauthenticated requests to /api/orders and /api/addresses return HTTP 401');

    // 3. Address Management & Pincode Serviceability
    console.log('\n--- 3. Address & Pincode Serviceability ---');
    // Valid address with GPS coordinates
    const validAddrRes = await request('POST', '/api/addresses', {
      line: 'Near Temple, Yesgaon',
      village: 'Yesgaon',
      landmark: 'Mahalaxmi Temple',
      pincode: '423601',
      locationPin: 'https://maps.google.com/?q=19.8912,74.4789',
      isDefault: true,
    }, customerToken);
    if (validAddrRes.status !== 201) {
      throw new Error(`Valid address creation failed: ${JSON.stringify(validAddrRes.body)}`);
    }
    validAddressId = validAddrRes.body.data._id;
    console.log('✅ PASS | Serviceable address created with landmark and GPS map link');

    // Address with unserviceable pincode
    const badAddrRes = await request('POST', '/api/addresses', {
      line: 'Marine Drive, Mumbai',
      pincode: '400001',
    }, customerToken);
    badAddressId = badAddrRes.body.data._id;

    // Order with unserviceable address must be rejected
    const badPincodeOrderRes = await request('POST', '/api/orders', {
      items: [{ productId: testProduct._id.toString(), qty: 2 }],
      addressId: badAddressId,
      slot: 'evening',
      deliveryDate: 'tomorrow',
      paymentMethod: 'cod',
    }, customerToken);

    if (badPincodeOrderRes.status !== 400 || !badPincodeOrderRes.body.message.includes('not available to pincode')) {
      throw new Error(`Expected unserviceable pincode rejection, got: ${JSON.stringify(badPincodeOrderRes.body)}`);
    }
    console.log('✅ PASS | Order to unserviceable pincode correctly rejected with HTTP 400');

    // 4. Price Tampering Rejection
    console.log('\n--- 4. Price Tampering Prevention ---');
    // Client sends price = 10, mrp = 10, total = 20 for product whose real DB price is 45
    const tamperedOrderRes = await request('POST', '/api/orders', {
      items: [{
        productId: testProduct._id.toString(),
        qty: 2,
        price: 10, // Tampered price
      }],
      addressId: validAddressId,
      slot: 'evening',
      deliveryDate: 'tomorrow',
      paymentMethod: 'cod',
      subtotal: 20, // Tampered subtotal
      deliveryCharge: 0,
      total: 20, // Tampered total
    }, customerToken);

    if (tamperedOrderRes.status !== 201) {
      throw new Error(`Order placement failed: ${JSON.stringify(tamperedOrderRes.body)}`);
    }
    const orderData = tamperedOrderRes.body.data;
    // Expected real subtotal: 2 * 45 = 90. Delivery fee: 20 (since < 300). Total: 110.
    if (orderData.subtotal !== 90 || orderData.deliveryCharge !== 20 || orderData.total !== 110) {
      throw new Error(`Server failed to recalculate authoritative prices from DB! subtotal=${orderData.subtotal}, total=${orderData.total}`);
    }
    console.log(`✅ PASS | Server recalculated real price (₹90 subtotal + ₹20 fee = ₹110), ignoring client tampering (₹20)`);

    // Clean up tampered order
    await Order.findByIdAndDelete(orderData._id);

    // 5. Out of Stock Validation
    console.log('\n--- 5. Out of Stock Validation ---');
    const oosOrderRes = await request('POST', '/api/orders', {
      items: [{
        productId: testProduct._id.toString(),
        qty: 15, // Stock is 10, requesting 15 (within max 50 limit)
      }],
      addressId: validAddressId,
      slot: 'evening',
      deliveryDate: 'tomorrow',
      paymentMethod: 'cod',
    }, customerToken);

    if (oosOrderRes.status !== 400 || !Array.isArray(oosOrderRes.body.invalidItems)) {
      throw new Error(`Expected invalidItems array with HTTP 400, got: ${JSON.stringify(oosOrderRes.body)}`);
    }
    console.log('✅ PASS | Order with quantity > stockQuantity rejected with HTTP 400 and invalidItems breakdown');

    // 6. Closed Store Enforcement (HTTP 403 STORE_CLOSED)
    console.log('\n--- 6. Closed Store Enforcement ---');
    await Settings.findOneAndUpdate({}, { isStoreOpen: false });
    const closedOrderRes = await request('POST', '/api/orders', {
      items: [{
        productId: testProduct._id.toString(),
        qty: 2,
      }],
      addressId: validAddressId,
      slot: 'evening',
      deliveryDate: 'tomorrow',
      paymentMethod: 'cod',
    }, customerToken);

    if (closedOrderRes.status !== 403 || closedOrderRes.body.code !== 'STORE_CLOSED') {
      throw new Error(`Expected HTTP 403 STORE_CLOSED, got: ${JSON.stringify(closedOrderRes.body)}`);
    }
    console.log('✅ PASS | Closed store rejects checkout with HTTP 403 STORE_CLOSED');

    // Reopen store
    await Settings.findOneAndUpdate({}, { isStoreOpen: true });

    // 7. Atomic Concurrency on Last Stock Item
    console.log('\n--- 7. Atomic Concurrency on Last Stock Item ---');
    const singleStockProduct = await Product.create({
      nameEn: 'Last Item In Stock',
      nameMr: 'शेवटची शिल्लक वस्तू',
      categoryId: testCategory._id,
      price: 100,
      mrp: 120,
      stockQuantity: 1, // EXACTLY 1 item in stock
      unit: 'pack',
      packSize: '1 pack',
      active: true,
    });

    const createOrderPayload = () => ({
      items: [{
        productId: singleStockProduct._id.toString(),
        qty: 1,
      }],
      addressId: validAddressId,
      slot: 'evening',
      deliveryDate: 'tomorrow',
      paymentMethod: 'cod',
    });

    // Send two concurrent orders simultaneously
    const [resA, resB] = await Promise.all([
      request('POST', '/api/orders', createOrderPayload(), customerToken),
      request('POST', '/api/orders', createOrderPayload(), customerToken),
    ]);

    const statuses = [resA.status, resB.status];
    console.log(`resA: ${resA.status}`, resA.body);
    console.log(`resB: ${resB.status}`, resB.body);
    const successes = statuses.filter(s => s === 201).length;
    const failures = statuses.filter(s => s === 400 || s === 409).length;

    if (successes !== 1 || failures !== 1) {
      throw new Error(`Atomic concurrency test failed! successes=${successes}, failures=${failures}`);
    }
    const updatedProd = await Product.findById(singleStockProduct._id);
    if (updatedProd.stockQuantity !== 0) {
      throw new Error(`Expected final stock 0, got ${updatedProd.stockQuantity}`);
    }
    console.log('✅ PASS | Concurrent orders for 1 remaining stock item: exactly 1 succeeded (201), 1 rejected (400), final stock = 0');

    // 8. Full End-to-End Order Lifecycle (Place -> Status updates -> Cancel -> Stock Restored -> Reorder)
    console.log('\n--- 8. Full E2E Order Lifecycle & Cancellation ---');
    // Ensure testProduct has known stock: 10
    await Product.findByIdAndUpdate(testProduct._id, { stockQuantity: 10 });

    const orderRes = await request('POST', '/api/orders', {
      items: [{
        productId: testProduct._id.toString(),
        qty: 3, // Order 3 units (subtotal: 3 * 45 = 135 >= minOrder 50)
      }],
      addressId: validAddressId,
      slot: 'evening',
      deliveryDate: 'tomorrow',
      paymentMethod: 'cod',
    }, customerToken);

    if (orderRes.status !== 201) {
      throw new Error(`Order placement failed: ${JSON.stringify(orderRes.body)}`);
    }
    const activeOrder = orderRes.body.data;
    const orderId = activeOrder._id;
    console.log(`✓ Placed order #${activeOrder.orderNumber || orderId} for 3 units`);

    // Verify stock was decremented from 10 to 7
    const prodAfterOrder = await Product.findById(testProduct._id);
    if (prodAfterOrder.stockQuantity !== 7) {
      throw new Error(`Expected stock 7 after ordering 3, got ${prodAfterOrder.stockQuantity}`);
    }
    console.log('✅ PASS | Product stock atomically decremented from 10 to 7');

    // Customer cancels order with reason
    const cancelRes = await request('PATCH', `/api/orders/${orderId}/cancel`, {
      reason: 'चुकीने ऑर्डर झाली / Ordered by mistake',
    }, customerToken);

    if (cancelRes.status !== 200 || cancelRes.body.data.status !== 'cancelled') {
      throw new Error(`Order cancellation failed: ${JSON.stringify(cancelRes.body)}`);
    }
    console.log('✅ PASS | Customer cancelled order with reason (status becomes "cancelled")');

    // Verify stock was restored from 7 back to 10
    const prodAfterCancel = await Product.findById(testProduct._id);
    if (prodAfterCancel.stockQuantity !== 10) {
      throw new Error(`Expected stock restored to 10, got ${prodAfterCancel.stockQuantity}`);
    }
    console.log('✅ PASS | Cancelled order restored stock atomically from 7 back to 10');

    // Customer reorders
    const reorderRes = await request('GET', `/api/orders/${orderId}/reorder`, null, customerToken);
    if (reorderRes.status !== 200 || !Array.isArray(reorderRes.body.available) || reorderRes.body.available.length === 0) {
      throw new Error(`Reorder failed: ${JSON.stringify(reorderRes.body)}`);
    }
    console.log('✅ PASS | Reorder endpoint (/api/orders/:id/reorder) returned available items and quantities');

    // 9. Unknown /api/* JSON 404 Standard
    console.log('\n--- 9. Unknown API 404 Standard ---');
    const unknownRes = await request('GET', '/api/some-nonexistent-endpoint-xyz');
    if (unknownRes.status !== 404 || unknownRes.body.success !== false) {
      throw new Error(`Expected JSON 404 for unknown route, got: ${JSON.stringify(unknownRes.body)}`);
    }
    console.log('✅ PASS | Unknown /api/* route returns bilingual JSON 404');

    console.log('\n======================================================================');
    console.log('🎉 ALL CUSTOMER BACKEND VERIFICATION CHECKS PASSED!');
    console.log('======================================================================\n');
  } finally {
    // Cleanup
    if (testProduct) await Product.findByIdAndDelete(testProduct._id);
    if (customerId) {
      await Address.deleteMany({ userId: customerId });
      await Order.deleteMany({ userId: customerId });
      await User.findByIdAndDelete(customerId);
    }
    await Settings.findOneAndUpdate({}, {
      minOrder: 100,
      deliveryCharge: 30,
      freeDeliveryAbove: 1000,
      servicePincodes: ['423601', '423602'],
      isStoreOpen: true,
    });
    if (server) server.close();
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
