'use strict';

/**
 * R3 — AI Controller (AI-01 through AI-09, ORD-05)
 */

const mongoose = require('mongoose');
const AiLog = require('../models/AiLog');
const Product = require('../models/Product');
const { parseGroceryList, findSubstitutes } = require('../services/aiParser');

/**
 * POST /api/ai/parse-list
 * Parse customer grocery list and validate against live catalog.
 */
const parseList = async (req, res, next) => {
  try {
    const rawText = req.body.text;
    const language = req.body.language || 'mr';

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'कृपया किराणा यादी टाइप करा / Please provide grocery items list.',
      });
    }

    // Size limit check (AI-06)
    if (rawText.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'यादी खूप मोठी आहे. कृपया २००० अक्षरांपेक्षा कमी ठेवा / List exceeds maximum length.',
      });
    }

    const cleanText = rawText.trim();
    const result = await parseGroceryList(cleanText, language);

    // Asynchronously log to AiLog for owner miss analysis (AI-08)
    (async () => {
      try {
        await AiLog.create({
          customer: req.user ? req.user._id : null,
          inputText: cleanText,
          matchedItems: result.matched.map((m) => ({
            productId: m.product.productId,
            rawPhrase: m.rawPhrase,
            quantity: m.qty,
            unit: m.unit,
            confidence: m.confidence,
          })),
          unmatchedPhrases: result.unmatched,
          source: req.body.source === 'voice' ? 'voice' : 'typed',
          usedFallback: result.usedFallback,
        });
      } catch (logErr) {
        console.warn('AiLog creation warning:', logErr.message);
      }
    })();

    const replyMsg = result.usedFallback
      ? (language === 'en'
          ? 'AI is busy; items matched using catalog search.'
          : 'AI व्यस्त आहे, कॅटलॉगमधून शोधून वस्तू जोडल्या.')
      : (language === 'en'
          ? 'List processed successfully! Please review items before adding to cart.'
          : 'यादी तयार झाली! कृपया वस्तू तपासा आणि कार्टमध्ये जोडा.');

    res.status(200).json({
      success: true,
      message: replyMsg,
      data: {
        matched: result.matched,
        ambiguous: result.ambiguous,
        unmatched: result.unmatched,
        usedFallback: result.usedFallback,
        totalItemsFound: result.matched.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/substitutes/:productId
 * Return alternative items in the same category (ORD-05).
 */
const getSubstitutes = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const prod = await Product.findById(productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const alternatives = await findSubstitutes(prod._id, prod.categoryId);
    res.status(200).json({ success: true, data: alternatives });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/misses (Owner / Staff only - AI-08)
 * Returns frequently unmatched phrases so owner can add product aliases.
 */
const getAiMisses = async (req, res, next) => {
  try {
    const missesAgg = await AiLog.aggregate([
      { $match: { 'unmatchedPhrases.0': { $exists: true } } },
      { $unwind: '$unmatchedPhrases' },
      {
        $group: {
          _id: { $toLower: '$unmatchedPhrases' },
          count: { $sum: 1 },
          lastRequested: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    res.status(200).json({
      success: true,
      data: missesAgg.map((m) => ({
        phrase: m._id,
        frequency: m.count,
        lastRequested: m.lastRequested,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  parseList,
  getSubstitutes,
  getAiMisses,
};
