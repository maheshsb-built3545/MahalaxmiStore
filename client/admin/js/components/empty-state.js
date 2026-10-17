/**
 * Mahalaxmi Kirana Store — Empty State Component
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
    <div class="empty-state-icon">${icon}</div>
    <div class="empty-state-title">${window.esc ? window.esc(title) : title}</div>
    <div class="empty-state-desc">${window.esc ? window.esc(description) : description}</div>
  `;

  if (actionText && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.style.marginTop = '12px';
    btn.textContent = actionText;
    btn.onclick = onAction;
    container.appendChild(btn);
  }

  return container;
}

window.AdminEmptyState = { render: renderEmptyState };
