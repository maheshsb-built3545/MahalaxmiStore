/**
 * frontend/js/catalog.js
 *
 * Fetches categories and products from the API, renders the catalog.
 * Uses safe DOM methods (no innerHTML for user/API data).
 * Depends on: CONFIG (config.js), cart (cart.js).
 */

const catalog = (() => {

  let _categories  = [];   // full category objects from API
  let _products    = [];   // full product objects from API
  let _activeCatId = null; // null = "All"

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Safely create a text node. */
  function t(str) { return document.createTextNode(str ?? ''); }

  /** Escape HTML for safe template insertion. */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Create element with optional className and optional text content. */
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.appendChild(t(text));
    return e;
  }

  /** Format price as ₹N */
  function fmt(n) { return '₹' + n; }

  /** Discount % */
  function disc(price, mrp) { return Math.round((1 - price / mrp) * 100); }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchCategories() {
    const res  = await fetch(`${CONFIG.API_BASE}/categories`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    _categories = data.data;
  }

  async function fetchProducts() {
    const res  = await fetch(`${CONFIG.API_BASE}/products?limit=500`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    _products = data.data;
  }

  // ── Render: category grid ────────────────────────────────────────────────

  function renderCategoryGrid() {
    const grid = document.getElementById('catGrid');
    if (!grid) return;
    grid.textContent = ''; // clear safely

    // "All" button
    const allBtn = el('button', 'cat-card' + (_activeCatId === null ? ' active' : ''));
    allBtn.dataset.cat = 'all';
    const allEm  = el('span', 'em', '');
    allEm.innerHTML = '<svg class="icon"><use href="/images/icons.svg#grid"></use></svg>';
    allBtn.appendChild(allEm);
    allBtn.appendChild(t('All'));
    allBtn.addEventListener('click', () => setCat(null));
    grid.appendChild(allBtn);

    _categories.forEach((cat) => {
      const btn  = el('button', 'cat-card' + (_activeCatId === cat._id ? ' active' : ''));
      btn.dataset.cat = cat._id;
      const emEl = el('span', 'em', '');
      emEl.innerHTML = renderCategoryIcon(cat);
      btn.appendChild(emEl);
      btn.appendChild(t(cat.nameEn));
      btn.addEventListener('click', () => setCat(cat._id));
      grid.appendChild(btn);
    });

    const deptRow = document.getElementById('deptRow');
    if (deptRow && _categories.length) {
      deptRow.textContent = '';
      _categories.forEach((cat) => {
        const btn = el('button', 'dept');
        btn.innerHTML = `${renderCategoryIcon(cat, 'icon--sm')} <span>${cat.nameEn.split('&')[0].trim()}</span>`;
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', `View ${cat.nameEn} in catalog`);
        btn.addEventListener('click', () => setCat(cat._id));
        deptRow.appendChild(btn);
      });
    }

    if (typeof ui !== 'undefined' && ui.observeReveals) ui.observeReveals(grid);
  }

  // ── Render: filter chips ─────────────────────────────────────────────────

  function renderFilterChips() {
    const row = document.getElementById('filterRow');
    if (!row) return;
    row.textContent = '';

    const allChip = el('button', 'chip' + (_activeCatId === null ? ' active' : ''), 'All');
    allChip.addEventListener('click', () => setCat(null));
    row.appendChild(allChip);

    _categories.forEach((cat) => {
      const chip = el('button', 'chip' + (_activeCatId === cat._id ? ' active' : ''), cat.nameEn);
      chip.addEventListener('click', () => setCat(cat._id));
      row.appendChild(chip);
    });
  }

  function setCat(catId) {
    _activeCatId = catId;
    renderCategoryGrid();
    renderFilterChips();
    renderProductGrid();
    const catalogEl = document.getElementById('catalog');
    if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Render: product card ─────────────────────────────────────────────────

  function buildProductCard(p) {
    const qty  = cart.getQty(p._id);
    const off  = disc(p.price, p.mrp);
    // R1: get numeric stock (fallback: inStock boolean for backward compat)
    const stock = typeof p.stockQuantity === 'number' ? p.stockQuantity : (p.inStock ? 999 : 0);
    const rl    = typeof p.reorderLevel  === 'number' ? p.reorderLevel  : 5;
    const isLow = stock > 0 && stock <= rl;

    const card = el('div', 'card');
    card.dataset.productId = p._id;
    card.dataset.reveal = 'scale';

    // Discount badge
    const offEl = el('span', 'off', off + '% OFF');
    card.appendChild(offEl);

    // Product image wrapper with 1:1 ratio
    const imgWrap = el('div', 'card-img-wrap');
    if (p.imageUrl) {
      const img = document.createElement('img');
      img.src   = p.imageUrl;
      img.alt   = p.nameEn;
      img.width = 200;
      img.height = 200;
      img.className = 'card-img';
      img.loading   = 'lazy';
      img.decoding  = 'async';
      img.onerror   = () => {
        const fallback = el('div', 'em', '');
        fallback.innerHTML = renderCategoryIcon(p.categoryId);
        img.replaceWith(fallback);
      };
      imgWrap.appendChild(img);
    } else {
      const fallback = el('div', 'em', '');
      fallback.innerHTML = renderCategoryIcon(p.categoryId);
      imgWrap.appendChild(fallback);
    }
    card.appendChild(imgWrap);

    const nameH4 = el('h4');
    nameH4.innerHTML = `<span class="lang-mr">${escapeHtml(p.nameMr || p.nameEn)}</span><span class="lang-en">${escapeHtml(p.nameEn || p.nameMr)}</span>`;
    card.appendChild(nameH4);

    const packEl = el('div', 'wt', p.packSize || '');
    card.appendChild(packEl);

    const priceRow = el('div', 'price-row');
    priceRow.appendChild(el('span', 'price', fmt(p.price)));
    if (p.mrp && p.mrp > p.price) {
      priceRow.appendChild(el('span', 'mrp', fmt(p.mrp)));
    }
    if (off > 0) {
      priceRow.appendChild(el('span', 'save-chip', `${off}% OFF`));
    }
    card.appendChild(priceRow);

    // Out-of-stock (R1: based on virtual inStock which checks stockQuantity + unavailableFlag)
    if (!p.inStock || stock <= 0) {
      card.classList.add('out-of-stock');
      const oos = el('button', 'add-btn');
      oos.innerHTML = '<span class="lang-mr">संपले</span><span class="lang-en">Out of stock</span>';
      oos.disabled = true;
      oos.style.opacity = '0.55';
      oos.style.cursor  = 'not-allowed';
      card.appendChild(oos);
      return card;
    }

    // Stepper (if in cart) or Add button
    if (qty > 0) {
      const stepper = el('div', 'stepper');

      const minus = el('button', null, '−');
      minus.setAttribute('aria-label', 'Remove one ' + p.nameEn);
      minus.addEventListener('click', () => {
        if (window.PWA) window.PWA.haptic(15);
        cart.change(p, -1);
        ui.renderCartDrawer();
        renderProductGrid();
        renderBestSellers();
        ui.updateCartBadge();
      });

      const qtySpan = el('span', null, String(qty));

      const plus = el('button', null, '+');
      plus.setAttribute('aria-label', 'Add one more ' + p.nameEn);
      // R1: disable + if cart qty already equals available stock
      if (qty >= stock) {
        plus.disabled = true;
        plus.title    = `फक्त ${stock} उपलब्ध / Only ${stock} available`;
        plus.style.opacity = '0.4';
        plus.style.cursor  = 'not-allowed';
        plus.addEventListener('click', () => {
          ui.showToast(`फक्त ${stock} उपलब्ध / Only ${stock} available`, 'warning');
        });
      } else {
        plus.addEventListener('click', () => {
          if (window.PWA) window.PWA.haptic(20);
          cart.change(p, 1);
          ui.renderCartDrawer();
          renderProductGrid();
          renderBestSellers();
          ui.updateCartBadge();
          ui.showToast(p.nameEn + ' added to cart');
          if (typeof auth !== 'undefined' && !auth.isLoggedIn() && typeof ui !== 'undefined' && ui.showLoginPrompt) {
            const curPage = (window.location.pathname.split('/').pop() || 'index.html') + window.location.search;
            ui.showLoginPrompt({ type: 'add_item', product: p, qty: 1, alreadyInCart: true, returnUrl: curPage });
          }
        });
      }

      stepper.append(minus, qtySpan, plus);
      card.appendChild(stepper);
    } else {
      const addBtn = el('button', 'add-btn');
      addBtn.innerHTML = '<span class="lang-mr">+ जोडा</span><span class="lang-en">+ Add</span>';
      addBtn.setAttribute('aria-label', 'Add ' + p.nameEn + ' to cart');
      addBtn.addEventListener('click', () => {
        if (window.PWA) window.PWA.haptic(25);
        addBtn.classList.remove('btn-pop');
        void addBtn.offsetWidth;
        addBtn.classList.add('btn-pop');
        cart.change(p, 1);
        ui.renderCartDrawer();
        renderProductGrid();
        renderBestSellers();
        ui.updateCartBadge();
        ui.showToast(p.nameEn + ' added to cart');
        if (typeof auth !== 'undefined' && !auth.isLoggedIn() && typeof ui !== 'undefined' && ui.showLoginPrompt) {
          const curPage = (window.location.pathname.split('/').pop() || 'index.html') + window.location.search;
          ui.showLoginPrompt({ type: 'add_item', product: p, qty: 1, alreadyInCart: true, returnUrl: curPage });
        }
      });
      card.appendChild(addBtn);
    }

    return card;
  }

  // ── Render: product grid ─────────────────────────────────────────────────

  function renderProductGrid() {
    const grid  = document.getElementById('prodGrid');
    const search = (document.getElementById('searchInput')?.value ?? '').trim().toLowerCase();
    if (!grid) return;
    grid.textContent = '';

    const re = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const list = _products.filter((p) => {
      const catMatch = _activeCatId === null || p.categoryId._id === _activeCatId;
      if (!re) return catMatch;

      const keywords = Array.isArray(p.search_keywords) ? p.search_keywords : [];
      const aliases = Array.isArray(p.aliases) ? p.aliases : [];
      const searchMatch =
        re.test(p.nameEn || '') ||
        re.test(p.nameMr || '') ||
        re.test(p.nameHi || '') ||
        keywords.some((k) => re.test(k)) ||
        aliases.some((a) => re.test(a));

      return catMatch && searchMatch;
    });

    if (!list.length) {
      const msg = el('div', 'empty-search-state');
      msg.style.cssText = 'color:#64748b;grid-column:1/-1;text-align:center;padding:48px 16px;';
      const icon = el('div', '', '');
      icon.innerHTML = '<svg class="icon icon--2xl" style="color:var(--forest-400);margin-bottom:8px;"><use href="/images/icons.svg#search"></use></svg>';
      icon.style.cssText = 'margin-bottom:8px;';
      const title = el('strong', '', '');
      title.innerHTML = '<span class="lang-mr">उत्पादने सापडली नाहीत</span><span class="lang-en">No products found</span>';
      title.style.cssText = 'display:block;font-size:1.1rem;color:#04251a;margin-bottom:6px;';
      const sub = el('p', '', '');
      sub.innerHTML = '<span class="lang-mr">वेगळा शब्द वापरून शोधा किंवा व्हॉट्सॲपवर विचारा.</span><span class="lang-en">Try another search or ask on WhatsApp.</span>';
      sub.style.cssText = 'font-size:0.9rem;margin-bottom:12px;';

      const waNumber = (window._storeSettings && window._storeSettings.storeWhatsapp) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NUM : '919860924504');
      const waBtn = el('a', 'btn btn-outline', '');
      waBtn.innerHTML = '<svg class="icon" style="margin-right:6px;"><use href="/images/icons.svg#whatsapp"></use></svg> <span class="lang-mr">व्हॉट्सॲपवर विचारा</span><span class="lang-en">Ask on WhatsApp</span>';
      waBtn.href = `${CONFIG.WA_BASE}${waNumber}?text=` + encodeURIComponent(`नमस्कार! मला "${search}" हवे होते, तुमच्याकडे उपलब्ध आहे का? / Hi, do you have "${search}"?`);
      waBtn.target = '_blank';
      waBtn.rel = 'noopener';
      waBtn.style.cssText = 'min-height:44px;display:inline-flex;align-items:center;margin-top:14px;text-decoration:none;font-weight:700;';

      msg.append(icon, title, sub, waBtn);
      grid.appendChild(msg);

      if (search && search.length >= 2) {
        fetch(`${CONFIG.API_BASE}/products?search=${encodeURIComponent(search)}&limit=1`).catch(() => {});
      }
      return;
    }

    list.forEach((p) => grid.appendChild(buildProductCard(p)));
    if (typeof ui !== 'undefined' && ui.observeReveals) ui.observeReveals(grid);
  }

  // ── Render: Best Sellers (CAT-07) ─────────────────────────────────────────

  let _bestSellers = [];
  let _testimonials = [];

  async function fetchBestSellers() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/products/best-sellers`);
      const data = await res.json();
      if (data.success) _bestSellers = data.data;
    } catch (_) {}
  }

  function renderBestSellers() {
    const grid = document.getElementById('bestSellerGrid');
    if (!grid) return;
    grid.textContent = '';

    if (!_bestSellers.length) {
      grid.style.display = 'none';
      const sec = document.getElementById('bestSellers');
      if (sec) sec.style.display = 'none';
      return;
    }

    const sec = document.getElementById('bestSellers');
    if (sec) sec.style.display = 'block';
    grid.style.display = 'grid';

    _bestSellers.forEach((p) => {
      grid.appendChild(buildProductCard(p));
    });

    if (typeof ui !== 'undefined' && ui.observeReveals) ui.observeReveals(grid);
  }

  // ── Render: deals (CAT-06) ───────────────────────────────────────────────

  async function fetchOffers() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/products/offers`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        return data.data;
      }
    } catch (_) {}
    return null;
  }

  async function renderDeals() {
    const grid = document.getElementById('dealGrid');
    if (!grid) return;
    grid.textContent = '';

    const apiOffers = await fetchOffers();
    const deals = apiOffers && apiOffers.length > 0
      ? apiOffers.slice(0, 4)
      : _products
          .filter((p) => p.mrp > p.price)
          .sort((a, b) => (b.mrp - b.price) - (a.mrp - a.price))
          .slice(0, 4);

    deals.forEach((p) => {
      const save = p.mrp - p.price;
      const card = el('div', 'deal-card');
      card.dataset.reveal = 'scale';
      if (p.imageUrl) {
        const dImg = document.createElement('img');
        dImg.src = p.imageUrl;
        dImg.alt = p.nameEn;
        dImg.width = 180;
        dImg.height = 180;
        dImg.className = 'deal-card-img';
        dImg.loading = 'lazy';
        dImg.decoding = 'async';
        dImg.onerror = () => {
          const fallback = el('div', 'em', '');
          fallback.innerHTML = renderCategoryIcon(p.categoryId);
          dImg.replaceWith(fallback);
        };
        card.appendChild(dImg);
      } else {
        const fallback = el('div', 'em', '');
        fallback.innerHTML = renderCategoryIcon(p.categoryId);
        card.appendChild(fallback);
      }
      card.appendChild(el('h4', null, `${p.nameEn} ${p.packSize}`));
      card.appendChild(el('div', 'save', (p.offerPercent ? `${p.offerPercent}% OFF · ` : '') + 'Save ₹' + save));
      const dealBadge = el('div', 'timer');
      dealBadge.innerHTML = '<svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#badge-percent"></use></svg> <span class="lang-mr">विशेष सवलत</span><span class="lang-en">Mega Deal</span>';
      card.appendChild(dealBadge);
      grid.appendChild(card);
    });

    if (typeof ui !== 'undefined' && ui.observeReveals) ui.observeReveals(grid);
  }

  // ── Render: Testimonials (ADM-06, D11) ─────────────────────────────────────

  async function fetchTestimonials() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/testimonials`);
      const data = await res.json();
      if (data.success) _testimonials = data.data;
    } catch (_) {}
  }

  function renderTestimonials() {
    const grid = document.getElementById('testimonialGrid');
    if (!grid || !_testimonials.length) return;
    grid.textContent = '';

    _testimonials.forEach((item) => {
      const card = el('div', 'testimonial-card');
      card.dataset.reveal = 'scale';

      const top = el('div', 'testimonial-top');
      const stars = el('div', 'testimonial-stars', '★'.repeat(item.rating || 5));
      top.appendChild(stars);

      if (item.sampleFlag) {
        const sampleTag = el('span', 'sample-tag', 'नमुना अभिप्राय / Sample');
        top.appendChild(sampleTag);
      }
      card.appendChild(top);

      const quoteMr = el('div', 'testimonial-text-mr', `"${item.textMr}"`);
      card.appendChild(quoteMr);

      if (item.textEn) {
        const quoteEn = el('div', 'testimonial-text-en', `"${item.textEn}"`);
        card.appendChild(quoteEn);
      }

      const author = el('div', 'testimonial-author');
      const avatar = el('div', 'testimonial-avatar', (item.name || 'C').charAt(0));
      author.appendChild(avatar);

      const authorInfo = el('div', '');
      const authorName = el('div', 'testimonial-name', item.name);
      const authorArea = el('div', 'testimonial-area');
      authorArea.innerHTML = `<svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#map-pin"></use></svg> ${item.area || 'Yesgaon'}`;
      authorInfo.appendChild(authorName);
      authorInfo.appendChild(authorArea);
      author.appendChild(authorInfo);

      card.appendChild(author);
      grid.appendChild(card);
    });

    if (typeof ui !== 'undefined' && ui.observeReveals) ui.observeReveals(grid);
  }

  // ── Skeletons (Playbook 3.1) ──────────────────────────────────────────────
  function renderSkeletons() {
    const prodGrid = document.getElementById('prodGrid');
    if (!prodGrid) return;
    prodGrid.textContent = '';
    for (let i = 0; i < 8; i++) {
      const sk = el('div', 'card-skeleton');
      sk.appendChild(el('div', 'skeleton sk-img'));
      sk.appendChild(el('div', 'skeleton sk-title'));
      sk.appendChild(el('div', 'skeleton sk-sub'));
      sk.appendChild(el('div', 'skeleton sk-price'));
      sk.appendChild(el('div', 'skeleton sk-btn'));
      prodGrid.appendChild(sk);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  async function init() {
    renderSkeletons();

    try {
      await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchBestSellers(),
        fetchTestimonials(),
      ]);
    } catch (err) {
      console.error('[catalog] Failed to load data:', err);
      const prodGrid = document.getElementById('prodGrid');
      if (prodGrid) {
        prodGrid.textContent = '';
        const errMsg = el('div', 'empty');
        errMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:48px 16px;color:#dc2626;';
        
        const icon = el('div', '', '');
        icon.innerHTML = '<svg class="icon icon--2xl" style="color:#dc2626;margin-bottom:8px;"><use href="/images/icons.svg#warning"></use></svg>';
        
        const title = el('strong', '', '');
        title.innerHTML = '<span class="lang-mr">उत्पादने लोड झाली नाहीत</span><span class="lang-en">Could not load products</span>';
        title.style.cssText = 'display:block;font-size:1.15rem;margin-bottom:4px;';
        
        const sub = el('p', '', '');
        sub.innerHTML = '<span class="lang-mr">कृपया इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.</span><span class="lang-en">Check connection and retry.</span>';
        sub.style.cssText = 'font-size:0.9rem;color:#64748b;margin-bottom:16px;';
        
        const retryBtn = el('button', 'btn btn-primary', '');
        retryBtn.innerHTML = '<svg class="icon" style="margin-right:5px;"><use href="/images/icons.svg#refresh"></use></svg> <span class="lang-mr">पुन्हा प्रयत्न करा</span><span class="lang-en">Retry</span>';
        retryBtn.type = 'button';
        retryBtn.style.cssText = 'min-height:44px;padding:8px 24px;margin:0 auto;';
        retryBtn.addEventListener('click', () => init());
        
        errMsg.append(icon, title, sub, retryBtn);
        prodGrid.appendChild(errMsg);
      }
      return;
    }

    renderCategoryGrid();
    renderFilterChips();
    renderBestSellers();
    renderProductGrid();
    renderDeals();
    renderTestimonials();
  }

  // Re-render product grid & best sellers when cart changes (stepper updates)
  cart.onUpdate(() => {
    renderProductGrid();
    renderBestSellers();
  });

  return { init, renderProductGrid, renderBestSellers, setCat };
})();

