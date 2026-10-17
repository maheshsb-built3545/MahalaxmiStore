/**
 * Mahalaxmi Kirana Store — Filter Bar Component
 * Debounced search (250ms) + horizontally scrollable chip filters.
 */

'use strict';

class FilterBar {
  static create(options = {}) {
    const inst = new FilterBar(options);
    return inst.element || inst.container;
  }

  constructor(options = {}) {
    this.element = document.createElement('div');
    this.container = (typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container) || this.element;

    this.placeholder = options.placeholder || options.searchPlaceholder || 'शोधा / Search...';
    this.chips = options.chips || []; // [{ id, label, active }]
    this.activeChipId = options.activeChipId || (this.chips.find(c => c.active)?.id || (this.chips[0] ? this.chips[0].id : null));
    this.onSearch = options.onSearch || null;
    this.onChipSelect = options.onChipSelect || options.onFilterChange || null;

    this.debounceTimer = null;
    this.render();
  }

  render() {
    if (!this.container) this.container = this.element;
    this.container.className = 'filter-bar';
    this.container.innerHTML = `
      <div class="filter-search-wrap">
        <span class="search-icon-left">🔍</span>
        <input
          type="search"
          class="filter-search-input"
          id="filterSearchInput"
          placeholder="${window.esc ? window.esc(this.placeholder) : this.placeholder}"
          autocomplete="off"
          aria-label="Search"
        />
        <button type="button" class="search-clear-btn" id="filterSearchClear" style="display:none;" aria-label="Clear search">✕</button>
      </div>
      ${this.chips.length ? `
        <div class="chip-scroll-row" id="filterChipRow">
          ${this.chips.map((chip) => `
            <button
              type="button"
              class="chip ${chip.id === this.activeChipId ? 'active' : ''}"
              data-chip-id="${chip.id}"
            >
              ${chip.icon ? `<span>${chip.icon}</span>` : ''}
              <span>${window.esc ? window.esc(chip.label) : chip.label}</span>
              ${chip.count !== undefined ? `<span style="font-size:0.75rem;opacity:0.7;">(${chip.count})</span>` : ''}
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    const input = this.container.querySelector('#filterSearchInput');
    const clearBtn = this.container.querySelector('#filterSearchClear');
    const chipRow = this.container.querySelector('#filterChipRow');

    if (input) {
      input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          if (typeof this.onSearch === 'function') {
            this.onSearch(val);
          }
        }, 250);
      });
    }

    if (clearBtn && input) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        input.focus();
        if (typeof this.onSearch === 'function') {
          this.onSearch('');
        }
      });
    }

    if (chipRow) {
      chipRow.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn || !btn.dataset.chipId) return;

        const chipId = btn.dataset.chipId;
        this.activeChipId = chipId;

        chipRow.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.chipId === chipId);
        });

        if (typeof this.onChipSelect === 'function') {
          this.onChipSelect(chipId);
        }
      });
    }
  }

  setChipCount(chipId, count) {
    const btn = this.container ? this.container.querySelector(`[data-chip-id="${chipId}"]`) : null;
    if (btn) {
      let countSpan = btn.querySelector('span:last-child');
      if (countSpan && countSpan.textContent.startsWith('(')) {
        countSpan.textContent = `(${count})`;
      }
    }
  }
}

window.AdminFilterBar = FilterBar;
