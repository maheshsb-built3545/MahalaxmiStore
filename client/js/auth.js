/**
 * frontend/js/auth.js
 *
 * Authentication state management and UI header syncing.
 * Depends on: CONFIG (config.js).
 */

const auth = (() => {
  // Rule 4 & Stage 3: Exact whitelist for safe redirects (rejects external URLs or unapproved paths)
  const REDIRECT_WHITELIST = ['checkout.html', 'orders.html', 'index.html', 'inbox.html', 'account.html', 'admin/dashboard.html', 'admin/inbox.html'];

  function getToken() {
    return localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(CONFIG.AUTH_TOKEN_KEY, token);
    if (user)  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));

    // Merge previous user cart with guest cart (Task 1 step 4)
    if (user && user._id && window.cart && typeof window.cart.mergeWith === 'function') {
      try {
        const raw = localStorage.getItem(`kirana_user_cart_${user._id}`);
        if (raw) {
          const savedItems = JSON.parse(raw);
          if (Array.isArray(savedItems) && savedItems.length > 0) {
            window.cart.mergeWith(savedItems);
          }
        }
      } catch (_) {}
    }

    renderAuthHeader();
  }

  function clearSession() {
    // Save snapshot of current cart to user's saved cart before wiping token
    const user = getUser();
    if (user && user._id) {
      try {
        const currentCart = localStorage.getItem('kirana_cart');
        if (currentCart) {
          localStorage.setItem(`kirana_user_cart_${user._id}`, currentCart);
        }
      } catch (_) {}
    }

    // Wipe ONLY auth tokens (Non-negotiable Rule 5: Never purge localStorage key kirana_cart)
    localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    renderAuthHeader();
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  const PENDING_ACTION_KEY = 'kirana_pending_action';

  /**
   * Rule 4 & 5: Exact whitelist redirect targets.
   * Safely honors both ?next= and ?redirect= parameters.
   * Only allows same-origin relative paths on whitelist.
   */
  function getSafeRedirect() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('next') || params.get('redirect');
    if (!target) return 'index.html';
    // Reject absolute URLs with protocol or double slash (e.g. //evil.com or https://evil.com)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith('//')) {
      return 'index.html';
    }
    const cleanPath = target.split('?')[0].split('#')[0].replace(/^\/+/, '');
    if (REDIRECT_WHITELIST.includes(cleanPath)) {
      return target;
    }
    return 'index.html';
  }

  function savePendingAction(action) {
    if (!action) return;
    try {
      sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({
        ...action,
        timestamp: Date.now(),
      }));
    } catch (_) {}
  }

  function getPendingAction() {
    try {
      const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Short expiry: 30 minutes
      if (Date.now() - data.timestamp > 30 * 60 * 1000) {
        clearPendingAction();
        return null;
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  function clearPendingAction() {
    try {
      sessionStorage.removeItem(PENDING_ACTION_KEY);
    } catch (_) {}
  }

  /**
   * Auto-apply pending action after successful guest login or registration (Task 1)
   */
  async function checkAndApplyPendingAction() {
    if (!isLoggedIn()) return;
    const action = getPendingAction();
    if (!action) return;
    clearPendingAction(); // Auto-apply strictly once

    if (action.alreadyInCart) {
      if (window.ui) {
        if (ui.updateCartBadge) ui.updateCartBadge();
        if (ui.renderCartDrawer) ui.renderCartDrawer();
      }
      return;
    }

    if (action.type === 'add_item') {
      const prod = action.product;
      const qty = action.qty || 1;
      if (!prod) return;

      const id = prod._id || prod.productId;
      try {
        const res = await fetch(`${CONFIG.API_BASE}/products?ids=${id}`);
        const data = await res.json();
        const liveProd = data.success && data.data && data.data[0];
        if (liveProd && (!liveProd.inStock || liveProd.stockQuantity <= 0)) {
          if (window.ui && window.ui.showToast) {
            ui.showToast('या वस्तूचा स्टॉक संपला आहे / This item is out of stock');
          }
          return;
        }
      } catch (_) {}

      if (window.cart && window.cart.change) {
        window.cart.change(prod, qty);
      }
      if (window.ui) {
        if (ui.updateCartBadge) ui.updateCartBadge();
        if (ui.renderCartDrawer) ui.renderCartDrawer();
        if (ui.openCart) setTimeout(() => ui.openCart(), 350);
        if (ui.showToast) ui.showToast('कार्टमध्ये जोडले / Added to cart', 'success');
      }
    } else if (action.type === 'ai_list') {
      const items = action.items || [];
      if (!items.length) return;
      if (window.cart && window.cart.addBatch) {
        window.cart.addBatch(items);
      }
      if (window.ui) {
        if (ui.updateCartBadge) ui.updateCartBadge();
        if (ui.renderCartDrawer) ui.renderCartDrawer();
        if (ui.openCart) setTimeout(() => ui.openCart(), 350);
        if (ui.showToast) ui.showToast(`${items.length} वस्तू कार्टमध्ये जोडल्या / Added to cart`, 'success');
      }
    } else if (action.type === 'reorder') {
      if (window.location.pathname.includes('orders.html') && action.orderId) {
        window._pendingReorderId = action.orderId;
      }
    }
  }

  /**
   * Stage 3: Determines redirect path based on user role.
   * Owners go to admin dashboard; customers to safe storefront target.
   */
  function getRedirectForUser(user) {
    if (user && user.role === 'owner') {
      const target = getSafeRedirect();
      if (target === 'admin/dashboard.html') return target;
      return 'admin/dashboard.html';
    }
    const target = getSafeRedirect();
    return target === 'admin/dashboard.html' ? 'index.html' : target;
  }

  /**
   * Rule 6: Format dates and times in IST (Asia/Kolkata)
   */
  function formatDateIST(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  /**
   * Render logged-in user profile or login button in header using safe DOM methods
   */
  function renderAuthHeader() {
    const area = document.getElementById('userHeaderArea');
    if (!area) return;

    // Reset container safely
    area.textContent = '';

    const user = getUser();
    const token = getToken();

    if (token && user) {
      // 1. Logged-in profile badge container
      const badge = document.createElement('div');
      badge.className = 'user-profile-badge';

      // Avatar circle with first initial
      const initial = (user.name || 'C').trim().charAt(0).toUpperCase();
      const avatar = document.createElement('span');
      avatar.className = 'user-avatar';
      avatar.textContent = initial;
      badge.appendChild(avatar);

      // User first name
      const firstName = (user.name || 'Customer').trim().split(' ')[0];
      const nameSpan = document.createElement('span');
      nameSpan.className = 'user-first-name';
      nameSpan.textContent = firstName;
      nameSpan.title = user.name;
      badge.appendChild(nameSpan);

      // "My Orders" link
      const ordersLink = document.createElement('a');
      ordersLink.href = 'orders.html';
      ordersLink.className = 'btn-my-orders';
      ordersLink.innerHTML = '<svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#orders"></use></svg> <span class="lang-mr">ऑर्डर्स</span><span class="lang-en">Orders</span>';
      ordersLink.setAttribute('aria-label', 'View my orders');
      badge.appendChild(ordersLink);

      // R2: Inbox link with unread counter badge (MSG-02)
      const inboxLink = document.createElement('a');
      inboxLink.href = 'inbox.html';
      inboxLink.className = 'btn-my-orders btn-inbox-header';
      inboxLink.id = 'customerInboxHeaderLink';
      inboxLink.innerHTML = '<svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#bell"></use></svg> <span class="hide-mobile"><span class="lang-mr">संदेश</span><span class="lang-en">Inbox</span></span><span class="nav-unread-badge" id="customerUnreadBadge" style="display:none;">0</span>';
      inboxLink.setAttribute('aria-label', 'View messages and notifications');
      badge.appendChild(inboxLink);

      // Stage 3: Admin dashboard shortcut for owner
      if (user.role === 'owner' || user.role === 'staff') {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin/dashboard.html';
        adminLink.className = 'btn-my-orders btn-admin-header';
        adminLink.style.background = '#047857';
        adminLink.style.color = '#ffffff';
        adminLink.style.borderColor = '#059669';
        adminLink.innerHTML = '<svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#settings"></use></svg> <span class="lang-mr">प्रशासन</span><span class="lang-en">Admin</span>';
        adminLink.setAttribute('aria-label', 'Go to admin panel');
        badge.appendChild(adminLink);
      }

      // Logout button
      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'btn-logout';
      logoutBtn.innerHTML = '<span class="lang-mr">लॉगआउट</span><span class="lang-en">Logout</span>';
      logoutBtn.title = 'Log out of your account';
      logoutBtn.addEventListener('click', () => {
        clearSession();
        window.location.reload();
      });
      badge.appendChild(logoutBtn);

      area.appendChild(badge);

      // Fetch unread count for bell badge
      updateCustomerUnreadBadge();
    } else {
      // 2. Logged-out state: Login button
      const loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.className = 'auth-header-btn';
      loginLink.setAttribute('aria-label', 'Customer login');

      const iconSpan = document.createElement('span');
      iconSpan.innerHTML = '<svg class="icon icon--sm" style="margin-right:3px;vertical-align:-1px;"><use href="/images/icons.svg#account"></use></svg>';
      loginLink.appendChild(iconSpan);

      const textSpan = document.createElement('span');
      textSpan.innerHTML = '<span class="lang-mr">लॉगिन</span><span class="lang-en">Login</span>';

      loginLink.appendChild(textSpan);
      area.appendChild(loginLink);
    }
  }

  async function updateCustomerUnreadBadge() {
    const badgeEl = document.getElementById('customerUnreadBadge');
    if (!badgeEl || !getToken()) return;
    try {
      const res = await fetch(`${CONFIG.API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.unreadCount > 0) {
        badgeEl.textContent = data.unreadCount;
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    } catch (_) {}
  }

  return {
    getToken,
    getUser,
    setSession,
    clearSession,
    isLoggedIn,
    getSafeRedirect,
    getRedirectForUser,
    formatDateIST,
    renderAuthHeader,
    updateCustomerUnreadBadge,
    savePendingAction,
    getPendingAction,
    clearPendingAction,
    checkAndApplyPendingAction,
  };
})();

