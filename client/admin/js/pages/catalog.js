/**
 * Mahalaxmi Kirana Store — Catalog Controller (Products + Categories + Bulk Tools)
 * Mobile-friendly cards, inline stock steppers, complete product form with costPrice,
 * category reordering (touch up/down + drag), and bulk price adjustments.
 */

'use strict';

let currentCatalogTab = 'products'; // 'products' | 'categories' | 'bulk'
let allProducts = [];
let allCategories = [];
let activeCategoryFilter = 'all';
let catalogSearchQuery = '';
let productModal = null;
let categoryModal = null;
let editingProductId = null;
let editingCategoryId = null;

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
}

async function loadCatalogData() {
  try {
    const [prodRes, catRes] = await Promise.all([
      window.AdminAPI.get('/admin/products?limit=100'),
      window.AdminAPI.get('/admin/categories'),
    ]);

    allProducts = prodRes.data || [];
    allCategories = catRes.data || [];

    renderCategoryChips();
    if (currentCatalogTab === 'products') renderProductsView();
    else if (currentCatalogTab === 'categories') renderCategoriesView();
  } catch (err) {
    console.error('Catalog load error:', err);
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
          <span>${c.emoji || '🏷️'} ${window.esc(c.nameMr || c.nameEn)} (${count})</span>
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
      const aliases = (p.aliases || []).join(' ').toLowerCase();
      return en.includes(q) || mr.includes(q) || hi.includes(q) || aliases.includes(q);
    });
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏷️</div>
        <div class="empty-state-title">कोणतेही उत्पादन सापडले नाही / No products found</div>
        <button type="button" class="btn btn-primary" onclick="openProductModal()">➕ नवीन उत्पादन जोडा</button>
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
          <strong>${v} ${p.unitType}</strong>
          ${v <= (p.reorderLevel ?? 5) ? `<span class="badge badge-warning" style="margin-left:4px;">कमी</span>` : ''}
        `,
      },
      {
        field: 'unavailableFlag',
        label: 'उपलब्ध / Available',
        render: (flag, p) => `
          <button type="button" class="btn btn-sm ${flag ? 'btn-danger' : 'btn-outline'}" onclick="toggleProductAvailability('${p._id}', ${Boolean(flag)})">
            ${flag ? '🚫 बंद / Out' : '✅ सुरू / In Stock'}
          </button>
        `,
      },
      {
        field: 'actions',
        label: 'कृती / Action',
        render: (_, p) => `
          <button type="button" class="btn btn-sm btn-secondary" onclick="openProductModal('${p._id}')">✏️ Edit</button>
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

  card.innerHTML = `
    <div class="flex items-center gap-3">
      <img src="${p.imageUrl || '../images/placeholder-store.svg'}" alt="${window.esc(p.nameEn)}" style="width:54px;height:54px;border-radius:10px;object-fit:cover;background:#f1f5f9;flex-shrink:0;" onerror="this.src='../images/placeholder-store.svg';" />
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.95rem;" class="truncate">${window.esc(p.nameMr || p.nameEn)}</div>
        <div class="text-xs text-muted">${window.esc(p.nameEn)} • ${window.esc(p.packSize)}</div>
        <div style="margin-top:2px;">
          <strong style="color:var(--color-primary-800);font-size:1rem;">₹${p.price}</strong>
          <span class="text-xs text-muted" style="text-decoration:line-through;margin-left:4px;">₹${p.mrp}</span>
          ${p.costPrice ? `<span class="text-xs" style="color:#0284c7;margin-left:6px;">खरेदी: ₹${p.costPrice}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="item-card-footer flex justify-between items-center" style="margin-top:4px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}">
          ${isOut ? 'साठा संपला' : `${p.stockQuantity} ${p.unitType}`}
        </span>
        <button type="button" class="btn btn-sm ${p.unavailableFlag ? 'btn-danger' : 'btn-outline'}" onclick="toggleProductAvailability('${p._id}', ${Boolean(p.unavailableFlag)})">
          ${p.unavailableFlag ? '🚫 बंद' : '✅ चालू'}
        </button>
      </div>
      <button type="button" class="btn btn-sm btn-secondary" onclick="openProductModal('${p._id}')">
        ✏️ बदला (Edit)
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
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

// ── 2. PRODUCT FORM MODAL (with costPrice and validation) ──
window.openProductModal = (id = null) => {
  editingProductId = id;
  const p = id ? allProducts.find((x) => x._id === id) : null;

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="productEditForm" class="flex flex-col gap-3">
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
            ${allCategories.map((c) => `<option value="${c._id}" ${p && (p.categoryId?._id === c._id || p.categoryId === c._id) ? 'selected' : ''}>${c.emoji || '🏷️'} ${window.esc(c.nameMr || c.nameEn)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div>
          <label class="form-label">विक्री दर (Selling Price ₹) *</label>
          <input type="number" class="form-input" id="formPrice" value="${p?.price || ''}" min="0" step="0.5" required />
        </div>
        <div>
          <label class="form-label">छापील किंमत (MRP ₹) *</label>
          <input type="number" class="form-input" id="formMrp" value="${p?.mrp || ''}" min="0" step="0.5" required />
        </div>
        <div>
          <label class="form-label">खरेदी दर (Cost Price ₹) *</label>
          <input type="number" class="form-input" id="formCostPrice" value="${p?.costPrice || 0}" min="0" step="0.5" placeholder="नफा हिशोबासाठी" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label class="form-label">एकक प्रकार (Unit Type)</label>
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
          <label class="form-label">पुनर्खरेदी मर्यादा (Reorder Alert)</label>
          <input type="number" class="form-input" id="formReorderLevel" value="${p?.reorderLevel ?? 5}" min="0" />
        </div>
      </div>

      <div>
        <label class="form-label">सर्च टोपणनावे (Aliases / Keywords)</label>
        <input type="text" class="form-input" id="formAliases" value="${window.esc((p?.aliases || []).join(', '))}" placeholder="उदा. sakhar, chini, sugar" />
        <span class="form-hint">अल्पविरामाने (comma) वेगळे करा. ग्राहक या नावाने शोधू शकतील.</span>
      </div>

      <div>
        <label class="form-label">फोटो URL (Image URL)</label>
        <input type="url" class="form-input" id="formImageUrl" value="${window.esc(p?.imageUrl || '')}" placeholder="https://res.cloudinary.com/..." />
      </div>

      <div class="modal-footer" style="padding:12px 0 0;margin-top:12px;">
        <button type="button" class="btn btn-secondary" onclick="productModal.close()">रद्द करा / Cancel</button>
        <button type="submit" class="btn btn-primary" id="saveProductBtn">✅ जतन करा (Save Product)</button>
      </div>
    </form>
  `;

  productModal.setTitle(id ? '✏️ उत्पादन बदला (Edit Product)' : '➕ नवीन उत्पादन जोडा (Add Product)');
  productModal.setContent(body);
  productModal.open();

  body.querySelector('#productEditForm').onsubmit = async (e) => {
    e.preventDefault();
    const nameEn = body.querySelector('#formNameEn').value.trim();
    const nameMr = body.querySelector('#formNameMr').value.trim();
    const packSize = body.querySelector('#formPackSize').value.trim();
    const categoryId = body.querySelector('#formCategory').value;
    const price = parseFloat(body.querySelector('#formPrice').value);
    const mrp = parseFloat(body.querySelector('#formMrp').value);
    const costPrice = parseFloat(body.querySelector('#formCostPrice').value) || 0;
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
        window.AdminToast.show('✅ उत्पादन यशस्वीरीत्या जतन झाले!', 'success');
      }
    } catch (err) {
      alert(`Save Error: ${err.message}`);
      saveBtn.disabled = false;
    }
  };
};

// ── 3. CATEGORIES MANAGEMENT VIEW (Reorder + Product Counts) ──
function renderCategoriesView() {
  const container = document.getElementById('catalogCategoriesContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom:16px;">
      <div>
        <h2 style="font-size:1.15rem;margin:0;">🏷️ वर्ग व्यवस्थापन (Categories)</h2>
        <span class="text-xs text-muted">क्रम बदलण्यासाठी बाण (↑ / ↓) वापरा. Storefront वर याच क्रमाने दिसेल.</span>
      </div>
      <button type="button" class="btn btn-sm btn-primary" onclick="openCategoryModal()">
        ➕ नवीन वर्ग (Add Category)
      </button>
    </div>
    <div class="flex flex-col gap-2" id="categoriesListTarget">
      ${allCategories.map((c, idx) => {
        const prodCount = allProducts.filter((p) => p.categoryId && (p.categoryId._id === c._id || p.categoryId === c._id)).length;
        return `
          <div class="flex items-center justify-between" style="padding:12px 14px;background:#ffffff;border:1px solid var(--border-subtle);border-radius:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:1.5rem;">${c.emoji || '🏷️'}</span>
              <div>
                <strong style="font-size:1rem;">${window.esc(c.nameMr || c.nameEn)}</strong>
                <div class="text-xs text-muted">${window.esc(c.nameEn)} • ${prodCount} उत्पादने (Products)</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="moveCategory(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="वर हलवा / Move Up">↑</button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="moveCategory(${idx}, 1)" ${idx === allCategories.length - 1 ? 'disabled' : ''} title="खाली हलवा / Move Down">↓</button>
              <button type="button" class="btn btn-sm btn-outline" onclick="openCategoryModal('${c._id}')">✏️</button>
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
      window.AdminAPI.put(`/admin/categories/${c._id}`, { sortOrder: c.sortOrder })
    ));
    if (window.AdminToast) {
      window.AdminToast.show('✅ वर्गांचा क्रम जतन केला / Order saved', 'success', 1500);
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
        <label class="form-label">इमोजी (Emoji Icon) *</label>
        <input type="text" class="form-input" id="formCatEmoji" value="${c?.emoji || '🏷️'}" style="font-size:1.5rem;width:80px;text-align:center;" required />
      </div>
      <div>
        <label class="form-label">मराठी नाव (Marathi Name) *</label>
        <input type="text" class="form-input" id="formCatNameMr" value="${window.esc(c?.nameMr || '')}" placeholder="उदा. किराणा माल" required />
      </div>
      <div>
        <label class="form-label">English Name *</label>
        <input type="text" class="form-input" id="formCatNameEn" value="${window.esc(c?.nameEn || '')}" placeholder="e.g. Daily Groceries" required />
      </div>
      <div class="modal-footer" style="padding:12px 0 0;margin-top:12px;">
        <button type="button" class="btn btn-secondary" onclick="categoryModal.close()">रद्द करा / Cancel</button>
        <button type="submit" class="btn btn-primary">✅ जतन करा (Save Category)</button>
      </div>
    </form>
  `;

  categoryModal.setTitle(id ? '✏️ वर्ग बदला (Edit Category)' : '➕ नवीन वर्ग जोडा (Add Category)');
  categoryModal.setContent(body);
  categoryModal.open();

  body.querySelector('#categoryEditForm').onsubmit = async (e) => {
    e.preventDefault();
    const emoji = body.querySelector('#formCatEmoji').value.trim() || '🏷️';
    const nameMr = body.querySelector('#formCatNameMr').value.trim();
    const nameEn = body.querySelector('#formCatNameEn').value.trim();

    try {
      if (editingCategoryId) {
        await window.AdminAPI.put(`/admin/categories/${editingCategoryId}`, { emoji, nameMr, nameEn });
      } else {
        await window.AdminAPI.post('/admin/categories', { emoji, nameMr, nameEn });
      }
      categoryModal.close();
      loadCatalogData();
      if (window.AdminToast) window.AdminToast.show('✅ वर्ग जतन केला!', 'success');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };
};

// ── 4. BULK PRICE TOOLS ──
function renderBulkView() {
  const container = document.getElementById('catalogBulkContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="chart-card" style="max-width:540px;margin:0 auto;">
      <h3 style="font-size:1.1rem;margin-bottom:12px;">⚖️ घाऊक दर बदल साधन (Bulk Price Adjustment)</h3>
      <p class="text-sm text-muted" style="margin-bottom:16px;">
        निवडलेल्या वर्गातील सर्व उत्पादनांची किंमत एकाच वेळी टक्केवारीने (%) किंवा ठराविक रकमेने (+/- ₹) बदला.
      </p>
      <form id="bulkPriceForm" class="flex flex-col gap-3">
        <div>
          <label class="form-label">वर्ग निवडा / Select Category</label>
          <select class="form-select" id="bulkCategorySelect" required>
            <option value="all">सर्व उत्पादने (All Products)</option>
            ${allCategories.map((c) => `<option value="${c._id}">${c.emoji || '🏷️'} ${window.esc(c.nameMr || c.nameEn)}</option>`).join('')}
          </select>
        </div>
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
          <input type="number" class="form-input" id="bulkValueInput" min="0.5" step="0.5" placeholder="उदा. 5 (5% किंवा ₹5)" required />
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px;">
          🔍 बदल तपासा व जतन करा (Preview & Apply)
        </button>
      </form>
    </div>
  `;

  const form = container.querySelector('#bulkPriceForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const catId = container.querySelector('#bulkCategorySelect').value;
      const type = container.querySelector('#bulkTypeSelect').value;
      const val = parseFloat(container.querySelector('#bulkValueInput').value);

      const targetProducts = catId === 'all'
        ? allProducts
        : allProducts.filter((p) => p.categoryId && (p.categoryId._id === catId || p.categoryId === catId));

      const confirmed = await window.AdminConfirm({
        title: 'घाऊक दर बदल खात्री करा / Confirm Bulk Price Change',
        message: `${targetProducts.length} उत्पादनांच्या किमती बदलल्या जातील. खात्री करा?\nApply price change to ${targetProducts.length} items?`,
        confirmText: 'होय, बदला / Yes, Apply',
      });
      if (!confirmed) return;

      let count = 0;
      for (const p of targetProducts) {
        let newPrice = p.price;
        if (type === 'percent_inc') newPrice = Math.round(p.price * (1 + val / 100));
        else if (type === 'percent_dec') newPrice = Math.max(1, Math.round(p.price * (1 - val / 100)));
        else if (type === 'flat_inc') newPrice = p.price + val;
        else if (type === 'flat_dec') newPrice = Math.max(1, p.price - val);

        try {
          await window.AdminAPI.put(`/admin/products/${p._id}`, { price: newPrice });
          p.price = newPrice;
          count++;
        } catch (_) {}
      }

      loadCatalogData();
      if (window.AdminToast) {
        window.AdminToast.show(`✅ ${count} उत्पादनांचे दर यशस्वीरीत्या बदलले!`, 'success');
      }
    };
  }
}

// Search input
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'catalogSearchInput') {
    catalogSearchQuery = e.target.value.trim();
    renderProductsView();
  }
});
