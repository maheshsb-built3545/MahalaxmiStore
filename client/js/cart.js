/**
 * frontend/js/cart.js
 *
 * Cart persistence strategy (Stage 1):
 *  - localStorage key "kirana_cart" stores an array of { productId, qty } only.
 *    Prices and names are never stored – they are always fetched fresh from the API.
 *  - On page load, cart.init() fetches current product data for all stored IDs
 *    via GET /api/products?ids=id1,id2,... and rebuilds the in-memory cart.
 *  - Products that are no longer found or are out of stock are silently removed;
 *    a single toast is shown if any items were dropped.
 *
 * Public API used by catalog.js and index.html:
 *   cart.get(productId)             → { productId, qty, product } | undefined
 *   cart.getQty(productId)          → number (0 if not in cart)
 *   cart.getAll()                   → array of { productId, qty, product }
 *   cart.change(productId, delta)   → new qty (≥0); triggers save + UI refresh
 *   cart.clear()                    → empties cart
 *   cart.total()                    → ₹ total
 *   cart.itemCount()                → total unit count
 *   cart.init(onReady)              → loads from localStorage, validates via API
 *   cart.onUpdate(fn)               → registers a listener called after every change
 */

const cart = (() => {
  const STORAGE_KEY = 'kirana_cart';

  // In-memory store: productId → { productId, qty, product }
  // 'product' is the full API object, populated on init.
  let _items = {};
  const _listeners = [];

  // ── Persistence helpers ────────────────────────────────────────────────────

  /** Read raw [{productId, qty}] from localStorage. */
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /** Write current _items back to localStorage (productId + qty only). */
  function _save() {
    const slim = Object.values(_items).map(({ productId, qty }) => ({ productId, qty }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch (_) {
      // Storage full – fail silently
    }
  }

  /** Notify all registered listeners. */
  function _notify() {
    _listeners.forEach((fn) => fn());
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function get(productId) { return _items[productId]; }

  function getQty(productId) { return _items[productId] ? _items[productId].qty : 0; }

  function getAll() { return Object.values(_items); }

  function total() {
    return Object.values(_items).reduce((sum, { qty, product }) => {
      return sum + qty * (product ? product.price : 0);
    }, 0);
  }

  function itemCount() {
    return Object.values(_items).reduce((sum, { qty }) => sum + qty, 0);
  }

  /**
   * Change quantity for a product.
   * @param {object} product – full API product object (must have _id, inStock, price …)
   * @param {number} delta   – +1 or -1
   * @returns {number} new qty
   */
  function change(product, delta) {
    const id  = product._id || product.productId;
    if (!id) return 0;
    const cur = _items[id] ? _items[id].qty : 0;
    const stock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
    const rawNext = Math.round((cur + delta) * 100) / 100;
    const next = Math.max(0, Math.min(stock, rawNext));

    if (next <= 0) {
      delete _items[id];
    } else {
      _items[id] = { productId: id, qty: next, product };
    }

    _save();
    _notify();
    return next;
  }

  function addOrSet(product, qty) {
    const id = product._id || product.productId;
    if (!id) return 0;
    const stock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
    const next = Math.max(0, Math.min(stock, qty));
    if (next === 0) {
      delete _items[id];
    } else {
      _items[id] = { productId: id, qty: next, product };
    }
    _save();
    _notify();
    return next;
  }

  function addBatch(itemsList) {
    if (!Array.isArray(itemsList)) return;
    itemsList.forEach(({ product, qty }) => {
      if (!product) return;
      const id = product._id || product.productId;
      if (!id || qty <= 0) return;
      const cur = _items[id] ? _items[id].qty : 0;
      const stock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
      const nextQty = Math.max(0, Math.min(stock, cur + qty));
      if (nextQty > 0) {
        _items[id] = { productId: id, qty: nextQty, product };
      }
    });
    _save();
    _notify();
  }

  /**
   * Merge external guest items into current in-memory cart (Rule 4 of Task 1)
   * Sums quantities for the same product, capped by available stock, zero duplicates.
   */
  function mergeWith(otherItems) {
    if (!Array.isArray(otherItems)) return;
    otherItems.forEach((item) => {
      const id = item.productId || (item.product && (item.product._id || item.product.productId));
      const qty = item.qty || 0;
      if (!id || qty <= 0) return;

      const existing = _items[id];
      const prod = item.product || (existing ? existing.product : null);
      const stock = prod && typeof prod.stockQuantity === 'number' ? prod.stockQuantity : 50;
      const cur = existing ? existing.qty : 0;
      const nextQty = Math.min(stock, cur + qty);

      if (nextQty > 0) {
        _items[id] = {
          productId: id,
          qty: nextQty,
          product: prod || existing?.product,
        };
      }
    });
    _save();
    _notify();
  }

  function clear() {
    _items = {};
    _save();
    _notify();
  }

  function onUpdate(fn) { _listeners.push(fn); }

  /**
   * Initialise cart on page load:
   * 1. Read raw { productId, qty } pairs from localStorage.
   * 2. If any, fetch full product data from API (?ids=...).
   * 3. Discard items whose product is not found or is out of stock.
   * 4. Show one toast if any items were dropped.
   * 5. Call onReady() when done.
   */
  async function init(onReady) {
    const raw = _load();

    if (!raw.length) {
      onReady && onReady();
      return;
    }

    const ids = raw.map((r) => r.productId).filter(Boolean).join(',');
    let productMap = {};

    try {
      const res  = await fetch(`${CONFIG.API_BASE}/products?ids=${encodeURIComponent(ids)}&limit=500`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        data.data.forEach((p) => { productMap[p._id] = p; });
      }
    } catch (_) {
      // API unreachable – keep items without product data so UI can show a warning
    }

    let dropped = 0;

    raw.forEach(({ productId, qty }) => {
      if (!productId) return;
      const p = productMap[productId];
      if (productMap && Object.keys(productMap).length > 0 && (!p || !p.inStock)) {
        dropped++;
        return; // skip – confirmed stale or out of stock
      }
      _items[productId] = { productId, qty, product: p || { _id: productId, productId, nameEn: 'Grocery Item', price: 0, inStock: true } };
    });

    if (dropped > 0) {
      // ui.js's showToast is registered via window; call after DOM ready
      window._cartDroppedCount = dropped; // picked up by ui.js after init
    }

    _save();
    onReady && onReady();
  }

  return { get, getQty, getAll, total, itemCount, change, addOrSet, addBatch, mergeWith, clear, onUpdate, init };
})();
