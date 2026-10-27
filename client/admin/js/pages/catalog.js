/**
 * Mahalaxmi Kirana Store — Catalog Controller (Products + Categories + Bulk Tools)
 * Mobile-friendly cards, inline stock quick adjustments, complete product form with costPrice,
 * client-side image compression & Cloudinary upload, category reordering & deletion,
 * and bulk price adjustments with live preview.
 */

'use strict';

let currentCatalogTab = 'products'; // 'products' | 'categories' | 'bulk'
let allProducts = [];
let allCategories = [];
let activeCategoryFilter = 'all';
let catalogSearchQuery = '';
let productModal = null;
let categoryModal = null;
let stockAdjustSheet = null;
let editingProductId = null;
let editingCategoryId = null;

function getCatIconKey(c) {
  if (c && c.iconKey) return c.iconKey;
  const name = ((c && (c.nameMr || c.nameEn)) || '').toLowerCase();
  if (name.includes('धान्य') || name.includes('आटा') || name.includes('atta') || name.includes('grain')) return 'wheat';
  if (name.includes('डाळ') || name.includes('कडधान्य') || name.includes('dal') || name.includes('pulse')) return 'beans';
  if (name.includes('तेल') || name.includes('तूप') || name.includes('oil') || name.includes('ghee')) return 'oil';
  if (name.includes('दूध') || name.includes('पेये') || name.includes('dairy') || name.includes('drink') || name.includes('beverage')) return 'milk';
  if (name.includes('मसाले') || name.includes('spice') || name.includes('तिखट') || name.includes('मिरची')) return 'chilli';
  if (name.includes('नाश्ता') || name.includes('बिस्किट') || name.includes('snack') || name.includes('biscuit')) return 'cookie';
  if (name.includes('स्वच्छता') || name.includes('घरगुती') || name.includes('भांडी') || name.includes('साबण') || name.includes('home') || name.includes('clean')) return 'sponge';
  if (name.includes('वैयक्तिक') || name.includes('काळजी') || name.includes('personal')) return 'sparkles';
  if (name.includes('स्टेशनरी') || name.includes('वही') || name.includes('stationery') || name.includes('pen') || name.includes('book')) return 'book';
  return 'box';
}
function renderCatIconSvg(c, cls = 'icon--sm') {
  const k = getCatIconKey(c);
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="/images/icons.svg#${k}"></use></svg>`;
}

document.addEventListener('DOMContentLoaded', () => {
  window.shell = new window.AdminShell({
    activeRoute: 'catalog',
    pageTitle: 'उत्पादने व वर्ग / Catalog',
  });

  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  if (tab === 'categories') currentCatalogTab = 'categories';
  else if (tab === 'bulk') currentCatalogTab = 'bulk';
  else currentCatalogTab = 'products';

  initCatalogTabs();
  initModals();
  loadCatalogData();

  if (urlParams.get('action') === 'add') {
    setTimeout(() => openProductModal(), 300);
  }
});

function initCatalogTabs() {
  const tabs = ['products', 'categories', 'bulk'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tabBtnCatalog_${t}`);
    if (btn) btn.onclick = () => switchCatalogTab(t);
  });
  updateCatalogTabUi();
}

function switchCatalogTab(tab) {
  currentCatalogTab = tab;
  updateCatalogTabUi();
  if (tab === 'products') renderProductsView();
  else if (tab === 'categories') renderCategoriesView();
  else if (tab === 'bulk') renderBulkView();
}

function updateCatalogTabUi() {
  const tabs = ['products', 'categories', 'bulk'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tabBtnCatalog_${t}`);
    const view = document.getElementById(`tabViewCatalog_${t}`);
    if (btn) btn.classList.toggle('active', currentCatalogTab === t);
    if (view) view.style.display = currentCatalogTab === t ? 'block' : 'none';
  });
}

function initModals() {
  productModal = new window.AdminBottomSheet({
    title: 'उत्पादन तपशील / Product Details',
    isSheetOnMobile: true,
  });

  categoryModal = new window.AdminBottomSheet({
    title: 'वर्ग तपशील / Category Details',
    isSheetOnMobile: true,
  });

  stockAdjustSheet = new window.AdminBottomSheet({
    title: 'साठा व्यवस्थापन / Stock Adjust',
    isSheetOnMobile: true,
  });
}

async function loadCatalogData() {
  const container = document.getElementById('catalogProductsContainer');
  if (container) {
    container.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="skeleton" style="height: 90px; border-radius: 12px;"></div>
        <div class="skeleton" style="height: 90px; border-radius: 12px;"></div>
        <div class="skeleton" style="height: 90px; border-radius: 12px;"></div>
      </div>
    `;
  }

  try {
    const [prodRes, catRes] = await Promise.all([
      window.AdminAPI.get('/admin/products?limit=200'),
      window.AdminAPI.get('/admin/categories'),
    ]);

    allProducts = prodRes.data || [];
    allCategories = catRes.data || [];

    renderCategoryChips();
    if (currentCatalogTab === 'products') renderProductsView();
    else if (currentCatalogTab === 'categories') renderCategoriesView();
    else if (currentCatalogTab === 'bulk') renderBulkView();
  } catch (err) {
    if (container) {
      container.innerHTML = '';
      const errEl = window.AdminEmptyState.renderError({
        title: 'माहिती लोड करण्यात त्रुटी / Failed to load catalog',
        description: err.message,
        onRetry: () => loadCatalogData(),
      });
      container.appendChild(errEl);
    }
  }
}

// ── 1. PRODUCTS VIEW ──
function renderCategoryChips() {
  const container = document.getElementById('catalogCategoryChips');
  if (!container) return;

  container.innerHTML = `
    <button type="button" class="chip ${activeCategoryFilter === 'all' ? 'active' : ''}" data-cat-id="all">
      <span>सर्व / All (${allProducts.length})</span>
    </button>
    ${allCategories.map((c) => {
      const count = allProducts.filter((p) => p.categoryId && (p.categoryId._id === c._id || p.categoryId === c._id)).length;
      return `
        <button type="button" class="chip ${activeCategoryFilter === c._id ? 'active' : ''}" data-cat-id="${c._id}">
          <span style="display:inline-flex;align-items:center;gap:4px;">${renderCatIconSvg(c, 'icon--xs')} ${window.esc(c.nameMr || c.nameEn)} (${count})</span>
        </button>
      `;
    }).join('')}
  `;

  container.onclick = (e) => {
    const btn = e.target.closest('.chip');
    if (!btn || !btn.dataset.catId) return;
    activeCategoryFilter = btn.dataset.catId;
    container.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    renderProductsView();
  };
}

function renderProductsView() {
  const container = document.getElementById('catalogProductsContainer');
  if (!container) return;

  let filtered = allProducts;
  if (activeCategoryFilter !== 'all') {
    filtered = filtered.filter((p) => p.categoryId && (p.categoryId._id === activeCategoryFilter || p.categoryId === activeCategoryFilter));
  }

  if (catalogSearchQuery) {
    const q = catalogSearchQuery.toLowerCase();
    filtered = filtered.filter((p) => {
      const en = String(p.nameEn || '').toLowerCase();
      const mr = String(p.nameMr || '').toLowerCase();
      const hi = String(p.nameHi || '').toLowerCase();
      const pack = String(p.packSize || '').toLowerCase();
      const aliases = (p.aliases || []).join(' ').toLowerCase();
      return en.includes(q) || mr.includes(q) || hi.includes(q) || pack.includes(q) || aliases.includes(q);
    });
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="margin-bottom:8px;"><svg class="icon icon--2xl" aria-hidden="true"><use href="/images/icons.svg#tag"></use></svg></div>
        <div class="empty-state-title">कोणतेही उत्पादन सापडले नाही / No products found</div>
        <div class="empty-state-desc">शोध संज्ञा बदला किंवा नवीन उत्पादन जोडा.</div>
        <button type="button" class="btn btn-primary" onclick="openProductModal()" style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;">
          <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#plus"></use></svg> नवीन उत्पादन जोडा
        </button>
      </div>
    `;
    return;
  }

  new window.AdminDataList({
    container,
    items: filtered,
    columns: [
      {
        field: 'nameEn',
        label: 'उत्पादन / Product',
        render: (_, p) => `
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${p.imageUrl || '../images/placeholder-store.svg'}" alt="${window.esc(p.nameEn)}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;background:#f1f5f9;" onerror="this.src='../images/placeholder-store.svg';" />
            <div>
              <div style="font-weight:700;">${window.esc(p.nameMr || p.nameEn)}</div>
              <div class="text-xs text-muted">${window.esc(p.nameEn)} — ${window.esc(p.packSize)}</div>
            </div>
          </div>
        `,
      },
      {
        field: 'price',
        label: 'किंमत / Price',
        render: (v, p) => `
          <strong>₹${v}</strong>
          <span class="text-xs text-muted" style="text-decoration:line-through;margin-left:4px;">₹${p.mrp}</span>
          ${p.costPrice ? `<div class="text-xs" style="color:#0284c7;">खरेदी: ₹${p.costPrice}</div>` : ''}
        `,
      },
      {
        field: 'stockQuantity',
        label: 'साठा / Stock',
        render: (v, p) => `
          <button type="button" class="badge ${(v ?? 0) === 0 ? 'badge-danger' : (v <= (p.reorderLevel ?? 5) ? 'badge-warning' : 'badge-success')}" style="cursor:pointer;border:none;font-size:0.85rem;" onclick="openStockAdjustSheet('${p._id}')" title="साठा बदला / Adjust Stock">
            ${v} ${p.unitType || 'piece'}
          </button>
        `,
      },
      {
        field: 'unavailableFlag',
        label: 'उपलब्ध / Available',
        render: (flag, p) => `
          <button type="button" class="btn btn-sm ${flag ? 'btn-danger' : 'btn-outline'}" onclick="toggleProductAvailability('${p._id}', ${Boolean(flag)})">
            ${flag ? 'बंद / Out' : 'सुरू / In Stock'}
          </button>
        `,
      },
      {
        field: 'actions',
        label: 'कृती / Action',
        render: (_, p) => `
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="openProductModal('${p._id}')" style="display:inline-flex;align-items:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#edit"></use></svg> Edit</button>
            <button type="button" class="btn btn-sm btn-outline" onclick="openStockAdjustSheet('${p._id}')" title="साठा / Stock" style="display:inline-flex;align-items:center;justify-content:center;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#box"></use></svg></button>
          </div>
        `,
      },
    ],
    renderCard: (p) => renderProductCardMobile(p),
  });
}

function renderProductCardMobile(p) {
  const card = document.createElement('div');
  card.className = 'item-card';

  const isLow = (p.stockQuantity ?? 0) <= (p.reorderLevel ?? 5);
  const isOut = (p.stockQuantity ?? 0) === 0 || p.unavailableFlag;
  const margin = p.price > 0 && p.costPrice > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;

  card.innerHTML = `
    <div class="flex items-center gap-3">
      <img src="${p.imageUrl || '../images/placeholder-store.svg'}" alt="${window.esc(p.nameEn)}" style="width:54px;height:54px;border-radius:10px;object-fit:cover;background:#f1f5f9;flex-shrink:0;" onerror="this.src='../images/placeholder-store.svg';" />
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.95rem;" class="truncate">${window.esc(p.nameMr || p.nameEn)}</div>
        <div class="text-xs text-muted">${window.esc(p.nameEn)} • ${window.esc(p.packSize)}</div>
        <div style="margin-top:2px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
          <strong style="color:var(--color-primary-800);font-size:1rem;">₹${p.price}</strong>
          <span class="text-xs text-muted" style="text-decoration:line-through;">₹${p.mrp}</span>
          ${p.costPrice ? `<span class="text-xs" style="color:#0284c7;">खरेदी: ₹${p.costPrice}</span>` : ''}
          ${margin !== null ? `<span class="text-xs" style="color:${margin >= 15 ? '#16a34a' : '#d97706'};font-weight:600;">(${margin}% नफा)</span>` : ''}
        </div>
      </div>
    </div>
    <div class="item-card-footer flex justify-between items-center" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border-subtle);">
      <div style="display:flex;align-items:center;gap:6px;">
        <button type="button" class="badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}" style="cursor:pointer;border:none;padding:6px 10px;" onclick="openStockAdjustSheet('${p._id}')" title="साठा बदला / Adjust Stock">
          ${isOut ? 'साठा संपला' : `${p.stockQuantity} ${p.unitType || 'pcs'}`}
        </button>
        <button type="button" class="btn btn-sm ${p.unavailableFlag ? 'btn-danger' : 'btn-outline'}" onclick="toggleProductAvailability('${p._id}', ${Boolean(p.unavailableFlag)})">
          ${p.unavailableFlag ? 'बंद' : 'चालू'}
        </button>
      </div>
      <button type="button" class="btn btn-sm btn-secondary" onclick="openProductModal('${p._id}')" style="display:inline-flex;align-items:center;gap:4px;">
        <svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#edit"></use></svg> बदला (Edit)
      </button>
    </div>
  `;

  return card;
}

window.toggleProductAvailability = async (id, currentFlag) => {
  try {
    await window.AdminAPI.patch(`/admin/products/${id}/toggle-stock`, {
      unavailableFlag: !currentFlag,
      inStock: currentFlag,
    });
    const p = allProducts.find((x) => x._id === id);
    if (p) p.unavailableFlag = !currentFlag;
    renderProductsView();
    if (window.AdminToast) {
      window.AdminToast.show(currentFlag ? 'उत्पादन आता उपलब्ध केले / Set In Stock' : 'उत्पादन तात्पुरते बंद केले / Set Out of Stock', 'info');
    }
  } catch (err) {
    if (window.AdminToast) window.AdminToast.show('Error: ' + err.message, 'danger');
  }
};

// ── QUICK STOCK ADJUST SHEET ──
window.openStockAdjustSheet = (productId) => {
  const p = allProducts.find((x) => x._id === productId);
  if (!p) return;

  const body = document.createElement('div');
  body.className = 'flex flex-col gap-3';
  body.style.padding = '8px 0';

  body.innerHTML = `
    <div style="background:var(--bg-subtle);padding:12px;border-radius:10px;">
      <div style="font-weight:700;font-size:1rem;">${window.esc(p.nameMr || p.nameEn)}</div>
      <div class="text-xs text-muted">${window.esc(p.nameEn)} — ${window.esc(p.packSize)}</div>
      <div style="margin-top:6px;font-size:0.9rem;">
        चालू साठा (Current Stock): <strong style="font-size:1.1rem;color:var(--color-primary-800);">${p.stockQuantity} ${p.unitType || 'piece'}</strong>
      </div>
    </div>

    <!-- Quick Stepper Options -->
    <div>
      <label class="form-label">कृती प्रकार निवडा (Action Type)</label>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <button type="button" class="btn btn-secondary active" id="btnModeIn" onclick="setAdjustMode('in')" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#inbox"></use></svg> साठा वाढवा</button>
        <button type="button" class="btn btn-secondary" id="btnModeOut" onclick="setAdjustMode('out')" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#minus"></use></svg> साठा कमी</button>
        <button type="button" class="btn btn-secondary" id="btnModeSet" onclick="setAdjustMode('set')" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#edit"></use></svg> अचूक संख्या</button>
      </div>
    </div>

    <form id="quickAdjustForm" class="flex flex-col gap-3">
      <div>
        <label class="form-label" id="adjustQuantityLabel">वाढवायची संख्या / Quantity to Add *</label>
        <input type="number" class="form-input" id="adjustQuantityInput" min="0.1" step="0.5" value="10" required />
      </div>

      <div id="adjustReasonWrap" style="display:none;">
        <label class="form-label">कमी करण्याचे कारण / Reason Code *</label>
        <select class="form-select" id="adjustReasonSelect">
          <option value="damage">तूटफूट / खराब झाले (Damage / Spoilage)</option>
          <option value="expiry">मुदत संपली (Expired / Discarded)</option>
          <option value="theft">चोरी / गहाळ (Theft / Shrinkage)</option>
          <option value="customer_return">ग्राहक रिटर्न (Customer Return)</option>
          <option value="correction">मोजणी दुरुस्ती (Stock Count Correction)</option>
        </select>
      </div>

      <div>
        <label class="form-label">पर्यायी टीप / Note (Optional)</label>
        <input type="text" class="form-input" id="adjustNoteInput" placeholder="उदा. नवीन माल आला किंवा नुकसान" />
      </div>

      <div class="modal-footer" style="padding-top:8px;">
        <button type="button" class="btn btn-secondary" onclick="stockAdjustSheet.close()">रद्द करा / Cancel</button>
        <button type="submit" class="btn btn-primary" id="saveQuickAdjustBtn">साठा जतन करा (Save)</button>
      </div>
    </form>
  `;

  stockAdjustSheet.setTitle(`साठा दुरुस्ती — ${window.esc(p.nameMr || p.nameEn)}`);
  stockAdjustSheet.setContent(body);
  stockAdjustSheet.open();

  let activeMode = 'in'; // 'in' | 'out' | 'set'

  window.setAdjustMode = (mode) => {
    activeMode = mode;
    body.querySelector('#btnModeIn').classList.toggle('active', mode === 'in');
    body.querySelector('#btnModeOut').classList.toggle('active', mode === 'out');
    body.querySelector('#btnModeSet').classList.toggle('active', mode === 'set');

    const lbl = body.querySelector('#adjustQuantityLabel');
    const reasonWrap = body.querySelector('#adjustReasonWrap');
    const qtyInput = body.querySelector('#adjustQuantityInput');

    if (mode === 'in') {
      lbl.textContent = 'वाढवायची संख्या / Quantity to Add *';
      reasonWrap.style.display = 'none';
      qtyInput.value = '10';
      qtyInput.min = '0.1';
    } else if (mode === 'out') {
      lbl.textContent = 'कमी करायची संख्या / Quantity to Deduct *';
      reasonWrap.style.display = 'block';
      qtyInput.value = '1';
      qtyInput.min = '0.1';
    } else {
      lbl.textContent = 'अचूक नवीन संख्या / Absolute New Stock Count *';
      reasonWrap.style.display = 'none';
      qtyInput.value = String(p.stockQuantity ?? 0);
      qtyInput.min = '0';
    }
  };

  body.querySelector('#quickAdjustForm').onsubmit = async (e) => {
    e.preventDefault();
    const qtyVal = parseFloat(body.querySelector('#adjustQuantityInput').value);
    const noteVal = body.querySelector('#adjustNoteInput').value.trim();
    const reasonCode = body.querySelector('#adjustReasonSelect').value;
    const saveBtn = body.querySelector('#saveQuickAdjustBtn');

    if (isNaN(qtyVal)) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'जतन होत आहे... / Saving...';

    try {
      if (activeMode === 'in') {
        await window.AdminAPI.post('/inventory/stock-in', {
          productId: p._id,
          quantity: qtyVal,
          note: noteVal || 'Stock Inward via quick adjust',
        });
      } else if (activeMode === 'out') {
        await window.AdminAPI.post('/inventory/adjust', {
          productId: p._id,
          quantity: -qtyVal,
          reason: reasonCode,
          note: `[${reasonCode.toUpperCase()}] ${noteVal || 'Quick deduct'}`,
        });
      } else {
        await window.AdminAPI.post('/inventory/adjust', {
          productId: p._id,
          newQuantity: qtyVal,
          note: noteVal || 'Direct stock count set',
        });
      }

      stockAdjustSheet.close();
      loadCatalogData();
      if (window.AdminToast) {
        window.AdminToast.show('साठा यशस्वीरीत्या अद्यतनित केला! / Stock updated', 'success');
      }
    } catch (err) {
      if (window.AdminToast) window.AdminToast.show('Error: ' + err.message, 'danger');
      saveBtn.disabled = false;
      saveBtn.textContent = 'साठा जतन करा (Save)';
    }
  };
};

// ── 2. PRODUCT FORM MODAL (with image upload, costPrice, validation, and delete) ──
function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to blob conversion failed'));
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

window.openProductModal = (id = null) => {
  editingProductId = id;
  const p = id ? allProducts.find((x) => x._id === id) : null;

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="productEditForm" class="flex flex-col gap-3">
      <!-- Image Upload Section -->
      <div style="background:var(--bg-subtle);padding:12px;border-radius:10px;">
        <label class="form-label" style="margin-bottom:6px;">उत्पादन फोटो (Product Image)</label>
        <div style="display:flex;gap:12px;align-items:center;">
          <img
            id="formImagePreview"
            src="${p?.imageUrl || '../images/placeholder-store.svg'}"
            alt="Product Preview"
            style="width:68px;height:68px;border-radius:10px;object-fit:cover;border:1px solid var(--border-subtle);background:#f1f5f9;flex-shrink:0;"
            onerror="this.src='../images/placeholder-store.svg';"
          />
          <div style="flex:1;">
            <input type="file" id="formImageFile" accept="image/*" style="display:none;" />
            <button type="button" class="btn btn-sm btn-secondary" id="btnUploadImageTrigger" style="display:inline-flex;align-items:center;gap:6px;">
              <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#camera"></use></svg> फोटो निवडा / कॅमेरा
            </button>
            <div id="imageUploadStatus" class="text-xs text-muted" style="margin-top:4px;">फोन कॅमेरा फोटो आपोआप कॉम्प्रेस केला जाईल.</div>
          </div>
        </div>
        <div style="margin-top:8px;">
          <input
            type="url"
            class="form-input"
            id="formImageUrl"
            value="${window.esc(p?.imageUrl || '')}"
            placeholder="किंवा थेट Cloudinary/Web फोटो URL पेस्ट करा..."
          />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label class="form-label">मराठी नाव (Marathi Name) *</label>
          <input type="text" class="form-input" id="formNameMr" value="${window.esc(p?.nameMr || '')}" placeholder="उदा. साखर" required />
        </div>
        <div>
          <label class="form-label">English Name *</label>
          <input type="text" class="form-input" id="formNameEn" value="${window.esc(p?.nameEn || '')}" placeholder="e.g. Sugar" required />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label class="form-label">पॅक साईज (Pack Size) *</label>
          <input type="text" class="form-input" id="formPackSize" value="${window.esc(p?.packSize || '')}" placeholder="उदा. 1 kg, 500 g, 1 Litre" required />
        </div>
        <div>
          <label class="form-label">वर्ग (Category) *</label>
          <select class="form-select" id="formCategory" required>
            <option value="">-- निवडा --</option>
            ${allCategories.map((c) => `<option value="${c._id}" ${p && (p.categoryId?._id === c._id || p.categoryId === c._id) ? 'selected' : ''}>${window.esc(c.nameMr || c.nameEn)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div>
          <label class="form-label">विक्री दर (Selling ₹) *</label>
          <input type="number" class="form-input" id="formPrice" value="${p?.price || ''}" min="0" step="0.5" required />
        </div>
        <div>
          <label class="form-label">छापील दर (MRP ₹) *</label>
          <input type="number" class="form-input" id="formMrp" value="${p?.mrp || ''}" min="0" step="0.5" required />
        </div>
        <div>
          <label class="form-label">खरेदी दर (Cost ₹)</label>
          <input type="number" class="form-input" id="formCostPrice" value="${p?.costPrice || 0}" min="0" step="0.5" placeholder="नफा हिशोबासाठी" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div>
          <label class="form-label">एकक प्रकार (Unit)</label>
          <select class="form-select" id="formUnitType">
            <option value="piece" ${p?.unitType === 'piece' ? 'selected' : ''}>नग / piece</option>
            <option value="kg" ${p?.unitType === 'kg' ? 'selected' : ''}>किलो / kg</option>
            <option value="g" ${p?.unitType === 'g' ? 'selected' : ''}>ग्रॅम / g</option>
            <option value="litre" ${p?.unitType === 'litre' ? 'selected' : ''}>लिटर / litre</option>
            <option value="ml" ${p?.unitType === 'ml' ? 'selected' : ''}>मिली / ml</option>
            <option value="pack" ${p?.unitType === 'pack' ? 'selected' : ''}>पॅक / pack</option>
          </select>
        </div>
        <div>
          <label class="form-label">साठा (Stock Quantity)</label>
          <input type="number" class="form-input" id="formStockQuantity" value="${p?.stockQuantity ?? 10}" min="0" step="0.5" />
        </div>
        <div>
          <label class="form-label">पुनर्खरेदी इशारा (Alert Level)</label>
          <input type="number" class="form-input" id="formReorderLevel" value="${p?.reorderLevel ?? 5}" min="0" />
        </div>
      </div>

      <div>
        <label class="form-label">सर्च टोपणनावे (Aliases / Keywords)</label>
        <input type="text" class="form-input" id="formAliases" value="${window.esc((p?.aliases || []).join(', '))}" placeholder="उदा. sakhar, chini, sugar" />
        <span class="form-hint">अल्पविरामाने (comma) वेगळे करा. AI शोध व व्हॉईस सर्चसाठी उपयुक्त.</span>
      </div>

      <div class="modal-footer" style="padding:12px 0 0;margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          ${p ? `
            <button type="button" class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#fca5a5;display:inline-flex;align-items:center;gap:4px;" onclick="deleteProductPrompt('${p._id}', '${window.esc(p.nameEn)}')">
              <svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#trash"></use></svg> हटवा (Delete)
            </button>
          ` : ''}
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary" onclick="productModal.close()">रद्द करा / Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveProductBtn">जतन करा (Save Product)</button>
        </div>
      </div>
    </form>
  `;

  productModal.setTitle(id ? 'उत्पादन बदला (Edit Product)' : 'नवीन उत्पादन जोडा (Add Product)');
  productModal.setContent(body);
  productModal.open();

  // Image Upload wiring
  const fileInput = body.querySelector('#formImageFile');
  const triggerBtn = body.querySelector('#btnUploadImageTrigger');
  const urlInput = body.querySelector('#formImageUrl');
  const previewImg = body.querySelector('#formImagePreview');
  const statusEl = body.querySelector('#imageUploadStatus');

  if (triggerBtn && fileInput) {
    triggerBtn.onclick = () => fileInput.click();
  }

  if (urlInput) {
    urlInput.oninput = () => {
      previewImg.src = urlInput.value || '../images/placeholder-store.svg';
    };
  }

  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (triggerBtn) triggerBtn.disabled = true;
      if (statusEl) statusEl.textContent = '⏳ फोटो कॉम्प्रेस व अपलोड होत आहे... / Uploading...';

      try {
        const compressedBlob = await compressImageFile(file, 800, 800, 0.82);
        const formData = new FormData();
        formData.append('image', compressedBlob, file.name || 'product.jpg');

        const res = await window.AdminAPI.postForm('/admin/upload', formData);
        if (res.success && res.url) {
          urlInput.value = res.url;
          previewImg.src = res.url;
          if (statusEl) statusEl.textContent = 'फोटो अपलोड यशस्वी! / Uploaded to Cloudinary';
        } else {
          throw new Error(res.message || 'Upload failed');
        }
      } catch (err) {
        if (statusEl) statusEl.textContent = `अपलोड अयशस्वी: ${err.message}`;
      } finally {
        if (triggerBtn) triggerBtn.disabled = false;
      }
    };
  }

  body.querySelector('#productEditForm').onsubmit = async (e) => {
    e.preventDefault();
    const nameEn = body.querySelector('#formNameEn').value.trim();
    const nameMr = body.querySelector('#formNameMr').value.trim();
    const packSize = body.querySelector('#formPackSize').value.trim();
    const categoryId = body.querySelector('#formCategory').value;
    const price = parseFloat(body.querySelector('#formPrice').value);
    const mrp = parseFloat(body.querySelector('#formMrp').value);
    const costPrice = parseFloat(body.querySelector('#formCostPrice').value) || 0;
    const stockQuantity = parseFloat(body.querySelector('#formStockQuantity').value) || 0;
    const unitType = body.querySelector('#formUnitType').value;
    const reorderLevel = parseInt(body.querySelector('#formReorderLevel').value, 10) || 5;
    const aliases = body.querySelector('#formAliases').value.split(',').map((s) => s.trim()).filter(Boolean);
    const imageUrl = body.querySelector('#formImageUrl').value.trim();

    if (mrp < price) {
      alert('छापील किंमत (MRP) ही विक्री किमतीपेक्षा कमी असू शकत नाही.\nMRP cannot be less than selling price.');
      return;
    }

    const payload = {
      nameEn,
      nameMr,
      packSize,
      categoryId,
      price,
      mrp,
      costPrice,
      stockQuantity,
      unitType,
      reorderLevel,
      aliases,
      imageUrl,
    };

    const saveBtn = body.querySelector('#saveProductBtn');
    saveBtn.disabled = true;

    try {
      if (editingProductId) {
        await window.AdminAPI.put(`/admin/products/${editingProductId}`, payload);
      } else {
        await window.AdminAPI.post('/admin/products', payload);
      }
      productModal.close();
      loadCatalogData();
      if (window.AdminToast) {
        window.AdminToast.show('उत्पादन यशस्वीरीत्या जतन झाले!', 'success');
      }
    } catch (err) {
      alert(`Save Error: ${err.message}`);
      saveBtn.disabled = false;
    }
  };
};

window.deleteProductPrompt = async (id, name) => {
  const confirmed = await window.AdminConfirm({
    title: 'उत्पादन कायमचे हटवा / Delete Product',
    message: `तुम्हाला खात्री आहे का "${name}" हे उत्पादन कायमचे हटवायचे आहे?\nAre you sure you want to permanently delete this product?`,
    confirmText: 'होय, हटवा / Yes, Delete',
    isDestructive: true,
  });
  if (!confirmed) return;

  try {
    const res = await window.AdminAPI.delete(`/admin/products/${id}`);
    if (res.success) {
      if (productModal) productModal.close();
      loadCatalogData();
      if (window.AdminToast) {
        window.AdminToast.show('उत्पादन यशस्वीरीत्या हटवले / Product deleted', 'success');
      }
    }
  } catch (err) {
    if (window.AdminToast) window.AdminToast.show('Error: ' + err.message, 'danger');
  }
};

// ── 3. CATEGORIES MANAGEMENT VIEW (Reorder, Active Toggle, and Deletion) ──
function renderCategoriesView() {
  const container = document.getElementById('catalogCategoriesContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom:16px;">
      <div>
        <h2 style="font-size:1.15rem;margin:0;display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--md" aria-hidden="true"><use href="/images/icons.svg#tag"></use></svg> वर्ग व्यवस्थापन (Categories)</h2>
        <span class="text-xs text-muted">क्रम बदलण्यासाठी बाण (↑ / ↓) वापरा. Storefront वर याच क्रमाने दिसेल.</span>
      </div>
      <button type="button" class="btn btn-sm btn-primary" onclick="openCategoryModal()" style="display:inline-flex;align-items:center;gap:6px;">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#plus"></use></svg> नवीन वर्ग (Add Category)
      </button>
    </div>
    <div class="flex flex-col gap-2" id="categoriesListTarget">
      ${allCategories.map((c, idx) => {
        const prodCount = allProducts.filter((p) => p.categoryId && (p.categoryId._id === c._id || p.categoryId === c._id)).length;
        const isActive = c.active !== false;

        return `
          <div class="flex items-center justify-between" style="padding:12px 14px;background:#ffffff;border:1px solid var(--border-subtle);border-radius:12px;${!isActive ? 'opacity:0.6;background:#f8fafc;' : ''}">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="display:inline-flex;align-items:center;">${renderCatIconSvg(c, 'icon--lg')}</span>
              <div>
                <strong style="font-size:1rem;">${window.esc(c.nameMr || c.nameEn)}</strong>
                <div class="text-xs text-muted">${window.esc(c.nameEn)} • ${prodCount} उत्पादने (Products)</div>
                ${!isActive ? '<span class="badge badge-warning" style="margin-top:2px;">अक्रिय / Inactive</span>' : ''}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="moveCategory(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="वर हलवा / Move Up">↑</button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="moveCategory(${idx}, 1)" ${idx === allCategories.length - 1 ? 'disabled' : ''} title="खाली हलवा / Move Down">↓</button>
              <button type="button" class="btn btn-sm btn-outline" onclick="openCategoryModal('${c._id}')" title="बदला / Edit" style="display:inline-flex;align-items:center;justify-content:center;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#edit"></use></svg></button>
              <button type="button" class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#fca5a5;display:inline-flex;align-items:center;justify-content:center;" onclick="deleteCategoryPrompt('${c._id}', '${window.esc(c.nameMr || c.nameEn)}', ${prodCount})" title="हटवा / Delete"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#trash"></use></svg></button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.moveCategory = async (index, delta) => {
  const targetIndex = index + delta;
  if (targetIndex < 0 || targetIndex >= allCategories.length) return;

  const item = allCategories.splice(index, 1)[0];
  allCategories.splice(targetIndex, 0, item);

  // Update sortOrder on backend
  allCategories.forEach((c, idx) => { c.sortOrder = idx; });
  renderCategoriesView();

  try {
    await Promise.all(allCategories.map((c) =>
      window.AdminAPI.put(`/admin/categories/${c._id}`, { sortOrder: c.sortOrder, nameEn: c.nameEn, nameMr: c.nameMr, iconKey: c.iconKey })
    ));
    if (window.AdminToast) {
      window.AdminToast.show('वर्गांचा क्रम जतन केला / Order saved', 'success', 1500);
    }
  } catch (_) {}
};

window.openCategoryModal = (id = null) => {
  editingCategoryId = id;
  const c = id ? allCategories.find((x) => x._id === id) : null;

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="categoryEditForm" class="flex flex-col gap-3">
      <div>
        <label class="form-label">वर्ग चिन्ह (Category Icon) *</label>
        <select class="form-select" id="formCatIconKey" required>
          <option value="grains" ${(c?.iconKey === 'grains' || c?.iconKey === 'wheat') ? 'selected' : ''}>धान्य व आटा (Atta & Grains)</option>
          <option value="dals" ${(c?.iconKey === 'dals' || c?.iconKey === 'beans') ? 'selected' : ''}>डाळी व कडधान्ये (Dals & Pulses)</option>
          <option value="oils" ${(c?.iconKey === 'oils' || c?.iconKey === 'oil') ? 'selected' : ''}>तेल व तूप (Oils & Ghee)</option>
          <option value="dairy" ${(c?.iconKey === 'dairy' || c?.iconKey === 'milk') ? 'selected' : ''}>दूध व पेये (Dairy & Drinks)</option>
          <option value="spices" ${(c?.iconKey === 'spices' || c?.iconKey === 'chilli') ? 'selected' : ''}>मसाले (Spices)</option>
          <option value="snacks" ${(c?.iconKey === 'snacks' || c?.iconKey === 'cookie') ? 'selected' : ''}>नाश्ता व बिस्किटे (Snacks & Biscuits)</option>
          <option value="beverages" ${c?.iconKey === 'beverages' ? 'selected' : ''}>शीतपेये व सरबत (Beverages)</option>
          <option value="homecare" ${(c?.iconKey === 'homecare' || c?.iconKey === 'sponge') ? 'selected' : ''}>घरगुती काळजी (Home Care)</option>
          <option value="personalcare" ${(c?.iconKey === 'personalcare' || c?.iconKey === 'sparkles') ? 'selected' : ''}>वैयक्तिक काळजी (Personal Care)</option>
          <option value="stationery" ${(c?.iconKey === 'stationery' || c?.iconKey === 'book') ? 'selected' : ''}>स्टेशनरी व इतर (Stationery)</option>
          <option value="box" ${(!c?.iconKey || c?.iconKey === 'box') ? 'selected' : ''}>इतर (General / Box)</option>
        </select>
      </div>
      <div>
        <label class="form-label">मराठी नाव (Marathi Name) *</label>
        <input type="text" class="form-input" id="formCatNameMr" value="${window.esc(c?.nameMr || '')}" placeholder="उदा. किराणा माल" required />
      </div>
      <div>
        <label class="form-label">English Name *</label>
        <input type="text" class="form-input" id="formCatNameEn" value="${window.esc(c?.nameEn || '')}" placeholder="e.g. Daily Groceries" required />
      </div>
      <div>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <input type="checkbox" id="formCatActive" style="width:20px;height:20px;accent-color:#16a34a;" ${c?.active !== false ? 'checked' : ''} />
          <span>स्टोअरवर सक्रिय ठेवा (Active on Storefront)</span>
        </label>
      </div>
      <div class="modal-footer" style="padding:12px 0 0;margin-top:12px;">
        <button type="button" class="btn btn-secondary" onclick="categoryModal.close()">रद्द करा / Cancel</button>
        <button type="submit" class="btn btn-primary" id="saveCatBtn">जतन करा (Save Category)</button>
      </div>
    </form>
  `;

  categoryModal.setTitle(id ? 'वर्ग बदला (Edit Category)' : 'नवीन वर्ग जोडा (Add Category)');
  categoryModal.setContent(body);
  categoryModal.open();

  body.querySelector('#categoryEditForm').onsubmit = async (e) => {
    e.preventDefault();
    const iconKey = body.querySelector('#formCatIconKey').value.trim() || 'box';
    const nameMr = body.querySelector('#formCatNameMr').value.trim();
    const nameEn = body.querySelector('#formCatNameEn').value.trim();
    const active = body.querySelector('#formCatActive').checked;
    const saveBtn = body.querySelector('#saveCatBtn');

    saveBtn.disabled = true;

    try {
      if (editingCategoryId) {
        await window.AdminAPI.put(`/admin/categories/${editingCategoryId}`, { iconKey, emoji: '', nameMr, nameEn, active });
      } else {
        await window.AdminAPI.post('/admin/categories', { iconKey, emoji: '', nameMr, nameEn, active });
      }
      categoryModal.close();
      loadCatalogData();
      if (window.AdminToast) window.AdminToast.show('वर्ग जतन केला! / Category saved', 'success');
    } catch (err) {
      alert(`Error: ${err.message}`);
      saveBtn.disabled = false;
    }
  };
};

window.deleteCategoryPrompt = async (id, name, prodCount) => {
  if (prodCount > 0) {
    alert(`या वर्गामध्ये ${prodCount} उत्पादने आहेत, म्हणून हा वर्ग हटवता येणार नाही. आधी त्या उत्पादनांचा वर्ग बदला.\nCannot delete category containing ${prodCount} products.`);
    return;
  }

  const confirmed = await window.AdminConfirm({
    title: 'वर्ग हटवा / Delete Category',
    message: `तुम्हाला खात्री आहे का "${name}" हा वर्ग हटवायचा आहे?\nAre you sure you want to delete this category?`,
    confirmText: 'होय, हटवा / Yes, Delete',
    isDestructive: true,
  });
  if (!confirmed) return;

  try {
    const res = await window.AdminAPI.delete(`/admin/categories/${id}`);
    if (res.success) {
      loadCatalogData();
      if (window.AdminToast) {
        window.AdminToast.show('वर्ग यशस्वीरीत्या हटवला / Category deleted', 'success');
      }
    }
  } catch (err) {
    if (window.AdminToast) window.AdminToast.show('Error: ' + err.message, 'danger');
  }
};

// ── 4. BULK PRICE TOOLS WITH LIVE PREVIEW ──
function renderBulkView() {
  const container = document.getElementById('catalogBulkContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="chart-card" style="max-width:580px;margin:0 auto;">
      <h3 style="font-size:1.15rem;margin-bottom:8px;display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#edit"></use></svg> घाऊक दर बदल साधन (Bulk Price Adjustment)</h3>
      <p class="text-sm text-muted" style="margin-bottom:16px;">
        निवडलेल्या वर्गातील उत्पादनांची किंमत एकाच वेळी टक्केवारीने (%) किंवा ठराविक रकमेने (+/- ₹) बदला. खाली थेट पूर्वावलोकन दिसेल.
      </p>
      <form id="bulkPriceForm" class="flex flex-col gap-3">
        <div>
          <label class="form-label">वर्ग निवडा / Select Category</label>
          <select class="form-select" id="bulkCategorySelect" required>
            <option value="all">सर्व उत्पादने (All Products - ${allProducts.length})</option>
            ${allCategories.map((c) => `<option value="${c._id}">${window.esc(c.nameMr || c.nameEn)}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:10px;">
          <div>
            <label class="form-label">बदलाचा प्रकार / Adjustment Type</label>
            <select class="form-select" id="bulkTypeSelect">
              <option value="percent_inc">टक्केवारी वाढ (+ % Increase)</option>
              <option value="percent_dec">टक्केवारी घट (- % Decrease)</option>
              <option value="flat_inc">ठराविक रक्कम वाढ (+ ₹ Amount)</option>
              <option value="flat_dec">ठराविक रक्कम घट (- ₹ Amount)</option>
            </select>
          </div>
          <div>
            <label class="form-label">मूल्य / Value</label>
            <input type="number" class="form-input" id="bulkValueInput" min="0.5" step="0.5" value="5" placeholder="5" required />
          </div>
        </div>

        <!-- Live Preview Box -->
        <div id="bulkPreviewBox" style="background:var(--bg-subtle);border-radius:10px;padding:12px;margin-top:6px;">
          <strong style="font-size:0.85rem;color:var(--text-secondary);">पूर्वावलोकन नमुना (Sample Preview):</strong>
          <div id="bulkPreviewTable" style="margin-top:8px;"></div>
        </div>

        <button type="submit" class="btn btn-primary" id="btnSubmitBulkPrice" style="margin-top:12px;min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#check"></use></svg> बदल तपासा व जतन करा (Confirm & Apply)
        </button>
      </form>
    </div>
  `;

  const form = container.querySelector('#bulkPriceForm');
  const catSelect = container.querySelector('#bulkCategorySelect');
  const typeSelect = container.querySelector('#bulkTypeSelect');
  const valInput = container.querySelector('#bulkValueInput');
  const previewTarget = container.querySelector('#bulkPreviewTable');

  function calculateNewPrice(currentPrice, type, val) {
    if (type === 'percent_inc') return Math.round(currentPrice * (1 + val / 100));
    if (type === 'percent_dec') return Math.max(1, Math.round(currentPrice * (1 - val / 100)));
    if (type === 'flat_inc') return currentPrice + val;
    if (type === 'flat_dec') return Math.max(1, currentPrice - val);
    return currentPrice;
  }

  function updatePreview() {
    const catId = catSelect.value;
    const type = typeSelect.value;
    const val = parseFloat(valInput.value) || 0;

    const targets = catId === 'all'
      ? allProducts
      : allProducts.filter((p) => p.categoryId && (p.categoryId._id === catId || p.categoryId === catId));

    if (!targets.length) {
      previewTarget.innerHTML = `<span class="text-xs text-muted">या वर्गात उत्पादने नाहीत.</span>`;
      return;
    }

    const samples = targets.slice(0, 4);
    previewTarget.innerHTML = `
      <table style="width:100%;font-size:0.85rem;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid var(--border-subtle);color:var(--text-muted);text-align:left;">
            <th>उत्पादन</th>
            <th>सध्याचा दर</th>
            <th>नवीन दर</th>
            <th>तफावत</th>
          </tr>
        </thead>
        <tbody>
          ${samples.map((p) => {
            const nextPrice = calculateNewPrice(p.price, type, val);
            const diff = nextPrice - p.price;
            return `
              <tr style="border-bottom:1px solid var(--border-subtle);">
                <td style="padding:4px 0;">${window.esc(p.nameMr || p.nameEn)}</td>
                <td>₹${p.price}</td>
                <td><strong style="color:var(--color-primary-800);">₹${nextPrice}</strong></td>
                <td style="color:${diff >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;">${diff >= 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="text-xs text-muted" style="margin-top:8px;">
        एकूण ${targets.length} उत्पादनांचे दर बदलले जातील.
      </div>
    `;
  }

  catSelect.onchange = updatePreview;
  typeSelect.onchange = updatePreview;
  valInput.oninput = updatePreview;
  updatePreview();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const catId = catSelect.value;
    const type = typeSelect.value;
    const val = parseFloat(valInput.value) || 0;

    const targets = catId === 'all'
      ? allProducts
      : allProducts.filter((p) => p.categoryId && (p.categoryId._id === catId || p.categoryId === catId));

    if (!targets.length) {
      alert('बदल करण्यासाठी उत्पादने नाहीत.');
      return;
    }

    const confirmed = await window.AdminConfirm({
      title: 'घाऊक दर बदल खात्री करा / Confirm Bulk Price Change',
      message: `${targets.length} उत्पादनांच्या किमती बदलल्या जातील. खात्री करा?\nApply price change to ${targets.length} items?`,
      confirmText: 'होय, दर बदला / Yes, Apply',
    });
    if (!confirmed) return;

    const submitBtn = form.querySelector('#btnSubmitBulkPrice');
    submitBtn.disabled = true;
    submitBtn.textContent = 'दर बदल चालू आहे... / Applying...';

    let count = 0;
    for (const p of targets) {
      const newPrice = calculateNewPrice(p.price, type, val);
      try {
        await window.AdminAPI.put(`/admin/products/${p._id}`, { price: newPrice });
        p.price = newPrice;
        count++;
      } catch (_) {}
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'बदल तपासा व जतन करा (Confirm & Apply)';
    loadCatalogData();

    if (window.AdminToast) {
      window.AdminToast.show(`${count} उत्पादनांचे दर यशस्वीरीत्या बदलले! / Updated ${count} products`, 'success', 3500);
    }
  };
}

// Search input with debounce
let catalogSearchDebounce = null;
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'catalogSearchInput') {
    catalogSearchQuery = e.target.value.trim();
    renderProductsView();
  }
});
