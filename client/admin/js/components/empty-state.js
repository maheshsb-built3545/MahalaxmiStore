/**
 * Mahalaxmi Kirana Store — Empty, Error & Offline State Components
 * Standard bilingual states with working retry triggers.
 */

'use strict';

function renderEmptyState({
  icon = '📦',
  title = 'कोणतीही माहिती नाही / No Data Available',
  description = 'येथे दाखवण्यासाठी कोणतीही नोंद आढळली नाही / No records found to display.',
  actionText = '',
  onAction = null,
}) {
  const container = document.createElement('div');
  container.className = 'empty-state';

  container.innerHTML = `
    <div class="empty-state-icon" style="font-size: 2.75rem; margin-bottom: 8px;">${icon}</div>
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
  icon = '⚠️',
  title = 'माहिती लोड करण्यात त्रुटी / Failed to Load Data',
  description = 'नेटवर्क किंवा सर्व्हर समस्या आली. कृपया पुन्हा प्रयत्न करा. / Network or server error. Please retry.',
  onRetry = null,
}) {
  const container = document.createElement('div');
  container.className = 'empty-state error-state';
  container.style.padding = '32px 16px';
  container.style.textAlign = 'center';

  container.innerHTML = `
    <div class="empty-state-icon" style="font-size: 2.75rem; color: var(--color-danger-600); margin-bottom: 8px;">${icon}</div>
    <div class="empty-state-title" style="font-size: 1.1rem; font-weight: 700; color: var(--color-danger-700); margin-bottom: 4px;">${window.esc ? window.esc(title) : title}</div>
    <div class="empty-state-desc" style="font-size: 0.875rem; color: var(--text-secondary); max-width: 380px; margin: 0 auto 16px;">${window.esc ? window.esc(description) : description}</div>
  `;

  if (typeof onRetry === 'function') {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-primary';
    retryBtn.innerHTML = '🔄 पुन्हा प्रयत्न करा / Retry';
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
    icon: '📶',
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
