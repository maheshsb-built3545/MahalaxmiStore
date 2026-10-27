/**
 * frontend/admin/js/admin-customers.js
 * Customer directory with order counts and Block / Unblock controls.
 */

'use strict';

async function loadCustomers() {
  const container = document.getElementById('customersTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--admin-muted);">Loading customers…</td></tr>';

  try {
    const res = await adminFetch('/admin/customers');
    if (!res.success || !res.data) {
      container.innerHTML = '<tr><td colspan="5" style="text-align: center;">Failed to load customers.</td></tr>';
      return;
    }

    if (res.data.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--admin-muted);">No registered customers yet.</td></tr>';
      return;
    }

    container.innerHTML = res.data
      .map((cust) => {
        const id = cust._id;
        const name = escapeHtml(cust.name);
        const phone = escapeHtml(cust.phone);
        const rawPhone = normalizePhone(cust.phone);
        const orders = cust.orderCount || 0;
        const isBlocked = Boolean(cust.blocked);
        const joinedDate = auth.formatDateIST(cust.createdAt);

        return `
          <tr style="border-bottom: 1px solid var(--admin-border); ${isBlocked ? 'background: #fff1f2;' : ''}">
            <td style="padding: 0.6rem;">
              <div style="font-weight: 700; color: #0f172a;">${name}</div>
              <div style="font-size: 0.75rem; color: var(--admin-muted);">Joined: ${joinedDate}</div>
            </td>
            <td style="padding: 0.6rem;">
              <a href="tel:+${rawPhone}" class="phone-link"><svg class="icon icon-sm"><use href="/images/icons.svg#phone"></use></svg> ${phone}</a>
            </td>
            <td style="padding: 0.6rem; font-weight: 700;">${orders} orders</td>
            <td style="padding: 0.6rem;">
              <span class="badge ${isBlocked ? 'badge-cancelled' : 'badge-delivered'}">
                ${isBlocked ? 'BLOCKED' : 'ACTIVE'}
              </span>
            </td>
            <td style="padding: 0.6rem; text-align: right;">
              <button class="btn-action ${isBlocked ? 'btn-primary' : 'btn-danger'}" style="min-width: 80px; padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="toggleCustomerBlock('${id}', ${isBlocked})">
                ${isBlocked ? 'Unblock' : 'Block User'}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--admin-danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function toggleCustomerBlock(id, currentBlocked) {
  const action = currentBlocked ? 'unblock' : 'block';
  if (!confirm(`Are you sure you want to ${action} this customer?`)) return;

  try {
    const res = await adminFetch(`/admin/customers/${id}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ blocked: !currentBlocked }),
    });

    if (res.success) {
      loadCustomers();
    }
  } catch (err) {
    alert(`Could not update customer status: ${err.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('customers');
  loadCustomers();
});
