/**
 * frontend/admin/js/admin-common.js
 * Shared admin shell, authentication guard, XSS prevention, audio chime, and API utilities.
 */

'use strict';

// ─── 1. CLIENT ROLE GUARD (Owner & Staff Allowed) ────────────────────────────
(function enforceAdminAuth() {
  if (typeof auth === 'undefined' || !auth.isLoggedIn()) {
    window.location.href = '../login.html?redirect=admin/dashboard.html';
    return;
  }
  const user = auth.getUser();
  if (!user || !['owner', 'staff'].includes(user.role)) {
    alert('Access restricted to store staff and owner / केवळ दुकान कर्मचारी व मालकासाठी परवानगी आहे.');
    window.location.href = '../index.html';
  }
})();

// ─── 2. XSS ESCAPE HELPER (Rule 2) ────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── 3. PHONE NUMBER NORMALIZER (Rule 12) ────────────────────────────────────
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '').slice(-10);
  return `91${digits}`;
}

// ─── 4. CLIENT-SIDE CANVAS IMAGE COMPRESSOR (Rule 6) ─────────────────────────
async function compressImageFile(file, maxWidth = 1200) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file); // Let server magic bytes validate/reject
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ─── 5. WEB AUDIO CHIME & CONTROLS (Rule 7) ──────────────────────────────────
let audioCtx = null;

function isAudioMuted() {
  return localStorage.getItem('admin_audio_muted') === 'true';
}

function setAudioMuted(muted) {
  localStorage.setItem('admin_audio_muted', muted ? 'true' : 'false');
  updateAudioUi();
}

function unlockAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    localStorage.setItem('admin_audio_unlocked', 'true');
    updateAudioUi();
  } catch (err) {
    console.warn('Web Audio not supported:', err);
  }
}

function playNewOrderChime() {
  if (isAudioMuted()) return;
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33, now);
    osc2.frequency.setValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio chime playback error:', err);
  }
}

function updateAudioUi() {
  const container = document.getElementById('audioControlsArea');
  if (!container) return;

  const isUnlocked = localStorage.getItem('admin_audio_unlocked') === 'true';
  const isMuted = isAudioMuted();

  container.innerHTML = '';

  if (!isUnlocked) {
    const enableBtn = document.createElement('button');
    enableBtn.className = 'btn-audio';
    enableBtn.textContent = '🔊 Enable Sound / आवाज सुरू करा';
    enableBtn.title = 'Click once to allow audio alerts for new orders';
    enableBtn.onclick = () => {
      unlockAudio();
      playNewOrderChime();
    };
    container.appendChild(enableBtn);
  } else {
    const muteBtn = document.createElement('button');
    muteBtn.className = 'btn-audio';
    muteBtn.textContent = isMuted ? '🔇 Unmute' : '🔊 Mute Sound';
    muteBtn.title = isMuted ? 'Unmute alert sounds' : 'Mute alert sounds';
    muteBtn.onclick = () => setAudioMuted(!isMuted);
    container.appendChild(muteBtn);
  }
}

// ─── 6. ADMIN API FETCH WRAPPER ──────────────────────────────────────────────
async function adminFetch(path, options = {}) {
  const token = auth.getToken();
  const headers = options.headers || {};

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    auth.clearSession();
    window.location.href = '../login.html?redirect=admin/dashboard.html';
    throw new Error('Session expired.');
  }

  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = { success: false, message: 'Invalid server response.' };
  }

  if (!res.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

// ─── 6b. AUTHENTICATED BLOB CSV/FILE DOWNLOADER ──────────────────────────────
async function downloadAuthed(url, filename) {
  try {
    const token = auth.getToken();
    let fullUrl = url;
    if (!url.startsWith('http')) {
      if (url.startsWith('/api')) {
        fullUrl = `${CONFIG.API_BASE}${url.replace('/api', '')}`;
      } else if (url.startsWith('/')) {
        fullUrl = `${CONFIG.API_BASE}${url}`;
      } else {
        fullUrl = `${CONFIG.API_BASE}/${url}`;
      }
    }

    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'File download failed / फाईल डाऊनलोड अपयशी.');
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (err) {
    alert(`Download error / डाऊनलोड त्रुटी: ${err.message}`);
  }
}

// ─── 7. SHARED NAVIGATION BUILDER ────────────────────────────────────────────
function renderAdminNavigation(activePage = '') {
  const user = auth.getUser ? auth.getUser() : null;
  const isOwner = user && user.role === 'owner';
  const currentLang = localStorage.getItem('admin_lang') || 'mr';

  // Top Navbar
  const topNav = document.getElementById('adminNavbar');
  if (topNav) {
    topNav.innerHTML = `
      <div class="admin-nav-inner">
        <a href="dashboard.html" class="admin-brand">
          🏪 <span>Mahalaxmi ${currentLang === 'mr' ? 'व्यवस्थापन' : 'Admin'}</span>
        </a>
        <ul class="admin-nav-links">
          <li><a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">📊 ${currentLang === 'mr' ? 'डॅशबोर्ड' : 'Dashboard'}</a></li>
          <li><a href="inbox.html" class="${activePage === 'inbox' ? 'active' : ''}">🔔 ${currentLang === 'mr' ? 'सूचना' : 'Inbox'} <span id="adminInboxBadge" class="nav-badge" style="display:none;background:#ef4444;color:#fff;border-radius:999px;font-size:10px;padding:2px 6px;font-weight:800;margin-left:4px;">0</span></a></li>
          <li><a href="orders.html" class="${activePage === 'orders' ? 'active' : ''}">📦 ${currentLang === 'mr' ? 'ऑर्डर्स' : 'Orders'}</a></li>
          <li><a href="udhar.html" class="${activePage === 'udhar' ? 'active' : ''}">📝 ${currentLang === 'mr' ? 'उधारी वही' : 'Udhar Ledger'}</a></li>
          <li><a href="reports.html" class="${activePage === 'reports' ? 'active' : ''}">📈 ${currentLang === 'mr' ? 'हिशोब / रिपोर्ट्स' : 'Reports & Settlement'}</a></li>
          <li><a href="stock-in.html" class="${activePage === 'stock-in' ? 'active' : ''}">📥 ${currentLang === 'mr' ? 'स्टॉक इन' : 'Stock In'}</a></li>
          <li><a href="low-stock.html" class="${activePage === 'low-stock' ? 'active' : ''}">⚠️ ${currentLang === 'mr' ? 'कमी साठा' : 'Low Stock'}</a></li>
          <li><a href="products.html" class="${activePage === 'products' ? 'active' : ''}">🏷️ ${currentLang === 'mr' ? 'उत्पादने' : 'Products'}</a></li>
          <li><a href="ai-misses.html" class="${activePage === 'ai-misses' ? 'active' : ''}">🤖 ${currentLang === 'mr' ? 'AI शोध' : 'AI Misses'}</a></li>
          ${isOwner ? `<li><a href="staff.html" class="${activePage === 'staff' ? 'active' : ''}">🧑‍💼 ${currentLang === 'mr' ? 'कर्मचारी' : 'Staff'}</a></li>` : ''}
          <li><a href="settings.html" class="${activePage === 'settings' ? 'active' : ''}">⚙️ ${currentLang === 'mr' ? 'सेटिंग्ज' : 'Settings'}</a></li>
        </ul>
        <div class="admin-nav-actions">
          <button id="adminLangToggle" class="btn-audio" title="मराठी / English Switcher">
            🌐 ${currentLang === 'mr' ? 'English' : 'मराठी'}
          </button>
          <div id="audioControlsArea"></div>
          <a href="../index.html" class="btn-storefront" target="_blank" title="View customer storefront">🌐 Store</a>
          <button class="btn-admin-logout" id="adminLogoutBtn">${currentLang === 'mr' ? 'बाहेर पडा' : 'Logout'}</button>
        </div>
      </div>
    `;

    // Wire up language toggle
    const langBtn = document.getElementById('adminLangToggle');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        const nextLang = currentLang === 'mr' ? 'en' : 'mr';
        localStorage.setItem('admin_lang', nextLang);
        window.location.reload();
      });
    }
  }

  // Mobile Bottom Bar
  const bottomBar = document.getElementById('mobileBottomBar');
  if (bottomBar) {
    bottomBar.innerHTML = `
      <a href="dashboard.html" class="bottom-tab ${activePage === 'dashboard' ? 'active' : ''}">
        <span class="icon">📊</span>
        <span>Stats</span>
      </a>
      <a href="inbox.html" class="bottom-tab ${activePage === 'inbox' ? 'active' : ''}">
        <span class="icon">🔔</span>
        <span>Inbox</span>
      </a>
      <a href="orders.html" class="bottom-tab ${activePage === 'orders' ? 'active' : ''}">
        <span class="icon">📦</span>
        <span>Orders</span>
      </a>
      <a href="low-stock.html" class="bottom-tab ${activePage === 'low-stock' ? 'active' : ''}">
        <span class="icon">⚠️</span>
        <span>Stock</span>
      </a>
      <a href="settings.html" class="bottom-tab ${activePage === 'settings' ? 'active' : ''}">
        <span class="icon">⚙️</span>
        <span>Settings</span>
      </a>
    `;
  }

  // Attach logout handler
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.clearSession();
      window.location.href = '../login.html';
    });
  }

  updateAudioUi();
  updateAdminInboxBadge();
}

async function updateAdminInboxBadge() {
  const badge = document.getElementById('adminInboxBadge');
  if (!badge) return;
  try {
    const res = await adminFetch('/notifications/unread-count');
    if (res.success && res.unreadCount > 0) {
      badge.textContent = res.unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (_) {}
}

// Check every 30s for inbox updates
setInterval(updateAdminInboxBadge, 30000);

