/**
 * Mahalaxmi Kirana Store — Owner/Admin Authentication & Permissions
 * Non-negotiable Rule 5: Never purge `kirana_cart` on 401 or logout.
 */

'use strict';

const TOKEN_KEY = (typeof CONFIG !== 'undefined' && CONFIG.AUTH_TOKEN_KEY) || 'kirana_token';
const USER_KEY  = (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) || 'kirana_user';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function isLoggedIn() {
  return Boolean(getToken() && getUser());
}

function isOwner() {
  const u = getUser();
  return Boolean(u && u.role === 'owner');
}

function isStaff() {
  const u = getUser();
  return Boolean(u && u.role === 'staff');
}

/**
 * Checks whether current user has permission for a specific module/action.
 * Owners have full access to everything.
 * Staff access is governed by permissions array on user profile or allowed modules.
 */
function hasPermission(permissionKey) {
  const u = getUser();
  if (!u) return false;
  if (u.role === 'owner') return true;
  if (u.role !== 'staff') return false;

  // If user has specific permissions defined
  if (Array.isArray(u.permissions)) {
    return u.permissions.includes(permissionKey);
  }

  // Default permitted modules for staff
  const defaultStaffAllowed = [
    'orders',
    'packing',
    'inventory_stock_in',
    'inventory_alerts',
    'udhar_payments',
    'catalog_view',
  ];
  return defaultStaffAllowed.includes(permissionKey);
}

/**
 * Non-negotiable Rule 5: Clear only auth keys. Preserve customer cart!
 */
function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (_) {}
}

/**
 * Redirects to login page with sanitized same-origin next param.
 */
function redirectToLogin(nextPath = '') {
  clearSession();
  let target = '../login.html';
  if (nextPath && typeof nextPath === 'string' && !nextPath.startsWith('http')) {
    const cleanPath = nextPath.replace(/^[/\\]+/, '');
    target += `?redirect=${encodeURIComponent(cleanPath)}`;
  }
  window.location.href = target;
}

window.AdminAuth = {
  getToken,
  getUser,
  isLoggedIn,
  isOwner,
  isStaff,
  hasPermission,
  clearSession,
  redirectToLogin,
  TOKEN_KEY,
  USER_KEY,
};
