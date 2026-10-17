'use strict';

/**
 * R3 — AI Grocery List Parser (AI-01 through AI-09, ORD-05)
 * Translates customer typed or spoken text in Marathi, Hindi, Hinglish, and English
 * into a structured, validated cart with ambiguity resolution and substitutions.
 */

const Product = require('../models/Product');
const Category = require('../models/Category');

// Marathi Devanagari numerals to standard digits
const DEV_NUMS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function normalizeDevanagariNumbers(str) {
  if (!str) return '';
  return str.replace(/[०-९]/g, (char) => DEV_NUMS[char] || char);
}

/**
 * Common Marathi / Hindi quantity words to numbers
 */
const WORD_QUANTITIES = {
  'अर्धा': 0.5, 'आधा': 0.5, 'half': 0.5,
  'पाव': 0.25, 'paav': 0.25, 'pav': 0.25,
  'दीड': 1.5, 'dedh': 1.5,
  'अडीच': 2.5, 'dhai': 2.5,
  'एक': 1, 'दोन': 2, 'तीन': 3, 'चार': 4, 'पाच': 5,
};

/**
 * Extract numeric quantity and unit from a raw item line
 */
function extractQuantityAndUnit(text) {
  let cleaned = normalizeDevanagariNumbers(text.toLowerCase().trim());
  let qty = 1;
  let unit = 'piece';

  // Check word quantities first
  for (const [w, val] of Object.entries(WORD_QUANTITIES)) {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    if (re.test(cleaned)) {
      qty = val;
      cleaned = cleaned.replace(re, '').trim();
      break;
    }
  }

  // Check digits (e.g. 2.5, 2, 500)
  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(kilo|kg|किलो|litre|liter|ltr|l|लिटर|लि|gm|g|gram|ग्रॅम|packet|pack|पॅकेट|पुडा|box|डबा|piece|pc|नग|डझन|dozen)?/i);
  if (numMatch) {
    const parsedNum = parseFloat(numMatch[1]);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      qty = parsedNum;
      if (numMatch[2]) {
        const rawUnit = numMatch[2].toLowerCase();
        if (/kilo|kg|किलो/.test(rawUnit)) unit = 'kg';
        else if (/litre|liter|ltr|l|लिटर|लि/.test(rawUnit)) unit = 'litre';
        else if (/gm|g|gram|ग्रॅम/.test(rawUnit)) {
          if (qty >= 1000) {
            qty = qty / 1000;
            unit = 'kg';
          } else {
            unit = 'g';
          }
        } else if (/packet|pack|पॅकेट|पुडा/.test(rawUnit)) unit = 'pack';
        else if (/डझन|dozen/.test(rawUnit)) {
          qty = qty * 12;
          unit = 'piece';
        }
      }
      cleaned = cleaned.replace(numMatch[0], '').trim();
    }
  }

  // Clean remnant words
  cleaned = cleaned.replace(/^(आणि|and|व|\+|-|\*|,)/i, '').trim();

  return { phrase: cleaned, qty, unit };
}

/**
 * Tokenize grocery list into individual item lines
 */
function tokenizeList(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/[\n,;।+•]+|(?:\s+आणि\s+)|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/**
 * Fetch compact catalog for AI matching
 */
async function getCatalogForAI() {
  return await Product.find({ active: true })
    .select('_id nameEn nameMr nameHi aliases packSize unitType price mrp imageUrl inStock stockQuantity unavailableFlag categoryId')
    .populate('categoryId', 'nameEn nameMr emoji')
    .lean();
}

/**
 * Fallback fuzzy matcher (AI-05)
 * Resilient, fast, zero-external-dependency matcher across Marathi, Hindi, English
 */
function matchLocally(lines, catalog) {
  const matched = [];
  const ambiguous = [];
  const unmatched = [];

  for (const rawLine of lines) {
    const { phrase, qty, unit } = extractQuantityAndUnit(rawLine);
    if (!phrase || phrase.length < 2) continue;

    const lowerPhrase = phrase.toLowerCase();
    const candidateMatches = [];

    for (const prod of catalog) {
      let score = 0;
      const names = [
        prod.nameEn.toLowerCase(),
        prod.nameMr.toLowerCase(),
        (prod.nameHi || '').toLowerCase(),
        ...(prod.aliases || []).map((a) => a.toLowerCase()),
      ];

      for (const name of names) {
        if (!name) continue;
        if (name === lowerPhrase) {
          score = Math.max(score, 100);
        } else if (name.includes(lowerPhrase) || lowerPhrase.includes(name)) {
          score = Math.max(score, 70);
        } else {
          // Word-level partial match
          const pWords = lowerPhrase.split(/\s+/);
          const nWords = name.split(/\s+/);
          let matchedWords = 0;
          for (const pw of pWords) {
            if (pw.length > 2 && nWords.some((nw) => nw.includes(pw) || pw.includes(nw))) {
              matchedWords++;
            }
          }
          if (matchedWords > 0) {
            score = Math.max(score, (matchedWords / pWords.length) * 60);
          }
        }
      }

      if (score >= 50) {
        candidateMatches.push({ prod, score });
      }
    }

    // Sort by highest score
    candidateMatches.sort((a, b) => b.score - a.score);

    if (candidateMatches.length === 0) {
      unmatched.push(rawLine);
    } else if (candidateMatches.length > 1 && candidateMatches[0].score - candidateMatches[1].score < 15) {
      // Ambiguous item (AI-03): multiple close candidates
      ambiguous.push({
        rawPhrase: rawLine,
        qty,
        unit,
        candidates: candidateMatches.slice(0, 3).map((c) => sanitizeProduct(c.prod, qty)),
      });
    } else {
      // Single clear match
      matched.push({
        rawPhrase: rawLine,
        qty,
        unit,
        confidence: candidateMatches[0].score / 100,
        product: sanitizeProduct(candidateMatches[0].prod, qty),
      });
    }
  }

  return { matched, ambiguous, unmatched };
}

/**
 * Format product object safely with live database prices and stock (AI-02)
 */
function sanitizeProduct(p, reqQty = 1) {
  const stock = typeof p.stockQuantity === 'number' ? p.stockQuantity : 0;
  const isAvailable = stock > 0 && !p.unavailableFlag;

  return {
    _id: p._id,
    productId: p._id,
    nameEn: p.nameEn,
    nameMr: p.nameMr,
    nameHi: p.nameHi || '',
    nameEnglish: p.nameEn,
    nameMarathi: p.nameMr,
    name: p.nameEn,
    packSize: p.packSize,
    unitType: p.unitType || 'piece',
    price: p.price,
    mrp: p.mrp,
    imageUrl: p.imageUrl || '',
    inStock: isAvailable,
    stockQuantity: stock,
    requestedQty: Math.max(0.1, Math.min(50, reqQty)),
    category: p.categoryId ? (p.categoryId.nameMr || p.categoryId.nameEn) : '',
    categoryId: p.categoryId ? (p.categoryId._id || p.categoryId) : null,
  };
}

/**
 * Call Gemini API when GEMINI_API_KEY is configured (AI-01)
 */
async function callGemini(inputText, catalog, userLanguage = 'mr') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('replace_with') || apiKey.trim() === '') {
    return null; // triggers fallback
  }

  // Model name can be set in env or defaults to gemini-1.5-flash
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // Build compact catalog lookup for prompt
  const catalogSnippet = catalog.map((p) => ({
    id: p._id.toString(),
    en: p.nameEn,
    mr: p.nameMr,
    aliases: p.aliases || [],
    pack: p.packSize,
  }));

  const systemInstruction = `You are an AI order parser for Mahalaxmi Kirana Store, a village grocery store in Yesgaon, Maharashtra.
You receive a customer's grocery list in Marathi, Hindi, Hinglish, or English.
Match each item against the provided product catalog.
Catalog JSON: ${JSON.stringify(catalogSnippet)}

Rules:
1. Return strict JSON ONLY. No markdown, no triple backticks, no explanations.
2. Structure:
{
  "matches": [
    {
      "rawPhrase": "<extracted line>",
      "matchedProductIds": ["<catalog id 1>", "<optional candidate 2 if ambiguous>"],
      "quantity": <number, default 1>,
      "unit": "<kg|g|litre|pack|piece>",
      "confidence": <0.0 to 1.0>
    }
  ],
  "unmatched": ["<items not in catalog>"]
}
3. If an item matches multiple products closely (e.g. "tel" / "oil" could be Sunflower or Groundnut), list up to 3 candidate IDs in matchedProductIds.
4. For loose grains/sugar, convert fractions: "अर्धा किलो" -> 0.5, "पाव किलो" -> 0.25, "दीड किलो" -> 1.5.`;

  const body = {
    contents: [
      {
        parts: [
          { text: systemInstruction },
          { text: `Customer grocery list:\n${inputText}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Gemini API returned status ${res.status}`);
      return null;
    }

    const json = await res.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    // Clean any accidental markdown code fences
    const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Gemini call error or timeout:', err.message);
    return null;
  }
}

/**
 * Call OpenAI API when OPENAI_API_KEY is configured
 */
async function callOpenAI(inputText, catalog, userLanguage = 'mr') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('replace_with') || apiKey.trim() === '') {
    return null;
  }

  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const catalogSnippet = catalog.map((p) => ({
    id: p._id.toString(),
    en: p.nameEn,
    mr: p.nameMr,
    aliases: p.aliases || [],
    pack: p.packSize,
  }));

  const systemInstruction = `You are an AI order parser for Mahalaxmi Kirana Store, a village grocery store in Yesgaon, Maharashtra.
You receive a customer's grocery list in Marathi, Hindi, Hinglish, or English.
Match each item against the provided product catalog.
Catalog JSON: ${JSON.stringify(catalogSnippet)}

Rules:
1. Return strict JSON ONLY. No markdown, no triple backticks, no explanations.
2. Structure:
{
  "matches": [
    {
      "rawPhrase": "<extracted line>",
      "matchedProductIds": ["<catalog id 1>", "<optional candidate 2 if ambiguous>"],
      "quantity": <number, default 1>,
      "unit": "<kg|g|litre|pack|piece>",
      "confidence": <0.0 to 1.0>
    }
  ],
  "unmatched": ["<items not in catalog>"]
}
3. If an item matches multiple products closely (e.g. "tel" / "oil" could be Sunflower or Groundnut), list up to 3 candidate IDs in matchedProductIds.
4. For loose grains/sugar, convert fractions: "अर्धा किलो" -> 0.5, "पाव किलो" -> 0.25, "दीड किलो" -> 1.5.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Customer grocery list:\n${inputText}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`OpenAI API returned status ${res.status}: ${errText.slice(0, 160)}`);
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('OpenAI call error or timeout:', err.message);
    return null;
  }
}

/**
 * Find alternatives in the same category for out of stock items (ORD-05)
 */
async function findSubstitutes(productId, categoryId) {
  try {
    if (!categoryId) return [];
    const subs = await Product.find({
      _id: { $ne: productId },
      categoryId,
      active: true,
      stockQuantity: { $gt: 0 },
      unavailableFlag: false,
    })
      .sort({ stockQuantity: -1 })
      .limit(3)
      .lean();

    return subs.map((s) => sanitizeProduct(s, 1));
  } catch (_) {
    return [];
  }
}

/**
 * Main parser entrypoint
 */
async function parseGroceryList(inputText, userLanguage = 'mr') {
  const catalog = await getCatalogForAI();
  const rawLines = tokenizeList(inputText);

  let llmResult = null;
  let usedFallback = false;

  // 1. Attempt LLM call: OpenAI first, then Gemini (AI-01)
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('replace_with')) {
    llmResult = await callOpenAI(inputText, catalog, userLanguage);
  }
  if (!llmResult && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('replace_with')) {
    llmResult = await callGemini(inputText, catalog, userLanguage);
  }

  const matched = [];
  const ambiguous = [];
  const unmatched = [];
  const catalogMap = new Map(catalog.map((p) => [p._id.toString(), p]));

  if (llmResult && Array.isArray(llmResult.matches)) {
    // 2. Server-side validation of every returned product ID (AI-02)
    for (const m of llmResult.matches) {
      const pids = (m.matchedProductIds || []).filter((id) => catalogMap.has(id));
      const qty = typeof m.quantity === 'number' && m.quantity > 0 ? m.quantity : 1;
      const unit = m.unit || 'piece';

      if (pids.length === 0) {
        unmatched.push(m.rawPhrase || 'Unrecognized item');
      } else if (pids.length === 1) {
        const prod = catalogMap.get(pids[0]);
        const item = {
          rawPhrase: m.rawPhrase,
          qty,
          unit,
          confidence: m.confidence || 0.9,
          product: sanitizeProduct(prod, qty),
        };
        // Check if out of stock, offer substitutes (ORD-05)
        if (!item.product.inStock) {
          item.substitutes = await findSubstitutes(prod._id, prod.categoryId?._id || prod.categoryId);
        }
        matched.push(item);
      } else {
        // Ambiguous (AI-03): candidate options
        ambiguous.push({
          rawPhrase: m.rawPhrase,
          qty,
          unit,
          candidates: pids.map((id) => sanitizeProduct(catalogMap.get(id), qty)),
        });
      }
    }

    if (Array.isArray(llmResult.unmatched)) {
      unmatched.push(...llmResult.unmatched);
    }
  } else {
    // 3. Fallback to local regex/token matcher (AI-05)
    usedFallback = true;
    const local = matchLocally(rawLines, catalog);

    for (const item of local.matched) {
      if (!item.product.inStock) {
        item.substitutes = await findSubstitutes(item.product.productId, item.product.categoryId);
      }
      matched.push(item);
    }
    ambiguous.push(...local.ambiguous);
    unmatched.push(...local.unmatched);
  }

  return {
    matched,
    ambiguous,
    unmatched: [...new Set(unmatched)],
    usedFallback,
    totalLines: rawLines.length,
  };
}

module.exports = {
  parseGroceryList,
  findSubstitutes,
  tokenizeList,
  extractQuantityAndUnit,
};
