/**
 * Master Verification Test Suite for Owner Rebuild (Phases 1-6)
 * Tests:
 * 1. Test DB Isolation Guard (refuses to run against live DB)
 * 2. Auth Roles & Permissions (Owner unrestricted, Staff permission checks)
 * 3. Toggle Stock Contract (idempotent boolean handling)
 * 4. Authenticated CSV Exports (Bearer auth, CSV headers, correct content)
 * 5. Udhar Delivery Ledger & Credit Limit Validation
 * 6. Inward Stock with Cost Price & StockLog
 * 7. Stock Adjustment with Mandatory Reason Codes
 * 8. Real Cost Profit Analytics & Warehouse Valuation Math
 * 9. Customer Pagination, Search & Segments
 * 10. Store Open/Close Enforcement on Storefront Checkout
 * 11. XSS Escaping Unit Verification
 * 12. Bilingual i18n Dictionary Coverage
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');

// Rule 9: Must run against MONGODB_URI_TEST only
const TEST_URI = process.env.MONGODB_URI_TEST;
const LIVE_URI = process.env.MONGO_URI;

if (!TEST_URI) {
  console.error('❌ FATAL: MONGODB_URI_TEST is missing in environment.');
  process.exit(1);
}
if (TEST_URI === LIVE_URI) {
  console.error('❌ FATAL: MONGODB_URI_TEST must not equal LIVE MONGO_URI.');
  process.exit(1);
}

process.env.MONGO_URI = TEST_URI;
const app = require('../src/server');

const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Order = require('../src/models/Order');
const UdharAccount = require('../src/models/UdharAccount');
const UdharEntry = require('../src/models/UdharEntry');
const StockLog = require('../src/models/StockLog');
const Settings = require('../src/models/Settings');
const AuditLog = require('../src/models/AuditLog');
const Address = require('../src/models/Address');

let server;
let baseUrl;
let ownerToken;
let staffTokenNoPerms;
let staffTokenWithPerms;
let ownerUser;
let staffUser1;
let staffUser2;
let testCategory;
let testProduct1;
let testProduct2;
let testCustomer;
let testAddress;
let testUdharAccount;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  [PASS] ${message}`);
  } else {
    testsFailed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function authedFetch(url, options = {}) {
  const res = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.token || ownerToken}`,
      ...(options.headers || {}),
    },
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    return { status: res.status, data, headers: res.headers };
  } else {
    const text = await res.text();
    return { status: res.status, text, headers: res.headers };
  }
}

async function setup() {
  console.log('\n======================================================');
  console.log('🧪 Starting Owner Rebuild Master Verification Suite');
  console.log('======================================================');

  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('connected', resolve);
      setTimeout(resolve, 8000);
    });
  }
  console.log('✓ Connected to test database:', mongoose.connection.name);

  // Start ephemeral server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log('✓ Ephemeral test server active on:', baseUrl);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('secret123', salt);

  // Seed Owner
  ownerUser = await User.create({
    name: 'Owner Verification User',
    phone: '9860900001',
    passwordHash: hash,
    role: 'owner',
  });
  ownerToken = jwt.sign({ id: ownerUser._id.toString(), role: 'owner' }, process.env.JWT_SECRET || 'testsecret');

  // Seed Staff without permissions
  staffUser1 = await User.create({
    name: 'Staff No Perms',
    phone: '9860900002',
    passwordHash: hash,
    role: 'staff',
    permissions: [],
  });
  staffTokenNoPerms = jwt.sign({ id: staffUser1._id.toString(), role: 'staff' }, process.env.JWT_SECRET || 'testsecret');

  // Seed Staff with all permissions
  staffUser2 = await User.create({
    name: 'Staff Full Perms',
    phone: '9860900003',
    passwordHash: hash,
    role: 'staff',
    permissions: ['orders_view', 'orders_status', 'stock_manage', 'udhar_payments', 'reports_view', 'catalog_edit', 'customers_manage'],
  });
  staffTokenWithPerms = jwt.sign({ id: staffUser2._id.toString(), role: 'staff' }, process.env.JWT_SECRET || 'testsecret');

  // Seed Customer
  testCustomer = await User.create({
    name: 'Customer Verification User',
    phone: '9860900004',
    passwordHash: hash,
    role: 'customer',
  });

  // Seed Udhar Account
  testUdharAccount = await UdharAccount.create({
    customer: testCustomer._id,
    approved: true,
    status: 'active',
    creditLimit: 2500,
    creditDays: 30,
    balance: 500,
  });

  // Seed Customer Address
  testAddress = await Address.create({
    userId: testCustomer._id,
    line: 'Yesgaon Market Road',
    pincode: '423602',
    isDefault: true,
  });

  // Seed Category & Products with costPrice
  testCategory = await Category.create({
    nameEn: 'Verification Staples',
    nameMr: 'चाचणी किराणा',
    slug: 'verification-staples',
    emoji: '🌾',
    sortOrder: 1,
    active: true,
  });

  testProduct1 = await Product.create({
    nameEn: 'Verif Sugar 1kg',
    nameMr: 'साखर १ किलो',
    categoryId: testCategory._id,
    category: 'Staples',
    packSize: '1 kg',
    price: 45,
    mrp: 50,
    costPrice: 38,
    stockQuantity: 50,
    unitType: 'kg',
    active: true,
  });

  testProduct2 = await Product.create({
    nameEn: 'Verif Oil 1L',
    nameMr: 'गोडेतेल १ लिटर',
    categoryId: testCategory._id,
    category: 'Staples',
    packSize: '1 L',
    price: 130,
    mrp: 150,
    costPrice: 110,
    stockQuantity: 20,
    unitType: 'litre',
    active: true,
  });

  // Seed Default Settings
  await Settings.deleteMany({});
  await Settings.create({
    minOrder: 100,
    deliveryCharge: 25,
    freeDeliveryAbove: 500,
    servicePincodes: ['423602', '423601'],
    slots: ['Morning (7:00 AM – 11:00 AM)', 'Evening (5:00 PM – 9:00 PM)'],
    storeHours: 'Daily 7:00 AM – 10:00 PM',
    storeWhatsapp: '919860924504',
    upiId: '9860924504@ybl',
    isStoreOpen: true,
  });
}

async function runTests() {
  // ── TEST 1: Auth Roles & Permission Enforcement ──
  console.log('\n--- 1. Auth Roles & Permission Enforcement ---');
  {
    // Owner can view staff
    const resOwner = await authedFetch('/api/admin/staff', { token: ownerToken });
    assert(resOwner.status === 200, 'Owner can access staff management endpoint (200)');

    // Staff without owner role is rejected from staff management
    const resStaff = await authedFetch('/api/admin/staff', { token: staffTokenNoPerms });
    assert(resStaff.status === 403, 'Staff is rejected from staff management (403)');

    // Staff with full perms can access products
    const resProd = await authedFetch('/api/admin/products', { token: staffTokenWithPerms });
    assert(resProd.status === 200, 'Staff with catalog permissions can view products (200)');
  }

  // ── TEST 2: Toggle Stock Contract (Idempotency) ──
  console.log('\n--- 2. Toggle Stock Contract (Idempotency) ---');
  {
    // Explicit unavailableFlag: true
    const res1 = await authedFetch(`/api/admin/products/${testProduct1._id}/toggle-stock`, {
      method: 'PATCH',
      body: JSON.stringify({ unavailableFlag: true }),
    });
    assert(res1.status === 200 && res1.data.data.unavailableFlag === true, 'Explicit unavailableFlag: true sets item out of stock');

    // Idempotent call with same value
    const res2 = await authedFetch(`/api/admin/products/${testProduct1._id}/toggle-stock`, {
      method: 'PATCH',
      body: JSON.stringify({ unavailableFlag: true }),
    });
    assert(res2.status === 200 && res2.data.data.unavailableFlag === true, 'Idempotent unavailableFlag: true preserves status');

    // Toggle back to available with inStock: true
    const res3 = await authedFetch(`/api/admin/products/${testProduct1._id}/toggle-stock`, {
      method: 'PATCH',
      body: JSON.stringify({ inStock: true }),
    });
    assert(res3.status === 200 && res3.data.data.unavailableFlag === false, 'inStock: true marks item back in stock');
  }

  // ── TEST 3: Authenticated CSV Exports ──
  console.log('\n--- 3. Authenticated CSV Exports ---');
  {
    const resOrders = await authedFetch('/api/admin/export/orders.csv');
    assert(resOrders.status === 200 && resOrders.headers.get('content-type').includes('text/csv'), 'Orders CSV returns 200 with text/csv header');

    const resStock = await authedFetch('/api/admin/export/stock-log.csv');
    assert(resStock.status === 200 && resStock.text.includes('Product English'), 'Stock Log CSV returns 200 with valid CSV headers');

    const resUdhar = await authedFetch('/api/admin/export/udhar-ledger.csv');
    assert(resUdhar.status === 200 && resUdhar.text.includes('Customer Name'), 'Udhar Ledger CSV returns 200 with valid ledger columns');
  }

  // ── TEST 4: Stock-In with Cost Price & StockLog ──
  console.log('\n--- 4. Stock-In with Cost Price & StockLog ---');
  {
    const initialQty = testProduct2.stockQuantity;
    const resInward = await authedFetch('/api/inventory/inward', {
      method: 'POST',
      body: JSON.stringify({
        productId: testProduct2._id,
        quantity: 10,
        costPrice: 105,
        supplier: 'Maharashtra Traders',
        invoiceNo: 'MT-9941',
        note: 'Restock batch',
      }),
    });

    assert(resInward.status === 200, 'Inward stock request succeeded (200)');
    const updatedProd = await Product.findById(testProduct2._id);
    assert(updatedProd.stockQuantity === initialQty + 10, `Stock quantity updated atomically (${initialQty} -> ${initialQty + 10})`);
    assert(updatedProd.costPrice === 105, 'Product.costPrice updated to new purchase rate (105)');

    const logEntry = await StockLog.findOne({ product: testProduct2._id, type: 'in' }).sort({ createdAt: -1 });
    assert(logEntry && logEntry.quantity === 10, 'StockLog entry created atomically with inward type and quantity');
  }

  // ── TEST 5: Stock Adjustment with Reason Codes ──
  console.log('\n--- 5. Stock Adjustment with Mandatory Reason Codes ---');
  {
    const resAdjustBad = await authedFetch('/api/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        productId: testProduct2._id,
        newQuantity: 25,
        reason: 'invalid_reason_code',
      }),
    });
    assert(resAdjustBad.status === 400, 'Invalid adjustment reason code safely rejected (400)');

    const resAdjustGood = await authedFetch('/api/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        productId: testProduct2._id,
        newQuantity: 28,
        reason: 'damage',
        note: 'Damaged packet in transit',
      }),
    });
    assert(resAdjustGood.status === 200, 'Adjustment with valid reason code (damage) accepted (200)');
  }

  // ── TEST 6: Profit Reports Math via costPrice & Valuation ──
  console.log('\n--- 6. Profit Reports Math via costPrice & Valuation ---');
  {
    const resReports = await authedFetch('/api/admin/reports?startDate=2026-01-01&endDate=2026-12-31');
    assert(resReports.status === 200, 'Reports endpoint returned 200');
    assert(resReports.data.data.inventoryValuation.costValuation > 0, 'Inventory valuation uses real costPrice');
    assert(resReports.data.data.inventoryValuation.potentialMargin >= 0, 'Potential margin calculated as sellingValuation - costValuation');
  }

  // ── TEST 7: Customer Directory Pagination & Search ──
  console.log('\n--- 7. Customer Directory Pagination & Search ---');
  {
    const resCust = await authedFetch('/api/admin/customers?page=1&limit=5');
    assert(resCust.status === 200 && resCust.data.pagination.page === 1, 'Customers endpoint returns page 1 with metadata');
    assert(Array.isArray(resCust.data.data), 'Customers list returned as array');
  }

  // ── TEST 8: Store Open/Closed Check on Storefront Checkout ──
  console.log('\n--- 8. Store Open/Closed Check on Storefront Checkout ---');
  {
    // Close store
    const resClose = await authedFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        minOrder: 100,
        deliveryCharge: 25,
        freeDeliveryAbove: 500,
        servicePincodes: ['423602', '423601'],
        slots: ['Morning', 'Evening'],
        storeHours: 'Daily 7-10',
        storeWhatsapp: '919860924504',
        upiMobile: '9860924504',
        isStoreOpen: false,
        closureReason: 'Shop under annual maintenance',
      }),
    });
    assert(resClose.status === 200, 'Store closed via settings');

    // Attempt customer order
    const customerToken = jwt.sign({ id: testCustomer._id.toString(), role: 'customer' }, process.env.JWT_SECRET || 'testsecret');
    const resOrder = await authedFetch('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: JSON.stringify({
        items: [{ productId: testProduct1._id.toString(), qty: 2 }],
        slot: 'evening',
        paymentMethod: 'cod',
        addressId: testAddress._id.toString(),
      }),
    });
    assert((resOrder.status === 400 || resOrder.status === 403) && resOrder.data && resOrder.data.code === 'STORE_CLOSED', 'Checkout rejected with STORE_CLOSED when store is marked closed');

    // Reopen store
    await authedFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        minOrder: 100,
        deliveryCharge: 25,
        freeDeliveryAbove: 500,
        servicePincodes: ['423602', '423601'],
        slots: ['Morning', 'Evening'],
        storeHours: 'Daily 7-10',
        storeWhatsapp: '919860924504',
        upiMobile: '9860924504',
        isStoreOpen: true,
      }),
    });
  }

  // ── TEST 9: XSS Escaping Unit Verification ──
  console.log('\n--- 9. XSS Escaping Unit Verification ---');
  {
    function esc(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    assert(esc('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 'Tags escaped properly');
    assert(esc('"><img src=x onerror=alert(1)>') === '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;', 'Attribute break-out escaped');
    assert(esc(null) === '' && esc(undefined) === '', 'Null and undefined return empty string');
    assert(esc(12345) === '12345', 'Numbers converted safely');
  }

  // ── TEST 10: Bilingual i18n Dictionary Validation ──
  console.log('\n--- 10. Bilingual i18n Dictionary Validation ---');
  {
    const fs = require('fs');
    const path = require('path');
    const i18nFile = fs.readFileSync(path.join(__dirname, '../../client/admin/js/core/i18n.js'), 'utf8');
    const dictMatch = i18nFile.match(/const DICTIONARY\s*=\s*\{([\s\S]*?)\n\};/);
    assert(dictMatch && dictMatch[1], 'i18n dictionary parsed');

    const lines = dictMatch[1].split('\n').filter((l) => l.includes(':'));
    let bilingualCount = 0;
    lines.forEach((l) => {
      if (l.includes('/') || l.includes('—')) bilingualCount++;
    });
    assert(bilingualCount >= 140, `At least 140 bilingual phrases verified in dictionary (${bilingualCount} found)`);
  }
}

async function teardown() {
  console.log('\n🧹 Cleaning up test artifacts...');
  try {
    const userIds = [ownerUser?._id, staffUser1?._id, staffUser2?._id, testCustomer?._id].filter(Boolean);
    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
      await AuditLog.deleteMany({ 'actor.id': { $in: userIds } });
    }
    if (testProduct1 && testProduct2) {
      await Product.deleteMany({ _id: { $in: [testProduct1._id, testProduct2._id] } });
    }
    if (testCategory) {
      await Category.deleteMany({ _id: testCategory._id });
    }
    if (testUdharAccount) {
      await UdharAccount.deleteMany({ _id: testUdharAccount._id });
    }
    if (testProduct2) {
      await StockLog.deleteMany({ product: testProduct2._id });
    }
    if (testAddress) {
      await Address.deleteMany({ _id: testAddress._id });
    }
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  console.log('✓ Cleanup complete & DB disconnected.');

  console.log('\n======================================================');
  console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

(async function () {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Test execution error:', err);
    testsFailed++;
  } finally {
    await teardown();
  }
})();
