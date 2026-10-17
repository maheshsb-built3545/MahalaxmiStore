/**
 * frontend/admin/js/packing.js
 * Multi-order selection and aggregated printable packing list.
 */

'use strict';

let eligibleOrders = [];
const selectedOrderIds = new Set();

async function loadEligibleOrders() {
  const container = document.getElementById('orderSelectionArea');
  if (!container) return;

  container.innerHTML = '<div style="padding: 1rem; color: var(--admin-muted);">Loading pending orders…</div>';

  try {
    // Only fetch orders that are new, confirmed, or packed
    const res = await adminFetch('/admin/orders?limit=100');
    if (!res.success || !res.data) {
      container.innerHTML = '<div>Failed to load orders.</div>';
      return;
    }

    // Filter to only new, confirmed, packed
    eligibleOrders = res.data.filter((o) => ['new', 'confirmed', 'packed'].includes(o.status));

    if (eligibleOrders.length === 0) {
      container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--admin-muted);">No pending orders to pack / पॅक करण्यासाठी कोणतीही प्रलंबित ऑर्डर नाही.</div>';
      document.getElementById('packingResultArea').innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span style="font-weight: 700; font-size: 0.9rem;">Select Orders to Pack (${eligibleOrders.length} pending):</span>
        <button class="btn-action btn-outline no-print" style="min-width: 90px; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="toggleSelectAll()">
          Select All / सर्व निवडा
        </button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.5rem;">
        ${eligibleOrders
          .map((ord) => {
            const isChecked = selectedOrderIds.has(ord._id);
            return `
              <label style="display: flex; align-items: center; gap: 0.5rem; background: #ffffff; padding: 0.6rem; border: 1px solid var(--admin-border); border-radius: 8px; cursor: pointer;">
                <input type="checkbox" value="${ord._id}" ${isChecked ? 'checked' : ''} onchange="handleOrderSelect('${ord._id}', this.checked)">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(ord.orderNumber)}</div>
                  <div style="font-size: 0.75rem; color: var(--admin-muted);">${escapeHtml(ord.customerName)} (${ord.items.length} items)</div>
                </div>
              </label>
            `;
          })
          .join('')}
      </div>
    `;

    generatePackingList();
  } catch (err) {
    container.innerHTML = `<div style="color: var(--admin-danger);">${escapeHtml(err.message)}</div>`;
  }
}

function handleOrderSelect(orderId, isChecked) {
  if (isChecked) {
    selectedOrderIds.add(orderId);
  } else {
    selectedOrderIds.delete(orderId);
  }
  generatePackingList();
}

function toggleSelectAll() {
  if (selectedOrderIds.size === eligibleOrders.length) {
    selectedOrderIds.clear();
  } else {
    eligibleOrders.forEach((o) => selectedOrderIds.add(o._id));
  }
  loadEligibleOrders();
}

async function generatePackingList() {
  const resultArea = document.getElementById('packingResultArea');
  if (!resultArea) return;

  if (selectedOrderIds.size === 0) {
    resultArea.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--admin-muted);">Select one or more orders above to generate packing list.</div>';
    return;
  }

  resultArea.innerHTML = '<div style="padding: 1rem; color: var(--admin-muted);">Generating checklist…</div>';

  try {
    const res = await adminFetch('/admin/orders/packing-list', {
      method: 'POST',
      body: JSON.stringify({ orderIds: Array.from(selectedOrderIds) }),
    });

    if (!res.success || !res.data) {
      resultArea.innerHTML = '<div style="color: var(--admin-danger);">Failed to calculate packing list.</div>';
      return;
    }

    const { ordersCount, orderNumbers, items } = res.data;
    const nowIST = auth.formatDateIST(new Date());

    resultArea.innerHTML = `
      <div class="printable-card" style="background: #ffffff; border: 1px solid var(--admin-border); border-radius: var(--admin-radius); padding: 1.25rem; margin-top: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--admin-border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.2rem; font-weight: 800; color: #0f172a;">📦 Packing Checklist / पॅकिंग यादी</h2>
            <div style="font-size: 0.8rem; color: var(--admin-muted);">Generated on: ${nowIST} | Orders (${ordersCount}): ${orderNumbers.join(', ')}</div>
          </div>
          <button class="btn-action btn-primary no-print" onclick="window.print()">
            🖨️ Print Packing List
          </button>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid var(--admin-border);">
              <th style="padding: 0.6rem; text-align: left; width: 40px;">✓</th>
              <th style="padding: 0.6rem; text-align: left;">Item Name / वस्तू</th>
              <th style="padding: 0.6rem; text-align: left;">Pack Size</th>
              <th style="padding: 0.6rem; text-align: right;">Total Qty</th>
              <th style="padding: 0.6rem; text-align: left;">In Orders</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it) => `
              <tr style="border-bottom: 1px solid var(--admin-border);">
                <td style="padding: 0.6rem;"><input type="checkbox" style="width: 18px; height: 18px;"></td>
                <td style="padding: 0.6rem; font-weight: 600;">
                  ${escapeHtml(it.nameEn)} <span style="color: var(--admin-muted); font-size: 0.85rem;">(${escapeHtml(it.nameMr)})</span>
                </td>
                <td style="padding: 0.6rem; color: var(--admin-muted);">${escapeHtml(it.packSize)}</td>
                <td style="padding: 0.6rem; text-align: right; font-weight: 800; font-size: 1.1rem; color: var(--admin-primary);">${it.totalQty}</td>
                <td style="padding: 0.6rem; font-size: 0.75rem; color: var(--admin-muted);">${it.orderNumbers.join(', ')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    resultArea.innerHTML = `<div style="color: var(--admin-danger);">${escapeHtml(err.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('packing');
  loadEligibleOrders();
});
