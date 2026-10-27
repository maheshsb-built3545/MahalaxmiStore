'use strict';
/**
 * Seed script – Mahalaxmi Kirana Store (Stage 2)
 *
 * Rules:
 *  - Refuses to run if NODE_ENV === 'production'
 *  - Drops and re-populates ONLY Categories and Products
 *  - Never deletes or modifies Users, Orders, or Settings
 *  - Creates default Settings ONLY if missing
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

if (process.env.NODE_ENV === 'production') {
  console.error('❌  FATAL: Seeding is blocked in production environment.');
  process.exit(1);
}

const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Settings = require('../src/models/Settings');

// ─── Seed data (verified 100% against baseline) ───────────────────────────────

const CATEGORIES = [
  { nameEn: 'Atta & Grains',   nameMr: 'आटा आणि धान्य',     iconKey: 'grains', sortOrder: 1 },
  { nameEn: 'Dals & Pulses',   nameMr: 'डाळ आणि कडधान्ये',  iconKey: 'dals', sortOrder: 2 },
  { nameEn: 'Oils & Ghee',     nameMr: 'तेल आणि तूप',        iconKey: 'oils', sortOrder: 3 },
  { nameEn: 'Dairy & Drinks',  nameMr: 'दूध आणि पेये',       iconKey: 'dairy', sortOrder: 4 },
  { nameEn: 'Spices',          nameMr: 'मसाले',               iconKey: 'spices', sortOrder: 5 },
  { nameEn: 'Snacks',          nameMr: 'नाश्ता',              iconKey: 'snacks', sortOrder: 6 },
  { nameEn: 'Beverages',       nameMr: 'पेये',                iconKey: 'beverages', sortOrder: 7 },
  { nameEn: 'Home Care',       nameMr: 'घरगुती काळजी',        iconKey: 'homecare', sortOrder: 8 },
  { nameEn: 'Personal Care',   nameMr: 'वैयक्तिक काळजी',     iconKey: 'personalcare', sortOrder: 9 },
  { nameEn: 'Stationery',      nameMr: 'स्टेशनरी',            iconKey: 'stationery', sortOrder: 10 },
];

const PRODUCT_DEFS = [
  // Atta & Grains
  { c: 'Atta & Grains',  nameEn: 'Wheat Atta',        nameMr: 'गहू आटा',           packSize: '5 kg',   price: 210, mrp: 240, unitType: 'kg',    sortOrder: 1, aliases: ['atta', 'aata', 'gehu', 'pith', 'गहू'], search_keywords: ['atta', 'aata', 'gehu', 'pith', 'flour', 'गहू आटा'] },
  { c: 'Atta & Grains',  nameEn: 'Basmati Rice',      nameMr: 'बासमती तांदूळ',     packSize: '1 kg',   price:  95, mrp: 110, unitType: 'kg',    sortOrder: 2, aliases: ['rice', 'tandul', 'chawal', 'तांदूळ'], search_keywords: ['rice', 'tandul', 'chawal', 'basmati', 'तांदूळ'] },
  { c: 'Atta & Grains',  nameEn: 'Sugar',             nameMr: 'साखर',             packSize: '1 kg',   price:  42, mrp:  48, unitType: 'kg',    sortOrder: 3, aliases: ['sugar', 'sakhar', 'shakkar', 'साखर'], search_keywords: ['sugar', 'sakhar', 'shakkar', 'साखर'] },
  // Dals & Pulses
  { c: 'Dals & Pulses',  nameEn: 'Toor Dal',          nameMr: 'तूर डाळ',           packSize: '1 kg',   price: 140, mrp: 160, unitType: 'kg',    sortOrder: 1, aliases: ['tur dal', 'toor', 'varan', 'तूर डाळ'], search_keywords: ['dal', 'daal', 'tur', 'toor', 'वरण', 'तूर'] },
  { c: 'Dals & Pulses',  nameEn: 'Moong Dal',         nameMr: 'मूग डाळ',           packSize: '1 kg',   price: 130, mrp: 145, unitType: 'kg',    sortOrder: 2, aliases: ['mung dal', 'moong', 'मूग डाळ'], search_keywords: ['dal', 'daal', 'moong', 'mung', 'मूग'] },
  // Oils & Ghee
  { c: 'Oils & Ghee',    nameEn: 'Sunflower Oil',     nameMr: 'सूर्यफूल तेल',      packSize: '1 L',    price: 135, mrp: 155, unitType: 'litre', sortOrder: 1, aliases: ['oil', 'tel', 'cooking oil', 'तेल', 'खाद्य तेल'], search_keywords: ['oil', 'tel', 'cooking oil', 'तेल', 'खाद्य तेल', 'mitha tel'] },
  { c: 'Oils & Ghee',    nameEn: 'Cow Ghee',          nameMr: 'गाय तूप',           packSize: '500 g',  price: 290, mrp: 330, unitType: 'g',     sortOrder: 2, aliases: ['ghee', 'tup', 'toop', 'तूप', 'गाय तूप'], search_keywords: ['ghee', 'tup', 'toop', 'तूप', 'clarified butter'] },
  // Dairy & Drinks
  { c: 'Dairy & Drinks', nameEn: 'Toned Milk',        nameMr: 'टोन्ड दूध',         packSize: '500 ml', price:  27, mrp:  30, unitType: 'ml',    sortOrder: 1, aliases: ['milk', 'dudh', 'दूध'], search_keywords: ['milk', 'dudh', 'दूध'] },
  { c: 'Dairy & Drinks', nameEn: 'Curd',              nameMr: 'दही',               packSize: '400 g',  price:  38, mrp:  42, unitType: 'g',     sortOrder: 2, aliases: ['dahi', 'curd', 'दही', 'yogurt'], search_keywords: ['curd', 'dahi', 'दही'] },
  // Spices
  { c: 'Spices',         nameEn: 'Turmeric Powder',   nameMr: 'हळद पावडर',         packSize: '200 g',  price:  45, mrp:  55, unitType: 'g',     sortOrder: 1, aliases: ['haldi', 'turmeric', 'हळद'], search_keywords: ['haldi', 'turmeric', 'हळद पावडर'] },
  { c: 'Spices',         nameEn: 'Red Chilli Powder', nameMr: 'लाल मिरची पावडर',   packSize: '200 g',  price:  60, mrp:  75, unitType: 'g',     sortOrder: 2, aliases: ['mirchi', 'chilli', 'लाल तिखट', 'मिरची'], search_keywords: ['chilli', 'mirchi', 'tikhat', 'मिरची', 'लाल तिखट'] },
  // Snacks
  { c: 'Snacks',         nameEn: 'Namkeen Mix',       nameMr: 'नमकीन मिक्स',       packSize: '200 g',  price:  40, mrp:  50, unitType: 'g',     sortOrder: 1, aliases: ['farsan', 'chivda', 'namkeen', 'फरसाण'], search_keywords: ['farsan', 'namkeen', 'chivda', 'फरसाण'] },
  { c: 'Snacks',         nameEn: 'Biscuits Pack',     nameMr: 'बिस्किट पॅक',       packSize: '250 g',  price:  30, mrp:  35, unitType: 'pack',  sortOrder: 2, aliases: ['biscuit', 'parle', 'बिस्किट'], search_keywords: ['biscuit', 'cookies', 'बिस्किट'] },
  // Beverages
  { c: 'Beverages',      nameEn: 'Cold Drink',        nameMr: 'कोल्ड ड्रिंक',      packSize: '750 ml', price:  40, mrp:  45, unitType: 'ml',    sortOrder: 1, aliases: ['soda', 'coke', 'pepsi', 'पेये'], search_keywords: ['drink', 'soda', 'cold drink'] },
  { c: 'Beverages',      nameEn: 'Tea Powder',        nameMr: 'चहा पावडर',         packSize: '250 g',  price: 110, mrp: 125, unitType: 'g',     sortOrder: 2, aliases: ['chai', 'tea', 'चहा पत्ती', 'चहा'], search_keywords: ['chai', 'tea', 'chaha', 'चहा'] },
  // Home Care
  { c: 'Home Care',      nameEn: 'Dish Wash Bar',     nameMr: 'भांडी घासण्याची बार', packSize: '1 pc',  price:  20, mrp:  25, unitType: 'piece', sortOrder: 1, aliases: ['bartan', 'vim', 'भांडी साबण'], search_keywords: ['dishwash', 'vim', 'bar', 'भांडी'] },
  { c: 'Home Care',      nameEn: 'Detergent Powder',  nameMr: 'कपडे धुण्याची पावडर', packSize: '1 kg', price:  95, mrp: 110, unitType: 'kg',    sortOrder: 2, aliases: ['surf', 'washing powder', 'निरमा', 'सर्फ'], search_keywords: ['detergent', 'surf', 'powder', 'कपडे'] },
  // Personal Care
  { c: 'Personal Care',  nameEn: 'Toothpaste',        nameMr: 'टूथपेस्ट',          packSize: '150 g',  price:  65, mrp:  75, unitType: 'g',     sortOrder: 1, aliases: ['colgate', 'paste', 'टूथपेस्ट', 'दंतमंजन'], search_keywords: ['toothpaste', 'colgate', 'दंतमंजन'] },
  { c: 'Personal Care',  nameEn: 'Bath Soap',         nameMr: 'आंघोळीचा साबण',     packSize: '100 g',  price:  35, mrp:  40, unitType: 'piece', sortOrder: 2, aliases: ['soap', 'saban', 'साबण', 'lifebuoy', 'lux'], search_keywords: ['soap', 'saban', 'साबण'] },
  // Stationery
  { c: 'Stationery',     nameEn: 'Notebook',          nameMr: 'वही',               packSize: '1 pc',   price:  30, mrp:  35, unitType: 'piece', sortOrder: 1, aliases: ['vahi', 'book', 'वही'], search_keywords: ['notebook', 'vahi', 'वही'] },
  { c: 'Stationery',     nameEn: 'Pen Set',           nameMr: 'पेन सेट',           packSize: '5 pc',   price:  25, mrp:  30, unitType: 'pack',  sortOrder: 2, aliases: ['pen', 'ballpen', 'पेन'], search_keywords: ['pen', 'ballpen', 'पेन'] },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅  Connected to MongoDB');

    // 1. Drop only Category and Product documents (never touches Users or Orders)
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️   Cleared existing categories and products');

    // 2. Insert categories and build a nameEn → _id map
    const insertedCats = await Category.insertMany(CATEGORIES);
    const catMap = {};
    insertedCats.forEach((cat) => { catMap[cat.nameEn] = cat._id; });
    console.log(`📂  Inserted ${insertedCats.length} categories`);

    // 3. Build product documents
    const productDocs = PRODUCT_DEFS.map((def) => {
      const catId = catMap[def.c];
      if (!catId) throw new Error(`Unknown category name in seed: "${def.c}"`);
      return {
        categoryId: catId,
        nameEn:     def.nameEn,
        nameMr:     def.nameMr,
        packSize:   def.packSize,
        price:      def.price,
        mrp:        def.mrp,
        unitType:   def.unitType || 'piece',
        stockQuantity: def.stockQuantity || 50,
        reorderLevel: 5,
        aliases:    def.aliases || [def.nameEn.toLowerCase(), def.nameMr],
        search_keywords: def.search_keywords || def.aliases || [def.nameEn.toLowerCase(), def.nameMr],
        imageUrl:   `/images/products/${def.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`,
        inStock:    true,
        active:     true,
        sortOrder:  def.sortOrder,
      };
    });

    const insertedProds = await Product.insertMany(productDocs);
    console.log(`📦  Inserted ${insertedProds.length} products`);

    // 4. Ensure Settings exists (never overwrite existing owner settings)
    const existingSettings = await Settings.findOne();
    if (!existingSettings) {
      await Settings.create({
        minOrder: 200,             // [PLACEHOLDER - editable by owner in Stage 3]
        deliveryCharge: 30,         // [PLACEHOLDER - editable by owner in Stage 3]
        freeDeliveryAbove: 1000,    // [PLACEHOLDER - editable by owner in Stage 3]
        servicePincodes: ['423602', '423601'], // Yesgaon, Kopargaon
        slots: [
          'Morning (7:00 AM – 11:00 AM)',
          'Afternoon (12:00 PM – 4:00 PM)',
          'Evening (5:00 PM – 9:00 PM)',
        ],
        storeHours: 'Daily 7:00 AM – 10:00 PM',
        upiMobile: 'REPLACE_ME',   // [PLACEHOLDER - editable by owner in Stage 3]
        upiQrImage: '/images/placeholder-upi-qr.svg',
        storeWhatsapp: '919860924504',
      });
      console.log('⚙️   Created initial Settings with Stage 2 default placeholders');
    } else {
      console.log('ℹ️   Settings already exist; preserved existing configuration');
    }

    console.log('\n🌱  Catalog & Settings seed complete!');
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
