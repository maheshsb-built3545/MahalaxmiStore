/**
 * frontend/admin/js/admin-products.js
 * Product catalog management: search, category filtering, 1-tap stock toggle,
 * Add/Edit modal, Cloudinary image upload, and price change warning.
 */

'use strict';

let currentSearch = '';
let currentCategory = '';
let currentPage = 1;
let categoriesList = [];
let editingProductId = null;
let originalPrice = null;

async function loadCategoriesForDropdown() {
  try {
    const res = await adminFetch('/admin/categories');
    if (res.success && res.data) {
      categoriesList = res.data;
      const filterSelect = document.getElementById('categoryFilterSelect');
      const modalSelect = document.getElementById('prodCategory');

      const optionsHtml = categoriesList
        .filter((c) => c.active !== false)
        .map((c) => `<option value="${c._id}">${escapeHtml(c.emoji)} ${escapeHtml(c.nameEn)} (${escapeHtml(c.nameMr)})</option>`)
        .join('');

      if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Categories / सर्व श्रेणी</option>' + optionsHtml;
      }
      if (modalSelect) {
        modalSelect.innerHTML = optionsHtml;
      }
    }
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

async function loadProducts() {
  const container = document.getElementById('productsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--admin-muted);">Loading products…</td></tr>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 30,
    });
    if (currentSearch) params.set('search', currentSearch);
    if (currentCategory) params.set('category', currentCategory);

    const res = await adminFetch(`/admin/products?${params.toString()}`);
    if (!res.success || !res.data) {
      container.innerHTML = '<tr><td colspan="6" style="text-align: center;">Failed to load products.</td></tr>';
      return;
    }

    if (res.data.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--admin-muted);">No products found.</td></tr>';
      return;
    }

    container.innerHTML = res.data.map(renderProductRow).join('');
    if (!container.dataset.listenerAttached) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-archive-product');
        if (btn && btn.dataset.id) {
          archiveProduct(btn.dataset.id, btn.dataset.name);
        }
      });
      container.dataset.listenerAttached = 'true';
    }
    renderProductsPagination(res.pagination);
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--admin-danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderProductRow(p) {
  const id = p._id;
  const nameEn = escapeHtml(p.nameEn);
  const nameMr = escapeHtml(p.nameMr);
  const packSize = escapeHtml(p.packSize);
  const catName = p.categoryId ? escapeHtml(p.categoryId.nameEn) : 'General';
  const imgUrl = p.imageUrl || '../images/placeholder-store.svg';
  const inStock = p.inStock;
  const active = p.active;

  return `
    <tr style="border-bottom: 1px solid var(--admin-border); ${active ? '' : 'opacity: 0.5; background: #f8fafc;'}">
      <td style="padding: 0.6rem;">
        <img src="${escapeHtml(imgUrl)}" alt="${nameEn}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--admin-border);">
      </td>
      <td style="padding: 0.6rem;">
        <div style="font-weight: 700; color: #0f172a;">${nameEn}</div>
        <div style="font-size: 0.8rem; color: var(--admin-muted);">${nameMr} • ${packSize}</div>
        ${!active ? '<span class="badge badge-cancelled" style="margin-top: 2px;">Archived</span>' : ''}
      </td>
      <td style="padding: 0.6rem; font-size: 0.85rem; color: var(--admin-muted);">${catName}</td>
      <td style="padding: 0.6rem;">
        <strong style="color: var(--admin-primary); font-size: 0.95rem;">₹${p.price}</strong>
        <span style="font-size: 0.75rem; color: var(--admin-muted); text-decoration: line-through; margin-left: 4px;">₹${p.mrp}</span>
      </td>
      <td style="padding: 0.6rem;">
        <label class="switch" title="Toggle Stock (स्टॉक आहे/नाही)">
          <input type="checkbox" ${inStock ? 'checked' : ''} onchange="toggleStock('${id}', this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td style="padding: 0.6rem; text-align: right;">
        <button class="btn-action btn-outline" style="min-width: 50px; padding: 0.3rem 0.5rem; font-size: 0.8rem;" onclick="openEditProductModal('${id}')">
          Edit
        </button>
        ${
          active
            ? `<button type="button" class="btn-action btn-danger btn-archive-product" style="min-width: 50px; padding: 0.3rem 0.5rem; font-size: 0.8rem; margin-left: 4px;" data-id="${id}" data-name="${nameEn}" title="Delete">
                <svg class="icon icon-sm"><use href="/images/icons.svg#trash"></use></svg>
              </button>`
            : ''
        }
      </td>
    </tr>
  `;
}

function renderProductsPagination(pagination) {
  const container = document.getElementById('productsPagination');
  if (!container) return;

  if (pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn-action btn-outline" style="min-width: 80px;" ${pagination.page <= 1 ? 'disabled' : ''} onclick="changeProductsPage(${pagination.page - 1})">
        ← Prev
      </button>
      <span style="display: flex; align-items: center; font-size: 0.85rem; color: var(--admin-muted); padding: 0 0.5rem;">
        Page ${pagination.page} of ${pagination.pages}
      </span>
      <button class="btn-action btn-outline" style="min-width: 80px;" ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="changeProductsPage(${pagination.page + 1})">
        Next →
      </button>
    </div>
  `;
}

function changeProductsPage(page) {
  currentPage = page;
  loadProducts();
}

async function toggleStock(id, newStatus) {
  try {
    await adminFetch(`/admin/products/${id}/toggle-stock`, {
      method: 'PATCH',
      body: JSON.stringify({
        unavailableFlag: !newStatus,
        inStock: Boolean(newStatus),
      }),
    });
  } catch (err) {
    alert(`Failed to update stock: ${err.message}`);
    loadProducts();
  }
}

async function archiveProduct(id, name) {
  if (!confirm(`Are you sure you want to archive "${name}"? It will be hidden from the storefront.\n\nतुम्हाला खात्री आहे का "${name}" काढून टाकायचे आहे?`)) {
    return;
  }

  try {
    const res = await adminFetch(`/admin/products/${id}`, { method: 'DELETE' });
    if (res.success) {
      loadProducts();
    }
  } catch (err) {
    alert(`Could not archive product: ${err.message}`);
  }
}

function openAddProductModal() {
  editingProductId = null;
  originalPrice = null;
  document.getElementById('productModalTitle').textContent = 'Add New Product / नवीन उत्पादन जोडा';
  document.getElementById('productForm').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('prodImageUrl').value = '';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  document.getElementById('priceChangeWarning').style.display = 'none';
  const uploadStatus = document.getElementById('uploadStatusText');
  if (uploadStatus) {
    uploadStatus.textContent = 'Phone camera photos are automatically compressed before upload.';
    uploadStatus.style.color = '';
  }
  document.getElementById('productModal').style.display = 'flex';
}

async function openEditProductModal(id) {
  editingProductId = id;
  document.getElementById('productModalTitle').textContent = 'Edit Product / उत्पादन संपादन';
  document.getElementById('productForm').reset();
  document.getElementById('priceChangeWarning').style.display = 'none';
  const uploadStatus = document.getElementById('uploadStatusText');
  if (uploadStatus) {
    uploadStatus.textContent = 'Phone camera photos are automatically compressed before upload.';
    uploadStatus.style.color = '';
  }

  try {
    // Find from current list
    const res = await adminFetch(`/admin/products?limit=100`);
    const p = res.data.find((item) => item._id === id);
    if (!p) return;

    document.getElementById('prodId').value = p._id;
    document.getElementById('prodNameEn').value = p.nameEn;
    document.getElementById('prodNameMr').value = p.nameMr;
    document.getElementById('prodPackSize').value = p.packSize;
    document.getElementById('prodCategory').value = p.categoryId ? p.categoryId._id || p.categoryId : '';
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodMrp').value = p.mrp;
    document.getElementById('prodSortOrder').value = p.sortOrder || 0;
    document.getElementById('prodInStock').checked = p.inStock;
    document.getElementById('prodImageUrl').value = p.imageUrl || '';

    originalPrice = Number(p.price);

    const prevWrap = document.getElementById('imagePreviewWrap');
    const previewImg = document.getElementById('imagePreview');
    if (p.imageUrl) {
      previewImg.src = p.imageUrl;
      prevWrap.style.display = 'block';
    } else {
      prevWrap.style.display = 'none';
    }

    document.getElementById('productModal').style.display = 'flex';
  } catch (err) {
    alert(`Could not load product: ${err.message}`);
  }
}

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('products');
  loadCategoriesForDropdown();
  loadProducts();

  // Search input debounced
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadProducts();
      }, 350);
    });
  }

  // Category filter select
  const catFilter = document.getElementById('categoryFilterSelect');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      currentPage = 1;
      loadProducts();
    });
  }

  // Price change warning trigger
  const priceInput = document.getElementById('prodPrice');
  if (priceInput) {
    priceInput.addEventListener('input', () => {
      const warning = document.getElementById('priceChangeWarning');
      if (originalPrice !== null && Number(priceInput.value) !== originalPrice) {
        warning.style.display = 'block';
      } else {
        warning.style.display = 'none';
      }
    });
  }

  // Image file input handler (client-side compression + Cloudinary upload)
  const imageInput = document.getElementById('prodImageFile');
  if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const uploadStatus = document.getElementById('uploadStatusText');
      uploadStatus.style.color = '';
      uploadStatus.textContent = 'Compressing and uploading image… / प्रतिमा अपलोड होत आहे…';

      try {
        // Compress on canvas max 1200px (Rule 6)
        const compressed = await compressImageFile(file, 1200);

        const formData = new FormData();
        formData.append('image', compressed);

        const res = await adminFetch('/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.success && res.url) {
          document.getElementById('prodImageUrl').value = res.url;
          document.getElementById('imagePreview').src = res.url;
          document.getElementById('imagePreviewWrap').style.display = 'block';
          uploadStatus.style.color = '#16a34a';
          uploadStatus.textContent = 'Image uploaded to Cloudinary!';
        } else {
          uploadStatus.style.color = '#dc2626';
          uploadStatus.textContent = `Upload failed: ${res.message || 'Unknown server error.'}`;
        }
      } catch (uploadErr) {
        uploadStatus.style.color = '#dc2626';
        uploadStatus.textContent = `Upload failed: ${uploadErr.message}`;
      }
    });
  }

  // Form submit handler
  const form = document.getElementById('productForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveProductBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      const payload = {
        nameEn: document.getElementById('prodNameEn').value.trim(),
        nameMr: document.getElementById('prodNameMr').value.trim(),
        packSize: document.getElementById('prodPackSize').value.trim(),
        categoryId: document.getElementById('prodCategory').value,
        price: Number(document.getElementById('prodPrice').value),
        mrp: Number(document.getElementById('prodMrp').value),
        sortOrder: Number(document.getElementById('prodSortOrder').value) || 0,
        inStock: document.getElementById('prodInStock').checked,
        imageUrl: document.getElementById('prodImageUrl').value.trim(),
      };

      if (payload.mrp < payload.price) {
        alert('MRP must be greater than or equal to selling price.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
        return;
      }

      try {
        let res;
        if (editingProductId) {
          res = await adminFetch(`/admin/products/${editingProductId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          res = await adminFetch('/admin/products', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }

        if (res.success) {
          closeProductModal();
          loadProducts();
        }
      } catch (saveErr) {
        alert(`Error saving product: ${saveErr.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
      }
    });
  }
});
