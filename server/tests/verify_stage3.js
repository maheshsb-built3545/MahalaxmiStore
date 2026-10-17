'use strict';
/**
 * Stage 3 Comprehensive Verification Suite
 * Tests all owner admin endpoints, security protections, atomic transitions,
 * and packing list logic against the live database.
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
const Category = require('../src/models/Category');
const Settings = require('../src/models/Settings');

const BASE_URL = 'http://localhost:5000/api';

// HTTP helper using fetch
async function req(method, path, body = null, token = null, isFormData = false) {
  const headers = {};
  if (body && !isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  return { status: res.status, data };
}

async function runStage3Tests() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('connected');
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

  // Generate unique test credentials
  const custPhone = '984' + Math.floor(1000000 + Math.random() * 9000000);
  const ownerPhone = '985' + Math.floor(1000000 + Math.random() * 9000000);

  let custUser, ownerUser;
  let custToken, ownerToken;
  let testCat, testProduct;
  let testOrder1, testOrder2, testOrder3, testOrderDelivered, testOrderCancelled;
  let custAddress;

  try {
    // ── Setup: Create Customer and Owner accounts ───────────────────────────
    custUser = await User.create({
      name: 'Stage3 Test Customer',
      phone: custPhone,
      passwordHash: 'dummyhash123',
      role: 'customer',
      blocked: false,
    });
    custToken = jwt.sign({ id: custUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    ownerUser = await User.create({
      name: 'Stage3 Test Owner',
      phone: ownerPhone,
      passwordHash: 'dummyhash123',
      role: 'owner',
      blocked: false,
    });
    ownerToken = jwt.sign({ id: ownerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    testCat = await Category.findOne({ active: true });
    testProduct = await Product.findOne({ active: true, inStock: true });

    custAddress = await Address.create({
      userId: custUser._id,
      line: 'Kopargaon Road',
      pincode: '423602',
    });

    // ── Check 1: Customer token and no token get 403/401 on every admin route ─
    const adminRoutesToTest = [
      { method: 'GET', path: '/admin/dashboard/stats' },
      { method: 'GET', path: '/admin/orders' },
      { method: 'GET', path: '/admin/products' },
      { method: 'GET', path: '/admin/categories' },
      { method: 'GET', path: '/admin/settings' },
      { method: 'GET', path: '/admin/customers' },
    ];

    let allNoToken401 = true;
    let allCustToken403 = true;
    for (const r of adminRoutesToTest) {
      const resNoToken = await req(r.method, r.path);
      if (resNoToken.status !== 401) allNoToken401 = false;

      const resCustToken = await req(r.method, r.path, null, custToken);
      if (resCustToken.status !== 403) allCustToken403 = false;
    }

    const check1Pass = allNoToken401 && allCustToken403;
    record(1, 'Customer token and no token get 403/401 on every admin route', check1Pass, {
      allNoToken401,
      allCustToken403,
    });

    // ── Check 2: Invalid status jump rejected & atomic concurrency ─────────
    testOrder1 = await Order.create({
      orderNumber: 'MK-S3-TEST1-' + Date.now(),
      userId: custUser._id,
      customerName: custUser.name,
      customerPhone: custUser.phone,
      address: { line: 'Test Line', pincode: '423602' },
      items: [{ productId: testProduct._id, nameEn: testProduct.nameEn, nameMr: testProduct.nameMr, packSize: testProduct.packSize, price: testProduct.price, qty: 1 }],
      subtotal: testProduct.price,
      deliveryCharge: 30,
      total: testProduct.price + 30,
      paymentMethod: 'cod',
      slot: 'Morning (7:00 AM – 11:00 AM)',
      status: 'new',
    });

    // Attempt illegal forward jump: new -> delivered
    const jumpRes = await req('PATCH', `/admin/orders/${testOrder1._id}/status`, {
      currentStatus: 'new',
      nextStatus: 'delivered',
    }, ownerToken);

    // Valid progression step: new -> confirmed
    const step1Res = await req('PATCH', `/admin/orders/${testOrder1._id}/status`, {
      currentStatus: 'new',
      nextStatus: 'confirmed',
    }, ownerToken);

    // Concurrency / double-click race test: trying to apply same transition again
    const step1DuplicateRes = await req('PATCH', `/admin/orders/${testOrder1._id}/status`, {
      currentStatus: 'new',
      nextStatus: 'confirmed',
    }, ownerToken);

    const check2Pass = jumpRes.status === 400 && step1Res.status === 200 && step1DuplicateRes.status === 400;
    record(2, 'Invalid status jump rejected & double-click race handled atomically', check2Pass, {
      jumpStatus: jumpRes.status,
      jumpMessage: jumpRes.data?.message,
      step1Status: step1Res.status,
      duplicateStepStatus: step1DuplicateRes.status,
    });

    // ── Check 3: Price and settings changes appear on storefront & checkout ─
    const originalPrice = testProduct.price;
    const newPrice = originalPrice + 15;

    await req('PUT', `/admin/products/${testProduct._id}`, {
      nameEn: testProduct.nameEn,
      nameMr: testProduct.nameMr,
      packSize: testProduct.packSize,
      categoryId: testCat._id.toString(),
      price: newPrice,
      mrp: newPrice + 20,
      inStock: true,
    }, ownerToken);

    const publicProductRes = await req('GET', `/products/${testProduct._id}`);

    // Update settings: minOrder = 225
    await req('PUT', '/admin/settings', {
      minOrder: 225,
      deliveryCharge: 35,
      freeDeliveryAbove: 1200,
      servicePincodes: ['423602', '423601'],
      slots: ['Morning (7:00 AM – 11:00 AM)', 'Evening (5:00 PM – 9:00 PM)'],
      storeHours: 'Daily 7:00 AM – 10:00 PM',
      upiMobile: '9860924504',
      storeWhatsapp: '919860924504',
    }, ownerToken);

    const publicSettingsRes = await req('GET', '/settings/public');

    // Restore original price
    await req('PUT', `/admin/products/${testProduct._id}`, {
      nameEn: testProduct.nameEn,
      nameMr: testProduct.nameMr,
      packSize: testProduct.packSize,
      categoryId: testCat._id.toString(),
      price: originalPrice,
      mrp: originalPrice + 20,
      inStock: true,
    }, ownerToken);

    const check3Pass = publicProductRes.status === 200 &&
      publicProductRes.data?.data?.price === newPrice &&
      publicSettingsRes.status === 200 &&
      publicSettingsRes.data?.data?.minOrder === 225;

    record(3, 'Price and settings changes reflect immediately on storefront', check3Pass, {
      publicProductPrice: publicProductRes.data?.data?.price,
      publicMinOrder: publicSettingsRes.data?.data?.minOrder,
    });

    // ── Check 4: Soft-deleted & out-of-stock products cannot be ordered ─────
    // Archive product
    await req('DELETE', `/admin/products/${testProduct._id}`, null, ownerToken);

    const orderArchivedRes = await req('POST', '/orders', {
      addressId: custAddress._id.toString(),
      slot: 'Morning (7:00 AM – 11:00 AM)',
      paymentMethod: 'cod',
      items: [{ productId: testProduct._id.toString(), qty: 1 }],
    }, custToken);

    // Restore active
    await Product.findByIdAndUpdate(testProduct._id, { active: true });

    // Verify existing order still displays the item correctly
    const oldOrderDoc = await Order.findById(testOrder1._id);
    const oldOrderHasItem = oldOrderDoc.items.some(i => i.productId.toString() === testProduct._id.toString());

    const check4Pass = orderArchivedRes.status === 400 &&
      orderArchivedRes.data?.invalidItems?.[0]?.reason === 'inactive' &&
      oldOrderHasItem;

    record(4, 'Soft-deleted products rejected at checkout; old orders preserve items', check4Pass, {
      orderArchivedStatus: orderArchivedRes.status,
      invalidReason: orderArchivedRes.data?.invalidItems?.[0]?.reason,
      oldOrderHasItem,
    });

    // ── Check 5: Real HTTP upload rejection tests against POST /api/admin/upload ──
    // 1. .exe renamed to .jpg
    const exeFd = new FormData();
    const exeBlob = new Blob([Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00])], { type: 'image/jpeg' });
    exeFd.append('image', exeBlob, 'malicious.jpg');
    const exeRes = await req('POST', '/admin/upload', exeFd, ownerToken, true);

    // 2. Plain text file
    const txtFd = new FormData();
    const txtBlob = new Blob([Buffer.from('This is a text file, not an image.')], { type: 'text/plain' });
    txtFd.append('image', txtBlob, 'notes.txt');
    const txtRes = await req('POST', '/admin/upload', txtFd, ownerToken, true);

    // 3. File over 5 MB (5.5 MB)
    const bigFd = new FormData();
    const bigBuf = Buffer.alloc(5.5 * 1024 * 1024);
    bigBuf[0] = 0x89; bigBuf[1] = 0x50; bigBuf[2] = 0x4e; bigBuf[3] = 0x47;
    bigBuf[4] = 0x0d; bigBuf[5] = 0x0a; bigBuf[6] = 0x1a; bigBuf[7] = 0x0a;
    const bigBlob = new Blob([bigBuf], { type: 'image/png' });
    bigFd.append('image', bigBlob, 'huge.png');
    const bigRes = await req('POST', '/admin/upload', bigFd, ownerToken, true);

    const check5Pass = exeRes.status === 400 && txtRes.status === 400 && bigRes.status === 400;
    record(5, 'HTTP POST /api/admin/upload rejects renamed .exe, text file, and file > 5MB with 400', check5Pass, {
      exeStatus: exeRes.status,
      exeMessage: exeRes.data?.message,
      textStatus: txtRes.status,
      textMessage: txtRes.data?.message,
      bigStatus: bigRes.status,
      bigMessage: bigRes.data?.message,
    });

    // ── Check 6: Admin routes never expose passwordHash ────────────────────
    const custsRes = await req('GET', '/admin/customers', null, ownerToken);
    let exposedHash = false;
    if (custsRes.data?.data) {
      for (const c of custsRes.data.data) {
        if (c.passwordHash) exposedHash = true;
      }
    }

    const check6Pass = custsRes.status === 200 && !exposedHash;
    record(6, 'Admin routes never expose passwordHash in customer directory', check6Pass, {
      customerCount: custsRes.data?.data?.length,
      exposedHash,
    });

    // ── Check 7: Blocked customer cannot log in or place an order ──────────
    await User.findByIdAndUpdate(custUser._id, { blocked: true });

    const blockedLogin = await req('POST', '/auth/login', {
      phone: custPhone,
      password: 'password123',
    });

    const blockedOrder = await req('POST', '/orders', {
      addressId: custAddress._id.toString(),
      slot: 'Morning (7:00 AM – 11:00 AM)',
      paymentMethod: 'cod',
      items: [{ productId: testProduct._id.toString(), qty: 1 }],
    }, custToken);

    await User.findByIdAndUpdate(custUser._id, { blocked: false });

    const check7Pass = blockedLogin.status === 403 && blockedOrder.status === 403;
    record(7, 'Blocked customer cannot log in or place an order (HTTP 403)', check7Pass, {
      blockedLoginStatus: blockedLogin.status,
      blockedOrderStatus: blockedOrder.status,
    });

    // ── Check 8: Two simultaneous status updates on same order (atomic race)
    testOrder2 = await Order.create({
      orderNumber: 'MK-S3-RACE-' + Date.now(),
      userId: custUser._id,
      customerName: custUser.name,
      customerPhone: custUser.phone,
      address: { line: 'Test Line', pincode: '423602' },
      items: [{ productId: testProduct._id, nameEn: testProduct.nameEn, nameMr: testProduct.nameMr, packSize: testProduct.packSize, price: testProduct.price, qty: 1 }],
      subtotal: testProduct.price,
      deliveryCharge: 30,
      total: testProduct.price + 30,
      paymentMethod: 'cod',
      slot: 'Morning (7:00 AM – 11:00 AM)',
      status: 'new',
    });

    // Launch 2 simultaneous updates
    const [raceRes1, raceRes2] = await Promise.all([
      req('PATCH', `/admin/orders/${testOrder2._id}/status`, { currentStatus: 'new', nextStatus: 'confirmed' }, ownerToken),
      req('PATCH', `/admin/orders/${testOrder2._id}/status`, { currentStatus: 'new', nextStatus: 'confirmed' }, ownerToken),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    const exactlyOneSuccess = statuses[0] === 200 && statuses[1] === 400;

    const check8Pass = exactlyOneSuccess;
    record(8, 'Simultaneous status updates: exactly one succeeds (atomic concurrency)', check8Pass, {
      responseStatuses: [raceRes1.status, raceRes2.status],
    });

    // ── Check 9: Packing list ignores cancelled and delivered orders ───────
    testOrderDelivered = await Order.create({
      orderNumber: 'MK-S3-DELIV-' + Date.now(),
      userId: custUser._id,
      customerName: custUser.name,
      customerPhone: custUser.phone,
      address: { line: 'Test Line', pincode: '423602' },
      items: [{ productId: testProduct._id, nameEn: testProduct.nameEn, nameMr: testProduct.nameMr, packSize: testProduct.packSize, price: testProduct.price, qty: 5 }],
      subtotal: testProduct.price * 5,
      deliveryCharge: 0,
      total: testProduct.price * 5,
      paymentMethod: 'cod',
      slot: 'Morning (7:00 AM – 11:00 AM)',
      status: 'delivered',
    });

    testOrderCancelled = await Order.create({
      orderNumber: 'MK-S3-CANCEL-' + Date.now(),
      userId: custUser._id,
      customerName: custUser.name,
      customerPhone: custUser.phone,
      address: { line: 'Test Line', pincode: '423602' },
      items: [{ productId: testProduct._id, nameEn: testProduct.nameEn, nameMr: testProduct.nameMr, packSize: testProduct.packSize, price: testProduct.price, qty: 10 }],
      subtotal: testProduct.price * 10,
      deliveryCharge: 0,
      total: testProduct.price * 10,
      paymentMethod: 'cod',
      slot: 'Morning (7:00 AM – 11:00 AM)',
      status: 'cancelled',
    });

    const packingRes = await req('POST', '/admin/orders/packing-list', {
      orderIds: [
        testOrder1._id.toString(),
        testOrderDelivered._id.toString(),
        testOrderCancelled._id.toString(),
      ],
    }, ownerToken);

    // Only testOrder1 should be included; testOrderDelivered and testOrderCancelled must be filtered out
    const packingData = packingRes.data?.data;
    const check9Pass = packingRes.status === 200 &&
      packingData?.ordersCount === 1 &&
      packingData?.orderNumbers?.length === 1 &&
      packingData?.orderNumbers[0] === testOrder1.orderNumber;

    record(9, 'Packing list server-side ignores cancelled and delivered orders', check9Pass, {
      status: packingRes.status,
      ordersCount: packingData?.ordersCount,
      orderNumbers: packingData?.orderNumbers,
      itemsCount: packingData?.items?.length,
    });

    // ── Check 10: Non-Cloudinary imageUrl is rejected ──────────────────────
    const fakeImageProd = await req('POST', '/admin/products', {
      nameEn: 'Fake Image Product',
      nameMr: 'बनावट फोटो उत्पादन',
      packSize: '1 unit',
      categoryId: testCat._id.toString(),
      price: 100,
      mrp: 120,
      imageUrl: 'https://evil.com/malicious.jpg',
    }, ownerToken);

    const validCloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'mahalaxmi-kirana'}/image/upload/v1234/test.jpg`;
    const validImageProd = await req('POST', '/admin/products', {
      nameEn: 'Valid Image Product',
      nameMr: 'योग्य फोटो उत्पादन',
      packSize: '1 unit',
      categoryId: testCat._id.toString(),
      price: 100,
      mrp: 120,
      imageUrl: validCloudinaryUrl,
    }, ownerToken);

    const check10Pass = fakeImageProd.status === 400 && validImageProd.status === 201;
    record(10, 'Non-Cloudinary imageUrl rejected; valid Cloudinary URL accepted', check10Pass, {
      fakeImageStatus: fakeImageProd.status,
      fakeImageMessage: fakeImageProd.data?.message,
      validImageStatus: validImageProd.status,
    });

    // Clean up valid product
    if (validImageProd.data?.data?._id) {
      await Product.findByIdAndDelete(validImageProd.data.data._id);
    }

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    try {
      console.log('\nCleaning up Stage 3 throwaway test records…');
      await User.deleteMany({ phone: { $in: [custPhone, ownerPhone] } });
      await Address.deleteMany({ userId: custUser?._id });
      await Order.deleteMany({ $or: [{ userId: custUser?._id }, { orderNumber: /^MK-S3/ }] });
      console.log('Stage 3 Cleanup complete.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr.message);
    }
    await mongoose.disconnect();
  }

  return results;
}

runStage3Tests().then((res) => {
  console.log('\n=== STAGE 3 DETAILED RESULTS ===');
  console.log(JSON.stringify(res, null, 2));
  console.log('\n=== STAGE 3 SUMMARY TABLE ===');
  console.table(res.map((r) => ({ ID: r.id, Title: r.title, Status: r.pass ? 'PASS' : 'FAIL' })));
  process.exit(res.every((r) => r.pass) ? 0 : 1);
});
