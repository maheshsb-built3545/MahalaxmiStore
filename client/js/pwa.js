'use strict';

/**
 * frontend/js/pwa.js
 * PWA Registration, A2HS (Add to Home Screen) banner, and haptic touch helpers.
 */

window.PWA = {
  deferredPrompt: null,

  init() {
    // 1. Service Worker registration
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    if (window.ui && window.ui.showToast) {
                      ui.showToast('नवीन आवृत्ती उपलब्ध आहे • New version available - Refresh', 'info');
                    }
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err.message);
          });
      });
    }

    // 2. Install prompt listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const dismissed = localStorage.getItem('mk_pwa_dismissed');
      // Show prompt if not dismissed in the last 7 days
      if (!dismissed || (Date.now() - parseInt(dismissed, 10)) > 7 * 24 * 60 * 60 * 1000) {
        this.showInstallBanner();
      }
    });

    // 3. App installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App successfully installed!');
      this.hideInstallBanner();
      this.deferredPrompt = null;
    });
  },

  showInstallBanner() {
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'pwa-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install App');
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <div class="pwa-banner-icon">
          <img src="/images/icon-192.svg" alt="App Icon" width="40" height="40">
        </div>
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">महालक्ष्मी किराणा ॲप • Install App</div>
          <div class="pwa-banner-sub">Install on your phone for faster 1-tap grocery ordering</div>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="btn-pwa-dismiss" id="pwaDismissBtn">नंतर • Later</button>
        <button type="button" class="btn-pwa-install" id="pwaInstallBtn">इन्स्टॉल • Install</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted install');
        }
        this.deferredPrompt = null;
        this.hideInstallBanner();
      }
    });

    document.getElementById('pwaDismissBtn')?.addEventListener('click', () => {
      localStorage.setItem('mk_pwa_dismissed', Date.now().toString());
      this.hideInstallBanner();
    });
  },

  hideInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.classList.add('pwa-banner-hiding');
      setTimeout(() => banner.remove(), 250);
    }
  },

  /**
   * Safe subtle haptic feedback for mobile actions
   */
  haptic(pattern = 15) {
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }
};

// Auto-initialize PWA features
PWA.init();
