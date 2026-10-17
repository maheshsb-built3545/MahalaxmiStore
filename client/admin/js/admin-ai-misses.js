/**
 * frontend/admin/js/admin-ai-misses.js
 *
 * R4 — AI Miss Analysis & Alias Management Controller (AI-08)
 */

let _catalogProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderAdminNavigation('ai-misses');
  document.getElementById('aliasForm')?.addEventListener('submit', handleSaveAlias);

  await Promise.all([loadCatalogProducts(), loadAiMisses()]);
});

async function loadCatalogProducts() {
  try {
    const res = await adminFetch('/products?limit=500');
    if (res.success && res.data) {
      _catalogProducts = res.data;
      const select = document.getElementById('aliasProductSelect');
      if (select) {
        select.innerHTML = '<option value="">उत्पादन निवडा (Choose product)...</option>';
        _catalogProducts.forEach((p) => {
          const opt = document.createElement('option');
          opt.value = p._id;
          opt.textContent = `${p.nameMr || ''} (${p.nameEn}) - ₹${p.price}`;
          select.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.warn('Could not load products for alias selection:', err.message);
  }
}

async function loadAiMisses() {
  const tbody = document.getElementById('missesTableBody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#64748b;">माहिती लोड होत आहे...</td></tr>';

  try {
    const res = await adminFetch('/ai/misses');
    if (!res.success) throw new Error(res.message);

    renderMissesTable(res.data);
  } catch (err) {
    console.error('Failed to load misses:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#ef4444;">${escapeHtml(err.message)}</td></tr>`;
  }
}

let missesTableListenerAttached = false;

function renderMissesTable(misses) {
  const tbody = document.getElementById('missesTableBody');
  tbody.innerHTML = '';

  if (!missesTableListenerAttached) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-open-alias');
      if (btn && btn.dataset.phrase) {
        openAliasModal(btn.dataset.phrase);
      }
    });
    missesTableListenerAttached = true;
  }

  if (!misses || misses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#059669;">🎉 उत्तम! कॅटलॉगमध्ये सर्व ग्राहकांचे शब्द ओळखले जात आहेत. कोणताही न सापडलेला शब्द नाही.</td></tr>';
    return;
  }

  misses.forEach((m) => {
    const tr = document.createElement('tr');
    const dt = m.lastRequested
      ? new Date(m.lastRequested).toLocaleDateString('mr-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

    tr.innerHTML = `
      <td>
        <strong style="font-size:1.05rem;color:#04251a;">"${escapeHtml(m.phrase)}"</strong>
      </td>
      <td>
        <span style="font-weight:800;color:#b45309;font-size:1.1rem;background:#fef3c7;padding:3px 10px;border-radius:12px;">
          ${m.frequency} वेळा
        </span>
      </td>
      <td style="font-size:0.82rem;color:#64748b;">${dt}</td>
      <td>
        <button type="button" class="btn btn-secondary btn-sm btn-open-alias" data-phrase="${escapeHtml(m.phrase)}">
          + पर्यायी नाव जोडा (Add Alias)
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAliasModal(phrase) {
  document.getElementById('aliasPhraseInput').value = phrase;
  document.getElementById('aliasProductSelect').value = '';
  document.getElementById('aliasModal').style.display = 'flex';
}

function closeAliasModal() {
  document.getElementById('aliasModal').style.display = 'none';
}

async function handleSaveAlias(e) {
  e.preventDefault();
  const aliasPhrase = document.getElementById('aliasPhraseInput').value.trim();
  const productId = document.getElementById('aliasProductSelect').value;
  const saveBtn = document.getElementById('saveAliasBtn');

  if (!productId) {
    alert('कृपया उत्पादन निवडा.');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'जतन करत आहे...';

  try {
    const res = await adminFetch('/admin/ai/add-alias', {
      method: 'POST',
      body: JSON.stringify({ productId, aliasPhrase }),
    });

    if (!res.success) throw new Error(res.message);

    closeAliasModal();
    alert(`यशस्वी! "${aliasPhrase}" हे पर्यायी नाव कॅटलॉगमधील उत्पादनाला जोडले गेले!`);
    await loadAiMisses();
  } catch (err) {
    alert(`Alias save error: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '✓ पर्यायी नाव जोडा (Save Alias)';
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAliasModal();
});
