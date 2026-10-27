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

  function showToast(msg, type = 'info') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const div = el('div', 'toast');
    let iconKey = 'info';
    if (type === 'success' || /जोड|यशस्वी|सुरू|unlocked|added|saved|success/i.test(msg)) iconKey = 'check';
    else if (type === 'warning' || type === 'warn' || /बंद|किमान|alert|warning|closed|संपल्यामुळे/i.test(msg)) iconKey = 'warning';
    else if (type === 'error' || /चूक|error|failed/i.test(msg)) iconKey = 'close';
    let cleanMsg = typeof msg === 'string' ? msg.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/ug, '').replace(/[!！]/g, '').trim() : msg;
    if (typeof cleanMsg === 'string' && !cleanMsg.includes('<span') && (cleanMsg.includes(' / ') || cleanMsg.includes(' • '))) {
      const sep = cleanMsg.includes(' / ') ? ' / ' : ' • ';
      const parts = cleanMsg.split(sep);
      cleanMsg = `<span class="lang-mr">${parts[0].trim()}</span><span class="lang-en">${parts.slice(1).join(' ').trim()}</span>`;
    }
    div.innerHTML = `<svg class="icon icon--sm" style="margin-right:6px;"><use href="/images/icons.svg#${iconKey}"></use></svg><span>${cleanMsg}</span>`;
    wrap.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => div.remove(), 300);
    }, 2400);
  }

  // ── Store open/closed ─────────────────────────────────────────────────────

  // ── Store open/closed (Live from Settings) ────────────────────────────────

  async function updateStoreStatus() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/settings/public`);
      const json = await res.json();
      if (json.success && json.data) {
        window._storeSettings = json.data;
      }
    } catch (err) {
      console.warn('[ui] Could not load store settings, using defaults:', err.message);
    }

    const s = window._storeSettings || {};
    const isOpen = s.isStoreOpen !== false;
    const storeHours = s.storeHours || '7 AM – 10 PM';
    const whatsappNum = s.storeWhatsapp || CONFIG.STORE_NUM || '919860924504';

    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (dot) dot.classList.toggle('closed', !isOpen);
    if (text) {
      text.textContent = isOpen
        ? `दुकान सुरू आहे · ${storeHours} (Open now)`
        : `दुकान सध्या बंद आहे · ${s.closureReason || 'Store is closed'}`;
    }

    // Closed banner if store is closed
    let closedBanner = document.getElementById('storeClosedBanner');
    if (!isOpen) {
      if (!closedBanner) {
        closedBanner = document.createElement('div');
        closedBanner.id = 'storeClosedBanner';
        closedBanner.style.cssText = 'background:#fef2f2;border-bottom:1.5px solid #f87171;color:#991b1b;padding:10px 16px;text-align:center;font-size:13.5px;font-weight:600;z-index:99;position:relative;';
        closedBanner.innerHTML = `<svg class="icon icon--sm" style="margin-right:5px;vertical-align:-2px;"><use href="/images/icons.svg#warning"></use></svg> <span class="lang-mr">दुकान सध्या बंद आहे (${s.closureReason || 'तात्पुरते बंद'}). ऑर्डर तात्पुरत्या बंद आहेत.</span><span class="lang-en">Store is closed (${s.closureReason || 'Temporarily closed'}). Ordering paused.</span>`;
        const header = document.querySelector('header');
        if (header && header.parentNode) {
          header.parentNode.insertBefore(closedBanner, header.nextSibling);
        }
      }
    } else if (closedBanner) {
      closedBanner.remove();
    }

    setWaLinks(whatsappNum);
  }

  // ── WhatsApp links ────────────────────────────────────────────────────────

  function setWaLinks(storeNum) {
    const num = storeNum || (window._storeSettings && window._storeSettings.storeWhatsapp) || CONFIG.STORE_NUM || '919860924504';
    const base = `${CONFIG.WA_BASE}${num}?text=`;
    const heroLink = document.getElementById('heroWaLink');
    const snapLink = document.getElementById('snapWaLink');
    const fab      = document.getElementById('fabWa');

    let cartSummary = '';
    if (typeof cart !== 'undefined' && cart.itemCount() > 0) {
      const items = cart.getAll();
      const itemsText = items.map(i => `- ${i.product.nameEn} (${i.qty})`).join('%0A');
      cartSummary = `%0A%0A*माझी कार्ट यादी / My Cart:*%0A${itemsText}%0A*एकूण रक्कम / Total:* ₹${cart.total()}`;
    }

    if (heroLink) heroLink.href = base + encodeURIComponent("नमस्कार! मला महालक्ष्मी किराणा दुकानातून किराणा सामान मागवायचे आहे. / Hi! I'd like to place a grocery order.") + cartSummary;
    if (snapLink) snapLink.href = base + encodeURIComponent("नमस्कार! मी माझ्या किराणा मालाच्या यादीचा फोटो पाठवत आहे. / Hi! I'm sending a photo of my grocery list.") + cartSummary;
    if (fab)      fab.href      = base + encodeURIComponent("नमस्कार! मला ऑर्डर द्यायची आहे. / Hi! I'd like to place an order.") + cartSummary;

    // Update announcement phone link
    const announcePhone = document.querySelector('.announce a[href^="tel:"]');
    if (announcePhone && (window._storeSettings?.upiMobile || num)) {
      const displayPhone = window._storeSettings?.upiMobile || num.replace(/^91/, '');
      announcePhone.href = `tel:+91${displayPhone}`;
      announcePhone.innerHTML = `<svg class="icon icon--sm"><use href="/images/icons.svg#phone"></use></svg> +91 ${displayPhone}`;
    }
  }

  // ── Deals badge (No fake countdown) ───────────────────────────────────────

  function tickDeals() {
    document.querySelectorAll('[data-deal]').forEach((el) => {
      el.innerHTML = '<svg class="icon icon--sm"><use href="/images/icons.svg#badge-percent"></use></svg> <span class="lang-mr">विशेष सवलत</span><span class="lang-en">Special Offer</span>';
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
    document.body.classList.add('drawer-open');
    if (drawer) setupSheetDrag(drawer, closeCart);

    if (!window.location.hash.includes('cart-open')) {
      try { history.pushState({ cartOpen: true }, '', '#cart-open'); } catch (_) {}
    }
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
    document.body.classList.remove('drawer-open');

    if (window.location.hash === '#cart-open') {
      try { history.back(); } catch (_) {}
    }
  }

  window.addEventListener('popstate', () => {
    const drawer = document.getElementById('drawer');
    if (drawer && drawer.classList.contains('open')) {
      drawer.style.transform = '';
      drawer.classList.remove('open');
      document.getElementById('overlay')?.classList.remove('open');
      document.body.classList.remove('drawer-open');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

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
          <span class="login-sheet-icon"><svg class="icon icon--lg"><use href="/images/icons.svg#lock"></use></svg></span>
        </div>
        <div class="login-sheet-title-box">
          <h3 id="loginPromptTitle" class="login-sheet-title">
            <span class="lang-mr">आधी लॉगिन करा</span><span class="lang-en">Please log in first</span>
          </h3>
          <p class="login-sheet-body">
            <span class="lang-mr">तुमचा कार्ट सुरक्षित राहील आणि ऑर्डर ट्रॅक करता येईल.</span>
            <span class="lang-en">Log in to save your cart and track orders.</span>
          </p>
        </div>
        <button type="button" class="login-sheet-close" id="loginPromptClose" aria-label="Close"><svg class="icon"><use href="/images/icons.svg#close"></use></svg></button>
      </div>
      <div class="login-sheet-reassurance">
        <span class="reassurance-sparkle"><svg class="icon icon--sm"><use href="/images/icons.svg#check"></use></svg></span>
        <span class="reassurance-text">
          <span class="lang-mr">निवडलेली वस्तू लॉगिननंतर आपोआप कार्टमध्ये येईल.</span>
          <span class="lang-en">Your item will be added automatically after login.</span>
        </span>
      </div>
      <div class="login-sheet-actions">
        <a href="login.html" id="loginPromptLoginBtn" class="btn btn-primary btn-login-action">
          <span class="lang-mr">लॉगिन करा</span><span class="lang-en">Log In</span>
        </a>
        <a href="register.html" id="loginPromptRegisterBtn" class="btn btn-outline btn-register-action">
          <span class="lang-mr">नोंदणी करा</span><span class="lang-en">Register</span>
        </a>
        <button type="button" id="loginPromptNotNowBtn" class="btn-not-now">
          <span class="lang-mr">नंतर</span><span class="lang-en">Not now</span>
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
    document.body.classList.add('sheet-open');

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
    document.body.classList.remove('sheet-open');
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
      const icon = el('div', '', '');
      icon.innerHTML = '<svg class="icon icon--2xl" style="color:var(--forest-400);margin-bottom:12px;"><use href="/images/icons.svg#cart"></use></svg>';
      const title = el('strong', '', '');
      title.innerHTML = '<span class="lang-mr">तुमची कार्ट रिकामी आहे</span><span class="lang-en">Your cart is empty</span>';
      title.style.cssText = 'display:block;font-size:1.15rem;color:#04251a;margin-bottom:6px;';
      const sub = el('p', '', '');
      sub.innerHTML = '<span class="lang-mr">आमच्या ताज्या कॅटलॉगमधून वस्तू जोडा.</span><span class="lang-en">Add items from our catalog.</span>';
      sub.style.cssText = 'font-size:0.9rem;margin-bottom:20px;';
      const shopBtn = el('button', 'btn btn-primary', '');
      shopBtn.innerHTML = '<span class="lang-mr">खरेदी सुरू करा</span><span class="lang-en">Start Shopping</span>';
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

      // Category icon fallback or image
      if (p.imageUrl) {
        const itemImg = document.createElement('img');
        itemImg.src = p.imageUrl;
        itemImg.alt = p.nameEn;
        itemImg.className = 'cart-item-img';
        itemImg.onerror = () => {
          const emEl = el('div', 'em', '');
          emEl.innerHTML = renderCategoryIcon(p.categoryId || p.category);
          itemImg.replaceWith(emEl);
        };
        row.appendChild(itemImg);
      } else {
        const emEl = el('div', 'em', '');
        emEl.innerHTML = renderCategoryIcon(p.categoryId || p.category);
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

    // Render Full Sticky Footer (Playbook Mobile UX)
    if (foot) {
      const subtotal = cart.total();
      const s = window._storeSettings || {};
      const minOrder = typeof s.minOrder === 'number' ? s.minOrder : 200;
      const freeAbove = typeof s.freeDeliveryAbove === 'number' ? s.freeDeliveryAbove : 1000;
      const deliveryCharge = subtotal >= freeAbove ? 0 : (typeof s.deliveryCharge === 'number' ? s.deliveryCharge : 30);
      const grandTotal = subtotal + deliveryCharge;
      const isStoreOpen = s.isStoreOpen !== false;
      const isUnderMin = subtotal < minOrder;

      const remainingForFree = Math.max(0, freeAbove - subtotal);
      const freePercent = Math.min(100, Math.round((subtotal / freeAbove) * 100));

      foot.innerHTML = `
        <div class="cart-free-delivery-box" style="margin-bottom:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:12px;font-weight:600;">
            <span style="color:${remainingForFree === 0 ? '#166534' : '#04251a'};">
              ${remainingForFree === 0
                ? '<svg class="icon icon--sm" style="color:#16a34a;margin-right:4px;"><use href="/images/icons.svg#truck"></use></svg> <span class="lang-mr">मोफत डिलिव्हरी लागू</span><span class="lang-en">Free Delivery Unlocked</span>'
                : `<span class="lang-mr">मोफत डिलिव्हरीसाठी अजून <strong>₹${remainingForFree}</strong> ची खरेदी करा</span><span class="lang-en">Add <strong>₹${remainingForFree}</strong> for Free Delivery</span>`}
            </span>
            <span style="font-weight:800;color:#04251a;">${freePercent}%</span>
          </div>
          <div style="height:6px;width:100%;background:#e2e8f0;border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${freePercent}%;background:${remainingForFree === 0 ? '#10b981' : '#f59e0b'};border-radius:3px;transition:width 0.3s ease;"></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#64748b;margin-bottom:3px;">
          <span><span class="lang-mr">एकूण सामानाची किंमत</span><span class="lang-en">Subtotal</span></span>
          <span style="font-weight:700;color:#1e293b;">₹${subtotal}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#64748b;margin-bottom:6px;">
          <span><span class="lang-mr">डिलिव्हरी शुल्क</span><span class="lang-en">Delivery Fee</span></span>
          <span style="font-weight:700;color:${deliveryCharge === 0 ? '#16a34a' : '#1e293b'};">
            ${deliveryCharge === 0 ? '<span class="lang-mr">मोफत</span><span class="lang-en">FREE</span>' : '₹' + deliveryCharge}
          </span>
        </div>

        <div class="total-row" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-top:6px;border-top:1px dashed #cbd5e1;">
          <span style="font-weight:700;font-size:14.5px;color:#04251a;"><span class="lang-mr">एकूण देय रक्कम</span><span class="lang-en">Total</span></span>
          <strong id="totalAmt" style="font-size:1.3rem;font-weight:800;color:#04251a;">₹${grandTotal}</strong>
        </div>

        ${!isStoreOpen
          ? `<div class="cart-min-notice" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:10px;text-align:center;">
              <svg class="icon icon--sm" style="margin-right:4px;"><use href="/images/icons.svg#warning"></use></svg> <span class="lang-mr">दुकान सध्या बंद आहे (${s.closureReason || 'तात्पुरते बंद'})</span><span class="lang-en">Store closed (${s.closureReason || 'Temporarily closed'})</span>
            </div>`
          : (isUnderMin
            ? `<div class="cart-min-notice" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:10px;text-align:center;">
                <svg class="icon icon--sm" style="margin-right:4px;"><use href="/images/icons.svg#warning"></use></svg> <span class="lang-mr">किमान ऑर्डर ₹${minOrder}. आणखी ₹${minOrder - subtotal} जोडा.</span><span class="lang-en">Min order ₹${minOrder}. Add ₹${minOrder - subtotal}.</span>
              </div>`
            : ''
          )
        }

        <button class="checkout-btn btn btn-primary" id="checkoutBtn" ${(!isStoreOpen || isUnderMin) ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>
          ${!isStoreOpen
            ? '<span class="lang-mr">दुकान बंद आहे</span><span class="lang-en">Store Closed</span>'
            : (isUnderMin
              ? `<span class="lang-mr">किमान ₹${minOrder} आवश्यक</span><span class="lang-en">Min ₹${minOrder} Required</span>`
              : '<span class="lang-mr">ऑर्डर पूर्ण करा</span><span class="lang-en">Proceed to Checkout</span> →'
            )
          }
        </button>
      `;

      foot.querySelector('#checkoutBtn')?.addEventListener('click', () => checkout());
    }
  }

  // ── Checkout (Stage 2) ───────────────────────────────────────────────────

  function checkout() {
    const items = cart.getAll();
    if (!items.length) {
      showToast('कार्ट रिकामी आहे / Cart is empty', 'warning');
      return;
    }

    const s = window._storeSettings || {};
    if (s.isStoreOpen === false) {
      showToast('दुकान सध्या बंद आहे / Store closed', 'warning');
      return;
    }

    const minOrder = typeof s.minOrder === 'number' ? s.minOrder : 200;
    if (cart.total() < minOrder) {
      showToast(`किमान ऑर्डर ₹${minOrder} / Min order ₹${minOrder}`, 'warning');
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

    // Search input (Debounced 250ms)
    let searchDebounceTimer = null;
    document.getElementById('searchInput')?.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        catalog.renderProductGrid();
      }, 250);
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
      showToast('काही वस्तू संपल्यामुळे काढल्या / Out of stock items removed', 'warning');
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
        <span class="fab-icon"><svg class="icon"><use href="/images/icons.svg#sparkles"></use></svg></span>
        <span class="fab-text"><span class="lang-mr">स्मार्ट यादी</span><span class="lang-en">Smart List</span></span>
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
          <span class="mbn-icon"><svg class="icon"><use href="/images/icons.svg#home"></use></svg></span>
          <span class="mbn-label"><span class="lang-mr">मुख्य</span><span class="lang-en">Home</span></span>
        </a>
        <a href="index.html#catalog" class="mbn-item" id="mbnCatalog" aria-label="Categories">
          <span class="mbn-icon"><svg class="icon"><use href="/images/icons.svg#grid"></use></svg></span>
          <span class="mbn-label"><span class="lang-mr">विभाग</span><span class="lang-en">Items</span></span>
        </a>
        <button type="button" class="mbn-item mbn-ai" id="mbnSmartList" aria-label="Smart List">
          <span class="mbn-icon"><svg class="icon"><use href="/images/icons.svg#sparkles"></use></svg></span>
          <span class="mbn-label"><span class="lang-mr">स्मार्ट यादी</span><span class="lang-en">List</span></span>
        </button>
        <button type="button" class="mbn-item mbn-cart" id="mbnCart" aria-label="Cart">
          <span class="mbn-icon-wrap">
            <span class="mbn-icon"><svg class="icon"><use href="/images/icons.svg#cart"></use></svg></span>
            <span class="mbn-badge" id="mbnCartBadge">0</span>
          </span>
          <span class="mbn-label"><span class="lang-mr">कार्ट</span><span class="lang-en">Cart</span></span>
        </button>
        <a href="orders.html" class="mbn-item" id="mbnOrders" aria-label="Orders">
          <span class="mbn-icon"><svg class="icon"><use href="/images/icons.svg#orders"></use></svg></span>
          <span class="mbn-label"><span class="lang-mr">ऑर्डर्स</span><span class="lang-en">Orders</span></span>
        </a>
        <a href="account.html" class="mbn-item" id="mbnAccount" aria-label="Account">
          <span class="mbn-icon"><svg class="icon"><use href="/images/icons.svg#account"></use></svg></span>
          <span class="mbn-label"><span class="lang-mr">खाते</span><span class="lang-en">Account</span></span>
        </a>
      `;
      document.body.appendChild(nav);
    }

    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    
    document.querySelectorAll('.mbn-item').forEach(el => el.classList.remove('active'));
    if (path.includes('orders') || path.includes('order-confirmation')) {
      document.getElementById('mbnOrders')?.classList.add('active');
    } else if (path.includes('account') || path.includes('login') || path.includes('register')) {
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
  if (typeof cart !== 'undefined' && typeof cart.onUpdate === 'function') {
    cart.onUpdate(() => {
      updateCartBadge();
    });
  }

  return {
    init,
    showToast,
    updateCartBadge,
    updateStickyCartBar,
    renderCartDrawer,
    openCart,
    closeCart,
    checkout,
    showLoginPrompt,
    closeLoginPrompt,
    initSmartAiPromotion,
    observeReveals,
  };
})();

// Explicitly attach to window object
window.ui = ui;
