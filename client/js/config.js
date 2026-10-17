/**
 * frontend/js/config.js
 *
 * Single source of truth for frontend configuration.
 * For production deployment, update API_BASE to your backend URL (e.g. https://api.mahalaxmikirana.in).
 */

const CONFIG = {
  // API base URL – defaults to current origin in browser or fallback to localhost:5000
  API_BASE: (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http'))
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api',

  // Store WhatsApp number (international format without + or spaces)
  STORE_NUM: '919860924504',

  // WhatsApp click-to-chat base URL
  WA_BASE: 'https://wa.me/',

  // Storage keys
  AUTH_TOKEN_KEY: 'kirana_token',
  USER_KEY: 'kirana_user',
  CART_KEY: 'kirana_cart',
};

/**
 * Authenticated fetch helper:
 * - Automatically attaches Authorization: Bearer <token>
 * - Rule 12: On any 401 Unauthorized response, clears token and user,
 *   preserves the cart in localStorage, and redirects to login with redirect param.
 */
async function authFetch(url, options = {}) {
  const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
  const headers = Object.assign({}, options.headers || {});

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, Object.assign({}, options, { headers }));

  if (res.status === 401) {
    // Clear user auth session but NEVER touch the cart (Non-negotiable Rule 5)
    localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);

    // Current page filename for redirect
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const safeWhitelist = ['checkout.html', 'orders.html', 'index.html'];
    const redirectTarget = safeWhitelist.includes(currentPage) ? currentPage : 'index.html';

    if (window.ui && typeof window.ui.showLoginPrompt === 'function') {
      window.ui.showLoginPrompt({ type: 'session_expired', returnUrl: redirectTarget });
    } else if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = `login.html?next=${encodeURIComponent(redirectTarget)}&redirect=${encodeURIComponent(redirectTarget)}`;
    }
  }

  return res;
}
