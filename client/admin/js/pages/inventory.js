/**
 * Mahalaxmi Kirana Store — Inventory Management Controller
 * Merges: Stock-In (Multi-item cart, cost rate, camera barcode scan),
 * Alerts (Out of stock, Low stock, Near expiry, Supplier reorder generator),
 * and Log & Adjust (reason codes: damage, theft, return, correction, expiry).
 */

'use strict';

let currentInventoryTab = 'stock-in'; // 'stock-in' | 'alerts' | 'log'
let lowStockItems = [];
let nearExpiryItems = [];
let receiveCart = new Map(); // productId -> { product, quantity, costPrice, expiryDate, supplier, invoiceNo }
let stockLogPage = 1;
let barcodeStream = null;

document.addEventListener('DOMContentLoaded', () => {
  window.shell = new window.AdminShell({
    activeRoute: 'inventory',
    pageTitle: 'स्टॉक व माल / Inventory',
  });

  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  if (tab === 'alerts') currentInventoryTab = 'alerts';
  else if (tab === 'log') currentInventoryTab = 'log';
  else currentInventoryTab = 'stock-in';

  initInventoryTabs();
  initStockInSearch();
  loadCurrentTab();
});

function initInventoryTabs() {
  const tabs = ['stock-in', 'alerts', 'log'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tabBtn_${t}`);
    if (btn) {
      btn.onclick = () => switchInventoryTab(t);
    }
  });
  updateInventoryTabUi();
}

function switchInventoryTab(tab) {
  currentInventoryTab = tab;
  updateInventoryTabUi();
  loadCurrentTab();
}

function updateInventoryTabUi() {
  const tabs = ['stock-in', 'alerts', 'log'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tabBtn_${t}`);
    const view = document.getElementById(`tabView_${t}`);
    if (btn) btn.classList.toggle('active', currentInventoryTab === t);
    if (view) view.style.display = currentInventoryTab === t ? 'block' : 'none';
  });
}

function loadCurrentTab() {
  if (currentInventoryTab === 'stock-in') {
    renderReceiveCart();
  } else if (currentInventoryTab === 'alerts') {
    loadAlertsData();
  } else if (currentInventoryTab === 'log') {
    loadStockLogs();
  }
}

// ── 1. STOCK-IN: SEARCH & RECEIVE CART ──
function initStockInSearch() {
  const searchInput = document.getElementById('inventoryProductSearch');
  const resultsContainer = document.getElementById('inventorySearchResults');
  const scanBtn = document.getElementById('cameraScanBtn');
  let debounceTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const q = e.target.value.trim();
      if (!q) {
        if (resultsContainer) resultsContainer.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(() => searchInventoryProducts(q), 250);
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener('click', () => startBarcodeScan());
  }
}

async function searchInventoryProducts(q) {
  const container = document.getElementById('inventorySearchResults');
  if (!container) return;

  try {
    const res = await window.AdminAPI.get(`/admin/products?search=${encodeURIComponent(q)}&limit=8`);
    const products = res.data || [];

    if (!products.length) {
      container.innerHTML = `<p class="text-sm text-muted" style="padding:12px;text-align:center;">कोणतेही उत्पादन सापडले नाही / No products found</p>`;
      return;
    }

    container.innerHTML = products.map((p) => {
      const stock = p.stockQuantity ?? 0;
      const rl = p.reorderLevel ?? 5;
      const badgeCls = stock === 0 ? 'badge-danger' : stock <= rl ? 'badge-warning' : 'badge-success';
      const badgeTxt = stock === 0 ? 'साठा संपला / Out' : `${stock} ${p.unitType || 'pcs'}`;

      return `
        <div class="product-search-item" data-id="${p._id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#ffffff;border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:6px;cursor:pointer;">
          <div style="flex:1;">
            <div style="font-weight:700;">${window.esc(p.nameMr || p.nameEn)}</div>
            <div class="text-xs text-muted">${window.esc(p.nameEn)} — ${window.esc(p.packSize)} • ₹${p.price}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="badge ${badgeCls}">${badgeTxt}</span>
            <button type="button" class="btn btn-sm btn-primary" onclick="addProductToReceiveCart('${p._id}')">➕ निवडा / Add</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-muted">Error: ${window.esc(err.message)}</p>`;
  }
}

window.addProductToReceiveCart = async (productId) => {
  try {
    const res = await window.AdminAPI.get(`/admin/products/${productId}`);
    const p = res.data;
    if (!p) return;

    if (!receiveCart.has(p._id)) {
      receiveCart.set(p._id, {
        product: p,
        quantity: 10,
        costPrice: p.costPrice || Math.round(p.price * 0.85), // Default suggested wholesale cost
        expiryDate: '',
        supplier: '',
        invoiceNo: '',
      });
    }

    // Clear search
    const searchInput = document.getElementById('inventoryProductSearch');
    const resultsContainer = document.getElementById('inventorySearchResults');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.innerHTML = '';

    renderReceiveCart();
    if (window.AdminToast) {
      window.AdminToast.show(`📥 ${p.nameMr || p.nameEn} साठ्यात जोडण्यासाठी निवडले`, 'info', 2000);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

function renderReceiveCart() {
  const container = document.getElementById('receiveCartContainer');
  const submitBtn = document.getElementById('submitReceiveCartBtn');
  if (!container) return;

  const items = Array.from(receiveCart.values());
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px 12px;background:#ffffff;border-radius:14px;border:1px dashed var(--border-strong);">
        <div class="empty-state-icon">📥</div>
        <div class="empty-state-title">स्टॉक भरण्यासाठी वरील शोधपेटीतून उत्पादन निवडा</div>
        <div class="empty-state-desc">Search products above or use barcode scanner to add incoming delivery.</div>
      </div>
    `;
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (submitBtn) submitBtn.disabled = false;

  let totalEstimatedCost = 0;

  container.innerHTML = `
    <div class="flex flex-col gap-3">
      ${items.map((entry) => {
        const p = entry.product;
        const lineCost = (Number(entry.costPrice) || 0) * (Number(entry.quantity) || 0);
        totalEstimatedCost += lineCost;

        const margin = p.price > 0 && entry.costPrice > 0
          ? Math.round(((p.price - entry.costPrice) / p.price) * 100)
          : 0;

        return `
          <div class="item-card" style="border:1.5px solid var(--color-primary-300);">
            <div class="item-card-header">
              <div>
                <strong style="font-size:1rem;">${window.esc(p.nameMr || p.nameEn)}</strong>
                <div class="text-xs text-muted">${window.esc(p.nameEn)} — ${window.esc(p.packSize)} (चालू साठा: ${p.stockQuantity} ${p.unitType})</div>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" onclick="removeReceiveCartItem('${p._id}')" title="काढून टाका / Remove">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-top:10px;">
              <div>
                <label class="form-label" style="font-size:0.75rem;">नवीन साठा (Qty to Add)</label>
                <input
                  type="number"
                  class="form-input"
                  min="0.1"
                  step="0.1"
                  value="${entry.quantity}"
                  onchange="updateReceiveItemField('${p._id}', 'quantity', this.value)"
                />
              </div>
              <div>
                <label class="form-label" style="font-size:0.75rem;">खरेदी दर (Cost Rate ₹)</label>
                <input
                  type="number"
                  class="form-input"
                  min="0"
                  step="0.5"
                  value="${entry.costPrice}"
                  onchange="updateReceiveItemField('${p._id}', 'costPrice', this.value)"
                />
              </div>
              <div>
                <label class="form-label" style="font-size:0.75rem;">मुदत समाप्ती (Expiry Date)</label>
                <input
                  type="date"
                  class="form-input"
                  value="${entry.expiryDate}"
                  onchange="updateReceiveItemField('${p._id}', 'expiryDate', this.value)"
                />
              </div>
            </div>
            <div class="flex justify-between items-center text-xs text-muted" style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border-subtle);">
              <span>विक्री किंमत: ₹${p.price} (MRP: ₹${p.mrp})</span>
              <span style="font-weight:700;color:${margin > 0 ? '#15803d' : '#dc2626'};">
                नफा मार्जिन: ${margin}% | उपएकूण: ₹${lineCost}
              </span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-subtle);border-radius:10px;margin-top:12px;">
      <span class="font-bold">एकूण अंदाजे खरेदी किंमत (Total Inward):</span>
      <strong style="font-size:1.15rem;color:var(--color-primary-800);">${window.AdminFormat.currency(totalEstimatedCost)}</strong>
    </div>
  `;
}

window.updateReceiveItemField = (id, field, value) => {
  const item = receiveCart.get(id);
  if (item) {
    item[field] = value;
    renderReceiveCart();
  }
};

window.removeReceiveCartItem = (id) => {
  receiveCart.delete(id);
  renderReceiveCart();
};

window.submitBatchStockIn = async () => {
  const items = Array.from(receiveCart.values());
  if (!items.length) return;

  const btn = document.getElementById('submitReceiveCartBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ साठा जतन होत आहे / Saving...';
  }

  let successCount = 0;
  for (const item of items) {
    try {
      await window.AdminAPI.post('/inventory/stock-in', {
        productId: item.product._id,
        quantity: parseFloat(item.quantity) || 1,
        costPrice: parseFloat(item.costPrice) || 0,
        expiryDate: item.expiryDate || undefined,
        supplier: document.getElementById('globalSupplierInput')?.value || '',
        invoiceNo: document.getElementById('globalInvoiceInput')?.value || '',
      });
      successCount++;
    } catch (err) {
      console.error('Stock in error for:', item.product.nameEn, err);
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '✅ सर्व साठा जतन करा (Save All Stock)';
  }

  receiveCart.clear();
  renderReceiveCart();

  if (window.AdminToast) {
    window.AdminToast.show(`✅ ${successCount} उत्पादनांचा साठा यशस्वीरित्या वाढवला!`, 'success', 4000);
  }
};

// ── Native Camera Barcode Scanner ──
function startBarcodeScan() {
  if (!('BarcodeDetector' in window)) {
    alert('तुमच्या ब्राऊझरमध्ये कॅमेरा बारकोड स्कॅनर उपलब्ध नाही. कृपया उत्पादन नाव टाईप करून शोधा.\n(Native BarcodeDetector not supported in this browser. Please search by name or barcode text).');
    return;
  }

  const sheet = new window.AdminBottomSheet({
    title: '📷 बारकोड स्कॅनर (Scan Barcode)',
  });

  const body = document.createElement('div');
  body.innerHTML = `
    <video id="barcodeVideo" style="width:100%;max-height:280px;background:#000;border-radius:12px;object-fit:cover;" autoplay muted playsinline></video>
    <p class="text-sm text-muted" style="text-align:center;margin-top:10px;">कॅमेऱ्यासमोर उत्पादनाचा बारकोड धरा / Point camera at barcode</p>
  `;

  sheet.setContent(body);
  sheet.open();

  navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      barcodeStream = stream;
      const video = body.querySelector('#barcodeVideo');
      video.srcObject = stream;

      const barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });

      const interval = setInterval(async () => {
        if (!sheet.isOpen) {
          clearInterval(interval);
          stopBarcodeStream();
          return;
        }
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue;
            clearInterval(interval);
            stopBarcodeStream();
            sheet.close();
            const searchInput = document.getElementById('inventoryProductSearch');
            if (searchInput) {
              searchInput.value = rawVal;
              searchInventoryProducts(rawVal);
            }
          }
        } catch (_) {}
      }, 500);
    })
    .catch((err) => {
      sheet.close();
      alert(`Camera Permission Error: ${err.message}`);
    });
}

function stopBarcodeStream() {
  if (barcodeStream) {
    barcodeStream.getTracks().forEach((t) => t.stop());
    barcodeStream = null;
  }
}

// ── 2. ALERTS TAB: OUT OF STOCK, LOW STOCK, NEAR EXPIRY ──
async function loadAlertsData() {
  const container = document.getElementById('inventoryAlertsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton" style="height:140px;border-radius:12px;margin-bottom:12px;"></div>
    <div class="skeleton" style="height:140px;border-radius:12px;"></div>
  `;

  try {
    const [lowRes, expiryRes] = await Promise.all([
      window.AdminAPI.get('/inventory/low-stock'),
      window.AdminAPI.get('/inventory/near-expiry'),
    ]);

    lowStockItems = lowRes.data || [];
    nearExpiryItems = expiryRes.data || [];
    renderAlerts();
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-muted">Error: ${window.esc(err.message)}</p>`;
  }
}

function renderAlerts() {
  const container = document.getElementById('inventoryAlertsContainer');
  if (!container) return;

  const outOfStock = lowStockItems.filter((p) => (p.stockQuantity ?? 0) === 0);
  const lowStock = lowStockItems.filter((p) => (p.stockQuantity ?? 0) > 0);

  container.innerHTML = `
    <!-- Top Action: Reorder List Generator Button -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div>
        <h2 style="font-size:1.15rem;margin:0;">⚠️ साठा इशारे व पुनर्खरेदी (Stock Alerts)</h2>
        <span class="text-xs text-muted">एकूण ${lowStockItems.length} वस्तूंचा साठा संपला किंवा कमी आहे.</span>
      </div>
      <button type="button" class="btn btn-sm btn-primary" onclick="generateReorderListWhatsApp()">
        📲 पुरवठादार ऑर्डर तयार करा
      </button>
    </div>

    <!-- Section 1: Out of Stock -->
    <div style="margin-bottom:20px;">
      <h3 style="font-size:0.95rem;color:#dc2626;margin-bottom:8px;">🛑 पूर्ण संपलेला साठा / Out of Stock (${outOfStock.length})</h3>
      ${outOfStock.length ? `
        <div class="flex flex-col gap-2">
          ${outOfStock.map((p) => renderAlertItemRow(p, 'zero')).join('')}
        </div>
      ` : '<p class="text-sm text-muted">सर्व उत्पादने स्टॉकमध्ये आहेत / No out of stock items.</p>'}
    </div>

    <!-- Section 2: Low Stock (below reorder level) -->
    <div style="margin-bottom:20px;">
      <h3 style="font-size:0.95rem;color:#d97706;margin-bottom:8px;">⚠️ कमी साठा / Low Stock (${lowStock.length})</h3>
      ${lowStock.length ? `
        <div class="flex flex-col gap-2">
          ${lowStock.map((p) => renderAlertItemRow(p, 'low')).join('')}
        </div>
      ` : '<p class="text-sm text-muted">कोणतेही उत्पादन कमी साठ्यात नाही / All stocks healthy.</p>'}
    </div>

    <!-- Section 3: Near Expiry Items -->
    <div>
      <h3 style="font-size:0.95rem;color:#c2410c;margin-bottom:8px;">📅 मुदत संपत आलेला साठा / Near Expiry (${nearExpiryItems.length})</h3>
      ${nearExpiryItems.length ? `
        <div class="flex flex-col gap-2">
          ${nearExpiryItems.map((p) => {
            const expDate = window.AdminFormat.dateIST(p.expiryDate, 'short');
            return `
              <div class="flex items-center justify-between" style="padding:10px 14px;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;">
                <div>
                  <div style="font-weight:700;">${window.esc(p.nameMr || p.nameEn)}</div>
                  <div class="text-xs text-muted">${window.esc(p.nameEn)} — ${window.esc(p.packSize)}</div>
                  <div class="text-xs" style="color:#b91c1c;margin-top:2px;font-weight:600;">
                    मुदत समाप्ती: ${expDate} (${p.daysUntilExpiry} दिवस शिल्लक)
                  </div>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" onclick="openAdjustModal('${p._id}', '${window.esc(p.nameEn)}')">
                  दुरुस्ती / Adjust
                </button>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<p class="text-sm text-muted">पुढील ३० दिवसात कोणतीही वस्तू एक्सपायर होत नाही / No near-expiry items within 30 days.</p>'}
    </div>
  `;
}

function renderAlertItemRow(p, type) {
  return `
    <div class="flex items-center justify-between" style="padding:10px 14px;background:#ffffff;border:1px solid var(--border-subtle);border-radius:10px;">
      <div>
        <div style="font-weight:700;">${window.esc(p.nameMr || p.nameEn)}</div>
        <div class="text-xs text-muted">${window.esc(p.nameEn)} — ${window.esc(p.packSize)}</div>
        <div class="text-xs" style="color:${type === 'zero' ? '#dc2626' : '#d97706'};margin-top:2px;">
          शिल्लक: ${p.stockQuantity} ${p.unitType} (मर्यादा: ${p.reorderLevel})
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-sm btn-primary" onclick="quickStockIn('${p._id}', '${window.esc(p.nameEn)}')">
          📥 स्टॉक भरा
        </button>
        <button type="button" class="btn btn-sm btn-outline" onclick="toggleProductUnavailable('${p._id}', ${Boolean(p.unavailableFlag)})">
          ${p.unavailableFlag ? 'उपलब्ध करा' : 'बंद करा'}
        </button>
      </div>
    </div>
  `;
}

window.quickStockIn = (id, name) => {
  switchInventoryTab('stock-in');
  addProductToReceiveCart(id);
};

window.toggleProductUnavailable = async (id, currentFlag) => {
  try {
    await window.AdminAPI.patch(`/admin/products/${id}/toggle-stock`, {
      unavailableFlag: !currentFlag,
    });
    loadAlertsData();
    if (window.AdminToast) {
      window.AdminToast.show('बदल जतन केले / Updated availability', 'success');
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

window.generateReorderListWhatsApp = () => {
  if (!lowStockItems.length) {
    alert('कोणतीही वस्तू कमी साठ्यात नाही / No items need reordering');
    return;
  }

  const lines = ['📋 महालक्ष्मी किराणा — पुरवठादार माल ऑर्डर यादी:\n'];
  lowStockItems.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p.nameMr || p.nameEn} (${p.packSize}) — चालू साठा: ${p.stockQuantity} ${p.unitType}`);
  });
  lines.push('\nकृपया वरील मालाचा दर व पुरवठा कळवावा.');

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    if (window.AdminToast) {
      window.AdminToast.show('📋 पुरवठादार ऑर्डर यादी कॉपी केली! (Copied to clipboard)', 'success', 3000);
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  });
};

// ── 3. LOG & ADJUST TAB ──
async function loadStockLogs() {
  const container = document.getElementById('inventoryLogsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton" style="height:120px;border-radius:12px;margin-bottom:12px;"></div>
    <div class="skeleton" style="height:120px;border-radius:12px;"></div>
  `;

  try {
    const res = await window.AdminAPI.get(`/inventory/stock-log/all?page=${stockLogPage}&limit=30`).catch(() => null);
    // If /all log endpoint not present, fetch low-stock or log via admin reports
    const logs = (res && res.data) ? res.data : [];

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.15rem;margin:0;">📝 स्टॉक नोंदवही व दुरुस्ती (Log & Adjust)</h2>
          <span class="text-xs text-muted">साठा बदल इतिहास आणि नुकसान/तफावत नोंद.</span>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-sm btn-secondary" onclick="downloadAuthed('/admin/export/stock-log.csv', 'stock-log.csv')">
            📥 CSV डाऊनलोड
          </button>
          <button type="button" class="btn btn-sm btn-danger" onclick="openManualAdjustModal()">
            ⚖️ साठा दुरुस्ती (Adjust)
          </button>
        </div>
      </div>
      <div id="logsListTarget"></div>
    `;

    const target = container.querySelector('#logsListTarget');
    if (!logs.length) {
      target.innerHTML = `<p class="text-sm text-muted" style="padding:24px;text-align:center;">अद्याप कोणतीही स्टॉक दुरुस्ती नोंद नाही / No stock log entries found.</p>`;
      return;
    }

    new window.AdminDataList({
      container: target,
      items: logs,
      columns: [
        { field: 'createdAt', label: 'तारीख / Date', render: (v) => window.AdminFormat.dateIST(v, 'full') },
        { field: 'product', label: 'उत्पादन / Product', render: (v) => v ? window.esc(v.nameMr || v.nameEn) : '—' },
        { field: 'type', label: 'प्रकार / Type', render: (v) => `<span class="badge ${v === 'in' ? 'badge-success' : 'badge-danger'}">${v.toUpperCase()}</span>` },
        { field: 'quantity', label: 'नग / Qty', render: (v) => `<strong>${v}</strong>` },
        { field: 'balanceAfter', label: 'शिल्लक / Balance', render: (v) => `${v}` },
        { field: 'note', label: 'नोंद / Reason', render: (v) => window.esc(v) },
      ],
    });
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-muted">Error: ${window.esc(err.message)}</p>`;
  }
}

window.openAdjustModal = (id) => {
  window.openManualAdjustModal(id);
};

window.openManualAdjustModal = async (preselectedProductId = null) => {
  const sheet = new window.AdminBottomSheet({
    title: '⚖️ साठा दुरुस्ती नोंद (Stock Adjustment)',
  });

  let productOptions = lowStockItems;
  try {
    const res = await window.AdminAPI.get('/admin/products?limit=200');
    if (res.success && res.data) {
      productOptions = res.data;
    }
  } catch (_) {}

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="adjustStockForm" class="flex flex-col gap-3">
      <div>
        <label class="form-label">उत्पादन निवडा / Select Product *</label>
        <select class="form-select" id="adjustProductSelect" required>
          <option value="">-- उत्पादन निवडा --</option>
          ${productOptions.map((p) => `<option value="${p._id}" ${preselectedProductId === p._id ? 'selected' : ''}>${window.esc(p.nameMr || p.nameEn)} (${window.esc(p.packSize || '')}) — शिल्लक: ${p.stockQuantity ?? 0}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label">बदल संख्या / Adjustment Quantity (+ किंवा -) *</label>
        <input type="number" class="form-input" id="adjustQtyInput" step="0.5" placeholder="उदा. -2 (नुकसान) किंवा +5" required />
      </div>
      <div>
        <label class="form-label">कारण कोड / Reason Code (Mandatory) *</label>
        <select class="form-select" id="adjustReasonCode" required>
          <option value="damage">तूटफूट / खराब झाले (Damage / Spoilage)</option>
          <option value="expiry">मुदत संपली (Expired / Discarded)</option>
          <option value="theft">चोरी / गहाळ (Theft / Shrinkage)</option>
          <option value="customer_return">ग्राहक रिटर्न (Customer Return)</option>
          <option value="correction">मोजणी दुरुस्ती (Stock Count Correction)</option>
        </select>
      </div>
      <div>
        <label class="form-label">टीप / Note (Optional)</label>
        <textarea class="form-textarea" id="adjustNoteInput" rows="2" placeholder="तपशीलवार कारण नमूद करा..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top:12px;">✅ दुरुस्ती जतन करा (Save Adjustment)</button>
    </form>
  `;

  sheet.setContent(body);
  sheet.open();

  body.querySelector('#adjustStockForm').onsubmit = async (e) => {
    e.preventDefault();
    const productId = body.querySelector('#adjustProductSelect').value;
    const qty = parseFloat(body.querySelector('#adjustQtyInput').value);
    const reason = body.querySelector('#adjustReasonCode').value;
    const note = body.querySelector('#adjustNoteInput').value.trim();

    if (!productId || isNaN(qty)) {
      alert('कृपया उत्पादन आणि संख्या योग्य भरा');
      return;
    }

    try {
      await window.AdminAPI.post('/inventory/adjust', {
        productId,
        quantity: qty,
        reason,
        note: `[${reason.toUpperCase()}] ${note}`,
      });
      sheet.close();
      loadStockLogs();
      if (window.AdminToast) {
        window.AdminToast.show('✅ साठा दुरुस्ती यशस्वीरीत्या नोंदवली!', 'success');
      }
    } catch (err) {
      alert(`Adjustment Error: ${err.message}`);
    }
  };
};
