'use strict';
/**
 * server/seed/seedDemo.js
 *
 * Populates realistic demo dataset for the Mahalaxmi Kirana Store Admin Rebuild.
 * STRICT SAFETY RULE:
 * Refuses to run unless connecting to MONGODB_URI_TEST. Never touches production DB.
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const testMongoUri = process.env.MONGODB_URI_TEST;
const prodMongoUri = process.env.MONGO_URI;

if (!testMongoUri) {
  console.error('❌ FATAL: MONGODB_URI_TEST is not set in server/.env');
  process.exit(1);
}

if (testMongoUri === prodMongoUri) {
  console.error('❌ FATAL: MONGODB_URI_TEST must not equal production MONGO_URI.');
  process.exit(1);
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const UdharAccount = require('../src/models/UdharAccount');
const UdharEntry = require('../src/models/UdharEntry');
const StockLog = require('../src/models/StockLog');
const Settings = require('../src/models/Settings');
const Notification = require('../src/models/Notification');
const AuditLog = require('../src/models/AuditLog');

const CATEGORIES = [
  { nameEn: 'Atta & Grains', nameMr: 'आटा आणि धान्य', iconKey: 'grains', sortOrder: 1 },
  { nameEn: 'Dals & Pulses', nameMr: 'डाळ आणि कडधान्ये', iconKey: 'dals', sortOrder: 2 },
  { nameEn: 'Oils & Ghee', nameMr: 'तेल आणि तूप', iconKey: 'oils', sortOrder: 3 },
  { nameEn: 'Dairy & Drinks', nameMr: 'दूध आणि पेये', iconKey: 'dairy', sortOrder: 4 },
  { nameEn: 'Spices', nameMr: 'मसाले', iconKey: 'spices', sortOrder: 5 },
  { nameEn: 'Snacks & Biscuits', nameMr: 'नाश्ता आणि बिस्किटे', iconKey: 'snacks', sortOrder: 6 },
  { nameEn: 'Cleaning & Home', nameMr: 'स्वच्छता आणि घरगुती', iconKey: 'homecare', sortOrder: 7 },
  { nameEn: 'Personal Care', nameMr: 'वैयक्तिक स्वच्छता', iconKey: 'personalcare', sortOrder: 8 },
];

const PRODUCTS_DEF = [
  // Atta & Grains
  { cat: 'Atta & Grains', nameEn: 'Aashirvaad Sharbati Atta', nameMr: 'आशीर्वाद शरबती आटा', packSize: '5 kg', unitType: 'kg', price: 245, mrp: 275, costPrice: 220, stock: 40, reorder: 10 },
  { cat: 'Atta & Grains', nameEn: 'Basmati Tukda Rice', nameMr: 'बासमती तुकडा तांदूळ', packSize: '1 kg', unitType: 'kg', price: 65, mrp: 75, costPrice: 55, stock: 85, reorder: 15 },
  { cat: 'Atta & Grains', nameEn: 'Indrayani Rice', nameMr: 'इंद्रायणी तांदूळ', packSize: '5 kg', unitType: 'kg', price: 340, mrp: 380, costPrice: 300, stock: 25, reorder: 5 },
  { cat: 'Atta & Grains', nameEn: 'Sugar (Sakhar)', nameMr: 'साखर उत्तम प्रत', packSize: '1 kg', unitType: 'kg', price: 42, mrp: 48, costPrice: 38, stock: 120, reorder: 20 },
  { cat: 'Atta & Grains', nameEn: 'Jowar (Shalu Jowar)', nameMr: 'शाळू ज्वारी', packSize: '2 kg', unitType: 'kg', price: 90, mrp: 105, costPrice: 78, stock: 3, reorder: 10 }, // LOW STOCK
  { cat: 'Atta & Grains', nameEn: 'Organic Poha (Thick)', nameMr: 'जाड पोहे', packSize: '1 kg', unitType: 'kg', price: 55, mrp: 65, costPrice: 46, stock: 0, reorder: 10 }, // ZERO STOCK

  // Dals & Pulses
  { cat: 'Dals & Pulses', nameEn: 'Polished Toor Dal', nameMr: 'तूर डाळ', packSize: '1 kg', unitType: 'kg', price: 155, mrp: 175, costPrice: 140, stock: 50, reorder: 12 },
  { cat: 'Dals & Pulses', nameEn: 'Moong Dal (Yellow)', nameMr: 'मूग डाळ', packSize: '1 kg', unitType: 'kg', price: 125, mrp: 140, costPrice: 110, stock: 35, reorder: 8 },
  { cat: 'Dals & Pulses', nameEn: 'Chana Dal', nameMr: 'चना डाळ', packSize: '1 kg', unitType: 'kg', price: 92, mrp: 105, costPrice: 80, stock: 4, reorder: 10 }, // LOW STOCK
  { cat: 'Dals & Pulses', nameEn: 'Kabuli Chana (Big)', nameMr: 'काबुली चणा (छोले)', packSize: '500 g', unitType: 'g', price: 78, mrp: 90, costPrice: 65, stock: 22, reorder: 5 },
  { cat: 'Dals & Pulses', nameEn: 'Masoor Dal (Split)', nameMr: 'मसूर डाळ', packSize: '1 kg', unitType: 'kg', price: 98, mrp: 112, costPrice: 85, stock: 18, reorder: 5 },

  // Oils & Ghee
  { cat: 'Oils & Ghee', nameEn: 'Gemini Sunflower Oil Pouch', nameMr: 'जेमिनी सूर्यफूल तेल', packSize: '1 L', unitType: 'litre', price: 135, mrp: 150, costPrice: 122, stock: 60, reorder: 15 },
  { cat: 'Oils & Ghee', nameEn: 'Fortune Groundnut Oil Pouch', nameMr: 'फॉर्च्यून शेंगदाणा तेल', packSize: '1 L', unitType: 'litre', price: 175, mrp: 195, costPrice: 160, stock: 45, reorder: 10 },
  { cat: 'Oils & Ghee', nameEn: 'Gowardhan Pure Cow Ghee', nameMr: 'गोवर्धन शुद्ध गाय तूप', packSize: '500 ml', unitType: 'ml', price: 340, mrp: 380, costPrice: 305, stock: 2, reorder: 6 }, // LOW STOCK
  { cat: 'Oils & Ghee', nameEn: 'Mustard Oil (Kacchi Ghani)', nameMr: 'मोहरीचे तेल', packSize: '1 L', unitType: 'litre', price: 145, mrp: 165, costPrice: 128, stock: 15, reorder: 5 },

  // Dairy & Drinks
  { cat: 'Dairy & Drinks', nameEn: 'Amul Taaza Milk Pouch', nameMr: 'अमुल ताझा दूध', packSize: '500 ml', unitType: 'ml', price: 27, mrp: 28, costPrice: 25, stock: 30, reorder: 10, expiryDays: 2 }, // NEAR EXPIRY
  { cat: 'Dairy & Drinks', nameEn: 'Amul Masti Dahi Cup', nameMr: 'अमुल मस्ती दही', packSize: '400 g', unitType: 'g', price: 40, mrp: 42, costPrice: 35, stock: 20, reorder: 5, expiryDays: 5 }, // NEAR EXPIRY
  { cat: 'Dairy & Drinks', nameEn: 'Amul Salted Butter', nameMr: 'अमुल बटर', packSize: '100 g', unitType: 'g', price: 56, mrp: 60, costPrice: 50, stock: 25, reorder: 8, expiryDays: 14 }, // NEAR EXPIRY
  { cat: 'Dairy & Drinks', nameEn: 'Red Label Tea (Chaha)', nameMr: 'रेड लेबल चहा पावडर', packSize: '250 g', unitType: 'g', price: 130, mrp: 150, costPrice: 115, stock: 40, reorder: 10 },

  // Spices
  { cat: 'Spices', nameEn: 'Suhana Turmeric Powder', nameMr: 'सुहाना हळद पावडर', packSize: '200 g', unitType: 'g', price: 52, mrp: 62, costPrice: 42, stock: 35, reorder: 8 },
  { cat: 'Spices', nameEn: 'Suhana Mirchi Powder (Tikhalal)', nameMr: 'सुहाना तिखालाल मिरची', packSize: '200 g', unitType: 'g', price: 72, mrp: 85, costPrice: 60, stock: 28, reorder: 8 },
  { cat: 'Spices', nameEn: 'Godha Masala (Kala Masala)', nameMr: 'घरगुती काळा मसाला', packSize: '250 g', unitType: 'g', price: 95, mrp: 120, costPrice: 70, stock: 50, reorder: 10 },
  { cat: 'Spices', nameEn: 'Tata Iodized Salt', nameMr: 'टाटा मीठ', packSize: '1 kg', unitType: 'kg', price: 28, mrp: 30, costPrice: 23, stock: 150, reorder: 25 },
  { cat: 'Spices', nameEn: 'Jeera (Cumin Seeds)', nameMr: 'जिरे उत्तम प्रत', packSize: '100 g', unitType: 'g', price: 48, mrp: 60, costPrice: 38, stock: 1, reorder: 5 }, // LOW STOCK

  // Snacks & Biscuits
  { cat: 'Snacks & Biscuits', nameEn: 'Parle-G Gold Biscuits', nameMr: 'पार्ले-जी बिस्किट', packSize: '250 g', unitType: 'pack', price: 30, mrp: 35, costPrice: 26, stock: 80, reorder: 20 },
  { cat: 'Snacks & Biscuits', nameEn: 'Good Day Butter Cookies', nameMr: 'गुड डे बटर बिस्किट', packSize: '200 g', unitType: 'pack', price: 40, mrp: 45, costPrice: 34, stock: 50, reorder: 15 },
  { cat: 'Snacks & Biscuits', nameEn: 'Bhadang Bhel Mix', nameMr: 'कोल्हापुरी भडंग भेळ', packSize: '250 g', unitType: 'g', price: 50, mrp: 60, costPrice: 38, stock: 25, reorder: 8 },
  { cat: 'Snacks & Biscuits', nameEn: 'Cream & Onion Wafers', nameMr: 'बटाटा वेफर्स', packSize: '100 g', unitType: 'g', price: 20, mrp: 20, costPrice: 16, stock: 40, reorder: 10 },

  // Cleaning & Home
  { cat: 'Cleaning & Home', nameEn: 'Surf Excel Easy Wash', nameMr: 'सर्फ एक्सेल डिटर्जंट पावडर', packSize: '1 kg', unitType: 'kg', price: 140, mrp: 160, costPrice: 125, stock: 35, reorder: 10 },
  { cat: 'Cleaning & Home', nameEn: 'Vim Dishwash Bar', nameMr: 'विम भांडी घासण्याचा साबण', packSize: '300 g', unitType: 'piece', price: 25, mrp: 30, costPrice: 20, stock: 60, reorder: 15 },
  { cat: 'Cleaning & Home', nameEn: 'Harpic Toilet Cleaner Power', nameMr: 'हार्पिक टॉयलेट क्लिनर', packSize: '500 ml', unitType: 'ml', price: 95, mrp: 105, costPrice: 82, stock: 20, reorder: 5 },

  // Personal Care
  { cat: 'Personal Care', nameEn: 'Dettol Original Bath Soap', nameMr: 'डेटॉल अंघोळीचा साबण', packSize: '125 g', unitType: 'piece', price: 42, mrp: 48, costPrice: 36, stock: 55, reorder: 12 },
  { cat: 'Personal Care', nameEn: 'Colgate Strong Teeth Paste', nameMr: 'कोलगेट टूथपेस्ट', packSize: '200 g', unitType: 'g', price: 98, mrp: 110, costPrice: 85, stock: 30, reorder: 8 },
  { cat: 'Personal Care', nameEn: 'Clinic Plus Shampoo Bottle', nameMr: 'क्लिनिक प्लस शाम्पू', packSize: '340 ml', unitType: 'ml', price: 195, mrp: 220, costPrice: 168, stock: 15, reorder: 5 },
];

async function seedDemoData() {
  console.log('======================================================================');
  console.log('🌱 SEEDING DEMO DATASET FOR OWNER PANEL REBUILD');
  console.log('======================================================================');
  console.log(`Connecting safely to: ${testMongoUri}`);

  await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 10000 });
  const currentDb = mongoose.connection.db.databaseName;
  console.log(`✅ Connected to DB: "${currentDb}"`);

  if (!currentDb.toLowerCase().includes('test')) {
    console.error(`❌ FATAL: Connected to database "${currentDb}" which does not contain 'test' in its name! Aborting.`);
    process.exit(1);
  }

  // 1. Clear existing test artifacts
  console.log('🧹 Purging prior test collections...');
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    UdharAccount.deleteMany({}),
    UdharEntry.deleteMany({}),
    StockLog.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 2. Categories
  console.log('📦 Seeding Categories...');
  const catDocs = await Category.insertMany(CATEGORIES);
  const catMap = new Map();
  catDocs.forEach((c) => catMap.set(c.nameEn, c._id));

  // 3. Products
  console.log('🛍️ Seeding 34 Products...');
  const now = new Date();
  const prodDocs = [];

  for (const p of PRODUCTS_DEF) {
    const categoryId = catMap.get(p.cat);
    let expiryDate = null;
    if (p.expiryDays) {
      expiryDate = new Date(now.getTime() + p.expiryDays * 24 * 60 * 60 * 1000);
    }
    prodDocs.push({
      nameEn: p.nameEn,
      nameMr: p.nameMr,
      packSize: p.packSize,
      unitType: p.unitType || 'piece',
      price: p.price,
      mrp: p.mrp,
      costPrice: p.costPrice || Math.round(p.price * 0.82),
      stockQuantity: p.stock,
      reorderLevel: p.reorder,
      categoryId,
      active: true,
      expiryDate,
      aliases: [p.nameEn.toLowerCase(), p.nameMr],
      search_keywords: [p.nameEn.toLowerCase(), p.nameMr],
      imageUrl: '/images/placeholder-product.svg',
    });
  }

  const createdProducts = await Product.insertMany(prodDocs);
  console.log(`✓ Inserted ${createdProducts.length} products.`);

  // 4. Owner & Staff
  console.log('🧑‍💼 Seeding Store Owner & 2 Staff accounts...');
  const salt = await bcrypt.genSalt(10);
  const defaultPassHash = await bcrypt.hash('TestPass@123', salt);

  const owner = await User.create({
    name: 'Mahesh Borde (मालक)',
    phone: '9860924504',
    role: 'owner',
    passwordHash: defaultPassHash,
    preferredLanguage: 'mr',
  });

  const staff1 = await User.create({
    name: 'Suresh Patil (कर्मचारी)',
    phone: '9876543201',
    role: 'staff',
    passwordHash: defaultPassHash,
    preferredLanguage: 'mr',
  });

  const staff2 = await User.create({
    name: 'Nitin Pawar (कर्मचारी)',
    phone: '9876543202',
    role: 'staff',
    passwordHash: defaultPassHash,
    preferredLanguage: 'mr',
  });

  // 5. Customers
  console.log('👥 Seeding 10 Customers...');
  const customerNames = [
    { name: 'Ramesh Shinde', phone: '9822011001', village: 'Yesgaon' },
    { name: 'Sunita Gaikwad', phone: '9822011002', village: 'Kopargaon' },
    { name: 'Balasaheb Kadam', phone: '9822011003', village: 'Yesgaon' },
    { name: 'Pooja Jadhav', phone: '9822011004', village: 'Yesgaon' },
    { name: 'Vikas More', phone: '9822011005', village: 'Kopargaon' },
    { name: 'Ananda Kale', phone: '9822011006', village: 'Yesgaon' },
    { name: 'Archana Deshmukh', phone: '9822011007', village: 'Kopargaon' },
    { name: 'Kisanrao Jagtap', phone: '9822011008', village: 'Yesgaon' },
    { name: 'Santosh Chavan', phone: '9822011009', village: 'Yesgaon' },
    { name: 'Meena Salunke', phone: '9822011010', village: 'Kopargaon' },
  ];

  const createdCustomers = [];
  for (const c of customerNames) {
    const cust = await User.create({
      name: c.name,
      phone: c.phone,
      role: 'customer',
      passwordHash: defaultPassHash,
      preferredLanguage: 'mr',
    });
    createdCustomers.push({ ...c, doc: cust });
  }

  // 6. Udhar Accounts
  console.log('📝 Seeding 5 Udhar Accounts & Ledgers...');
  const udharConfigs = [
    { custIdx: 0, balance: 1450, limit: 3000, status: 'active' },
    { custIdx: 1, balance: 820, limit: 2500, status: 'active' },
    { custIdx: 2, balance: 2900, limit: 3000, status: 'active' }, // NEAR LIMIT
    { custIdx: 3, balance: 0, limit: 2000, status: 'active' },    // ZERO BALANCE
    { custIdx: 4, balance: 1200, limit: 1500, status: 'paused' }, // PAUSED
  ];

  for (const u of udharConfigs) {
    const cust = createdCustomers[u.custIdx];
    const acc = await UdharAccount.create({
      customer: cust.doc._id,
      status: u.status,
      approved: true,
      creditLimit: u.limit,
      balance: u.balance,
      notes: `गावातील खातेदार - ${cust.village}`,
    });

    if (u.balance > 0) {
      await UdharEntry.create({
        account: acc._id,
        customer: cust.doc._id,
        type: 'purchase',
        amount: u.balance,
        balanceAfter: u.balance,
        paymentMethod: 'order_credit',
        note: 'किराणा सामान खरेदी (मागील बाकी)',
        actor: { id: owner._id, role: 'owner', name: owner.name },
      });
    }
  }

  // 7. Orders (15 orders across statuses)
  console.log('📦 Seeding 15 Orders in diverse statuses...');
  const orderStatuses = [
    'new', 'new', 'confirmed', 'confirmed', 'packed',
    'packed', 'out_for_delivery', 'out_for_delivery', 'delivered', 'delivered',
    'delivered', 'delivered', 'delivered', 'cancelled', 'new'
  ];

  const deliverySlots = [
    'Morning (7:00 AM – 11:00 AM)',
    'Evening (5:00 PM – 9:00 PM)'
  ];

  for (let i = 0; i < 15; i++) {
    const status = orderStatuses[i];
    const cust = createdCustomers[i % createdCustomers.length];
    const p1 = createdProducts[i % createdProducts.length];
    const p2 = createdProducts[(i + 3) % createdProducts.length];

    const qty1 = (i % 3) + 1;
    const qty2 = 1;
    const subtotal = (p1.price * qty1) + (p2.price * qty2);
    const deliveryCharge = subtotal >= 300 ? 0 : 20;
    const total = subtotal + deliveryCharge;
    const paymentMethod = (i % 3 === 0) ? 'cod' : (i % 3 === 1 ? 'upi_qr' : 'udhar');
    const paymentStatus = (status === 'delivered' || paymentMethod === 'udhar') ? 'paid' : (i === 1 ? 'paid_pending_verification' : 'pending');

    await Order.create({
      orderNumber: `MK-TEST-${1001 + i}`,
      userId: cust.doc._id,
      customerName: cust.name,
      customerPhone: cust.phone,
      address: {
        line: `घर क्र. ${12 + i}, मारुती मंदिराजवळ`,
        landmark: 'येसगाव ग्रामपंचायत चौक',
        pincode: '423602',
      },
      items: [
        {
          productId: p1._id,
          nameEn: p1.nameEn,
          nameMr: p1.nameMr,
          packSize: p1.packSize,
          price: p1.price,
          qty: qty1,
          itemTotal: p1.price * qty1,
        },
        {
          productId: p2._id,
          nameEn: p2.nameEn,
          nameMr: p2.nameMr,
          packSize: p2.packSize,
          price: p2.price,
          qty: qty2,
          itemTotal: p2.price * qty2,
        },
      ],
      subtotal,
      deliveryCharge,
      total,
      paymentMethod,
      paymentStatus,
      status,
      slot: deliverySlots[i % 2],
      note: i % 2 === 0 ? 'कृपया घाई करा, पाहुणे आले आहेत.' : '',
      createdAt: new Date(now.getTime() - (i * 3 * 3600 * 1000)), // spaced over last 45 hours
    });
  }

  // 8. Notifications
  console.log('🔔 Seeding System Notifications...');
  await Notification.create([
    {
      type: 'order_new',
      title: 'नवीन ऑर्डर प्राप्त!',
      body: 'ग्राहक Ramesh Shinde यांनी ₹465 ची नवीन ऑर्डर #MK-TEST-1001 दिली आहे.',
      link: 'orders.html',
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    {
      type: 'low_stock',
      title: 'साठा कमी झाला आहे!',
      body: 'शाळू ज्वारी (2 kg) चा साठा फक्त 3 शिल्लक आहे. पुनर्नोंदणी मर्यादा 10 आहे.',
      link: 'inventory.html',
      createdAt: new Date(now.getTime() - 45 * 60 * 1000),
    },
    {
      type: 'low_stock',
      title: 'साठा संपला!',
      body: 'जाड पोहे (1 kg) चा साठा पूर्णपणे संपला (0 शिल्लक).',
      link: 'inventory.html',
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000),
    },
  ]);

  // 9. Settings
  console.log('⚙️ Ensuring Store Settings in Test DB...');
  let settings = await Settings.findOne({});
  if (!settings) {
    settings = await Settings.create({
      minOrder: 150,
      deliveryCharge: 20,
      freeDeliveryAbove: 300,
      servicePincodes: ['423602', '423601'],
      slots: [
        'Morning (7:00 AM – 11:00 AM)',
        'Evening (5:00 PM – 9:00 PM)',
      ],
      storeHours: 'Daily 7:00 AM – 10:00 PM',
      upiMobile: '9860924504',
      storeWhatsapp: '919860924504',
      upiQrImage: '/images/upi-qr-sample.png',
    });
  }

  console.log('======================================================================');
  console.log('🎉 DEMO DATASET SEEDING COMPLETE FOR TEST DB!');
  console.log('======================================================================');
  console.log(`- Products:      ${createdProducts.length}`);
  console.log(`- Categories:    ${catDocs.length}`);
  console.log(`- Users:         1 Owner, 2 Staff, ${createdCustomers.length} Customers`);
  console.log(`- Orders:        15 (statuses: new, confirmed, packed, out_for_delivery, delivered, cancelled)`);
  console.log(`- Udhar Accounts:5 accounts`);
  console.log('Credentials: Owner phone: 9860924504 | Password: TestPass@123');
  console.log('             Staff phone: 9876543201 | Password: TestPass@123');

  await mongoose.disconnect();
}

seedDemoData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
