/**
 * frontend/js/config.js
 *
 * Single source of truth for frontend configuration.
 * For production deployment, update API_BASE to your backend URL (e.g. https://api.mahalaxmikirana.in).
 */

const CONFIG = {
  // API base URL – relative '/api' works seamlessly on local Express and Vercel proxy
  API_BASE: '/api',

  // Store WhatsApp number (international format without + or spaces)
  STORE_NUM: '919860924504',

  // WhatsApp click-to-chat base URL
  WA_BASE: 'https://wa.me/',

  // Storage keys
  AUTH_TOKEN_KEY: 'kirana_token',
  USER_KEY: 'kirana_user',
  CART_KEY: 'kirana_cart',

  // Store coordinates & Google Maps directions (Bug 3)
  STORE_COORDINATES: {
    lat: 19.945865348048383,
    lng: 74.48684734211365,
  },
  DIRECTIONS_URL: 'https://www.google.com/maps/dir/?api=1&destination=19.945865348048383,74.48684734211365',
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

// ── Category SVG icon mapping from UI polish audit ────────────────────────
const CATEGORY_NAME_MAP = {
  'atta & grains': 'grains',
  'grains': 'grains',
  'पीठ आणि धान्य': 'grains',
  'आटा आणि धान्य': 'grains',
  'dals & pulses': 'dals',
  'dals': 'dals',
  'डाळी आणि कडधान्ये': 'dals',
  'डाळ आणि कडधान्ये': 'dals',
  'oils & ghee': 'oils',
  'oils': 'oils',
  'तेल आणि तूप': 'oils',
  'dairy & drinks': 'dairy',
  'dairy': 'dairy',
  'दूध आणि पेये': 'dairy',
  'दुग्धजन्य आणि पेये': 'dairy',
  'spices': 'spices',
  'मसाले': 'spices',
  'snacks & biscuits': 'snacks',
  'snacks': 'snacks',
  'नाश्ता': 'snacks',
  'फराळ आणि बिस्किटे': 'snacks',
  'beverages': 'beverages',
  'पेये': 'beverages',
  'शीतपेये आणि सरबत': 'beverages',
  'cleaning & home care': 'homecare',
  'home care': 'homecare',
  'घरगुती काळजी': 'homecare',
  'स्वच्छता आणि गृहपयोगी': 'homecare',
  'personal care': 'personalcare',
  'वैयक्तिक काळजी': 'personalcare',
  'stationery & misc': 'stationery',
  'stationery': 'stationery',
  'स्टेशनरी': 'stationery',
  'स्टेशनरी आणि इतर': 'stationery',
};

function getCategoryIconKey(cat) {
  if (!cat) return 'box';
  if (typeof cat === 'string') {
    const key = cat.toLowerCase().trim();
    return CATEGORY_NAME_MAP[key] || 'box';
  }
  // 1. Category.iconKey
  if (cat.iconKey && typeof cat.iconKey === 'string' && cat.iconKey.trim()) {
    return cat.iconKey.trim();
  }
  // 2. Name mapping from audit
  const en = (cat.nameEn || '').toLowerCase().trim();
  const mr = (cat.nameMr || '').trim();
  return CATEGORY_NAME_MAP[en] || CATEGORY_NAME_MAP[mr] || 'box';
}

function renderCategoryIcon(cat, extraClass = '') {
  const iconKey = getCategoryIconKey(cat);
  return `<svg class="icon ${extraClass}"><use href="/images/icons.svg#${iconKey}"></use></svg>`;
}

// ── Language Toggle & Persistence (Default 'mr') ───────────────────────────
function getAppLang() {
  return localStorage.getItem('mk_lang') || 'mr';
}

function setAppLang(lang) {
  const target = lang === 'en' ? 'en' : 'mr';
  localStorage.setItem('mk_lang', target);
  document.documentElement.setAttribute('data-lang', target);
  updateLangToggleUI(target);
}

function updateLangToggleUI(lang) {
  const btn = document.getElementById('langToggleBtn');
  if (btn) {
    const mrSpan = btn.querySelector('.lang-mr');
    const enSpan = btn.querySelector('.lang-en');
    if (mrSpan && enSpan) {
      if (lang === 'mr') {
        mrSpan.style.display = 'inline';
        enSpan.style.display = 'none';
      } else {
        mrSpan.style.display = 'none';
        enSpan.style.display = 'inline';
      }
    }
  }
  const mrBtn = document.getElementById('accountLangMr');
  const enBtn = document.getElementById('accountLangEn');
  if (mrBtn && enBtn) {
    if (lang === 'mr') {
      mrBtn.classList.add('btn-primary');
      mrBtn.classList.remove('btn-outline');
      enBtn.classList.add('btn-outline');
      enBtn.classList.remove('btn-primary');
    } else {
      enBtn.classList.add('btn-primary');
      enBtn.classList.remove('btn-outline');
      mrBtn.classList.add('btn-outline');
      mrBtn.classList.remove('btn-primary');
    }
  }
}

function initLanguageToggle() {
  const current = getAppLang();
  document.documentElement.setAttribute('data-lang', current);
  updateLangToggleUI(current);

  const btn = document.getElementById('langToggleBtn');
  if (btn) {
    btn.onclick = () => {
      const next = getAppLang() === 'mr' ? 'en' : 'mr';
      setAppLang(next);
    };
  }
}

// Immediately apply persisted language to prevent layout flash
(function() {
  const initialLang = localStorage.getItem('mk_lang') || 'mr';
  document.documentElement.setAttribute('data-lang', initialLang);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageToggle);
  } else {
    initLanguageToggle();
  }
})();
