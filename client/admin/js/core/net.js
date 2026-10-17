/**
 * Mahalaxmi Kirana Store — Network Status & Offline Monitor
 */

'use strict';

let offlineBanner = null;

function isOnline() {
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
}

function updateOfflineUi() {
  if (!offlineBanner) {
    offlineBanner = document.getElementById('offlineBanner');
    if (!offlineBanner) {
      offlineBanner = document.createElement('div');
      offlineBanner.id = 'offlineBanner';
      offlineBanner.className = 'offline-banner';
      offlineBanner.textContent = '⚠️ ' + (window.t ? window.t('offline_notice') : 'Offline — Read only mode');
      document.body.prepend(offlineBanner);
    }
  }

  if (!isOnline()) {
    offlineBanner.classList.add('visible');
    if (window.AdminToast) {
      window.AdminToast.show(window.t ? window.t('offline_notice') : 'Offline', 'warning', 6000);
    }
  } else {
    offlineBanner.classList.remove('visible');
  }
}

window.addEventListener('online', () => {
  updateOfflineUi();
  if (window.AdminToast) {
    window.AdminToast.show('🌐 इंटरनेट पुन्हा सुरू झाले / Internet connected', 'success', 3000);
  }
});

window.addEventListener('offline', () => {
  updateOfflineUi();
});

// Initial check on DOM load
document.addEventListener('DOMContentLoaded', updateOfflineUi);

window.AdminNet = { isOnline, updateOfflineUi };
