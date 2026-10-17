'use strict';
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspect() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in server/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log(`Connected to live DB: ${db.databaseName}`);

  // 1. Categories
  const categories = await db.collection('categories').find({
    $or: [
      { nameEn: { $regex: 'test', $options: 'i' } },
      { nameMr: { $regex: 'कॅट|टेस्ट', $options: 'i' } },
      { slug: 'audit-test-cat' }
    ]
  }).toArray();

  // 2. Users
  const users = await db.collection('users').find({
    $or: [
      { name: { $regex: 'test|audit|customer a|customer b|rate user|ok user', $options: 'i' } },
      { phone: { $regex: '^99999|^981|^982|^980|^983|^984|^985' } }
    ]
  }, { projection: { passwordHash: 0 } }).toArray();

  const testUserIds = users.map(u => u._id);

  // 3. Products
  const products = await db.collection('products').find({
    $or: [
      { nameEn: { $regex: 'test|audit', $options: 'i' } },
      { nameMr: { $regex: 'टेस्ट|ऑडिट', $options: 'i' } }
    ]
  }).toArray();

  // 4. Orders
  const orders = await db.collection('orders').find({
    $or: [
      { orderNumber: { $regex: 'test', $options: 'i' } },
      { customerName: { $regex: 'test|audit|customer a|customer b', $options: 'i' } },
      { userId: { $in: testUserIds } }
    ]
  }).toArray();

  const testOrderIds = orders.map(o => o._id);

  // 5. Addresses
  const addresses = await db.collection('addresses').find({
    $or: [
      { userId: { $in: testUserIds } },
      { line: { $regex: 'test', $options: 'i' } }
    ]
  }).toArray();

  // 6. StockLogs
  const stockLogs = await db.collection('stocklogs').find({
    $or: [
      { orderId: { $in: testOrderIds } },
      { note: { $regex: 'test|audit', $options: 'i' } }
    ]
  }).toArray();

  // 7. UdharAccounts & UdharEntries
  const udharAccounts = await db.collection('udharaccounts').find({
    userId: { $in: testUserIds }
  }).toArray();

  const udharEntries = await db.collection('udharentries').find({
    $or: [
      { userId: { $in: testUserIds } },
      { orderId: { $in: testOrderIds } }
    ]
  }).toArray();

  // 8. Notifications
  const notifications = await db.collection('notifications').find({
    $or: [
      { userId: { $in: testUserIds } },
      { title: { $regex: 'test', $options: 'i' } }
    ]
  }).toArray();

  const result = {
    database: db.databaseName,
    summary: {
      categories: categories.length,
      users: users.length,
      products: products.length,
      orders: orders.length,
      addresses: addresses.length,
      stockLogs: stockLogs.length,
      udharAccounts: udharAccounts.length,
      udharEntries: udharEntries.length,
      notifications: notifications.length
    },
    categories: categories.map(c => ({ id: c._id.toString(), nameEn: c.nameEn, nameMr: c.nameMr, createdAt: c.createdAt })),
    users: users.map(u => ({ id: u._id.toString(), name: u.name, phone: u.phone, role: u.role, createdAt: u.createdAt })),
    products: products.map(p => ({ id: p._id.toString(), nameEn: p.nameEn, price: p.price })),
    orders: orders.map(o => ({ id: o._id.toString(), orderNumber: o.orderNumber, customerName: o.customerName, total: o.total, createdAt: o.createdAt })),
    addresses: addresses.map(a => ({ id: a._id.toString(), userId: a.userId ? a.userId.toString() : null, line: a.line, pincode: a.pincode })),
    stockLogs: stockLogs.map(s => ({ id: s._id.toString(), reason: s.reason, quantityChange: s.quantityChange, note: s.note })),
    udharAccounts: udharAccounts.map(u => ({ id: u._id.toString(), customerName: u.customerName, balance: u.balance })),
    udharEntries: udharEntries.map(e => ({ id: e._id.toString(), type: e.type, amount: e.amount, note: e.note })),
    notifications: notifications.map(n => ({ id: n._id.toString(), title: n.title, type: n.type }))
  };

  console.log('=== INSPECTION RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
