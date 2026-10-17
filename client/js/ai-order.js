/**
 * frontend/js/ai-order.js
 *
 * R3 — AI Order Box Frontend Controller (AI-01 through AI-09, ORD-05, ORD-08)
 *
 * Capabilities:
 *  - Multilingual natural language parsing (Marathi, Hindi, Hinglish, English)
 *  - Speech recognition voice typing (Web Speech API with mr-IN / hi-IN)
 *  - Interactive review tray with item stepper and price calculation
 *  - Ambiguity resolution chips (AI-03)
 *  - In-stock category substitute recommendation (ORD-05)
 *  - One-click bulk addition to cart with channel tracking 'ai_box' (AI-04, ORD-08)
 */

const aiOrderBox = (() => {
  // In-memory working list of items in the review tray:
  // Array of { product: fullProductObj, qty: number, unit: string, rawPhrase: string }
  let _resolvedItems = [];
  let _ambiguousItems = [];
  let _speechActive = false;
  let _recognition = null;

  // DOM elements cache
  let $input, $charCount, $parseBtn, $clearBtn, $voiceBtn, $voiceStatus, $voiceStatusText;
  let $tray, $matchedList, $ambiguousList, $unmatchedList;
  let $matchedCount, $ambiguousCount, $unmatchedCount, $totalPreview, $addBtn;
  let $matchedSec, $ambiguousSec, $unmatchedSec, $fallbackBadge;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function init() {
    $input           = document.getElementById('aiListInput');
    $charCount       = document.getElementById('aiCharCount');
    $parseBtn        = document.getElementById('aiParseBtn');
    $clearBtn        = document.getElementById('aiClearBtn');
    $voiceBtn        = document.getElementById('aiVoiceBtn');
    $voiceStatus     = document.getElementById('aiVoiceStatus');
    $voiceStatusText = document.getElementById('aiVoiceStatusText');
    $tray            = document.getElementById('aiResultsTray');
    $matchedSec      = document.getElementById('aiMatchedSection');
    $ambiguousSec    = document.getElementById('aiAmbiguousSection');
    $unmatchedSec    = document.getElementById('aiUnmatchedSection');
    $matchedList     = document.getElementById('aiMatchedList');
    $ambiguousList   = document.getElementById('aiAmbiguousList');
    $unmatchedList   = document.getElementById('aiUnmatchedList');
    $matchedCount    = document.getElementById('aiMatchedCount');
    $ambiguousCount  = document.getElementById('aiAmbiguousCount');
    $unmatchedCount  = document.getElementById('aiUnmatchedCount');
    $totalPreview    = document.getElementById('aiTotalPreview');
    $addBtn          = document.getElementById('aiAddToCartBtn');
    $fallbackBadge   = document.getElementById('aiFallbackBadge');

    if (!$input || !$parseBtn) return;

    // Character counter & clear button visibility
    $input.addEventListener('input', () => {
      const len = $input.value.length;
      if ($charCount) $charCount.textContent = `${len} / 2000`;
      if ($clearBtn) $clearBtn.style.display = len > 0 ? 'inline-block' : 'none';
    });

    if ($clearBtn) {
      $clearBtn.addEventListener('click', () => {
        $input.value = '';
        if ($charCount) $charCount.textContent = '0 / 2000';
        $clearBtn.style.display = 'none';
        $input.focus();
      });
    }

    // Sample pills click
    document.querySelectorAll('.ai-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        $input.value = text;
        if ($charCount) $charCount.textContent = `${text.length} / 2000`;
        if ($clearBtn) $clearBtn.style.display = 'inline-block';
        $input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $input.focus();
      });
    });

    // Voice recognition setup (AI-01, Voice Polish)
    setupVoiceRecognition();

    // Parse button click
    $parseBtn.addEventListener('click', handleParse);

    // Enter with Ctrl or Shift to submit
    $input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleParse();
      }
    });

    // Add to cart click
    if ($addBtn) {
      $addBtn.addEventListener('click', handleAddToCart);
    }
  }

  // ── Voice Input Setup ────────────────────────────────────────────────────────
  function setupVoiceRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec || !$voiceBtn) {
      if ($voiceBtn) $voiceBtn.title = 'Voice input not supported in this browser';
      return;
    }

    try {
      _recognition = new SpeechRec();
      _recognition.continuous = false;
      _recognition.interimResults = true;

      let initialVal = '';

      _recognition.onstart = () => {
        _speechActive = true;
        initialVal = $input.value.trim();
        const currentLang = localStorage.getItem('mk_lang') || 'mr';
        _recognition.lang = currentLang === 'hi' ? 'hi-IN' : (currentLang === 'en' ? 'en-IN' : 'mr-IN');
        $voiceBtn.classList.add('recording');
        if ($voiceStatus) {
          $voiceStatus.style.display = 'flex';
          const langLabel = currentLang === 'hi' ? 'हिंदी' : (currentLang === 'en' ? 'English' : 'मराठी');
          $voiceStatusText.textContent = `🎙️ ऐकत आहे... / Listening (${langLabel}) — बोलून किराणा यादी सांगा...`;
        }
      };

      _recognition.onresult = (event) => {
        let finalTrans = '';
        for (let i = 0; i < event.results.length; i++) {
          finalTrans += event.results[i][0].transcript;
        }
        if (finalTrans.trim()) {
          const sep = initialVal.length > 0 ? ', ' : '';
          $input.value = initialVal + sep + finalTrans.trim();
          if ($charCount) $charCount.textContent = `${$input.value.length} / 2000`;
          if ($clearBtn) $clearBtn.style.display = 'inline-block';
        }
      };

      _recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err.error);
        stopVoice();
      };

      _recognition.onend = () => {
        stopVoice();
      };

      $voiceBtn.addEventListener('click', () => {
        if (_speechActive) {
          _recognition.stop();
          stopVoice();
        } else {
          try {
            _recognition.start();
          } catch (e) {
            console.warn('Recognition start exception:', e);
          }
        }
      });
    } catch (e) {
      console.warn('Speech recognition setup error:', e);
    }
  }

  function stopVoice() {
    _speechActive = false;
    if ($voiceBtn) $voiceBtn.classList.remove('recording');
    if ($voiceStatus) $voiceStatus.style.display = 'none';
  }

  // ── Parse Handler ────────────────────────────────────────────────────────────
  async function handleParse() {
    const text = ($input.value || '').trim();
    if (!text) {
      if (window.ui && window.ui.showToast) {
        ui.showToast('कृपया किराणा यादी टाइप करा / Please enter items');
      } else {
        alert('कृपया किराणा यादी टाइप करा');
      }
      $input.focus();
      return;
    }

    setLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${CONFIG.API_BASE}/ai/parse-list`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          language: localStorage.getItem('kirana_lang') || 'mr',
          source: _speechActive ? 'voice' : 'typed',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'यादी वाचण्यात अडचण आली / Failed to parse list');
      }

      renderResults(data.data);
    } catch (err) {
      console.error('AI parse error:', err);
      if (window.ui && window.ui.showToast) {
        ui.showToast(err.message || 'Network error while parsing list');
      } else {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    if (!$parseBtn) return;
    $parseBtn.disabled = isLoading;
    const txt = $parseBtn.querySelector('.ai-btn-text');
    const spin = $parseBtn.querySelector('.ai-btn-spinner');
    if (txt) txt.style.display = isLoading ? 'none' : 'inline-block';
    if (spin) spin.style.display = isLoading ? 'inline-flex' : 'none';
  }

  // ── Render Review Tray ───────────────────────────────────────────────────────
  function renderResults(data) {
    const { matched = [], ambiguous = [], unmatched = [], usedFallback = false } = data;

    _resolvedItems = matched.map((m) => ({
      product: m.product,
      qty: m.qty,
      unit: m.unit,
      rawPhrase: m.rawPhrase,
      substitutes: m.substitutes || [],
    }));

    _ambiguousItems = ambiguous;

    if ($fallbackBadge) {
      $fallbackBadge.style.display = usedFallback ? 'inline-block' : 'none';
    }

    renderMatched();
    renderAmbiguous();
    renderUnmatched(unmatched);
    updateTotalPreview();

    if ($tray) {
      $tray.style.display = 'block';
      $tray.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ── Matched Items List ───────────────────────────────────────────────────────
  function renderMatched() {
    if (!$matchedList || !$matchedCount || !$matchedSec) return;

    $matchedCount.textContent = _resolvedItems.length;
    $matchedSec.style.display = _resolvedItems.length > 0 ? 'block' : 'none';
    $matchedList.innerHTML = '';

    _resolvedItems.forEach((item, index) => {
      const p = item.product;
      const isOos = !p.inStock || p.stockQuantity <= 0;
      const card = document.createElement('div');
      card.className = `ai-item-card ${isOos ? 'out-of-stock-card' : ''}`;

      const itemTotal = (p.price * item.qty).toFixed(0);
      const unitLabel = p.unitType ? p.unitType : (p.unit || 'unit');

      card.innerHTML = `
        <div class="ai-item-thumb">
          <img src="${p.imageUrl || 'images/placeholder-product.svg'}" alt="${escapeHtml(p.nameEnglish || p.name)}" loading="lazy" onerror="this.src='images/placeholder-product.svg'">
        </div>
        <div class="ai-item-details">
          <div class="ai-item-name-row">
            <span class="ai-item-title-mr">${escapeHtml(p.nameMarathi || p.nameHindi || '')}</span>
            <span class="ai-item-title-en">${escapeHtml(p.nameEnglish || p.name)}</span>
          </div>
          <div class="ai-item-meta">
            <span class="ai-item-price">₹${p.price} / ${escapeHtml(unitLabel)}</span>
            ${item.rawPhrase ? `<span class="ai-item-phrase">" ${escapeHtml(item.rawPhrase)} "</span>` : ''}
            ${isOos ? '<span class="badge-oos">Out of stock / संपले आहे</span>' : ''}
          </div>
          ${isOos && item.substitutes && item.substitutes.length > 0 ? `
            <div class="ai-subs-inline">
              <span class="ai-subs-label">💡 पर्यायी वस्तू निवडा:</span>
              ${item.substitutes.map((sub) => `
                <button type="button" class="btn-sub-pill" data-index="${index}" data-sub-id="${sub._id}">
                  ${escapeHtml(sub.nameMarathi || sub.nameEnglish)} (₹${sub.price})
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="ai-item-actions">
          <div class="ai-qty-stepper">
            <button type="button" class="ai-stepper-btn" data-action="dec" data-index="${index}" aria-label="Decrease quantity">−</button>
            <span class="ai-stepper-val">${item.qty} ${unitLabel}</span>
            <button type="button" class="ai-stepper-btn" data-action="inc" data-index="${index}" aria-label="Increase quantity">+</button>
          </div>
          <div class="ai-item-subtotal">₹${itemTotal}</div>
          <button type="button" class="ai-item-remove" data-index="${index}" title="यादीतून काढा" aria-label="Remove item">✕</button>
        </div>
      `;

      $matchedList.appendChild(card);
    });

    // Wire up steppers, removes, and substitute buttons
    $matchedList.querySelectorAll('.ai-stepper-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const action = btn.getAttribute('data-action');
        if (action === 'inc') {
          _resolvedItems[idx].qty = Math.min(50, _resolvedItems[idx].qty + 1);
        } else if (action === 'dec') {
          if (_resolvedItems[idx].qty > 1) {
            _resolvedItems[idx].qty -= 1;
          } else {
            _resolvedItems.splice(idx, 1);
          }
        }
        renderMatched();
        updateTotalPreview();
      });
    });

    $matchedList.querySelectorAll('.ai-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        _resolvedItems.splice(idx, 1);
        renderMatched();
        updateTotalPreview();
      });
    });

    $matchedList.querySelectorAll('.btn-sub-pill').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const subId = btn.getAttribute('data-sub-id');
        const originalItem = _resolvedItems[idx];
        const subProd = originalItem.substitutes.find((s) => s._id === subId);
        if (subProd) {
          // Replace with chosen substitute
          _resolvedItems[idx] = {
            product: {
              ...subProd,
              inStock: true,
              stockQuantity: subProd.stockQuantity || 10,
            },
            qty: originalItem.qty,
            unit: subProd.unitType || originalItem.unit,
            rawPhrase: `Swapped for ${originalItem.rawPhrase}`,
            substitutes: [],
          };
          renderMatched();
          updateTotalPreview();
          if (window.ui && window.ui.showToast) {
            ui.showToast(`पर्यायी वस्तू निवडली: ${subProd.nameMarathi || subProd.nameEnglish}`);
          }
        }
      });
    });
  }

  // ── Ambiguous Items (AI-03) ──────────────────────────────────────────────────
  function renderAmbiguous() {
    if (!$ambiguousList || !$ambiguousCount || !$ambiguousSec) return;

    $ambiguousCount.textContent = _ambiguousItems.length;
    $ambiguousSec.style.display = _ambiguousItems.length > 0 ? 'block' : 'none';
    $ambiguousList.innerHTML = '';

    _ambiguousItems.forEach((amb, ambIdx) => {
      const card = document.createElement('div');
      card.className = 'ai-ambiguous-card';

      card.innerHTML = `
        <div class="ai-amb-header">
          <span class="ai-amb-icon">⚠️</span>
          <div class="ai-amb-title">
            तुम्ही लिहिले: <strong>"${escapeHtml(amb.rawPhrase)}"</strong> — नक्की कोणती वस्तू हवी आहे?
          </div>
          <button type="button" class="ai-amb-dismiss" data-index="${ambIdx}" title="काढून टाका">✕</button>
        </div>
        <div class="ai-candidate-grid">
          ${amb.candidates.map((c, cIdx) => `
            <button type="button" class="ai-candidate-chip ${!c.inStock ? 'oos' : ''}" data-amb-index="${ambIdx}" data-candidate-index="${cIdx}">
              <div class="chip-name">
                <span class="c-mr">${escapeHtml(c.nameMarathi || '')}</span>
                <span class="c-en">${escapeHtml(c.nameEnglish || c.name)}</span>
              </div>
              <div class="chip-price">₹${c.price} ${c.inStock ? '✓ उपलब्ध' : '(संपले)'}</div>
            </button>
          `).join('')}
        </div>
      `;

      $ambiguousList.appendChild(card);
    });

    // Wire candidate clicks
    $ambiguousList.querySelectorAll('.ai-candidate-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ambIdx = parseInt(btn.getAttribute('data-amb-index'), 10);
        const cIdx = parseInt(btn.getAttribute('data-candidate-index'), 10);
        const amb = _ambiguousItems[ambIdx];
        const chosen = amb.candidates[cIdx];

        if (!chosen) return;

        // Move into _resolvedItems
        _resolvedItems.push({
          product: {
            ...chosen,
            productId: chosen.productId || chosen._id,
            _id: chosen.productId || chosen._id,
          },
          qty: amb.requestedQty || 1,
          unit: amb.requestedUnit || chosen.unitType || 'unit',
          rawPhrase: amb.rawPhrase,
          substitutes: [],
        });

        // Remove from ambiguous
        _ambiguousItems.splice(ambIdx, 1);

        renderMatched();
        renderAmbiguous();
        updateTotalPreview();

        if (window.ui && window.ui.showToast) {
          ui.showToast(`जोडले: ${chosen.nameMarathi || chosen.nameEnglish}`);
        }
      });
    });

    $ambiguousList.querySelectorAll('.ai-amb-dismiss').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ambIdx = parseInt(btn.getAttribute('data-index'), 10);
        _ambiguousItems.splice(ambIdx, 1);
        renderAmbiguous();
      });
    });
  }

  // ── Unmatched Items ──────────────────────────────────────────────────────────
  function renderUnmatched(unmatched) {
    if (!$unmatchedList || !$unmatchedCount || !$unmatchedSec) return;

    $unmatchedCount.textContent = unmatched.length;
    $unmatchedSec.style.display = unmatched.length > 0 ? 'block' : 'none';
    $unmatchedList.innerHTML = '';

    unmatched.forEach((phrase) => {
      const chip = document.createElement('span');
      chip.className = 'ai-unmatched-chip';
      chip.textContent = phrase;
      $unmatchedList.appendChild(chip);
    });
  }

  // ── Total Calculation ────────────────────────────────────────────────────────
  function updateTotalPreview() {
    const total = _resolvedItems.reduce((sum, item) => {
      if (!item.product.inStock || item.product.stockQuantity <= 0) return sum;
      return sum + (item.product.price * item.qty);
    }, 0);

    if ($totalPreview) {
      $totalPreview.textContent = `₹${total.toFixed(0)}`;
    }

    if ($addBtn) {
      const inStockCount = _resolvedItems.filter((i) => i.product.inStock && i.product.stockQuantity > 0).length;
      $addBtn.disabled = inStockCount === 0;
      $addBtn.innerHTML = `🛒 सर्व ${inStockCount} वस्तू कार्टमध्ये जोडा (₹${total.toFixed(0)}) →`;
    }
  }

  // ── Add All to Cart (AI-04, ORD-08) ──────────────────────────────────────────
  function handleAddToCart() {
    const inStockItems = _resolvedItems.filter((i) => i.product.inStock && i.product.stockQuantity > 0);

    if (!inStockItems.length) {
      if (window.ui && window.ui.showToast) {
        ui.showToast('कार्टमध्ये जोडण्यासाठी कोणतीही उपलब्ध वस्तू नाही / No in-stock items to add');
      }
      return;
    }

    // Set order channel in localStorage so checkout records channel: 'ai_box' (ORD-08)
    try {
      localStorage.setItem('kirana_order_channel', 'ai_box');
    } catch (_) {}

    // Add batch to cart
    if (window.cart && window.cart.addBatch) {
      window.cart.addBatch(inStockItems);
    } else if (window.cart && window.cart.change) {
      inStockItems.forEach(({ product, qty }) => {
        window.cart.change(product, qty);
      });
    }

    if (window.ui && window.ui.showToast) {
      ui.showToast(`🎉 ${inStockItems.length} वस्तू कार्टमध्ये जोडल्या! (Added to cart)`);
    }

    // Open cart drawer so user sees items instantly
    if (window.ui && window.ui.openCart) {
      setTimeout(() => {
        ui.openCart();
      }, 400);
    }
  }

  return { init, handleParse };
})();

// Auto boot on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  aiOrderBox.init();
});
