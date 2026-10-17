/**
 * frontend/js/auth.js
 *
 * Authentication state management and UI header syncing.
 * Depends on: CONFIG (config.js).
 */

const auth = (() => {
  // Rule 4 & Stage 3: Exact whitelist for safe redirects (rejects external URLs or unapproved paths)
  const REDIRECT_WHITELIST = ['checkout.html', 'orders.html', 'index.html', 'inbox.html', 'admin/dashboard.html', 'admin/inbox.html'];

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
    renderAuthHeader();
  }

  function clearSession() {
    localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    renderAuthHeader();
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  /**
   * Rule 4 & 5: Exact whitelist redirect targets.
   */
  function getSafeRedirect() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('redirect');
    if (target && REDIRECT_WHITELIST.includes(target)) {
      return target;
    }
    return 'index.html';
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
      ordersLink.textContent = '📦 Orders';
      ordersLink.setAttribute('aria-label', 'View my orders');
      badge.appendChild(ordersLink);

      // R2: Inbox link with unread counter badge (MSG-02)
      const inboxLink = document.createElement('a');
      inboxLink.href = 'inbox.html';
      inboxLink.className = 'btn-my-orders btn-inbox-header';
      inboxLink.id = 'customerInboxHeaderLink';
      inboxLink.innerHTML = '🔔 <span class="hide-mobile">Inbox</span><span class="nav-unread-badge" id="customerUnreadBadge" style="display:none;">0</span>';
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
        adminLink.textContent = '🛠️ Admin';
        adminLink.setAttribute('aria-label', 'Go to admin panel');
        badge.appendChild(adminLink);
      }

      // Logout button
      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'btn-logout';
      logoutBtn.textContent = 'Logout';
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
      iconSpan.textContent = '👤';
      loginLink.appendChild(iconSpan);

      const textSpan = document.createElement('span');
      textSpan.textContent = 'Login ';

      const mrSpan = document.createElement('span');
      mrSpan.className = 'mr';
      mrSpan.textContent = 'लॉगिन';
      textSpan.appendChild(mrSpan);

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
  };
})();

