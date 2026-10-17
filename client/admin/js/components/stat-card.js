/**
 * Mahalaxmi Kirana Store — Stat Card Component
 */

'use strict';

function renderStatCard({ label, value, delta = null, note = '', icon = '', onClick = null }) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  if (typeof onClick === 'function') {
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

  card.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="stat-card-label">${window.esc ? window.esc(label) : label}</span>
      ${icon ? `<span style="font-size: 1.25rem;">${icon}</span>` : ''}
    </div>
    <div class="stat-card-value">${window.esc ? window.esc(value) : value}</div>
    ${deltaHtml || (note ? `<div class="text-xs text-muted">${window.esc ? window.esc(note) : note}</div>` : '')}
  `;

  return card;
}

window.AdminStatCard = { render: renderStatCard, create: renderStatCard };
