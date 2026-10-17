'use strict';

/**
 * Phase 1 Hotfixes Regression Test Suite
 *
 * Verifies:
 *  1. Database test URI isolation guard.
 *  2. Toggle stock API contract: idempotent unavailableFlag and inStock handling.
 *  3. Role enforcement: Staff and Owner allowed on admin endpoints, customer rejected.
 *  4. Authenticated CSV exports: require valid Bearer token and return 200 text/csv.
 *  5. Static file integrity: no mk_token/mk_role, no localStorage.clear(), stray comma fix in settings.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// ── 1. TEST URI ISOLATION GUARD ───────────────────────────────────────────────
const testMongoUri = process.env.MONGODB_URI_TEST || process.env.MONGO_URI_TEST;
const prodMongoUri = process.env.MONGO_URI;

function verifyTestUriSafety(testUri, prodUri) {
  if (!testUri) {
    throw new Error('SAFETY ERROR: MONGODB_URI_TEST is required to run automated tests.');
  }
  if (testUri.trim() === (prodUri || '').trim()) {
    throw new Error('CRITICAL SAFETY REFUSAL: MONGODB_URI_TEST equals production MONGO_URI! Refusing to run tests against live DB.');
  }
  return true;
}

verifyTestUriSafety(testMongoUri, prodMongoUri);

process.env.MONGO_URI = testMongoUri;
const app = require('../src/server');

const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

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

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ── Test Runner ───────────────────────────────────────────────────────────────
async function runTests() {
  console.log('--- STARTING PHASE 1 HOTFIXES REGRESSION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // Tracking IDs for cleanup
  const cleanupUserIds = [];
  const cleanupProductIds = [];
  const cleanupCategoryIds = [];

  try {
    // 1. Wait for DB connection
    while (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const currentDb = mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown';
    console.log(`Connected to test DB: ${currentDb}`);

    // 2. Start HTTP server on ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
    console.log(`Test server running at ${baseUrl}`);

    // 3. Setup test users and data
    const ownerUser = await User.create({
      name: 'Test Owner Hotfix',
      phone: '9999900001',
      passwordHash: '$2b$10$dummyhashforeownerverification12345678901234567890',
      role: 'owner',
      isVerified: true,
    });
    cleanupUserIds.push(ownerUser._id);
    const ownerToken = makeToken(ownerUser);

    const staffUser = await User.create({
      name: 'Test Staff Hotfix',
      phone: '9999900002',
      passwordHash: '$2b$10$dummyhashforstaffverification12345678901234567890',
      role: 'staff',
      isVerified: true,
    });
    cleanupUserIds.push(staffUser._id);
    const staffToken = makeToken(staffUser);

    const customerUser = await User.create({
      name: 'Test Customer Hotfix',
      phone: '9999900003',
      passwordHash: '$2b$10$dummyhashforcustomerverification1234567890123456789',
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customerUser._id);
    const customerToken = makeToken(customerUser);

    const testCat = await Category.create({
      nameEn: 'Hotfix Test Cat',
      nameMr: 'हॉटफिक्स टेस्ट कॅट',
      emoji: '🏷️',
      slug: 'hotfix-test-cat-' + Date.now(),
    });
    cleanupCategoryIds.push(testCat._id);

    const testProduct = await Product.create({
      nameEn: 'Hotfix Test Sugar',
      nameMr: 'हॉटफिक्स टेस्ट साखर',
      categoryId: testCat._id,
      packSize: '1 kg',
      unitType: 'kg',
      price: 45,
      mrp: 50,
      stockQuantity: 20,
      reorderLevel: 5,
      unavailableFlag: false,
    });
    cleanupProductIds.push(testProduct._id);

    // ── TEST 1: Role Guard on Admin Endpoints ──
    console.log('\n[TEST 1] Role Guard Enforcement (Owner & Staff Allowed, Customer/Anon Rejected)');
    {
      const anonRes = await api('GET', '/admin/products');
      assert(anonRes.status === 401, 'Anonymous request to /admin/products rejected with 401');

      const custRes = await api('GET', '/admin/products', null, customerToken);
      assert(custRes.status === 403, 'Customer request to /admin/products rejected with 403');

      const ownerRes = await api('GET', '/admin/products', null, ownerToken);
      assert(ownerRes.status === 200 && ownerRes.data.success, 'Owner request to /admin/products allowed with 200');

      const staffRes = await api('GET', '/admin/products', null, staffToken);
      assert(staffRes.status === 200 && staffRes.data.success, 'Staff request to /admin/products allowed with 200');
    }

    // ── TEST 2: Toggle Stock Contract (Idempotent & Dual Support) ──
    console.log('\n[TEST 2] Toggle Stock Contract (unavailableFlag & inStock idempotency)');
    {
      // A: Send { unavailableFlag: true } -> should mark unavailable
      const res1 = await api('PATCH', `/admin/products/${testProduct._id}/toggle-stock`, { unavailableFlag: true }, ownerToken);
      assert(res1.status === 200 && res1.data.data.unavailableFlag === true, 'Explicit unavailableFlag: true sets unavailableFlag to true');

      const p1 = await Product.findById(testProduct._id);
      assert(p1.unavailableFlag === true && p1.inStock === false, 'Product in DB has unavailableFlag: true and inStock virtual: false');

      // B: Send { unavailableFlag: true } again -> idempotent
      const res2 = await api('PATCH', `/admin/products/${testProduct._id}/toggle-stock`, { unavailableFlag: true }, ownerToken);
      assert(res2.status === 200 && res2.data.data.unavailableFlag === true, 'Explicit unavailableFlag: true is idempotent on repeated call');

      // C: Send { inStock: true } -> should set unavailableFlag: false
      const res3 = await api('PATCH', `/admin/products/${testProduct._id}/toggle-stock`, { inStock: true }, ownerToken);
      assert(res3.status === 200 && res3.data.data.unavailableFlag === false, 'Explicit inStock: true clears unavailableFlag');

      const p3 = await Product.findById(testProduct._id);
      assert(p3.unavailableFlag === false && p3.inStock === true, 'Product in DB has unavailableFlag: false and inStock: true');

      // D: Send { inStock: false } -> should set unavailableFlag: true
      const res4 = await api('PATCH', `/admin/products/${testProduct._id}/toggle-stock`, { inStock: false }, staffToken);
      assert(res4.status === 200 && res4.data.data.unavailableFlag === true, 'Staff can call toggle-stock with inStock: false');

      // E: Parameterless toggle -> flips flag
      const res5 = await api('PATCH', `/admin/products/${testProduct._id}/toggle-stock`, {}, ownerToken);
      assert(res5.status === 200 && res5.data.data.unavailableFlag === false, 'Parameterless call toggles unavailableFlag to false');
    }

    // ── TEST 3: Authenticated CSV Downloads ──
    console.log('\n[TEST 3] Authenticated CSV Downloads');
    {
      // Orders CSV
      const noAuthOrders = await api('GET', '/admin/export/orders.csv');
      assert(noAuthOrders.status === 401, 'Unauthenticated /admin/export/orders.csv returns 401');

      const authOrders = await api('GET', '/admin/export/orders.csv', null, ownerToken);
      assert(authOrders.status === 200, 'Authenticated /admin/export/orders.csv returns 200');
      assert((authOrders.headers.get('content-type') || '').includes('text/csv'), 'Orders export returns text/csv');

      // Stock Log CSV
      const noAuthStock = await api('GET', '/admin/export/stock-log.csv');
      assert(noAuthStock.status === 401, 'Unauthenticated /admin/export/stock-log.csv returns 401');

      const authStock = await api('GET', '/admin/export/stock-log.csv', null, ownerToken);
      assert(authStock.status === 200, 'Authenticated /admin/export/stock-log.csv returns 200');

      // Udhar Ledger CSV
      const noAuthUdhar = await api('GET', '/admin/export/udhar-ledger.csv');
      assert(noAuthUdhar.status === 401, 'Unauthenticated /admin/export/udhar-ledger.csv returns 401');

      const authUdhar = await api('GET', '/admin/export/udhar-ledger.csv', null, staffToken);
      assert(authUdhar.status === 200, 'Staff authenticated /admin/export/udhar-ledger.csv returns 200');
    }

    // ── TEST 4: Static File Integrity & Code Contracts ──
    console.log('\n[TEST 4] Static File Integrity (Auth keys, Cart wipe, Stray comma, escapeHtml)');
    {
      const clientDir = path.join(__dirname, '../../client/admin');
      const stockInHtml = fs.readFileSync(path.join(clientDir, 'stock-in.html'), 'utf8');
      const lowStockHtml = fs.readFileSync(path.join(clientDir, 'low-stock.html'), 'utf8');
      const adminCommonJs = fs.readFileSync(path.join(clientDir, 'js/admin-common.js'), 'utf8');
      const adminSettingsJs = fs.readFileSync(path.join(clientDir, 'js/admin-settings.js'), 'utf8');

      assert(!stockInHtml.includes('mk_token'), 'stock-in.html has no mk_token');
      assert(!stockInHtml.includes('mk_role'), 'stock-in.html has no mk_role');
      assert(!stockInHtml.includes('localStorage.clear()'), 'stock-in.html does not call localStorage.clear()');
      assert(stockInHtml.includes('admin-common.js'), 'stock-in.html imports admin-common.js');

      assert(!lowStockHtml.includes('mk_token'), 'low-stock.html has no mk_token');
      assert(!lowStockHtml.includes('mk_role'), 'low-stock.html has no mk_role');
      assert(!lowStockHtml.includes('localStorage.clear()'), 'low-stock.html does not call localStorage.clear()');
      assert(lowStockHtml.includes('admin-common.js'), 'low-stock.html imports admin-common.js');

      assert(adminCommonJs.includes('function escapeHtml'), 'admin-common.js exports escapeHtml');
      assert(adminCommonJs.includes('function downloadAuthed'), 'admin-common.js exports downloadAuthed');
      assert(adminCommonJs.includes("['owner', 'staff']"), 'admin-common.js permits both owner and staff roles');

      assert(!adminSettingsJs.includes('deleteTestimonialItem(\'${item._id}\')", style='), 'admin-settings.js stray comma removed');
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // ── Teardown & Clean up ──
    console.log('\nCleaning up test records from test DB...');
    try {
      if (cleanupProductIds.length > 0) {
        await Product.deleteMany({ _id: { $in: cleanupProductIds } });
      }
      if (cleanupCategoryIds.length > 0) {
        await Category.deleteMany({ _id: { $in: cleanupCategoryIds } });
      }
      if (cleanupUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: cleanupUserIds } });
      }
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log('Teardown complete.');
  }

  console.log(`\n========================================`);
  console.log(`PHASE 1 REGRESSION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
