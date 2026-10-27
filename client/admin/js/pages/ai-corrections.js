/**
 * Mahalaxmi Kirana Store — AI Corrections & Synonym Mapping Page
 * Specs: 3.8 AI Corrections (AI misses)
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('ai-corrections-page-root');
  if (!root) return;

  let misses = [];
  let searchQuery = '';
  let isLoading = false;

  async function init() {
    AdminShell.init('ai-corrections');
    renderPageSkeleton();
    await loadMisses();
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="margin-bottom:16px;">
        <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
          ${t('nav_ai_corrections')}
        </h1>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
          ग्राहकांनी AI बॉक्समध्ये लिहिलेले पण कॅटलॉगमध्ये न सापडलेले शब्द / Unmatched search phrases from customer lists
        </p>
      </div>

      <!-- Explanatory Help Card -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;">
        <span style="display:inline-flex;align-items:center;margin-top:2px;"><svg class="icon" style="width:28px;height:28px;color:#166534;"><use href="/images/icons.svg#sparkles"></use></svg></span>
        <div style="font-size:0.85rem;color:#166534;line-height:1.5;">
          <strong>कॅटलॉग समृद्ध करणे (Catalog Expansion):</strong><br>
          येसगाव व कोपरगावातील ग्राहक घरगुती भाषेत किंवा स्थानिक उच्चारात किराणा वस्तूंची नावे लिहितात. येथे दिसणारे न सापडलेले शब्द थेट संबंधित उत्पादनाला <strong>पर्यायी नाव (Alias)</strong> म्हणून जोडल्यास, पुढच्या वेळी AI ऑर्डर बॉक्स ते उत्पादन क्षणात अचूक ओळखेल!
        </div>
      </div>

      <!-- Search Bar -->
      <div style="margin-bottom:16px;" id="ai-filter-container">
        <input type="text" id="input-search-miss" class="input" placeholder="न सापडलेला शब्द शोधा... / Search missed phrase..." style="height:44px;font-size:0.9rem;" />
      </div>

      <!-- Misses Container -->
      <div id="ai-misses-container">
        ${AdminSkeleton.cardList(4)}
      </div>
    `;

    document.getElementById('input-search-miss')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderMissesList();
    });
  }

  async function loadMisses() {
    isLoading = true;
    try {
      const res = await AdminAPI.get('/api/ai/misses');
      if (res.success && res.data) {
        misses = res.data || [];
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    } finally {
      isLoading = false;
      renderMissesList();
    }
  }

  function renderMissesList() {
    const container = document.getElementById('ai-misses-container');
    if (!container) return;

    let filtered = misses;
    if (searchQuery) {
      filtered = misses.filter((m) => (m.phrase || '').toLowerCase().includes(searchQuery));
    }

    if (filtered.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        AdminEmptyState.create({
          title: t('no_ai_misses'),
          description: searchQuery
            ? 'शोधलेला शब्द यादीत सापडला नाही / No matches found'
            : 'सध्या सर्व शोधलेले शब्द कॅटलॉगशी जुळलेले आहेत! / All customer queries matched successfully!',
        })
      );
      return;
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 320px), 1fr));gap:12px;" class="misses-grid"></div>
    `;
    const grid = container.querySelector('.misses-grid');

    filtered.forEach((m) => {
      grid.appendChild(createMissCard(m));
    });
  }

  function createMissCard(m) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'min-width:0;padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);display:flex;flex-direction:column;justify-content:space-between;gap:12px;box-sizing:border-box;';

    const phrase = m.phrase || '';
    const frequency = m.frequency || 1;
    const lastDate = m.lastRequested ? AdminFormat.date(m.lastRequested) : 'अलीकडे';

    card.innerHTML = `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <h3 style="font-size:1.15rem;font-weight:800;color:var(--text);margin:0;word-break:break-word;">
            "${AdminDOM.escape(phrase)}"
          </h3>
          <span class="badge badge-warning" style="font-size:0.75rem;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">
            <svg class="icon icon-sm"><use href="/images/icons.svg#trending-up"></use></svg> ${frequency} वेळा / times
          </span>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin:0;">
          शेवटचा शोध: ${lastDate}
        </p>
      </div>

      <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary btn-map-alias" style="flex:1 1 180px;min-height:44px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#tag"></use></svg> पर्यायी नाव जोडा / Map Alias
        </button>
        <button type="button" class="btn btn-secondary btn-ignore" style="flex:1 1 90px;min-height:44px;font-size:0.82rem;font-weight:600;color:var(--text-muted);">
          दुर्लक्ष / Ignore
        </button>
      </div>
    `;

    card.querySelector('.btn-map-alias')?.addEventListener('click', () => openMapAliasModal(m));
    card.querySelector('.btn-ignore')?.addEventListener('click', () => ignoreMissedPhrase(m));

    return card;
  }

  // ── Ignore Missed Phrase ──
  async function ignoreMissedPhrase(m) {
    try {
      const res = await AdminAPI.post('/api/admin/ai/ignore-miss', { phrase: m.phrase });
      if (res.success) {
        AdminToast.success(`"${m.phrase}" दुर्लक्ष केले / Phrase ignored`);
        misses = misses.filter((item) => item.phrase !== m.phrase);
        renderMissesList();
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    }
  }

  // ── Map Alias to Product BottomSheet / Modal ──
  function openMapAliasModal(m) {
    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:14px;">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--text);display:flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#tag"></use></svg> पर्यायी नाव जोडा (Map Product Alias)
        </h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
          शब्द: <strong style="color:var(--primary);font-size:1.05rem;">"${AdminDOM.escape(m.phrase)}"</strong>
        </p>
      </div>

      <!-- Live Product Search Input -->
      <div class="form-group" style="margin-bottom:14px;">
        <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
          संबंधित उत्पादन शोधा (Search Target Product) *
        </label>
        <input type="text" id="input-alias-product-search" class="input" placeholder="उदा. साखर, तेल, बिस्कीट..." style="height:44px;font-size:0.9rem;" autofocus />
      </div>

      <!-- Product Results Container -->
      <div id="alias-product-results" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem;">
          उत्पादन शोधण्यासाठी नाव टाइप करा / Type product name to search
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" id="btn-close-alias-sheet" style="min-height:44px;">
          ${t('cancel')}
        </button>
      </div>
    `;

    const sheet = AdminBottomSheet.open({ content: sheetContent });
    sheetContent.querySelector('#btn-close-alias-sheet')?.addEventListener('click', () => sheet.close());

    const searchInput = sheetContent.querySelector('#input-alias-product-search');
    const resultsContainer = sheetContent.querySelector('#alias-product-results');
    let searchTimeout = null;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      if (!query) {
        resultsContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem;">उत्पादन शोधण्यासाठी नाव टाइप करा / Type product name to search</div>';
        return;
      }

      searchTimeout = setTimeout(async () => {
        resultsContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem;">शोधत आहे... / Searching...</div>';
        try {
          const res = await AdminAPI.get(`/api/admin/products?search=${encodeURIComponent(query)}&limit=15`);
          if (res.success && res.data && res.data.length > 0) {
            renderProductSearchResults(resultsContainer, res.data, m, sheet);
          } else {
            resultsContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem;">कोणतेही उत्पादन सापडले नाही / No products found</div>';
          }
        } catch (err) {
          resultsContainer.innerHTML = `<div style="padding:12px;color:var(--danger);font-size:0.85rem;">${err.message || t('error_generic')}</div>`;
        }
      }, 250);
    });
  }

  function renderProductSearchResults(container, products, m, sheet) {
    container.innerHTML = '';
    products.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'product-search-item';
      item.style.cssText = 'padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface);display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:border-color 0.15s;';

      const existingAliases = Array.isArray(p.aliases) ? p.aliases.join(', ') : '';

      item.innerHTML = `
        <div style="flex:1;">
          <div style="font-weight:700;font-size:0.9rem;color:var(--text);">
            ${AdminDOM.escape(p.nameMr || p.nameEn)} <span style="font-size:0.8rem;font-weight:normal;color:var(--text-muted);">(${AdminDOM.escape(p.nameEn)})</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">
            पॅक: ${AdminDOM.escape(p.packSize || '')} • किंमत: ${AdminFormat.currency(p.price)}
            ${existingAliases ? ` • पर्यायी: <span style="color:var(--primary);">${AdminDOM.escape(existingAliases)}</span>` : ''}
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" style="min-height:36px;font-size:0.75rem;font-weight:700;margin-left:8px;flex-shrink:0;">
          + जोडा / Map
        </button>
      `;

      item.addEventListener('click', async () => {
        const btn = item.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'जोडत आहे...';

        try {
          const res = await AdminAPI.post('/api/admin/ai/add-alias', {
            productId: p._id,
            aliasPhrase: m.phrase,
          });

          if (res.success) {
            AdminToast.success(`"${m.phrase}" पर्यायी नाव म्हणून जोडले! / Alias added successfully!`);
            sheet.close();
            // Remove from misses list
            misses = misses.filter((item) => item.phrase !== m.phrase);
            renderMissesList();
          }
        } catch (err) {
          AdminToast.error(err.message || t('error_generic'));
          btn.disabled = false;
          btn.textContent = '+ जोडा / Map';
        }
      });

      container.appendChild(item);
    });
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
