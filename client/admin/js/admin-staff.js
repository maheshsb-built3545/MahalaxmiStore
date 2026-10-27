/**
 * frontend/admin/js/admin-staff.js
 *
 * R4 — Staff Management Controller (ADM-01)
 */

document.addEventListener('DOMContentLoaded', async () => {
  renderAdminNavigation('staff');

  const user = auth.getUser ? auth.getUser() : null;
  if (!user || user.role !== 'owner') {
    alert('Access restricted to store owner only.');
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('addStaffForm')?.addEventListener('submit', handleAddStaff);
  await loadStaffList();
});

async function loadStaffList() {
  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#64748b;">कर्मचारी माहिती लोड होत आहे...</td></tr>';

  try {
    const res = await adminFetch('/admin/staff');
    if (!res.success) throw new Error(res.message);

    renderStaffTable(res.data);
  } catch (err) {
    console.error('Failed to load staff:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#ef4444;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderStaffTable(staffList) {
  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = '';

  if (!staffList || staffList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#64748b;">कोणतेही कर्मचारी खाते जोडलेले नाही.</td></tr>';
    return;
  }

  if (!tbody.dataset.listenerAttached) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-staff');
      if (btn && btn.dataset.id) {
        removeStaff(btn.dataset.id, btn.dataset.name);
      }
    });
    tbody.dataset.listenerAttached = 'true';
  }

  staffList.forEach((s) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(s.name)}</strong>
        <div style="font-size:0.8rem;color:#64748b;"><svg class="icon icon-sm"><use href="/images/icons.svg#phone"></use></svg> ${escapeHtml(s.phone)}</div>
      </td>
      <td>
        <span style="font-size:0.8rem;text-transform:uppercase;background:#f1f5f9;padding:2px 8px;border-radius:4px;">
          ${escapeHtml(s.preferredLanguage || 'mr')}
        </span>
      </td>
      <td>
        <span style="font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:12px;background:${s.blocked ? '#fee2e2' : '#dcfce7'};color:${s.blocked ? '#b91c1c' : '#15803d'};">
          ${s.blocked ? 'Blocked' : 'Active'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:0.4rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="toggleStaffBlock('${s._id}')">
            ${s.blocked ? 'Unblock' : 'Block'}
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-remove-staff" style="color:#ef4444;border-color:#fca5a5;" data-id="${s._id}" data-name="${escapeHtml(s.name)}">
            Remove
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleAddStaff(e) {
  e.preventDefault();
  const name = document.getElementById('staffName').value.trim();
  const phone = document.getElementById('staffPhone').value.trim();
  const password = document.getElementById('staffPassword').value;
  const preferredLanguage = document.getElementById('staffLang').value;
  const submitBtn = document.getElementById('saveStaffBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'तयार करत आहे...';

  try {
    const res = await adminFetch('/admin/staff', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, preferredLanguage }),
    });

    if (!res.success) throw new Error(res.message);

    alert(`कर्मचारी खाते यशस्वीरीत्या तयार केले: ${name}!`);
    document.getElementById('addStaffForm').reset();
    await loadStaffList();
  } catch (err) {
    alert(`Error creating staff: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'कर्मचारी खाते तयार करा (Create Staff)';
  }
}

async function toggleStaffBlock(staffId) {
  try {
    const res = await adminFetch(`/admin/staff/${staffId}/toggle-block`, { method: 'PATCH' });
    if (!res.success) throw new Error(res.message);
    await loadStaffList();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function removeStaff(staffId, staffName) {
  if (!confirm(`तुम्हाला खात्री आहे का? कर्मचारी "${staffName}" हटवले जाईल.`)) return;

  try {
    const res = await adminFetch(`/admin/staff/${staffId}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.message);
    alert(`कर्मचारी "${staffName}" काढले.`);
    await loadStaffList();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}
