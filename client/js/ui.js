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

  function setupSheetDrag(drawer, onClose) {
    if (!drawer || drawer._sheetDragBound) return;
    drawer._sheetDragBound = true;

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
      const body = drawer.querySelector('.drawer-body, .login-sheet-body, .login-sheet-actions');
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
        if (typeof onClose === 'function') {
          onClose();
        } else {
          closeCart();
        }
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
    if (drawer) setupSheetDrag(drawer, closeCart);
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

  // ── Login-to-Add Bottom Sheet (Task 1) ──────────────────────────────────
  let _previousActiveElement = null;

  function ensureLoginPromptElements() {
    if (document.getElementById('loginPromptSheet')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loginPromptOverlay';
    overlay.className = 'login-prompt-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const sheet = document.createElement('div');
    sheet.id = 'loginPromptSheet';
    sheet.className = 'login-prompt-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'loginPromptTitle');

    sheet.innerHTML = `
      <div class="sheet-drag-handle" aria-hidden="true"></div>
      <div class="login-sheet-head">
        <div class="login-sheet-icon-wrap" aria-hidden="true">
          <span class="login-sheet-icon">🔐</span>
        </div>
        <div class="login-sheet-title-box">
          <h3 id="loginPromptTitle" class="login-sheet-title">
            आधी लॉगिन करा <span class="en-sub">/ Please log in first</span>
          </h3>
          <p class="login-sheet-body">
            तुमचा कार्ट सुरक्षित राहील आणि ऑर्डर ट्रॅक करता येईल.<br>
            <span class="en-sub">Log in to save your cart and track your orders.</span>
          </p>
        </div>
        <button type="button" class="login-sheet-close" id="loginPromptClose" aria-label="Close / बंद करा">✕</button>
      </div>
      <div class="login-sheet-reassurance">
        <span class="reassurance-sparkle">✨</span>
        <span class="reassurance-text">
          तुम्ही निवडलेली वस्तू लॉगिननंतर आपोआप कार्टमध्ये येईल.<br>
          <span class="en-sub">Your item will be added automatically after login.</span>
        </span>
      </div>
      <div class="login-sheet-actions">
        <a href="login.html" id="loginPromptLoginBtn" class="btn btn-primary btn-login-action">
          Log In / लॉगिन करा →
        </a>
        <a href="register.html" id="loginPromptRegisterBtn" class="btn btn-outline btn-register-action">
          Register / नोंदणी करा
        </a>
        <button type="button" id="loginPromptNotNowBtn" class="btn-not-now">
          नंतर / Not now
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    overlay.addEventListener('click', () => closeLoginPrompt());
    document.getElementById('loginPromptClose')?.addEventListener('click', () => closeLoginPrompt());
    document.getElementById('loginPromptNotNowBtn')?.addEventListener('click', () => closeLoginPrompt());

    setupSheetDrag(sheet, () => closeLoginPrompt());
  }

  function showLoginPrompt(pendingAction) {
    if (window.PWA) window.PWA.haptic(20);
    _previousActiveElement = document.activeElement;

    // Save pending intent in sessionStorage so it persists across redirects
    if (pendingAction && typeof auth !== 'undefined' && auth.savePendingAction) {
      auth.savePendingAction(pendingAction);
    }

    ensureLoginPromptElements();

    const overlay = document.getElementById('loginPromptOverlay');
    const sheet = document.getElementById('loginPromptSheet');
    if (!overlay || !sheet) return;

    // Build return redirect URL with safe relative path
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const loginBtn = document.getElementById('loginPromptLoginBtn');
    const regBtn = document.getElementById('loginPromptRegisterBtn');
    if (loginBtn) loginBtn.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
    if (regBtn) regBtn.href = `register.html?redirect=${encodeURIComponent(currentPath)}`;

    overlay.classList.add('open');
    sheet.classList.add('open');
    sheet.style.transform = '';

    // Focus primary action for accessibility
    setTimeout(() => {
      loginBtn?.focus();
    }, 100);

    function handleKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLoginPrompt();
      } else if (e.key === 'Tab') {
        const focusable = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    sheet._keyHandler = handleKeydown;
    document.addEventListener('keydown', handleKeydown);
  }

  function closeLoginPrompt() {
    if (window.PWA) window.PWA.haptic(10);
    const overlay = document.getElementById('loginPromptOverlay');
    const sheet = document.getElementById('loginPromptSheet');
    if (sheet) {
      sheet.classList.remove('open');
      sheet.style.transform = '';
      if (sheet._keyHandler) {
        document.removeEventListener('keydown', sheet._keyHandler);
      }
    }
    overlay?.classList.remove('open');
    if (_previousActiveElement && typeof _previousActiveElement.focus === 'function') {
      _previousActiveElement.focus();
    }
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

      // Mini stepper with decimal support (Task 3 sibling fixes)
      const step  = el('div', 'mini-step');
      const isDecimal = (qty % 1 !== 0);
      const decStep = (qty <= 0.5) ? -qty : (isDecimal ? -0.5 : -1);
      const incStep = isDecimal ? 0.5 : 1;

      const minus = el('button', null, '−');
      minus.setAttribute('aria-label', 'Remove ' + p.nameEn);
      minus.addEventListener('click', () => {
        cart.change(p, decStep);
        updateCartBadge();
        renderCartDrawer();
      });

      const qtySpan = el('span', null, String(qty));

      const plus = el('button', null, '+');
      plus.setAttribute('aria-label', 'Add more ' + p.nameEn);
      plus.addEventListener('click', () => {
        cart.change(p, incStep);
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

    // Auto-apply pending action if user just returned from login/registration (Task 1)
    if (typeof auth !== 'undefined' && auth.checkAndApplyPendingAction) {
      auth.checkAndApplyPendingAction();
    }

    // Initialize Mobile App Bottom Navigation
    initMobileBottomNav();

    // Initialize Smart AI List floating entry & onboarding hint (Task 2)
    initSmartAiPromotion();

    // Show stale-cart toast if cart.init() dropped items
    if (window._cartDroppedCount > 0) {
      showToast('Some cart items were removed — they are out of stock.');
      window._cartDroppedCount = 0;
    }
  }

  // ── Smart AI List Floating Action & Onboarding Hint (Task 2) ───────────
  function initSmartAiPromotion() {
    // 1. Floating button for 1-tap AI list access from anywhere on storefront
    if (!document.getElementById('floatingSmartListBtn') && document.getElementById('aiOrderBox')) {
      const fab = document.createElement('button');
      fab.id = 'floatingSmartListBtn';
      fab.className = 'floating-smart-list-btn';
      fab.setAttribute('type', 'button');
      fab.setAttribute('aria-label', 'Open Smart AI List / स्मार्ट किराणा यादी उघडा');
      fab.innerHTML = `
        <span class="fab-icon">✨</span>
        <span class="fab-text">स्मार्ट यादी <span class="fab-sub">Smart List</span></span>
      `;
      fab.addEventListener('click', () => {
        if (window.PWA) window.PWA.haptic(20);
        const aiBox = document.getElementById('aiOrderBox');
        if (aiBox) {
          aiBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            const input = document.getElementById('aiListInput');
            if (input) input.focus();
          }, 400);
        }
      });
      document.body.appendChild(fab);
    }

    // 2. One-time dismissible onboarding hint
    const hintContainer = document.getElementById('aiOnboardingHint');
    const HINT_KEY = 'kirana_ai_hint_seen';
    if (hintContainer && !localStorage.getItem(HINT_KEY)) {
      hintContainer.style.display = 'flex';
      const dismissBtn = document.getElementById('dismissAiHintBtn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          localStorage.setItem(HINT_KEY, '1');
          hintContainer.style.display = 'none';
        });
      }
    }
  }

  function initMobileBottomNav() {
    if (!document.getElementById('mobileBottomNav')) {
      const nav = document.createElement('nav');
      nav.id = 'mobileBottomNav';
      nav.className = 'mobile-bottom-nav';
      nav.setAttribute('aria-label', 'Mobile Bottom Navigation');
      nav.innerHTML = `
        <a href="index.html" class="mbn-item" id="mbnHome" aria-label="Home">
          <span class="mbn-icon">🏠</span>
          <span class="mbn-label"><span class="mbn-mr">मुख्य</span>Home</span>
        </a>
        <a href="index.html#catalog" class="mbn-item" id="mbnCatalog" aria-label="Categories">
          <span class="mbn-icon">🗂️</span>
          <span class="mbn-label"><span class="mbn-mr">विभाग</span>Items</span>
        </a>
        <button type="button" class="mbn-item mbn-ai" id="mbnSmartList" aria-label="Smart List">
          <span class="mbn-icon">✨</span>
          <span class="mbn-label"><span class="mbn-mr">स्मार्ट यादी</span>Smart List</span>
        </button>
        <button type="button" class="mbn-item mbn-cart" id="mbnCart" aria-label="Cart">
          <span class="mbn-icon-wrap">
            <span class="mbn-icon">🛒</span>
            <span class="mbn-badge" id="mbnCartBadge">0</span>
          </span>
          <span class="mbn-label"><span class="mbn-mr">कार्ट</span>Cart</span>
        </button>
        <a href="orders.html" class="mbn-item" id="mbnOrders" aria-label="Orders">
          <span class="mbn-icon">📋</span>
          <span class="mbn-label"><span class="mbn-mr">ऑर्डर्स</span>Orders</span>
        </a>
        <a href="login.html" class="mbn-item" id="mbnAccount" aria-label="Account">
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
    } else if (hash.includes('aiorderbox')) {
      document.getElementById('mbnSmartList')?.classList.add('active');
    } else if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
      document.getElementById('mbnHome')?.classList.add('active');
    }

    document.getElementById('mbnCart')?.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });

    document.getElementById('mbnSmartList')?.addEventListener('click', (e) => {
      e.preventDefault();
      const aiBox = document.getElementById('aiOrderBox');
      if (aiBox) {
        aiBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          document.getElementById('aiListInput')?.focus();
        }, 400);
      } else {
        window.location.href = 'index.html#aiOrderBox';
      }
    });
  }

  // Re-render cart badge whenever cart changes
  cart.onUpdate(() => {
    updateCartBadge();
  });

  return {
    init,
    showToast,
    updateCartBadge,
    updateStickyCartBar,
    renderCartDrawer,
    openCart,
    closeCart,
    showLoginPrompt,
    closeLoginPrompt,
    initSmartAiPromotion,
    observeReveals,
  };
})();

// Explicitly attach to window object
window.ui = ui;
