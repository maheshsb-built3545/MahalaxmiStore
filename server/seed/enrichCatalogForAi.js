'use strict';
/**
 * Enrich Catalog with Marathi/Hindi/English aliases and essential staples
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

const PRODUCT_ALIASES = {
  'Wheat Atta': ['गहू आटा', 'गहू पीठ', 'पीठ', 'आटा', 'flour', 'wheat flour', 'atta', 'gehu atta', 'chakki atta'],
  'Basmati Rice': ['बासमती तांदूळ', 'तांदूळ', 'चावल', 'भात', 'rice', 'basmati', 'chawal', 'tandul'],
  'Toor Dal': ['तूर डाळ', 'तूरडाळ', 'डाळ', 'tur dal', 'toor dal', 'tuar', 'arhar dal', 'dal'],
  'Moong Dal': ['मूग डाळ', 'मूगडाळ', 'moong dal', 'mung dal', 'peeli dal'],
  'Sunflower Oil': ['सूर्यफूल तेल', 'गोडे तेल', 'तेल', 'oil', 'cooking oil', 'sunflower oil', 'tel', 'gode tel'],
  'Cow Ghee': ['गाय तूप', 'तूप', 'ghee', 'cow ghee', 'tup', 'shuddha tup'],
  'Toned Milk': ['टोन्ड दूध', 'दूध', 'milk', 'dudh', 'doodh'],
  'Curd': ['दही', 'curd', 'dahi', 'yogurt'],
  'Turmeric Powder': ['हळद पावडर', 'हळद', 'हळदी', 'haldi', 'turmeric powder', 'turmeric'],
  'Red Chilli Powder': ['लाल मिरची पावडर', 'मिरची पावडर', 'लाल तिखट', 'तिखट', 'मिरची', 'chilli powder', 'mirchi', 'tikhat'],
  'Namkeen Mix': ['नमकीन मिक्स', 'फरसाण', 'नमकीन', 'namkeen', 'farsan', 'chivda'],
  'Biscuits Pack': ['बिस्किट पॅक', 'बिस्किट', 'biscuit', 'parle g', 'biscuits'],
  'Cold Drink': ['कोल्ड ड्रिंक', 'थंड पेय', 'cold drink', 'soft drink', 'soda'],
  'Tea Powder': ['चहा पावडर', 'चहा', 'tea powder', 'chai', 'tea', 'chaha'],
  'Dish Wash Bar': ['भांडी घासण्याची बार', 'भांडी साबण', 'विम बार', 'dishwash bar', 'vim bar', 'dish soap'],
  'Detergent Powder': ['कपडे धुण्याची पावडर', 'डिटर्जंट पावडर', 'सर्फ', 'detergent powder', 'surf', 'washing powder'],
  'Toothpaste': ['टूथपेस्ट', 'पेस्ट', 'कोलगेट', 'toothpaste', 'paste', 'colgate'],
  'Bath Soap': ['आंघोळीचा साबण', 'साबण', 'साबु', 'bath soap', 'soap', 'saban', 'dettol', 'lux', 'lifebuoy'],
  'Notebook': ['वही', 'नोटबुक', 'notebook', 'book', 'vahi'],
  'Pen Set': ['पेन सेट', 'पेन', 'pen set', 'pen', 'ball pen'],
};

const EXTRA_PRODUCTS = [
  {
    categoryName: 'Atta & Grains',
    nameEn: 'Sugar',
    nameMr: 'साखर',
    nameHi: 'चीनी',
    aliases: ['साखर', 'चीनी', 'sugar', 'sakhar', 'chini', 'shakkar'],
    packSize: '1 kg',
    unitType: 'kg',
    price: 44,
    mrp: 48,
    stockQuantity: 100,
    reorderLevel: 10,
    imageUrl: 'images/placeholder-product.svg',
    sortOrder: 3,
  },
  {
    categoryName: 'Atta & Grains',
    nameEn: 'Thick Poha',
    nameMr: 'जाड पोहे',
    nameHi: 'पोहा',
    aliases: ['पोहे', 'जाड पोहे', 'पोहा', 'poha', 'pohe', 'aval'],
    packSize: '1 kg',
    unitType: 'kg',
    price: 55,
    mrp: 65,
    stockQuantity: 50,
    reorderLevel: 8,
    imageUrl: 'images/placeholder-product.svg',
    sortOrder: 4,
  },
  {
    categoryName: 'Spices',
    nameEn: 'Cumin Seeds (Jeera)',
    nameMr: 'जिरे',
    nameHi: 'जीरा',
    aliases: ['जिरे', 'जीरा', 'jeera', 'jira', 'cumin'],
    packSize: '100 g',
    unitType: 'g',
    price: 38,
    mrp: 45,
    stockQuantity: 40,
    reorderLevel: 5,
    imageUrl: 'images/placeholder-product.svg',
    sortOrder: 3,
  },
  {
    categoryName: 'Spices',
    nameEn: 'Iodized Salt',
    nameMr: 'मीठ',
    nameHi: 'नमक',
    aliases: ['मीठ', 'नमक', 'टाटा मीठ', 'salt', 'namak', 'mith'],
    packSize: '1 kg',
    unitType: 'kg',
    price: 25,
    mrp: 28,
    stockQuantity: 60,
    reorderLevel: 10,
    imageUrl: 'images/placeholder-product.svg',
    sortOrder: 4,
  },
  {
    categoryName: 'Oils & Ghee',
    nameEn: 'Groundnut Oil (Singdana Tel)',
    nameMr: 'शेंगदाणा तेल',
    nameHi: 'मूंगफली तेल',
    aliases: ['शेंगदाणा तेल', 'दाणा तेल', 'groundnut oil', 'peanut oil', 'singdana tel', 'tel', 'गोडे तेल'],
    packSize: '1 L',
    unitType: 'litre',
    price: 175,
    mrp: 195,
    stockQuantity: 30,
    reorderLevel: 5,
    imageUrl: 'images/placeholder-product.svg',
    sortOrder: 3,
  },
  {
    categoryName: 'Oils & Ghee',
    nameEn: 'Soybean Oil',
    nameMr: 'सोयाबीन तेल',
    nameHi: 'सोयाबीन तेल',
    aliases: ['सोयाबीन तेल', 'soyabean oil', 'soybean oil', 'tel', 'गोडे तेल'],
    packSize: '1 L',
    unitType: 'litre',
    price: 125,
    mrp: 140,
    stockQuantity: 40,
    reorderLevel: 8,
    imageUrl: 'images/placeholder-product.svg',
    sortOrder: 4,
  },
];

async function enrich() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');

    // 1. Update existing products with aliases and ensure stock > 0
    for (const [nameEn, aliases] of Object.entries(PRODUCT_ALIASES)) {
      const prod = await Product.findOne({ nameEn });
      if (prod) {
        prod.aliases = Array.from(new Set([...(prod.aliases || []), ...aliases]));
        if (prod.stockQuantity <= 0) {
          prod.stockQuantity = 30; // ensure test stock
        }
        await prod.save();
        console.log(`Updated aliases for: ${nameEn}`);
      }
    }

    // 2. Insert extra staples if missing
    for (const extra of EXTRA_PRODUCTS) {
      const exists = await Product.findOne({ nameEn: extra.nameEn });
      if (!exists) {
        const cat = await Category.findOne({ nameEn: extra.categoryName });
        if (cat) {
          await Product.create({
            categoryId: cat._id,
            nameEn: extra.nameEn,
            nameMr: extra.nameMr,
            nameHi: extra.nameHi,
            aliases: extra.aliases,
            packSize: extra.packSize,
            unitType: extra.unitType,
            price: extra.price,
            mrp: extra.mrp,
            stockQuantity: extra.stockQuantity,
            reorderLevel: extra.reorderLevel,
            imageUrl: extra.imageUrl,
            sortOrder: extra.sortOrder,
            active: true,
          });
          console.log(`Added staple product: ${extra.nameEn} (${extra.nameMr})`);
        }
      }
    }

    console.log('Enrichment complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Enrich error:', err);
    process.exit(1);
  }
}

enrich();
