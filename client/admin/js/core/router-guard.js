/**
 * Mahalaxmi Kirana Store — Router Guard
 * Executes synchronously to block unauthorized views before rendering DOM.
 */

'use strict';

(function enforceGuard() {
  // If running inside node or test environment, skip
  if (typeof window === 'undefined' || !window.localStorage) return;

  const auth = window.AdminAuth || {
    isLoggedIn: () => {
      try {
        return Boolean(localStorage.getItem('kirana_token') && localStorage.getItem('kirana_user'));
      } catch (_) { return false; }
    },
    getUser: () => {
      try {
        const u = localStorage.getItem('kirana_user');
        return u ? JSON.parse(u) : null;
      } catch (_) { return null; }
    },
    redirectToLogin: () => {
      window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }
  };

  if (!auth.isLoggedIn()) {
    auth.redirectToLogin();
    return;
  }

  const user = auth.getUser();
  if (!user || !['owner', 'staff'].includes(user.role)) {
    alert('Access restricted to store staff and owner / केवळ दुकान कर्मचारी व मालकासाठी परवानगी आहे.');
    window.location.href = '../index.html';
  }
})();
