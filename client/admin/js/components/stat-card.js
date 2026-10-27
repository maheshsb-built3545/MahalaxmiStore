/**
 * Mahalaxmi Kirana Store — Stat Card Component
 * Tappable KPI card with optional deep-link href or onClick.
 */

'use strict';

function renderStatCard({ label, value, delta = null, note = '', icon = '', onClick = null, href = '' }) {
  const card = document.createElement(href ? 'a' : 'div');
  card.className = 'stat-card';
  if (href) {
    card.href = href;
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';
    card.style.display = 'block';
    card.style.cursor = 'pointer';
  } else if (typeof onClick === 'function') {
    card.style.cursor = 'pointer';
    card.onclick = onClick;
  }

  let deltaHtml = '';
  if (delta) {
    const isUp = delta.direction === 'up';
    const isDown = delta.direction === 'down';
    const cls = isUp ? 'delta-up' : isDown ? 'delta-down' : 'delta-neutral';
    const arrow = isUp ? '↑' : isDown ? '↓' : '';
    deltaHtml = `<span class="stat-card-delta ${cls}">${arrow} ${window.esc ? window.esc(delta.text) : delta.text}</span>`;
  }

  let iconHtml = '';
  if (icon) {
    if (typeof icon === 'string' && icon.includes('<svg')) {
      iconHtml = icon;
    } else {
      iconHtml = `<svg class="icon icon--lg" aria-hidden="true"><use href="/images/icons.svg#${icon}"></use></svg>`;
    }
  }

  card.innerHTML = `
    <div class="flex items-center justify-between" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span class="stat-card-label" style="font-size:0.825rem;font-weight:600;color:var(--text-secondary);">${window.esc ? window.esc(label) : label}</span>
      ${iconHtml ? `<span class="stat-card-icon" style="display:inline-flex;align-items:center;color:var(--text-secondary);">${iconHtml}</span>` : ''}
    </div>
    <div class="stat-card-value" style="font-size:1.4rem;font-weight:800;color:var(--text-primary);margin-bottom:4px;">${window.esc ? window.esc(value) : value}</div>
    ${deltaHtml || (note ? `<div class="text-xs text-muted" style="font-size:0.75rem;color:var(--text-muted);">${window.esc ? window.esc(note) : note}</div>` : '')}
  `;

  return card;
}

window.AdminStatCard = { render: renderStatCard, create: renderStatCard };
