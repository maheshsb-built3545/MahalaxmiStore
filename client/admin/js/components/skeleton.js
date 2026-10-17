/**
 * Mahalaxmi Kirana Store — Skeleton Loading Placeholders
 */

'use strict';

function renderStatsSkeleton(count = 4) {
  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
  container.style.gap = '16px';
  container.style.marginBottom = '20px';

  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="skeleton" style="height: 14px; width: 60%; margin-bottom: 8px;"></div>
      <div class="skeleton" style="height: 32px; width: 40%; margin-bottom: 8px;"></div>
      <div class="skeleton" style="height: 12px; width: 75%;"></div>
    `;
    container.appendChild(card);
  }
  return container;
}

function renderCardsSkeleton(count = 5) {
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-3';

  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="skeleton" style="width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;"></div>
        <div class="flex-1">
          <div class="skeleton" style="height: 16px; width: 70%; margin-bottom: 6px;"></div>
          <div class="skeleton" style="height: 12px; width: 40%;"></div>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
  return container;
}

function cardList(count = 4) {
  let html = '<div class="flex flex-col gap-3" style="display:flex;flex-direction:column;gap:12px;">';
  for (let i = 0; i < count; i++) {
    html += `
      <div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="skeleton" style="width:44px;height:44px;border-radius:var(--radius-sm);flex-shrink:0;"></div>
          <div style="flex:1;">
            <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
            <div class="skeleton" style="height:12px;width:35%;"></div>
          </div>
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

function tableRows(rows = 5, cols = 4) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += '<td style="padding:12px;"><div class="skeleton" style="height:14px;width:80%;"></div></td>';
    }
    html += '</tr>';
  }
  return html;
}

window.AdminSkeleton = {
  renderStats: renderStatsSkeleton,
  renderCards: renderCardsSkeleton,
  cardList,
  tableRows,
};
