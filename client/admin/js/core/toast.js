/**
 * Mahalaxmi Kirana Store — Toast Notification Queue
 * Accessible with role="status", auto-dismiss, one at a time, no doubled icons.
 */

'use strict';

let toastContainer = null;
let activeToastEl = null;
let dismissTimer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('role', 'status');
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

/**
 * Show a toast notification (one at a time, no duplicate icons).
 * @param {string} message - Bilingual message
 * @param {'success'|'danger'|'error'|'warning'|'info'} variant
 * @param {number} durationMs
 */
function show(message, variant = 'info', durationMs = 4000) {
  const container = ensureToastContainer();

  // Normalized variant: map 'error' to 'danger'
  const normVariant = variant === 'error' ? 'danger' : variant;

  // Rule: One toast at a time. Dismiss current if visible.
  if (activeToastEl) {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissToast(activeToastEl, true);
  }

  const iconMap = {
    success: '✅',
    danger: '❌',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  // Strip leading emojis from message text to avoid doubled icons (e.g. "❌ ❌ Route not found")
  let cleanMessage = String(message || '').trim();
  const leadingEmojiRegex = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}✅❌⚠️ℹ️🛑🚨]+)\s*/u;
  cleanMessage = cleanMessage.replace(leadingEmojiRegex, '').trim();

  const toast = document.createElement('div');
  toast.className = `toast toast-${normVariant}`;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.textContent = iconMap[normVariant] || 'ℹ️';

  const textSpan = document.createElement('span');
  textSpan.className = 'toast-text';
  textSpan.style.flex = '1';
  textSpan.textContent = cleanMessage;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close toast');
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#ffffff';
  closeBtn.style.opacity = '0.85';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '0 6px';
  closeBtn.style.minHeight = '32px';
  closeBtn.style.minWidth = '32px';
  closeBtn.onclick = () => dismissToast(toast);

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);

  container.appendChild(toast);
  activeToastEl = toast;

  if (durationMs > 0) {
    dismissTimer = setTimeout(() => dismissToast(toast), durationMs);
  }
}

function dismissToast(toastEl, immediate = false) {
  if (!toastEl) return;
  if (activeToastEl === toastEl) {
    activeToastEl = null;
  }
  if (immediate) {
    if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    return;
  }
  toastEl.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
  toastEl.style.opacity = '0';
  toastEl.style.transform = 'translateY(10px)';
  setTimeout(() => {
    if (toastEl.parentNode) {
      toastEl.parentNode.removeChild(toastEl);
    }
  }, 200);
}

window.AdminToast = {
  show,
  success: (msg, dur) => show(msg, 'success', dur),
  error: (msg, dur) => show(msg, 'danger', dur),
  info: (msg, dur) => show(msg, 'info', dur),
  warning: (msg, dur) => show(msg, 'warning', dur),
  dismiss: dismissToast,
};

window.showToast = (msg, type, dur) => show(msg, type || 'info', dur);
