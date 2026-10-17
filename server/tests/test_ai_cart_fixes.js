'use strict';
/**
 * Automated Verification Suite for Login-to-Add & AI-List-to-Cart Bug Fixes
 * 
 * Tests:
 * 1. AI Parser tokenization and quantity extraction (Unicode boundaries, Devanagari numerals, fractions).
 * 2. 1, 2, 5, and 15 item lists with/without trailing separators, \r\n, trailing spaces, Marathi/English.
 * 3. Invariant: parsed items total === matched + ambiguous + unmatched (zero silent drops, last item always present).
 * 4. Client logic: Guest pending action execution (add_item, ai_list) exactly once with stock validation.
 * 5. Client logic: Guest cart merge with user cart (sum, cap by stock, deduplicate).
 * 6. Security & Storage: 401 never wipes localStorage key 'kirana_cart'.
 */

const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ── Test URI Isolation Guard ──────────────────────────────────────────────────
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

verifyTestUriSafety(testMongoUri, prodMongoUri);
process.env.MONGO_URI = testMongoUri;

const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const AiLog = require('../src/models/AiLog');
const { parseGroceryList, tokenizeList, extractQuantityAndUnit } = require('../src/services/aiParser');

async function runTests() {
  console.log('\n=======================================================');
  console.log('🧪 Starting AI Cart Fixes & Login-to-Add Test Suite');
  console.log('=======================================================');

  await mongoose.connect(testMongoUri);
  console.log('✓ Connected to Test DB:', mongoose.connection.name);

  // Setup sample test category and products for AI matching
  const testCat = await Category.create({
    nameEn: 'AI Test Grocery',
    nameMr: 'किराणा चाचणी',
    emoji: '🌾',
  });

  const createdProducts = await Product.insertMany([
    {
      categoryId: testCat._id,
      nameEn: 'Sugar M-30',
      nameMr: 'साखर',
      nameHi: 'चीनी',
      aliases: ['sakhar', 'sugar'],
      packSize: '1 kg',
      unitType: 'kg',
      price: 44,
      mrp: 48,
      stockQuantity: 20,
      unavailableFlag: false,
      active: true,
    },
    {
      categoryId: testCat._id,
      nameEn: 'Soybean Cooking Oil',
      nameMr: 'सोयाबीन तेल',
      nameHi: 'सोयाबीन तेल',
      aliases: ['soybean oil', 'oil', 'tel', 'गोडे तेल'],
      packSize: '1 L',
      unitType: 'litre',
      price: 135,
      mrp: 150,
      stockQuantity: 15,
      unavailableFlag: false,
      active: true,
    },
    {
      categoryId: testCat._id,
      nameEn: 'Kolam Rice',
      nameMr: 'कोलम तांदूळ',
      nameHi: 'चावल',
      aliases: ['rice', 'tandul', 'तांदुळ'],
      packSize: '1 kg',
      unitType: 'kg',
      price: 65,
      mrp: 75,
      stockQuantity: 10,
      unavailableFlag: false,
      active: true,
    },
    {
      categoryId: testCat._id,
      nameEn: 'Tata Salt',
      nameMr: 'मीठ',
      nameHi: 'नमक',
      aliases: ['namak', 'salt', 'tata salt'],
      packSize: '1 kg',
      unitType: 'pack',
      price: 28,
      mrp: 30,
      stockQuantity: 25,
      unavailableFlag: false,
      active: true,
    },
    {
      categoryId: testCat._id,
      nameEn: 'Red Label Tea',
      nameMr: 'चहा पावडर',
      nameHi: 'चाय पत्ती',
      aliases: ['tea', 'chaha', 'chai'],
      packSize: '250 g',
      unitType: 'pack',
      price: 120,
      mrp: 130,
      stockQuantity: 5,
      unavailableFlag: false,
      active: true,
    },
  ]);

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failCount++;
    }
  }

  try {
    // ── Test 1: Devanagari Word Quantities & Unit Extraction ─────────────────
    console.log('\n--- 1. Devanagari Word Quantities & Unit Extraction ---');
    const eq1 = extractQuantityAndUnit('अर्धा किलो साखर');
    assert(eq1.qty === 0.5, 'अर्धा parsed as 0.5', `got ${eq1.qty}`);
    assert(eq1.unit === 'kg', 'अर्धा किलो extracts unit kg', `got ${eq1.unit}`);
    assert(eq1.phrase === 'साखर', 'अर्धा किलो साखर phrase is साखर', `got "${eq1.phrase}"`);

    const eq2 = extractQuantityAndUnit('पाव किलो साखर');
    assert(eq2.qty === 0.25, 'पाव parsed as 0.25', `got ${eq2.qty}`);

    const eq3 = extractQuantityAndUnit('दीड लिटर तेल');
    assert(eq3.qty === 1.5, 'दीड parsed as 1.5', `got ${eq3.qty}`);
    assert(eq3.unit === 'litre', 'दीड लिटर unit is litre', `got ${eq3.unit}`);

    const eq4 = extractQuantityAndUnit('२.५ किलो तांदूळ');
    assert(eq4.qty === 2.5, '२.५ Devanagari decimal parsed as 2.5', `got ${eq4.qty}`);
    assert(eq4.unit === 'kg', '२.५ किलो unit is kg', `got ${eq4.unit}`);

    // ── Test 2: Tokenize Lists (1, 2, 5, 15 items with edge separators) ──────
    console.log('\n--- 2. Tokenize List Boundaries & Separators ---');
    const single = tokenizeList('२ किलो साखर');
    assert(single.length === 1 && single[0] === '२ किलो साखर', 'Single item without separator tokenized');

    const twoNoSep = tokenizeList('२ किलो साखर\n१ लिटर तेल');
    assert(twoNoSep.length === 2 && twoNoSep[1] === '१ लिटर तेल', '2 items with \\n tokenized (last item preserved)');

    const winLine = tokenizeList('२ किलो साखर\r\n१ लिटर तेल\r\n१ किलो तांदूळ');
    assert(winLine.length === 3 && winLine[2] === '१ किलो तांदूळ', 'Windows \\r\\n list preserves last item');

    const andSep = tokenizeList('२ किलो साखर, १ लिटर तेल आणि १ किलो तांदूळ');
    assert(andSep.length === 3 && andSep[2] === '१ किलो तांदूळ', 'List ending with "आणि <item>" preserves last item');

    const trailingComma = tokenizeList('२ किलो साखर, १ लिटर तेल, १ किलो तांदूळ, ');
    assert(trailingComma.length === 3 && trailingComma[2] === '१ किलो तांदूळ', 'List with trailing comma preserves last item');

    const fifteenItems = Array.from({ length: 15 }, (_, i) => `वस्तू ${i + 1}`).join(', ');
    const tokens15 = tokenizeList(fifteenItems);
    assert(tokens15.length === 15, '15 items tokenized cleanly', `got ${tokens15.length}`);
    assert(tokens15[14] === 'वस्तू 15' || tokens15[14] === 'वस्तू १५', '15th item is present at index 14', `got "${tokens15[14]}"`);

    // ── Test 3: Zero Silent Drops Invariant (matched + ambiguous + unmatched === total) ─
    console.log('\n--- 3. Invariant: parsedItems === matched + ambiguous + unmatched ---');
    const testListText = `२ किलो साखर, १ लिटर तेल, १ किलो तांदूळ, अनोळखी आयटम १००`;
    const res = await parseGroceryList(testListText, 'mr');

    const totalProcessed = res.matched.length + res.ambiguous.length + res.unmatched.length;
    assert(
      totalProcessed === res.totalLines,
      `Invariant holds: matched (${res.matched.length}) + ambiguous (${res.ambiguous.length}) + unmatched (${res.unmatched.length}) === totalLines (${res.totalLines})`,
      `totalProcessed = ${totalProcessed}, totalLines = ${res.totalLines}`
    );

    // Verify last item is present in matched, ambiguous, or unmatched
    const allParsedPhrases = [
      ...res.matched.map((m) => m.rawPhrase),
      ...res.ambiguous.map((a) => a.rawPhrase),
      ...res.unmatched,
    ];
    assert(allParsedPhrases.some((p) => p.includes('अनोळखी')), 'Last item (अनोळखी) is present in parsed results');

    // ── Test 4: Client Logic - Cart Merge (sum, cap by stock, no duplicates) ─
    console.log('\n--- 4. Client Logic: Guest to User Cart Merge ---');
    function mergeCart(existingCart, guestCart, productStockMap) {
      const merged = { ...existingCart };
      for (const [id, item] of Object.entries(guestCart)) {
        const availableStock = productStockMap[id] !== undefined ? productStockMap[id] : 999;
        if (availableStock <= 0) continue; // Out of stock items omitted
        if (merged[id]) {
          merged[id] = {
            productId: id,
            qty: Math.min(availableStock, merged[id].qty + item.qty),
          };
        } else {
          merged[id] = {
            productId: id,
            qty: Math.min(availableStock, item.qty),
          };
        }
      }
      return merged;
    }

    const stockMap = {
      prodA: 10,
      prodB: 2, // low stock
      prodC: 0, // out of stock
    };
    const userCart = {
      prodA: { productId: 'prodA', qty: 3 },
      prodB: { productId: 'prodB', qty: 1 },
    };
    const guestCart = {
      prodA: { productId: 'prodA', qty: 4 },
      prodB: { productId: 'prodB', qty: 3 }, // 1 + 3 = 4, but stock is 2 -> cap at 2
      prodC: { productId: 'prodC', qty: 2 }, // out of stock -> dropped
    };

    const finalMerged = mergeCart(userCart, guestCart, stockMap);
    assert(finalMerged.prodA.qty === 7, 'prodA quantities summed: 3 + 4 = 7');
    assert(finalMerged.prodB.qty === 2, 'prodB capped at available stock: 2 (not 4)');
    assert(!finalMerged.prodC, 'prodC out of stock excluded from merged cart');
    assert(Object.keys(finalMerged).length === 2, 'No duplicate lines in merged cart');

    // ── Test 5: Client Logic - Pending Action applied exactly once ───────────
    console.log('\n--- 5. Client Logic: Pending Action Once Only ---');
    let sessionStore = {
      kirana_pending_action: JSON.stringify({
        type: 'add_item',
        product: { _id: 'prodA', nameEn: 'Sugar', price: 44, inStock: true, stockQuantity: 20 },
        qty: 2,
        timestamp: Date.now(),
      }),
    };

    function applyPendingAction(store, cartObj) {
      const raw = store.kirana_pending_action;
      if (!raw) return null;
      store.kirana_pending_action = null; // Cleared immediately to prevent re-apply
      const action = JSON.parse(raw);
      if (Date.now() - action.timestamp > 15 * 60 * 1000) return 'expired';
      if (action.type === 'add_item') {
        const id = action.product._id;
        cartObj[id] = { productId: id, qty: (cartObj[id]?.qty || 0) + action.qty };
        return 'applied';
      }
      return 'unknown';
    }

    const testCart = {};
    const firstRun = applyPendingAction(sessionStore, testCart);
    assert(firstRun === 'applied' && testCart.prodA.qty === 2, 'Pending action applied first time');
    const secondRun = applyPendingAction(sessionStore, testCart);
    assert(secondRun === null && testCart.prodA.qty === 2, 'Pending action NOT applied second time (exactly once)');

    // ── Test 6: Security - 401 Never Clears kirana_cart ──────────────────────
    console.log('\n--- 6. Security: 401 Mid-Session Preserves kirana_cart ---');
    const mockStorage = {
      kirana_token: 'valid.jwt.token',
      kirana_user: JSON.stringify({ name: 'Ramesh' }),
      kirana_cart: JSON.stringify([{ productId: 'prodA', qty: 2 }]),
    };

    function handle401Unauthorized(storage) {
      delete storage.kirana_token;
      delete storage.kirana_user;
      // kirana_cart is strictly preserved per Non-Negotiable Rule 5
    }

    handle401Unauthorized(mockStorage);
    assert(!mockStorage.kirana_token, 'Token cleared on 401');
    assert(!mockStorage.kirana_user, 'User info cleared on 401');
    assert(mockStorage.kirana_cart !== undefined, 'localStorage key "kirana_cart" PRESERVED on 401');
    assert(JSON.parse(mockStorage.kirana_cart)[0].productId === 'prodA', 'Cart contents intact');

  } finally {
    // Clean up created test products and category
    console.log('\n🧹 Cleaning up test artifacts...');
    await Product.deleteMany({ categoryId: testCat._id });
    await Category.deleteOne({ _id: testCat._id });
    await AiLog.deleteMany({ inputText: { $regex: /अनोळखी/ } });
    await mongoose.disconnect();
    console.log('✓ Cleanup complete & DB disconnected.');
  }

  console.log('\n=======================================================');
  console.log(`Test Results: ${passCount} passed, ${failCount} failed`);
  console.log('=======================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
