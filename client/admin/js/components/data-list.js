/**
 * Mahalaxmi Kirana Store — Responsive Data List
 * Renders high-density table on desktop (>= 768px) and touch-friendly cards on mobile (< 768px).
 */

'use strict';

class ResponsiveDataList {
  constructor(options = {}) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container;

    this.columns = options.columns || [];
    this.items = options.items || [];
    this.renderCard = options.renderCard || this.defaultRenderCard.bind(this);
    this.emptyMessage = options.emptyMessage || 'कोणतीही नोंद सापडली नाही / No records found';
    this.emptyIcon = options.emptyIcon || '📂';
    this.pagination = options.pagination || null; // { page, totalPages, onPageChange }

    if (this.container) {
      this.render();
    }
  }

  setItems(items, pagination = null) {
    this.items = items || [];
    if (pagination) this.pagination = pagination;
    this.render();
  }

  defaultRenderCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';

    this.columns.forEach((col, idx) => {
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center text-sm';

      const label = document.createElement('span');
      label.className = 'text-muted';
      label.textContent = col.label || col.field;

      const val = document.createElement('span');
      if (typeof col.render === 'function') {
        const rendered = col.render(item[col.field], item);
        if (rendered instanceof Node) val.appendChild(rendered);
        else val.innerHTML = rendered;
      } else {
        val.textContent = item[col.field] ?? '—';
      }

      row.appendChild(label);
      row.appendChild(val);
      card.appendChild(row);
    });

    return card;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (!this.items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-state-icon">${this.emptyIcon}</div>
        <div class="empty-state-title">${this.emptyMessage}</div>
      `;
      this.container.appendChild(empty);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'data-list-container';

    // 1. Desktop Table (>= 768px)
    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    this.columns.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.align) th.style.textAlign = col.align;
      if (col.width) th.style.width = col.width;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.items.forEach((item) => {
      const tr = document.createElement('tr');
      this.columns.forEach((col) => {
        const td = document.createElement('td');
        if (col.align) td.style.textAlign = col.align;

        if (typeof col.render === 'function') {
          const rendered = col.render(item[col.field], item);
          if (rendered instanceof Node) td.appendChild(rendered);
          else td.innerHTML = rendered;
        } else {
          td.textContent = item[col.field] ?? '—';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);

    // 2. Mobile Cards (< 768px)
    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'data-cards';
    this.items.forEach((item) => {
      const cardEl = this.renderCard(item);
      if (cardEl instanceof Node) cardsWrap.appendChild(cardEl);
      else {
        const div = document.createElement('div');
        div.innerHTML = cardEl;
        cardsWrap.appendChild(div.firstElementChild);
      }
    });
    wrapper.appendChild(cardsWrap);

    this.container.appendChild(wrapper);

    // 3. Pagination Controls
    if (this.pagination && this.pagination.totalPages > 1) {
      this.renderPagination();
    }
  }

  renderPagination() {
    const { page, totalPages, onPageChange } = this.pagination;
    const paginEl = document.createElement('div');
    paginEl.style.display = 'flex';
    paginEl.style.alignItems = 'center';
    paginEl.style.justifyContent = 'center';
    paginEl.style.gap = '8px';
    paginEl.style.marginTop = '16px';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-sm btn-secondary';
    prevBtn.innerHTML = '← Prev / मागे';
    prevBtn.disabled = page <= 1;
    prevBtn.onclick = () => onPageChange(page - 1);

    const info = document.createElement('span');
    info.className = 'text-sm text-muted';
    info.textContent = `पान ${page} / ${totalPages} (Page ${page} of ${totalPages})`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-sm btn-secondary';
    nextBtn.innerHTML = 'Next / पुढे →';
    nextBtn.disabled = page >= totalPages;
    nextBtn.onclick = () => onPageChange(page + 1);

    paginEl.appendChild(prevBtn);
    paginEl.appendChild(info);
    paginEl.appendChild(nextBtn);
    this.container.appendChild(paginEl);
  }
}

window.AdminDataList = ResponsiveDataList;
