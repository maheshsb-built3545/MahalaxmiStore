/**
 * Mahalaxmi Kirana Store — Toast Notification Queue
 * Accessible with role="status", auto-dismiss, and queueing.
 */

'use strict';

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
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
 * Show a toast notification.
 * @param {string} message - Bilingual message
 * @param {'success'|'danger'|'warning'|'info'} variant
 * @param {number} durationMs
 */
function show(message, variant = 'info', durationMs = 4000) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;

  const iconMap = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const iconSpan = document.createElement('span');
  iconSpan.textContent = iconMap[variant] || 'ℹ️';

  const textSpan = document.createElement('span');
  textSpan.style.flex = '1';
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#ffffff';
  closeBtn.style.opacity = '0.7';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '0 4px';
  closeBtn.onclick = () => dismissToast(toast);

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  if (durationMs > 0) {
    setTimeout(() => dismissToast(toast), durationMs);
  }
}

function dismissToast(toastEl) {
  if (!toastEl || !toastEl.parentNode) return;
  toastEl.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
  toastEl.style.opacity = '0';
  toastEl.style.transform = 'translateY(10px)';
  setTimeout(() => {
    if (toastEl.parentNode) {
      toastEl.parentNode.removeChild(toastEl);
    }
  }, 200);
}

window.AdminToast = { show, dismiss: dismissToast };
window.showToast = (msg, type) => show(msg, type === 'error' ? 'danger' : (type || 'info'));
