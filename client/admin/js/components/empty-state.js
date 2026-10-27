/**
 * Mahalaxmi Kirana Store — Empty, Error & Offline State Components
 * Standard bilingual states with working retry triggers.
 */

'use strict';

function formatEmptyIcon(iconStr, defaultKey = 'box') {
  if (!iconStr) iconStr = defaultKey;
  if (typeof iconStr === 'string' && iconStr.includes('<svg')) return iconStr;
  const keyMap = {
    '\u{1F4E6}': 'box',
    '\u26A0\uFE0F': 'warning',
    '\u{1F4F6}': 'wifi-off',
    '\u{1F3F7}\uFE0F': 'tag',
    '\u{1F4CB}': 'list',
    '\u{1F4C2}': 'inbox',
    '\u{1F6D2}': 'cart',
    '\u{1F50D}': 'search',
  };
  const key = keyMap[iconStr] || iconStr;
  return `<svg class="icon icon--2xl" aria-hidden="true"><use href="/images/icons.svg#${key}"></use></svg>`;
}

function renderEmptyState({
  icon = 'box',
  title = 'कोणतीही माहिती नाही / No Data Available',
  description = 'येथे दाखवण्यासाठी कोणतीही नोंद आढळली नाही / No records found to display.',
  actionText = '',
  onAction = null,
}) {
  const container = document.createElement('div');
  container.className = 'empty-state';

  container.innerHTML = `
    <div class="empty-state-icon" style="margin-bottom: 8px;">${formatEmptyIcon(icon, 'box')}</div>
    <div class="empty-state-title" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${window.esc ? window.esc(title) : title}</div>
    <div class="empty-state-desc" style="font-size: 0.875rem; color: var(--text-secondary); max-width: 380px; margin: 0 auto;">${window.esc ? window.esc(description) : description}</div>
  `;

  if (actionText && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.style.marginTop = '16px';
    btn.textContent = actionText;
    btn.onclick = onAction;
    container.appendChild(btn);
  }

  return container;
}

function renderErrorState({
  icon = 'warning',
  title = 'माहिती लोड करण्यात त्रुटी / Failed to Load Data',
  description = 'नेटवर्क किंवा सर्व्हर समस्या आली. कृपया पुन्हा प्रयत्न करा. / Network or server error. Please retry.',
  onRetry = null,
}) {
  const container = document.createElement('div');
  container.className = 'empty-state error-state';
  container.style.padding = '32px 16px';
  container.style.textAlign = 'center';

  container.innerHTML = `
    <div class="empty-state-icon" style="color: var(--color-danger-600); margin-bottom: 8px;">${formatEmptyIcon(icon, 'warning')}</div>
    <div class="empty-state-title" style="font-size: 1.1rem; font-weight: 700; color: var(--color-danger-700); margin-bottom: 4px;">${window.esc ? window.esc(title) : title}</div>
    <div class="empty-state-desc" style="font-size: 0.875rem; color: var(--text-secondary); max-width: 380px; margin: 0 auto 16px;">${window.esc ? window.esc(description) : description}</div>
  `;

  if (typeof onRetry === 'function') {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-primary';
    retryBtn.innerHTML = '<svg class="icon icon--sm" aria-hidden="true" style="margin-right:4px;"><use href="/images/icons.svg#refresh"></use></svg> पुन्हा प्रयत्न करा / Retry';
    retryBtn.onclick = (e) => {
      e.preventDefault();
      onRetry();
    };
    container.appendChild(retryBtn);
  }

  return container;
}

function renderOfflineState({
  title = 'आपण ऑफलाइन आहात / You are Offline',
  description = 'इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा. / Check your internet connection and try again.',
  onRetry = null,
} = {}) {
  return renderErrorState({
    icon: 'wifi-off',
    title,
    description,
    onRetry: onRetry || (() => window.location.reload()),
  });
}

window.AdminEmptyState = {
  render: renderEmptyState,
  create: renderEmptyState,
  renderError: renderErrorState,
  renderOffline: renderOfflineState,
};
