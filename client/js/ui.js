/**
 * frontend/js/ui.js
 *
 * UI utilities: toast, store-open status, WhatsApp links,
 * scroll-spy, cart drawer, cart badge, WhatsApp checkout.
 * Depends on: CONFIG (config.js), cart (cart.js).
 */

const ui = (() => {

  // ── Helpers ──────────────────────────────────────────────────────────────

  function t(str) { return document.createTextNode(str ?? ''); }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text !== undefined) e.appendChild(t(text));
    return e;
  }
  function fmt(n) { return '₹' + n; }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(msg) {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const div = el('div', 'toast', msg);
    wrap.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => div.remove(), 300);
    }, 2400);
  }

  // ── Store open/closed ─────────────────────────────────────────────────────

  function updateStoreStatus() {
    const hr   = new Date().getHours();
    const open = hr >= 7 && hr < 22;
    const dot  = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (dot)  dot.classList.toggle('closed', !open);
    if (text) text.textContent = open
      ? 'Store is open now · 7 AM – 10 PM'
      : 'Store is closed · opens 7 AM';
  }

  // ── WhatsApp links ────────────────────────────────────────────────────────

  function setWaLinks() {
    const base = `${CONFIG.WA_BASE}${CONFIG.STORE_NUM}?text=`;
    const heroLink = document.getElementById('heroWaLink');
    const snapLink = document.getElementById('snapWaLink');
    const fab      = document.getElementById('fabWa');
    if (heroLink) heroLink.href = base + encodeURIComponent("Hi! I'd like to place a grocery order from Mahalaxmi Kirana Store.");
    if (snapLink) snapLink.href = base + encodeURIComponent("Hi! I'm sending a photo of my grocery list.");
    if (fab)      fab.href      = base + encodeURIComponent("Hi! I'd like to place an order.");
  }

  // ── Deals countdown ───────────────────────────────────────────────────────

  function tickDeals() {
    const end  = new Date();
    end.setHours(23, 59, 59, 999);
    const diff = Math.max(0, end - new Date());
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor(diff / 60000) % 60).padStart(2, '0');
    const s = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
    document.querySelectorAll('[data-deal]').forEach((el) => {
      el.textContent = `Ends in ${h}:${m}:${s}`;
    });
  }

  // ── Sticky bottom cart bar (Playbook 3.1) ────────────────────────────────
  function updateStickyCartBar() {
    const bar = document.getElementById('stickyCartBar');
    if (!bar) return;
    const count = typeof cart !== 'undefined' ? cart.itemCount() : 0;
    if (count > 0) {
      const countEl = document.getElementById('scbCount');
      const totalEl = document.getElementById('scbTotal');
      const totalVal = typeof cart !== 'undefined' ? cart.total() : 0;
      if (countEl) countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'} (${count} वस्तू)`;
      if (totalEl) totalEl.textContent = `₹${totalVal.toLocaleString('en-IN')}`;
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  }

  // ── Cart badge ────────────────────────────────────────────────────────────

  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const mbnBadge = document.getElementById('mbnCartBadge');
    const count = typeof cart !== 'undefined' ? cart.itemCount() : 0;
    const current = String(count);

    if (badge) {
      const prev = badge.textContent.trim();
      badge.textContent = current;
      if (prev !== current) {
        badge.classList.remove('badge-pop');
        void badge.offsetWidth; // force reflow
        badge.classList.add('badge-pop');
      }
    }

    if (mbnBadge) {
      mbnBadge.textContent = current;
      if (count > 0) {
        mbnBadge.classList.add('visible');
      } else {
        mbnBadge.classList.remove('visible');
      }
    }

    updateStickyCartBar();
  }

  // ── Cart drawer & Bottom Sheet ─────────────────────────────────────────────

  let sheetDragBound = false;
  function setupSheetDrag(drawer) {
    if (!drawer || sheetDragBound) return;
    sheetDragBound = true;

    // Ensure drag handle exists
    if (!drawer.querySelector('.sheet-drag-handle')) {
      const handle = document.createElement('div');
      handle.className = 'sheet-drag-handle';
      handle.setAttribute('aria-hidden', 'true');
      drawer.prepend(handle);
    }

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    drawer.addEventListener('touchstart', (e) => {
      const body = document.getElementById('drawerBody');
      if (body && body.scrollTop > 5 && e.target !== drawer.querySelector('.sheet-drag-handle') && e.target !== drawer.querySelector('.drawer-head')) {
        return;
      }
      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
      drawer.style.transition = 'none';
    }, { passive: true });

    drawer.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const delta = currentY - startY;
      if (delta > 0) {
        drawer.style.transform = `translateY(${delta}px)`;
      }
    }, { passive: true });

    drawer.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      drawer.style.transition = '';
      const delta = currentY - startY;
      if (delta > 75) {
        closeCart();
      } else {
        drawer.style.transform = '';
      }
    });
  }

  function openCart() {
    if (window.PWA) window.PWA.haptic(20);
    renderCartDrawer();
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    drawer?.classList.add('open');
    overlay?.classList.add('open');
    if (drawer) setupSheetDrag(drawer);
  }

  function closeCart() {
    if (window.PWA) window.PWA.haptic(10);
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    if (drawer) {
      drawer.style.transform = '';
      drawer.classList.remove('open');
    }
    overlay?.classList.remove('open');
  }

  function renderCartDrawer() {
    const body = document.getElementById('drawerBody');
    const foot = document.getElementById('drawerFoot');
    if (!body) return;

    const items = cart.getAll();
    body.textContent = '';

    if (!items.length) {
      const empty = el('div', 'empty');
      empty.style.cssText = 'text-align:center;padding:48px 16px;color:#64748b;';
      const icon = el('div', '', '🛒');
      icon.style.cssText = 'font-size:3rem;margin-bottom:12px;';
      const title = el('strong', '', 'तुमची कार्ट रिकामी आहे / Your cart is empty');
      title.style.cssText = 'display:block;font-size:1.15rem;color:#04251a;margin-bottom:6px;';
      const sub = el('p', '', 'आमच्या ताज्या किराणा मालाच्या कॅटलॉगमधून वस्तू जोडा.');
      sub.style.cssText = 'font-size:0.9rem;margin-bottom:20px;';
      const shopBtn = el('button', 'btn btn-primary', 'खरेदी सुरू करा / Start Shopping');
      shopBtn.type = 'button';
      shopBtn.style.cssText = 'min-height:44px;padding:10px 24px;margin:0 auto;';
      shopBtn.addEventListener('click', () => closeCart());
      empty.append(icon, title, sub, shopBtn);
      body.appendChild(empty);
      if (foot) foot.style.display = 'none';
      return;
    }

    if (foot) foot.style.display = 'block';

    items.forEach(({ product: p, qty }) => {
      if (!p) return;

      const row = el('div', 'cart-item');

      // Emoji / image
      if (p.imageUrl) {
        const itemImg = document.createElement('img');
        itemImg.src = p.imageUrl;
        itemImg.alt = p.nameEn;
        itemImg.className = 'cart-item-img';
        itemImg.onerror = () => { itemImg.replaceWith(el('div', 'em', p.emoji || '🛒')); };
        row.appendChild(itemImg);
      } else {
        const emEl = el('div', 'em', p.emoji || '🛒');
        row.appendChild(emEl);
      }

      // Name + subtitle
      const info = el('div', '');
      info.style.flex = '1';
      info.appendChild(el('div', 'name', p.nameEn));
      info.appendChild(el('div', 'sub',  p.packSize + ' · ' + fmt(p.price)));
      row.appendChild(info);

      // Mini stepper
      const step  = el('div', 'mini-step');

      const minus = el('button', null, '−');
      minus.setAttribute('aria-label', 'Remove one ' + p.nameEn);
      minus.addEventListener('click', () => {
        cart.change(p, -1);
        updateCartBadge();
        renderCartDrawer();
      });

      const qtySpan = el('span', null, String(qty));

      const plus = el('button', null, '+');
      plus.setAttribute('aria-label', 'Add one more ' + p.nameEn);
      plus.addEventListener('click', () => {
        cart.change(p, 1);
        updateCartBadge();
        renderCartDrawer();
        showToast(p.nameEn + ' added to cart');
      });

      step.append(minus, qtySpan, plus);
      row.appendChild(step);
      body.appendChild(row);
    });

    const totalEl = document.getElementById('totalAmt');
    if (totalEl) totalEl.textContent = fmt(cart.total());
  }

  // ── Checkout (Stage 2) ───────────────────────────────────────────────────

  function checkout() {
    const items = cart.getAll();
    if (!items.length) {
      showToast('Your cart is empty. Add items first!');
      return;
    }

    if (auth.isLoggedIn()) {
      window.location.href = 'checkout.html';
    } else {
      window.location.href = 'login.html?redirect=checkout.html';
    }
  }

  // ── Scroll-spy ────────────────────────────────────────────────────────────

  function setupScrollSpy() {
    const links = document.querySelectorAll('.navlink');
    const ids   = ['catalog', 'deals', 'store'];
    const map   = {};
    links.forEach((l) => {
      const href = l.getAttribute('href')?.replace('#', '');
      if (href) map[href] = l;
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove('active'));
            if (map[e.target.id]) map[e.target.id].classList.add('active');
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // ── Header scroll hairline ────────────────────────────────────────────────
  function setupHeaderScroll() {
    const hdr = document.querySelector('header');
    if (!hdr) return;
    const onScroll = () => {
      if (window.scrollY > 40) {
        hdr.classList.add('header-scrolled');
      } else {
        hdr.classList.remove('header-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Hero parallax & scroll cue ────────────────────────────────────────────
  function setupHeroParallax() {
    const heroBg = document.querySelector('.hero-bg-layer');
    const cue = document.getElementById('scrollCue');
    const isMobile = () => window.innerWidth < 768;
    const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ticking = false;

    const updateMotion = () => {
      const scrollY = window.scrollY;

      // Scroll cue: fade out after 120px scroll
      if (cue) {
        if (scrollY > 120) {
          cue.classList.add('hidden');
        } else {
          cue.classList.remove('hidden');
        }
      }

      // Parallax on desktop hero: translateY capped at ±40px
      if (heroBg && !isMobile() && !prefersReduced()) {
        if (scrollY < window.innerHeight) {
          const offset = Math.max(-40, Math.min(40, scrollY * 0.25));
          heroBg.style.setProperty('--hero-parallax', `${offset}px`);
        }
      } else if (heroBg) {
        heroBg.style.removeProperty('--hero-parallax');
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateMotion);
        ticking = true;
      }
    }, { passive: true });

    updateMotion();
  }

  // ── Scroll-driven reveals (IntersectionObserver) ───────────────────────────
  let _revealObserver = null;

  function initRevealObserver() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    if ('IntersectionObserver' in window) {
      _revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.05,
        rootMargin: '0px 0px 80px 0px'
      });

      observeReveals(document);
    } else {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
    }
  }

  function observeReveals(root = document) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const all = root.querySelectorAll ? root.querySelectorAll('[data-reveal]') : [];
      all.forEach((el) => el.classList.add('is-revealed'));
      if (root.dataset && root.dataset.reveal) root.classList.add('is-revealed');
      return;
    }

    if (!_revealObserver) return;

    const targets = root.querySelectorAll ? root.querySelectorAll('[data-reveal]') : [];
    targets.forEach((el) => {
      if (el.dataset.reveal === 'stagger') {
        Array.from(el.children).forEach((child, i) => {
          child.style.setProperty('--stagger-i', i);
        });
      }

      // If already in viewport (or near it), reveal immediately so content is never blank
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight + 80 && rect.bottom > -80;
      if (inView) {
        el.classList.add('is-revealed');
      } else if (!el.classList.contains('is-revealed')) {
        _revealObserver.observe(el);
      }
    });

    if (root.dataset && root.dataset.reveal && !root.classList.contains('is-revealed')) {
      const rect = root.getBoundingClientRect();
      const inView = rect.top < window.innerHeight + 80 && rect.bottom > -80;
      if (inView) {
        root.classList.add('is-revealed');
      } else {
        _revealObserver.observe(root);
      }
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    updateStoreStatus();
    setInterval(updateStoreStatus, 60_000);

    setWaLinks();
    setupScrollSpy();
    setupHeaderScroll();
    setupHeroParallax();
    initRevealObserver();
    updateCartBadge();
    if (typeof auth !== 'undefined') auth.renderAuthHeader();

    tickDeals();
    setInterval(tickDeals, 1_000);

    // Search input
    document.getElementById('searchInput')?.addEventListener('input', () => {
      catalog.renderProductGrid();
    });

    // Keyboard shortcut Cmd/Ctrl+K → focus search
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    });

    // Sticky Cart Bar (Playbook 3.1)
    const stickyBar = document.getElementById('stickyCartBar');
    if (stickyBar) {
      stickyBar.addEventListener('click', () => openCart());
    }
    updateStickyCartBar();

    // Expose openCart/closeCart/checkout globally for inline HTML handlers
    window.openCart  = openCart;
    window.closeCart = closeCart;
    window.checkout  = checkout;

    // Initialize Mobile App Bottom Navigation
    initMobileBottomNav();

    // Show stale-cart toast if cart.init() dropped items
    if (window._cartDroppedCount > 0) {
      showToast('Some cart items were removed — they are out of stock.');
      window._cartDroppedCount = 0;
    }
  }

  function initMobileBottomNav() {
    if (!document.getElementById('mobileBottomNav')) {
      const nav = document.createElement('nav');
      nav.id = 'mobileBottomNav';
      nav.className = 'mobile-bottom-nav';
      nav.setAttribute('aria-label', 'Mobile Bottom Navigation');
      nav.innerHTML = `
        <a href="/index.html" class="mbn-item" id="mbnHome" aria-label="Home">
          <span class="mbn-icon">🏠</span>
          <span class="mbn-label"><span class="mbn-mr">मुख्य</span>Home</span>
        </a>
        <a href="/index.html#catalog" class="mbn-item" id="mbnCatalog" aria-label="Categories">
          <span class="mbn-icon">🗂️</span>
          <span class="mbn-label"><span class="mbn-mr">विभाग</span>Items</span>
        </a>
        <button type="button" class="mbn-item mbn-cart" id="mbnCart" aria-label="Cart">
          <span class="mbn-icon-wrap">
            <span class="mbn-icon">🛒</span>
            <span class="mbn-badge" id="mbnCartBadge">0</span>
          </span>
          <span class="mbn-label"><span class="mbn-mr">कार्ट</span>Cart</span>
        </button>
        <a href="/orders.html" class="mbn-item" id="mbnOrders" aria-label="Orders">
          <span class="mbn-icon">📋</span>
          <span class="mbn-label"><span class="mbn-mr">ऑर्डर्स</span>Orders</span>
        </a>
        <a href="/login.html" class="mbn-item" id="mbnAccount" aria-label="Account">
          <span class="mbn-icon">👤</span>
          <span class="mbn-label"><span class="mbn-mr">खाते</span>Account</span>
        </a>
      `;
      document.body.appendChild(nav);
    }

    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    
    document.querySelectorAll('.mbn-item').forEach(el => el.classList.remove('active'));
    if (path.includes('orders') || path.includes('order-confirmation')) {
      document.getElementById('mbnOrders')?.classList.add('active');
    } else if (path.includes('login') || path.includes('register')) {
      document.getElementById('mbnAccount')?.classList.add('active');
    } else if (hash.includes('catalog') || hash.includes('deals')) {
      document.getElementById('mbnCatalog')?.classList.add('active');
    } else if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
      document.getElementById('mbnHome')?.classList.add('active');
    }

    document.getElementById('mbnCart')?.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
  }

  // Re-render cart badge whenever cart changes
  cart.onUpdate(() => {
    updateCartBadge();
  });

  return { init, showToast, updateCartBadge, updateStickyCartBar, renderCartDrawer, openCart, closeCart, observeReveals };
})();

// Explicitly attach to window object
window.ui = ui;
