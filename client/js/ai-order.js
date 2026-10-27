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
  let _unmatchedPhrases = [];
  let _currentLogId = null;
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

    // Voice recognition setup (AI-01, Task 2: Hide gracefully if unsupported, mr-IN with fallback)
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

  // ── Voice Input Setup (Task 2) ───────────────────────────────────────────────
  function setupVoiceRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec || !$voiceBtn) {
      // Gracefully hide button if Web Speech API is not supported in browser
      if ($voiceBtn) $voiceBtn.style.display = 'none';
      return;
    }

    // Show button explicitly if supported
    $voiceBtn.style.display = 'inline-flex';

    try {
      _recognition = new SpeechRec();
      _recognition.continuous = false;
      _recognition.interimResults = true;

      const fallbackLangs = ['mr-IN', 'hi-IN', 'en-IN'];
      let currentLangIndex = 0;
      let initialVal = '';

      _recognition.onstart = () => {
        _speechActive = true;
        initialVal = $input.value.trim();
        const preferred = localStorage.getItem('kirana_lang') || 'mr';
        currentLangIndex = preferred === 'hi' ? 1 : (preferred === 'en' ? 2 : 0);
        _recognition.lang = fallbackLangs[currentLangIndex];
        $voiceBtn.classList.add('recording');
        if ($voiceStatus) {
          $voiceStatus.style.display = 'flex';
          const labels = ['मराठी', 'हिंदी', 'English'];
          $voiceStatusText.innerHTML = `<svg class="icon icon--sm" style="margin-right:4px;"><use href="/images/icons.svg#mic"></use></svg> <span class="lang-mr">ऐकत आहे (${labels[currentLangIndex]})...</span><span class="lang-en">Listening (${labels[currentLangIndex]})...</span>`;
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
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          if (window.ui && window.ui.showToast) {
            ui.showToast('मायक्रोफोन परवानगी नाकारली गेली आहे. कृपया ब्राऊझर सेटिंग्जमध्ये मायक्रोफोन सुरू करा. / Microphone permission denied. Please allow microphone in browser settings.');
          }
        } else if (err.error === 'language-not-supported' && currentLangIndex < fallbackLangs.length - 1) {
          currentLangIndex++;
          _recognition.lang = fallbackLangs[currentLangIndex];
          try {
            _recognition.start();
            return;
          } catch (_) {}
        }
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
      if ($voiceBtn) $voiceBtn.style.display = 'none';
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
        if (res.status === 429) {
          throw new Error('तुम्ही खूप कमी वेळात अनेक विनंत्या पाठवल्या आहेत. कृपया १ मिनिट थांबून प्रयत्न करा. / Too many requests. Please wait a minute.');
        }
        throw new Error(data.message || 'यादी वाचण्यात अडचण आली / Failed to parse list');
      }

      _currentLogId = data.data?.logId || data.logId || null;
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
    const { matched = [], ambiguous = [], unmatched = [], usedFallback = false, logId = null } = data;
    if (logId) _currentLogId = logId;
    _unmatchedPhrases = unmatched || [];

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
              <span class="ai-subs-label"><svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#info"></use></svg> <span class="lang-mr">पर्यायी वस्तू:</span><span class="lang-en">Substitutes:</span></span>
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
          <button type="button" class="ai-item-remove" data-index="${index}" title="यादीतून काढा" aria-label="Remove item"><svg class="icon icon--sm"><use href="/images/icons.svg#close"></use></svg></button>
        </div>
      `;

      $matchedList.appendChild(card);
    });

    // Wire up steppers, removes, and substitute buttons
    $matchedList.querySelectorAll('.ai-stepper-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const action = btn.getAttribute('data-action');
        const item = _resolvedItems[idx];
        if (!item) return;
        const unit = (item.unit || item.product?.unitType || item.product?.unit || '').toLowerCase();
        const isLoose = ['kg', 'l', 'litre', 'liter', 'किलो', 'लिटर'].includes(unit) || (item.qty % 1 !== 0);
        const step = isLoose ? 0.5 : 1;
        if (action === 'inc') {
          item.qty = Math.min(50, Math.round((item.qty + step) * 100) / 100);
        } else if (action === 'dec') {
          if (item.qty > step) {
            item.qty = Math.round((item.qty - step) * 100) / 100;
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
          <span class="ai-amb-icon"><svg class="icon icon--sm"><use href="/images/icons.svg#warning"></use></svg></span>
          <div class="ai-amb-title">
            <span class="lang-mr">तुम्ही लिहिले: <strong>"${escapeHtml(amb.rawPhrase)}"</strong> — वस्तू निवडा:</span>
            <span class="lang-en">You typed: <strong>"${escapeHtml(amb.rawPhrase)}"</strong> — Choose:</span>
          </div>
          <button type="button" class="ai-amb-dismiss" data-index="${ambIdx}" title="काढून टाका" aria-label="Dismiss"><svg class="icon icon--sm"><use href="/images/icons.svg#close"></use></svg></button>
        </div>
        <div class="ai-candidate-grid">
          ${amb.candidates.map((c, cIdx) => `
            <button type="button" class="ai-candidate-chip ${!c.inStock ? 'oos' : ''}" data-amb-index="${ambIdx}" data-candidate-index="${cIdx}">
              <div class="chip-name">
                <span class="c-mr">${escapeHtml(c.nameMarathi || '')}</span>
                <span class="c-en">${escapeHtml(c.nameEnglish || c.name)}</span>
              </div>
              <div class="chip-price">₹${c.price} ${c.inStock ? '<span style="color:#059669;">उपलब्ध</span>' : '<span style="color:#dc2626;">(संपले)</span>'}</div>
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
      $addBtn.innerHTML = `<svg class="icon" style="margin-right:5px;"><use href="/images/icons.svg#cart"></use></svg> <span class="lang-mr">कार्टमध्ये जोडा (₹${total.toFixed(0)})</span><span class="lang-en">Add to Cart (₹${total.toFixed(0)})</span>`;
    }
  }

  // ── Add All to Cart (AI-04, ORD-08, Task 1 & 3) ─────────────────────────────
  function handleAddToCart() {
    const inStockItems = _resolvedItems.filter((i) => i.product.inStock && i.product.stockQuantity > 0);
    const oosItems = _resolvedItems.filter((i) => !i.product.inStock || i.product.stockQuantity <= 0);

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

    // Add batch to cart in one atomic operation
    if (window.cart && window.cart.addBatch) {
      window.cart.addBatch(inStockItems);
    } else if (window.cart && window.cart.change) {
      inStockItems.forEach(({ product, qty }) => {
        window.cart.change(product, qty);
      });
    }

    // Diagnostic logging for AiLog (Task 3)
    const rawInput = $input ? $input.value : '';
    const parsedCount = _resolvedItems.length + _ambiguousItems.length + (_unmatchedPhrases ? _unmatchedPhrases.length : 0);
    const addedCount = inStockItems.length;
    const droppedReasons = [];
    oosItems.forEach((i) => {
      droppedReasons.push(`OOS: ${i.product.nameEnglish || i.product.name} (${i.rawPhrase || ''})`);
    });
    _ambiguousItems.forEach((i) => {
      droppedReasons.push(`Ambiguous: ${i.rawPhrase || ''}`);
    });
    (_unmatchedPhrases || []).forEach((p) => {
      droppedReasons.push(`Unmatched: ${p}`);
    });
    const droppedCount = oosItems.length + _ambiguousItems.length + (_unmatchedPhrases ? _unmatchedPhrases.length : 0);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = window.auth ? window.auth.getToken() : localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch(`${CONFIG.API_BASE}/ai/log-add-result`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          logId: _currentLogId,
          rawInput,
          parsedCount,
          addedCount,
          droppedCount,
          droppedReasons,
          source: _speechActive ? 'voice' : 'typed',
        }),
      }).catch(() => {});
    } catch (_) {}

    // Bilingual feedback summary toast
    let summaryMsg = `${addedCount} वस्तू कार्टमध्ये जोडल्या / ${addedCount} items added`;
    if (droppedCount > 0) {
      summaryMsg += ` • ${droppedCount} तपासणे बाकी / ${droppedCount} need attention`;
    }
    if (window.ui && window.ui.showToast) {
      ui.showToast(summaryMsg, 'success');
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
