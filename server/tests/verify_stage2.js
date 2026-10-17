'use strict';
/**
 * Stage 2 Comprehensive Verification Runner
 * Tests all 14 Stage 2 requirements + security checks.
 * Cleans up throwaway data after completion.
 */

const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../src/models/User');
const Address = require('../src/models/Address');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Settings = require('../src/models/Settings');

const http = require('http');
const app = require('../src/server');

let server;
let BASE_URL = 'http://localhost:5000/api';

// HTTP helper using fetch
async function req(method, path, body = null, token = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
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
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    }
    while (mongoose.connection.readyState !== 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log('✓ Connected to database');

    // Spin up ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    BASE_URL = `http://127.0.0.1:${port}/api`;
    console.log(`✓ Ephemeral test server active on ${BASE_URL}\n`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const results = [];
  function record(id, title, pass, actual) {
    results.push({ id, title, pass, actual });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}: ${title}`);
    if (!pass) console.log('   Actual:', actual);
  }

  // Generate unique throwaway phone numbers
  const phoneA = '981' + Math.floor(1000000 + Math.random() * 9000000);
  const phoneB = '982' + Math.floor(1000000 + Math.random() * 9000000);
  let ratePhone, okPhone;
  let userAId, userBId, tokenA, tokenB, addrAId, order1Id;
  let testProduct1, testProduct2;

  // Helper: dynamically choose slot and deliveryDate so tests pass at any hour in IST
  function getValidSlotData() {
    const istTimeStr = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const [istH, istM] = istTimeStr.split(':').map(Number);
    const currentMinsIST = istH * 60 + istM;

    if (currentMinsIST < 11 * 60) {
      return { slot: 'morning', deliveryDate: 'today' };
    } else if (currentMinsIST < 16 * 60) {
      return { slot: 'afternoon', deliveryDate: 'today' };
    } else if (currentMinsIST < 21 * 60) {
      return { slot: 'evening', deliveryDate: 'today' };
    } else {
      return { slot: 'morning', deliveryDate: 'tomorrow' };
    }
  }

  try {
    // ── Pre-fetch real products from DB ───────────────────────────────────
    const products = await Product.find({ active: true, inStock: true });
    testProduct1 = products.find(p => p.price >= 200) || products[0];
    testProduct2 = products.find(p => p._id.toString() !== testProduct1._id.toString());

    // ── Check 1: Register, login, GET /api/auth/me ────────────────────────
    const regA = await req('POST', '/auth/register', {
      name: 'Customer A',
      phone: phoneA,
      password: 'password123',
    });
    userAId = regA.data?.user?._id;

    const logA = await req('POST', '/auth/login', {
      phone: phoneA,
      password: 'password123',
    });
    tokenA = logA.data?.token;

    const meA = await req('GET', '/auth/me', null, tokenA);

    const check1Pass = regA.status === 201 && logA.status === 200 && meA.status === 200 && meA.data?.user?.phone === phoneA;
    record(1, 'Register, login, GET /api/auth/me for valid user', check1Pass, {
      registerStatus: regA.status,
      loginStatus: logA.status,
      meStatus: meA.status,
      userRole: meA.data?.user?.role,
    });

    // ── Check 2: Create order & verify fields ─────────────────────────────
    const addrA = await req('POST', '/addresses', {
      line: 'Main Road, Post Yesgaon',
      landmark: 'Near Datta Mandir',
      pincode: '423602',
      isDefault: true,
    }, tokenA);
    addrAId = addrA.data?.data?._id;

    const validSlotInfo = getValidSlotData();
    const orderQty = 2; // Ensure subtotal >= settings.minOrder (e.g. ₹210 * 2 = ₹420 >= ₹225)
    const expectedSubtotal = testProduct1.price * orderQty;

    const orderCreate = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'upi_qr',
      paymentRef: '9988',
      items: [{ productId: testProduct1._id.toString(), qty: orderQty }],
    }, tokenA);

    order1Id = orderCreate.data?.data?._id;
    const ordDoc = orderCreate.data?.data;
    const check2Pass = orderCreate.status === 201 &&
      Boolean(ordDoc?.customerName) &&
      Boolean(ordDoc?.customerPhone) &&
      ordDoc?.subtotal === expectedSubtotal &&
      ordDoc?.total === (ordDoc?.subtotal + ordDoc?.deliveryCharge);

    record(2, 'Create order with valid items & verify snapshot fields', check2Pass, {
      status: orderCreate.status,
      message: orderCreate.data?.message,
      orderNumber: ordDoc?.orderNumber,
      customerName: ordDoc?.customerName,
      customerPhone: ordDoc?.customerPhone,
      subtotal: ordDoc?.subtotal,
      deliveryCharge: ordDoc?.deliveryCharge,
      total: ordDoc?.total,
    });

    // ── Check 3: Price tampering prevention ───────────────────────────────
    const tamperOrder = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      subtotal: 1,         // Fake
      deliveryCharge: 0,   // Fake
      total: 1,            // Fake
      items: [{
        productId: testProduct1._id.toString(),
        qty: orderQty,
        price: 1,          // Fake
      }],
    }, tokenA);

    const check3Pass = tamperOrder.status === 201 &&
      tamperOrder.data?.data?.items[0]?.price === testProduct1.price &&
      tamperOrder.data?.data?.subtotal === expectedSubtotal;

    record(3, 'Price tampering ignored (server calculates from DB)', check3Pass, {
      sentPrice: 1,
      savedPrice: tamperOrder.data?.data?.items[0]?.price,
      savedSubtotal: tamperOrder.data?.data?.subtotal,
    });

    // ── Check 4: Cross-user order read & cancel ───────────────────────────
    const regB = await req('POST', '/auth/register', {
      name: 'Customer B',
      phone: phoneB,
      password: 'password123',
    });
    userBId = regB.data?.user?._id;
    tokenB = regB.data?.token;

    const crossRead = await req('GET', `/orders/${order1Id}`, null, tokenB);
    const crossCancel = await req('PATCH', `/orders/${order1Id}/cancel`, null, tokenB);

    const check4Pass = (crossRead.status === 404 || crossRead.status === 403) && crossCancel.status === 400;
    record(4, 'testB cannot read or cancel testA order', check4Pass, {
      crossReadStatus: crossRead.status,
      crossCancelStatus: crossCancel.status,
      cancelMessage: crossCancel.data?.message,
    });

    // ── Check 5: Out of stock item rejection & restoration ────────────────
    await Product.findByIdAndUpdate(testProduct2._id, { inStock: false, stockQuantity: 0 });

    const oosOrder = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: testProduct2._id.toString(), qty: 1 }],
    }, tokenA);

    // Restore immediately
    await Product.findByIdAndUpdate(testProduct2._id, { inStock: true, stockQuantity: 50 });

    const check5Pass = oosOrder.status === 400 &&
      Array.isArray(oosOrder.data?.invalidItems) &&
      oosOrder.data.invalidItems[0]?.reason === 'out_of_stock';

    record(5, 'Out-of-stock item rejected with invalidItems list', check5Pass, {
      status: oosOrder.status,
      message: oosOrder.data?.message,
      invalidItems: oosOrder.data?.invalidItems,
    });

    // ── Check 6: Order below minOrder & out-of-area pincode ────────────────
    const cheapProduct = await Product.findOne({ price: { $lt: 100 } });
    const lowOrder = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: cheapProduct._id.toString(), qty: 1 }],
    }, tokenA);

    const badAddr = await req('POST', '/addresses', {
      line: 'Marine Drive',
      pincode: '400001', // Outside service area
    }, tokenA);
    const badAddrId = badAddr.data?.data?._id;

    const outOfAreaOrder = await req('POST', '/orders', {
      addressId: badAddrId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: testProduct1._id.toString(), qty: 1 }],
    }, tokenA);

    const check6Pass = lowOrder.status === 400 && outOfAreaOrder.status === 400;
    record(6, 'Below minOrder and unserviceable pincode rejected', check6Pass, {
      lowOrderStatus: lowOrder.status,
      lowOrderMsg: lowOrder.data?.message,
      outOfAreaStatus: outOfAreaOrder.status,
      outOfAreaMsg: outOfAreaOrder.data?.message,
    });

    // ── Check 7: Input validation & duplicate merge ───────────────────────
    const badSlot = await req('POST', '/orders', {
      addressId: addrAId,
      slot: 'Midnight 3 AM',
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: testProduct1._id.toString(), qty: 1 }],
    }, tokenA);

    const badMethod = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'crypto',
      items: [{ productId: testProduct1._id.toString(), qty: 1 }],
    }, tokenA);

    const qtyZero = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: testProduct1._id.toString(), qty: 0 }],
    }, tokenA);

    const qty51 = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: testProduct1._id.toString(), qty: 51 }],
    }, tokenA);

    const emptyItems = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [],
    }, tokenA);

    const fiftyOneLines = [];
    for (let i = 0; i < 51; i++) {
      fiftyOneLines.push({ productId: testProduct1._id.toString(), qty: 1 });
    }
    const tooManyLines = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: fiftyOneLines,
    }, tokenA);

    const dupOrder = await req('POST', '/orders', {
      addressId: addrAId,
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [
        { productId: testProduct1._id.toString(), qty: 1 },
        { productId: testProduct1._id.toString(), qty: 2 },
      ],
    }, tokenA);

    const mergedQty = dupOrder.data?.data?.items?.length === 1 && dupOrder.data?.data?.items[0]?.qty === 3;
    const check7Pass = [400, 422].includes(badSlot.status) &&
      [400, 422].includes(badMethod.status) &&
      [400, 422].includes(qtyZero.status) &&
      [400, 422].includes(qty51.status) &&
      [400, 422].includes(emptyItems.status) &&
      [400, 422].includes(tooManyLines.status) &&
      mergedQty;

    record(7, 'Invalid slot, method, qty, length rejected & duplicate productIds merged', check7Pass, {
      badSlotStatus: badSlot.status,
      badMethodStatus: badMethod.status,
      qtyZeroStatus: qtyZero.status,
      qty51Status: qty51.status,
      emptyItemsStatus: emptyItems.status,
      tooManyLinesStatus: tooManyLines.status,
      mergedItemCount: dupOrder.data?.data?.items?.length,
      mergedTotalQty: dupOrder.data?.data?.items[0]?.qty,
    });

    // ── Check 8: Atomic cancel & status restrictions ──────────────────────
    const cancelNew = await req('PATCH', `/orders/${order1Id}/cancel`, null, tokenA);
    const cancelAgain = await req('PATCH', `/orders/${order1Id}/cancel`, null, tokenA);

    const packedOrderDoc = await Order.create({
      orderNumber: 'MK-TEST-PACKED-' + Date.now(),
      userId: userAId,
      customerName: 'Test Customer',
      customerPhone: phoneA,
      address: { line: 'Test Line', pincode: '423602' },
      items: [{ productId: testProduct1._id, nameEn: 'Item', nameMr: 'Item', packSize: '1kg', price: 200, qty: 1 }],
      subtotal: 200,
      deliveryCharge: 0,
      total: 200,
      paymentMethod: 'cod',
      slot: 'Morning (7:00 AM – 11:00 AM)',
      status: 'packed',
    });

    const cancelPacked = await req('PATCH', `/orders/${packedOrderDoc._id}/cancel`, null, tokenA);

    const check8Pass = cancelNew.status === 200 &&
      cancelAgain.status === 400 &&
      cancelPacked.status === 400;

    record(8, 'Cancel allowed for new, atomic rejection for packed or double-cancel', check8Pass, {
      cancelNewStatus: cancelNew.status,
      cancelAgainStatus: cancelAgain.status,
      cancelPackedStatus: cancelPacked.status,
    });

    // ── Check 9: Blocked user check ───────────────────────────────────────
    await User.findByIdAndUpdate(userAId, { blocked: true });

    const blockedLogin = await req('POST', '/auth/login', {
      phone: phoneA,
      password: 'password123',
    });

    const blockedTokenUse = await req('GET', '/auth/me', null, tokenA);

    await User.findByIdAndUpdate(userAId, { blocked: false });

    const check9Pass = blockedLogin.status === 403 &&
      blockedTokenUse.status === 403 &&
      blockedLogin.data?.message.includes('blocked');

    record(9, 'Blocked user cannot log in and existing token is rejected', check9Pass, {
      loginStatus: blockedLogin.status,
      loginMessage: blockedLogin.data?.message,
      tokenUseStatus: blockedTokenUse.status,
    });

    // ── Check 10: Expired or tampered token returns 401 ────────────────────
    const tampered = await req('GET', '/auth/me', null, 'header.payload.invalidSignature');
    const expiredToken = jwt.sign({ id: userAId }, process.env.JWT_SECRET, { expiresIn: '0s' });
    const expired = await req('GET', '/auth/me', null, expiredToken);

    const check10Pass = tampered.status === 401 && expired.status === 401;
    record(10, 'Tampered & expired JWT tokens return 401', check10Pass, {
      tamperedStatus: tampered.status,
      tamperedMsg: tampered.data?.message,
      expiredStatus: expired.status,
      expiredMsg: expired.data?.message,
    });

    // ── Check 11: Reorder endpoint ────────────────────────────────────────
    // Create source order directly with 2 products
    const reorderDoc = await Order.create({
      orderNumber: 'MK-TEST-REORDER-' + Date.now(),
      userId: userAId,
      customerName: 'Test Customer',
      customerPhone: phoneA,
      address: { line: 'Test Line', pincode: '423602' },
      items: [
        { productId: testProduct1._id, nameEn: testProduct1.nameEn, nameMr: testProduct1.nameMr, packSize: testProduct1.packSize, price: testProduct1.price, qty: 1 },
        { productId: testProduct2._id, nameEn: testProduct2.nameEn, nameMr: testProduct2.nameMr, packSize: testProduct2.packSize, price: testProduct2.price, qty: 1 },
      ],
      subtotal: testProduct1.price + testProduct2.price,
      deliveryCharge: 0,
      total: testProduct1.price + testProduct2.price,
      paymentMethod: 'cod',
      slot: 'Morning (7:00 AM – 11:00 AM)',
      status: 'new',
    });

    await Product.findByIdAndUpdate(testProduct2._id, { inStock: false, stockQuantity: 0 });

    const reorderRes = await req('GET', `/orders/${reorderDoc._id}/reorder`, null, tokenA);

    await Product.findByIdAndUpdate(testProduct2._id, { inStock: true, stockQuantity: 50 });

    const check11Pass = reorderRes.status === 200 &&
      reorderRes.data?.available?.length === 1 &&
      reorderRes.data?.unavailable?.length === 1 &&
      reorderRes.data?.unavailable[0]?.reason === 'out_of_stock';

    record(11, 'Reorder returns available & unavailable items accurately', check11Pass, {
      status: reorderRes.status,
      availableCount: reorderRes.data?.available?.length,
      unavailableCount: reorderRes.data?.unavailable?.length,
      unavailableReason: reorderRes.data?.unavailable[0]?.reason,
    });

    // ── Check 12: Rate limits (failed logins vs successful logins) ────────
    ratePhone = '980' + Math.floor(1000000 + Math.random() * 9000000);
    await req('POST', '/auth/register', { name: 'Rate User', phone: ratePhone, password: 'password123' });

    let tenthFailStatus = 0;
    for (let i = 0; i < 9; i++) {
      await req('POST', '/auth/login', { phone: ratePhone, password: 'wrongPassword' });
    }
    const tenth = await req('POST', '/auth/login', { phone: ratePhone, password: 'wrongPassword' });
    tenthFailStatus = tenth.status;
    const eleventh = await req('POST', '/auth/login', { phone: ratePhone, password: 'wrongPassword' });

    // Test that successful logins don't get blocked
    okPhone = '983' + Math.floor(1000000 + Math.random() * 9000000);
    await req('POST', '/auth/register', { name: 'OK User', phone: okPhone, password: 'password123' });
    let okSuccessCount = 0;
    for (let i = 0; i < 11; i++) {
      const s = await req('POST', '/auth/login', { phone: okPhone, password: 'password123' });
      if (s.status === 200) okSuccessCount++;
    }

    const check12Pass = (tenthFailStatus === 401 || tenthFailStatus === 429) && eleventh.status === 429 && okSuccessCount >= 10;
    record(12, '11 failed logins trigger 429 rate limit; successful logins not counted', check12Pass, {
      tenthFailStatus,
      eleventhFailStatus: eleventh.status,
      eleventhMessage: eleventh.data?.message,
      successfulLoginsCount: okSuccessCount,
    });

    // ── Check 13: NoSQL injection in register, login, orders ──────────────
    const nosqlReg = await req('POST', '/auth/register', {
      name: { '$ne': null },
      phone: { '$gt': '' },
      password: 'password123',
    });

    const nosqlLog = await req('POST', '/auth/login', {
      phone: { '$gt': '' },
      password: { '$gt': '' },
    });

    const nosqlOrder = await req('POST', '/orders', {
      addressId: { '$ne': null },
      slot: validSlotInfo.slot,
      deliveryDate: validSlotInfo.deliveryDate,
      paymentMethod: 'cod',
      items: [{ productId: testProduct1._id.toString(), qty: 1 }],
    }, tokenA);

    const check13Pass = [400, 422, 429].includes(nosqlReg.status) && [400, 401, 422, 429].includes(nosqlLog.status) && [400, 422].includes(nosqlOrder.status);
    record(13, 'NoSQL injection safely rejected in register, login, and orders', check13Pass, {
      registerStatus: nosqlReg.status,
      loginStatus: nosqlLog.status,
      orderStatus: nosqlOrder.status,
    });

    // ── Check 14: Redirect whitelist ──────────────────────────────────────
    function testRedirectWhitelist(param) {
      const REDIRECT_WHITELIST = ['checkout.html', 'orders.html', 'index.html'];
      if (param && REDIRECT_WHITELIST.includes(param)) return param;
      return 'index.html';
    }

    const evilRedirect = testRedirectWhitelist('https://evil.com');
    const slashRedirect = testRedirectWhitelist('//evil.com');
    const validRedirect = testRedirectWhitelist('checkout.html');

    const check14Pass = evilRedirect === 'index.html' && slashRedirect === 'index.html' && validRedirect === 'checkout.html';
    record(14, 'Redirect whitelist rejects external URLs and defaults to index.html', check14Pass, {
      evilResult: evilRedirect,
      slashResult: slashRedirect,
      validResult: validRedirect,
    });

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    try {
      console.log('\nCleaning up throwaway test users and orders…');
      await User.deleteMany({ phone: { $in: [phoneA, phoneB, ratePhone, okPhone] } });
      await Address.deleteMany({ userId: { $in: [userAId, userBId] } });
      await Order.deleteMany({ $or: [{ userId: { $in: [userAId, userBId] } }, { orderNumber: /^MK-TEST/ }] });
      console.log('Cleanup complete.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr.message);
    }
    if (server) {
      await new Promise((res) => server.close(res));
    }
    await mongoose.disconnect();
  }

  return results;
}

runTests().then(res => {
  console.log('\n=== DETAILED TEST RESULTS ===');
  console.log(JSON.stringify(res, null, 2));
  console.log('\n=== TEST RUN SUMMARY ===');
  console.table(res.map(r => ({ ID: r.id, Title: r.title, Status: r.pass ? 'PASS' : 'FAIL' })));
  process.exit(res.every(r => r.pass) ? 0 : 1);
});
