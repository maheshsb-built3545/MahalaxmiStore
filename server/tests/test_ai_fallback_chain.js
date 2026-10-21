'use strict';

/**
 * SEC-01: AI Fallback Chain Verification
 *
 * Verifies that when OpenAI returns HTTP 429 (quota exhausted)
 * AND Gemini also fails, the local phonetic fuzzy parser still
 * returns parsed items without throwing to the user.
 *
 * This test patches global `fetch` to simulate API failures and
 * directly exercises the parseGroceryList() entrypoint.
 * No MongoDB or HTTP server required.
 */

const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

let passed = 0;
let failed = 0;

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ─── Stub mongoose/Product so we can run without a real DB connection ─────────
// We intercept getCatalogForAI by providing a pre-built catalog via mock.
const mongoose = require('mongoose');

// Connect to test DB (needed to satisfy Mongoose model requirements)
const testMongoUri = process.env.MONGODB_URI_TEST || process.env.MONGO_URI_TEST;
const prodMongoUri = process.env.MONGO_URI;

if (!testMongoUri) {
  console.error('SAFETY ERROR: MONGODB_URI_TEST is required to run automated tests.');
  process.exit(1);
}
if (testMongoUri.trim() === (prodMongoUri || '').trim()) {
  console.error('CRITICAL SAFETY REFUSAL: MONGODB_URI_TEST equals production MONGO_URI!');
  process.exit(1);
}

// ─── Override env keys to simulate configured-but-failing APIs ─────────────────
process.env.MONGO_URI = testMongoUri;
// Set dummy API keys so the code paths are entered (but fetch will be mocked)
process.env.OPENAI_API_KEY = 'sk-dummy-test-key-for-fallback-test-only';
process.env.GEMINI_API_KEY = 'dummy-gemini-key-for-fallback-test-only';

// ─── Require aiParser after env overrides ─────────────────────────────────────
const { parseGroceryList, tokenizeList, extractQuantityAndUnit } = require('../src/services/aiParser');

// ─── Helper: mock global fetch ─────────────────────────────────────────────────
const realFetch = global.fetch;

function mockFetchWith(handler) {
  global.fetch = handler;
}
function restoreFetch() {
  global.fetch = realFetch;
}

// ─── Test suite ────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=======================================================');
  console.log('🧪 SEC-01: AI Fallback Chain Verification Suite');
  console.log('=======================================================\n');

  await mongoose.connect(testMongoUri, { dbName: 'mahalaxmi_kirana_test' });
  console.log('✓ Connected to test database:', mongoose.connection.name);

  // ── Test 1: extractQuantityAndUnit still works without any external calls ──
  console.log('\n--- 1. Local Parser Unit Functions (no external calls) ---');
  {
    const result = extractQuantityAndUnit('अर्धा किलो साखर');
    assert(result.qty === 0.5, 'अर्धा parses as 0.5', JSON.stringify(result));
    assert(result.unit === 'kg', 'किलो extracts as kg', JSON.stringify(result));
  }
  {
    const tokens = tokenizeList('साखर\nदूध\nतेल');
    assert(tokens.length === 3, 'Three items tokenized', JSON.stringify(tokens));
  }

  // ── Test 2: OpenAI 429 → Gemini error → local fuzzy still returns results ──
  console.log('\n--- 2. OpenAI HTTP 429, Gemini throws → Local Fuzzy Fallback ---');
  {
    mockFetchWith(async (url) => {
      if (url.includes('openai.com')) {
        // Simulate OpenAI 429 quota exhausted
        return {
          ok: false,
          status: 429,
          text: async () => JSON.stringify({
            error: { message: 'You have no credits remaining.' },
          }),
        };
      }
      if (url.includes('generativelanguage.googleapis.com') || url.includes('gemini')) {
        // Simulate Gemini network failure
        throw new Error('Gemini simulated network error');
      }
      // Fall through to real fetch for MongoDB/other calls
      return realFetch(url);
    });

    try {
      const result = await parseGroceryList('साखर\nदूध', 'mr');

      assert(typeof result === 'object', 'Result is an object (no throw)');
      assert(Array.isArray(result.matched), 'result.matched is an array');
      assert(Array.isArray(result.ambiguous), 'result.ambiguous is an array');
      assert(Array.isArray(result.unmatched), 'result.unmatched is an array');
      assert(result.usedFallback === true, 'usedFallback is true (local parser used)');
      assert(result.totalLines === 2, 'totalLines is 2', JSON.stringify(result.totalLines));

      const totalProcessed = result.matched.length + result.ambiguous.length + result.unmatched.length;
      assert(
        totalProcessed === result.totalLines,
        `Invariant: matched(${result.matched.length}) + ambiguous(${result.ambiguous.length}) + unmatched(${result.unmatched.length}) === totalLines(${result.totalLines})`
      );

      console.log(`    ↳ Parsed items: ${totalProcessed} (matched: ${result.matched.length}, ambiguous: ${result.ambiguous.length}, unmatched: ${result.unmatched.length})`);
    } finally {
      restoreFetch();
    }
  }

  // ── Test 3: OpenAI returns malformed JSON → local fallback active ──────────
  console.log('\n--- 3. OpenAI returns malformed JSON → Gemini disabled → Local Fallback ---');
  {
    // Temporarily remove Gemini key so only OpenAI path is attempted
    const savedGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'replace_with'; // trigger the skip condition

    mockFetchWith(async (url) => {
      if (url.includes('openai.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: 'NOT VALID JSON {{{{' } }],
          }),
        };
      }
      return realFetch(url);
    });

    try {
      const result = await parseGroceryList('तेल 1 लिटर', 'mr');
      assert(typeof result === 'object', 'Result is an object when OpenAI returns bad JSON');
      assert(result.usedFallback === true, 'usedFallback === true when JSON.parse throws');
      assert(result.totalLines === 1, 'totalLines === 1 for single item');
    } finally {
      restoreFetch();
      process.env.GEMINI_API_KEY = savedGeminiKey;
    }
  }

  // ── Test 4: All APIs disabled → pure local fallback ───────────────────────
  console.log('\n--- 4. All AI APIs Disabled → Pure Local Fuzzy Parser ---');
  {
    const savedOpenAI = process.env.OPENAI_API_KEY;
    const savedGemini = process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'replace_with_your_openai_api_key';
    process.env.GEMINI_API_KEY = 'replace_with_your_gemini_api_key';

    try {
      const result = await parseGroceryList('साखर\nदूध\nतेल', 'mr');
      assert(typeof result === 'object', 'Result is an object when all AI disabled');
      assert(result.usedFallback === true, 'usedFallback === true with all APIs disabled');
      assert(result.totalLines === 3, 'totalLines === 3 for 3 items');
      const total = result.matched.length + result.ambiguous.length + result.unmatched.length;
      assert(total === 3, `All 3 items processed by local parser (got ${total})`);
    } finally {
      process.env.OPENAI_API_KEY = savedOpenAI;
      process.env.GEMINI_API_KEY = savedGemini;
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  await mongoose.disconnect();
  console.log('\n🧹 Disconnected from test database.');

  console.log('\n=======================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('=======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
