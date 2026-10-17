/**
 * R0 — Internationalisation (i18n) module
 *
 * Usage:
 *   import { t, setLang, getLang, onLangChange } from './i18n.js';
 *
 *   t('catalog.outOfStock')              // → 'स्टॉक संपला' (Marathi default)
 *   t('errors.insufficientStock', { available: 3, unit: 'kg' })
 *                                        // → 'फक्त 3 kg शिल्लक आहे.'
 *   setLang('en');                       // switches to English, fires listeners
 *   onLangChange((lang) => rerender());  // register a listener
 *
 * Supported languages: 'mr' (Marathi, default), 'hi' (Hindi), 'en' (English)
 * Language choice is persisted in localStorage so it survives page reloads.
 */

const SUPPORTED_LANGS = ['mr', 'hi', 'en'];
const DEFAULT_LANG    = 'mr';
const LS_KEY          = 'mk_lang';  // localStorage key

// ── Internal state ────────────────────────────────────────────────────────────
let _currentLang  = null;
let _translations  = {};         // { mr: {...}, hi: {...}, en: {...} }
const _listeners  = [];          // onLangChange callbacks

// ── Bootstrap ─────────────────────────────────────────────────────────────────
/**
 * Load translation files and initialise the module.
 * Call this once, early in your page script (top-level await or .then).
 * Returns a promise that resolves when all files are loaded.
 */
export async function initI18n() {
  const saved = localStorage.getItem(LS_KEY);
  _currentLang = SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;

  // Fetch all three files in parallel
  const [mr, hi, en] = await Promise.all(
    SUPPORTED_LANGS.map((lang) =>
      fetch(`/i18n/${lang}.json`).then((r) => r.json()).catch(() => ({}))
    )
  );

  _translations = { mr, hi, en };
  _applyToDOM();
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Return the current language code ('mr' | 'hi' | 'en'). */
export function getLang() {
  return _currentLang || DEFAULT_LANG;
}

/**
 * Switch the active language and re-apply translations to every element that
 * has a data-i18n attribute.  Fires all onLangChange listeners.
 */
export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  _currentLang = lang;
  localStorage.setItem(LS_KEY, lang);
  _applyToDOM();
  _listeners.forEach((cb) => cb(lang));
}

/**
 * Register a callback to run whenever the language changes.
 * Returns an unsubscribe function.
 */
export function onLangChange(callback) {
  _listeners.push(callback);
  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}

/**
 * Translate a dot-separated key, with optional token interpolation.
 *
 * @param {string} key   - e.g. 'catalog.onlyNLeft'
 * @param {object} vars  - e.g. { n: 3 }   →  replaces {{n}} with 3
 * @returns {string}
 */
export function t(key, vars) {
  const lang    = _currentLang || DEFAULT_LANG;
  const dict    = _translations[lang] || _translations[DEFAULT_LANG] || {};
  const parts   = key.split('.');
  let   value   = dict;

  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      value = undefined;
      break;
    }
  }

  if (typeof value !== 'string') {
    // Fallback: try default lang, then return key itself
    const fallback = _translations[DEFAULT_LANG] || {};
    let fv = fallback;
    for (const part of parts) {
      fv = fv && typeof fv === 'object' ? fv[part] : undefined;
    }
    value = typeof fv === 'string' ? fv : key;
  }

  // Token substitution  {{varName}} → vars.varName
  if (vars && typeof value === 'string') {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      vars[name] !== undefined ? vars[name] : `{{${name}}}`
    );
  }

  return value;
}

// ── DOM integration ───────────────────────────────────────────────────────────
/**
 * Apply translations to all elements with data-i18n="<key>" in the document.
 * Also updates lang/dir on <html> and renders the language switcher if present.
 */
function _applyToDOM() {
  const lang = _currentLang || DEFAULT_LANG;
  const html  = document.documentElement;

  // Set lang attribute for screen readers / font rendering
  html.setAttribute('lang', lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'en');
  // All supported scripts are LTR
  html.setAttribute('dir', 'ltr');

  // Translate all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key   = el.getAttribute('data-i18n');
    const value = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = value;
    } else {
      el.textContent = value;
    }
  });

  // Update data-i18n-placeholder separately
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  // Update active state on language switcher buttons
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
  });
}

// ── Language Switcher helper ──────────────────────────────────────────────────
/**
 * Inject a three-button language switcher into a given container element.
 * Each button has data-lang-btn attribute for styling.
 *
 * @param {HTMLElement} container
 */
export function renderLangSwitcher(container) {
  if (!container) return;
  container.innerHTML = '';

  const labels = { mr: 'मराठी', hi: 'हिंदी', en: 'EN' };
  SUPPORTED_LANGS.forEach((lang) => {
    const btn = document.createElement('button');
    btn.textContent = labels[lang];
    btn.setAttribute('data-lang-btn', lang);
    btn.className   = 'lang-btn' + (_currentLang === lang ? ' active' : '');
    btn.addEventListener('click', () => setLang(lang));
    container.appendChild(btn);
  });
}
