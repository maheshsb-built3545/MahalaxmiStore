/**
 * frontend/admin/js/admin-categories.js
 * Category management: list, add, edit, reorder (sortOrder), and active toggle.
 */

'use strict';

let categories = [];
let editingCategoryId = null;

async function loadCategories() {
  const container = document.getElementById('categoriesTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--admin-muted);">Loading categories…</td></tr>';

  try {
    const res = await adminFetch('/admin/categories');
    if (!res.success || !res.data) {
      container.innerHTML = '<tr><td colspan="5" style="text-align: center;">Failed to load categories.</td></tr>';
      return;
    }

    categories = res.data;
    container.innerHTML = categories.map(renderCategoryRow).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--admin-danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderCategoryRow(cat) {
  const id = cat._id;
  const nameEn = escapeHtml(cat.nameEn);
  const nameMr = escapeHtml(cat.nameMr);
  const emoji = escapeHtml(cat.emoji || '🛒');
  const sortOrder = cat.sortOrder || 0;
  const count = cat.productCount || 0;
  const active = cat.active !== false;

  return `
    <tr style="border-bottom: 1px solid var(--admin-border); ${active ? '' : 'opacity: 0.5; background: #f8fafc;'}">
      <td style="padding: 0.6rem; font-size: 1.4rem; text-align: center; width: 50px;">${emoji}</td>
      <td style="padding: 0.6rem;">
        <div style="font-weight: 700; color: #0f172a;">${nameEn}</div>
        <div style="font-size: 0.8rem; color: var(--admin-muted);">${nameMr}</div>
      </td>
      <td style="padding: 0.6rem; font-size: 0.85rem; color: var(--admin-muted);">${count} products</td>
      <td style="padding: 0.6rem; font-size: 0.85rem;">Order: <strong>${sortOrder}</strong></td>
      <td style="padding: 0.6rem; text-align: right;">
        <button class="btn-action btn-outline" style="min-width: 50px; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="openEditCategoryModal('${id}')">
          ✏️ Edit
        </button>
        <button class="btn-action ${active ? 'btn-danger' : 'btn-primary'}" style="min-width: 60px; padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-left: 4px;" onclick="toggleCategoryActive('${id}')">
          ${active ? 'Hide' : 'Show'}
        </button>
      </td>
    </tr>
  `;
}

async function toggleCategoryActive(id) {
  try {
    const res = await adminFetch(`/admin/categories/${id}/toggle-active`, { method: 'PATCH' });
    if (res.success) {
      loadCategories();
    }
  } catch (err) {
    alert(`Could not toggle category: ${err.message}`);
  }
}

function openAddCategoryModal() {
  editingCategoryId = null;
  document.getElementById('categoryModalTitle').textContent = 'Add Category / नवीन श्रेणी';
  document.getElementById('categoryForm').reset();
  document.getElementById('catEmoji').value = '🛒';
  document.getElementById('categoryModal').style.display = 'flex';
}

function openEditCategoryModal(id) {
  editingCategoryId = id;
  const cat = categories.find((c) => c._id === id);
  if (!cat) return;

  document.getElementById('categoryModalTitle').textContent = 'Edit Category / श्रेणी संपादन';
  document.getElementById('catNameEn').value = cat.nameEn;
  document.getElementById('catNameMr').value = cat.nameMr;
  document.getElementById('catEmoji').value = cat.emoji || '🛒';
  document.getElementById('catSortOrder').value = cat.sortOrder || 0;
  document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('categories');
  loadCategories();

  const form = document.getElementById('categoryForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveCategoryBtn');
      saveBtn.disabled = true;

      const payload = {
        nameEn: document.getElementById('catNameEn').value.trim(),
        nameMr: document.getElementById('catNameMr').value.trim(),
        emoji: document.getElementById('catEmoji').value.trim() || '🛒',
        sortOrder: Number(document.getElementById('catSortOrder').value) || 0,
      };

      try {
        let res;
        if (editingCategoryId) {
          res = await adminFetch(`/admin/categories/${editingCategoryId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          res = await adminFetch('/admin/categories', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }

        if (res.success) {
          closeCategoryModal();
          loadCategories();
        }
      } catch (err) {
        alert(`Error saving category: ${err.message}`);
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
});
