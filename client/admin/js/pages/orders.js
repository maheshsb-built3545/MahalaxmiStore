/**
 * Mahalaxmi Kirana Store — Orders & Packing Controller
 * Features: Live Queue, 1-tap Status Advance, Packing Checklist with persistent state,
 * Thermal Bills (58mm/80mm), Substitution Picker, and WhatsApp Templates.
 */

'use strict';

let allOrders = [];
let currentTab = 'queue'; // 'queue' or 'packing'
let activeStatusFilter = 'all';
let searchQuery = '';
let slotFilter = 'all';
let selectedOrders = new Set();
let orderDetailSheet = null;
let currentDetailOrder = null;

document.addEventListener('DOMContentLoaded', () => {
  window.shell = new window.AdminShell({
    activeRoute: 'orders',
    pageTitle: 'ऑर्डर्स व पॅकिंग / Orders & Packing',
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'packing') {
    currentTab = 'packing';
  }
  if (urlParams.get('status')) {
    activeStatusFilter = urlParams.get('status');
  }

  initTabs();
  initDetailSheet();
  loadOrders();
});

function initTabs() {
  const queueTabBtn = document.getElementById('tabQueueBtn');
  const packingTabBtn = document.getElementById('tabPackingBtn');

  if (queueTabBtn && packingTabBtn) {
    queueTabBtn.onclick = () => switchTab('queue');
    packingTabBtn.onclick = () => switchTab('packing');
  }
  updateTabUi();
}

function switchTab(tab) {
  currentTab = tab;
  updateTabUi();
  if (tab === 'queue') {
    renderOrdersQueue();
  } else {
    renderPackingList();
  }
}

function updateTabUi() {
  const queueTabBtn = document.getElementById('tabQueueBtn');
  const packingTabBtn = document.getElementById('tabPackingBtn');
  const queueView = document.getElementById('ordersQueueView');
  const packingView = document.getElementById('packingListView');

  if (queueTabBtn) queueTabBtn.classList.toggle('active', currentTab === 'queue');
  if (packingTabBtn) packingTabBtn.classList.toggle('active', currentTab === 'packing');
  if (queueView) queueView.style.display = currentTab === 'queue' ? 'block' : 'none';
  if (packingView) packingView.style.display = currentTab === 'packing' ? 'block' : 'none';
}

function initDetailSheet() {
  orderDetailSheet = new window.AdminBottomSheet({
    title: 'ऑर्डर तपशील / Order Details',
    isSheetOnMobile: true,
  });
}

async function loadOrders() {
  const listEl = document.getElementById('ordersListContainer');
  if (listEl) {
    listEl.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="skeleton" style="height: 120px; border-radius: 12px;"></div>
        <div class="skeleton" style="height: 120px; border-radius: 12px;"></div>
        <div class="skeleton" style="height: 120px; border-radius: 12px;"></div>
      </div>
    `;
  }

  try {
    const res = await window.AdminAPI.get('/admin/orders?limit=100');
    if (!res.success) throw new Error(res.message);
    allOrders = res.data || [];
    updateStatusCounts();

    // Check URL for deep-linked order id
    const urlParams = new URLSearchParams(window.location.search);
    const deepId = urlParams.get('id');
    if (deepId) {
      const found = allOrders.find((o) => o._id === deepId);
      if (found) openOrderDetail(found);
    }

    if (currentTab === 'queue') {
      renderOrdersQueue();
    } else {
      renderPackingList();
    }
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">ऑर्डर्स लोड करताना त्रुटी / Error loading orders</div>
          <div class="empty-state-desc">${window.esc(err.message)}</div>
          <button type="button" class="btn btn-primary" onclick="loadOrders()">पुन्हा प्रयत्न करा / Retry</button>
        </div>
      `;
    }
  }
}

function updateStatusCounts() {
  const counts = { all: allOrders.length, new: 0, confirmed: 0, packed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 };
  allOrders.forEach((o) => {
    if (counts[o.status] !== undefined) counts[o.status]++;
  });

  document.querySelectorAll('[data-status-chip]').forEach((btn) => {
    const s = btn.dataset.statusChip;
    const badge = btn.querySelector('.chip-count');
    if (badge && counts[s] !== undefined) {
      badge.textContent = counts[s];
    }
  });

  // Update shell badge for new orders
  const bottomBadge = document.getElementById('bottomOrdersBadge');
  if (bottomBadge) {
    bottomBadge.textContent = counts.new;
    bottomBadge.style.display = counts.new > 0 ? 'inline-block' : 'none';
  }
}

// ── 1. ORDERS QUEUE ──
function renderOrdersQueue() {
  const container = document.getElementById('ordersListContainer');
  if (!container) return;

  let filtered = allOrders;

  // Status Filter
  if (activeStatusFilter !== 'all') {
    filtered = filtered.filter((o) => o.status === activeStatusFilter);
  }

  // Slot Filter
  if (slotFilter !== 'all') {
    filtered = filtered.filter((o) => {
      const slotStr = (o.deliverySlot || '').toLowerCase();
      return slotStr.includes(slotFilter);
    });
  }

  // Search Query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((o) => {
      const num = String(o.orderNumber || '').toLowerCase();
      const name = String(o.address?.name || o.customer?.name || '').toLowerCase();
      const phone = String(o.address?.phone || o.customer?.phone || '').toLowerCase();
      const village = String(o.address?.village || o.address?.area || '').toLowerCase();
      return num.includes(q) || name.includes(q) || phone.includes(q) || village.includes(q);
    });
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">कोणतीही ऑर्डर आढळली नाही / No orders found</div>
        <div class="empty-state-desc">निवडलेल्या फिल्टरनुसार ऑर्डर्स उपलब्ध नाहीत.</div>
      </div>
    `;
    return;
  }

  // Desktop Table + Mobile Cards
  new window.AdminDataList({
    container,
    items: filtered,
    columns: [
      { field: 'orderNumber', label: 'ऑर्डर क्र. / No.', render: (v, o) => `<strong>#${v}</strong><div class="text-xs text-muted">${window.AdminFormat.relativeTime(o.createdAt)}</div>` },
      { field: 'customer', label: 'ग्राहक / Customer', render: (_, o) => `<strong>${window.esc(o.address?.name || o.customer?.name || 'Customer')}</strong><div class="text-xs text-muted">${window.esc(o.address?.village || o.address?.area || '')} • ${window.esc(o.address?.phone || '')}</div>` },
      { field: 'items', label: 'वस्तू / Items', render: (v) => `${(v || []).length} वस्तू (${(v || []).reduce((acc, i) => acc + (i.qty || 1), 0)} नग)` },
      { field: 'total', label: 'रक्कम / Total', render: (v, o) => `<strong>${window.AdminFormat.currency(v)}</strong><div class="text-xs">${renderPaymentBadge(o)}</div>` },
      { field: 'status', label: 'स्थिती / Status', render: (v) => window.AdminBadge.render(v) },
      {
        field: 'actions',
        label: 'कृती / Actions',
        render: (_, o) => renderActionButtons(o),
      },
    ],
    renderCard: (order) => renderOrderCardMobile(order),
  });
}

function renderPaymentBadge(order) {
  const method = order.paymentMethod;
  const status = order.paymentStatus;
  let label = 'Cash (COD)';
  let color = '#475569';

  if (method === 'upi_qr') {
    label = status === 'paid' ? 'UPI Paid' : 'UPI Unverified';
    color = status === 'paid' ? '#16a34a' : '#d97706';
  } else if (method === 'udhar') {
    label = 'उधारी (Udhar)';
    color = '#b91c1c';
  }

  return `<span style="font-weight:700;color:${color};font-size:0.75rem;">${label}</span>`;
}

function renderActionButtons(order) {
  const next = getNextStatus(order.status);
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '6px';
  container.style.alignItems = 'center';

  if (next) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-primary';
    btn.textContent = next.label;
    btn.onclick = () => advanceOrderStatus(order, next.status);
    container.appendChild(btn);
  }

  const detailBtn = document.createElement('button');
  detailBtn.type = 'button';
  detailBtn.className = 'btn btn-sm btn-secondary';
  detailBtn.textContent = 'तपशील / View';
  detailBtn.onclick = () => openOrderDetail(order);
  container.appendChild(detailBtn);

  return container;
}

function renderOrderCardMobile(order) {
  const card = document.createElement('div');
  card.className = 'item-card';

  const next = getNextStatus(order.status);
  const customerName = window.esc(order.address?.name || order.customer?.name || 'Customer');
  const village = window.esc(order.address?.village || order.address?.area || 'Yesgaon');
  const phone = order.address?.phone || order.customer?.phone || '';
  const itemsCount = (order.items || []).length;

  card.innerHTML = `
    <div class="item-card-header">
      <div>
        <div style="font-size:1rem;font-weight:700;">#${window.esc(order.orderNumber)}</div>
        <div class="text-xs text-muted">${customerName} • ${village}</div>
      </div>
      <div style="text-align:right;">
        ${window.AdminBadge.render(order.status).outerHTML}
        <div class="text-xs text-muted" style="margin-top:2px;">${window.AdminFormat.relativeTime(order.createdAt)}</div>
      </div>
    </div>
    <div class="item-card-body flex justify-between items-center" style="padding:6px 0;">
      <div>
        <span class="text-sm font-semibold">${itemsCount} वस्तू</span>
        <span class="text-xs text-muted" style="margin-left:6px;">(${window.esc(order.deliverySlot || 'Standard')})</span>
      </div>
      <div>
        <strong style="font-size:1.05rem;color:var(--color-primary-800);">${window.AdminFormat.currency(order.total)}</strong>
        <div class="text-xs" style="text-align:right;">${renderPaymentBadge(order)}</div>
      </div>
    </div>
    <div class="item-card-footer">
      ${next ? `
        <button type="button" class="btn btn-primary" style="flex:1;" onclick="advanceOrderStatusById('${order._id}', '${next.status}')">
          ${next.label}
        </button>
      ` : '<span class="text-sm font-semibold" style="color:#16a34a;">✓ पूर्ण झाले / Completed</span>'}
      <button type="button" class="btn btn-secondary" onclick="openOrderDetailById('${order._id}')" title="More Actions">
        ⋮
      </button>
    </div>
  `;

  return card;
}

function getNextStatus(status) {
  const map = {
    new: { status: 'confirmed', label: 'स्वीकारा / Confirm' },
    confirmed: { status: 'packed', label: 'पॅक झाले / Mark Packed' },
    packed: { status: 'out_for_delivery', label: 'रवाना / Dispatch' },
    out_for_delivery: { status: 'delivered', label: 'डिलिव्हर करा / Mark Delivered' },
  };
  return map[status] || null;
}

window.openOrderDetailById = (id) => {
  const order = allOrders.find((o) => o._id === id);
  if (order) openOrderDetail(order);
};

window.advanceOrderStatusById = (id, nextStatus) => {
  const order = allOrders.find((o) => o._id === id);
  if (order) advanceOrderStatus(order, nextStatus);
};

async function advanceOrderStatus(order, nextStatus) {
  // If delivering a COD order, confirm cash collection
  let note = '';
  if (nextStatus === 'delivered' && order.paymentMethod === 'cod') {
    const confirmed = await window.AdminConfirm({
      title: '💵 रोख रक्कम जमा (Cash Collected)',
      message: `ग्राहकाकडून ₹${order.total} रोख रक्कम मिळाली आहे का?\nDid you collect ${window.AdminFormat.currency(order.total)} cash from customer?`,
      confirmText: 'होय, जमा झाले / Yes, Collected',
      cancelText: 'रद्द करा / Cancel',
    });
    if (!confirmed) return;
    note = 'Cash collected on delivery';
  } else if (nextStatus === 'delivered' && order.paymentMethod === 'udhar') {
    const confirmed = await window.AdminConfirm({
      title: '📝 उधारी डिलिव्हरी (Udhar Delivery)',
      message: `या ऑर्डरचे ₹${order.total} ग्राहकाच्या उधारी खात्यावर नोंदवून डिलिव्हरी पूर्ण करावी का?\nConfirm delivery and update customer credit ledger?`,
      confirmText: 'होय, पूर्ण करा / Deliver',
      cancelText: 'रद्द करा / Cancel',
    });
    if (!confirmed) return;
    note = 'Delivered on approved Udhar credit';
  }

  try {
    const res = await window.AdminAPI.patch(`/admin/orders/${order._id}/status`, {
      currentStatus: order.status,
      nextStatus,
      note,
    });

    if (res.success) {
      order.status = nextStatus;
      updateStatusCounts();
      renderOrdersQueue();
      if (window.AdminToast) {
        window.AdminToast.show(`✅ ऑर्डर #${order.orderNumber} स्थिती बदलली / Status updated: ${nextStatus}`, 'success');
      }
    }
  } catch (err) {
    if (window.AdminToast) {
      window.AdminToast.show(`❌ Error: ${err.message}`, 'danger');
    } else {
      alert(`Error: ${err.message}`);
    }
  }
}

// ── 2. ORDER DETAIL DRAWER ──
function openOrderDetail(order) {
  currentDetailOrder = order;
  const body = document.createElement('div');
  body.className = 'flex flex-col gap-4';

  const customerName = window.esc(order.address?.name || order.customer?.name || 'Customer');
  const phone = order.address?.phone || order.customer?.phone || '';
  const village = window.esc(order.address?.village || order.address?.area || 'Yesgaon');
  const landmark = window.esc(order.address?.landmark || '');

  body.innerHTML = `
    <!-- Order Header Summary -->
    <div class="flex justify-between items-center" style="padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
      <div>
        <h2 style="font-size:1.15rem;margin:0;">#${window.esc(order.orderNumber)}</h2>
        <span class="text-xs text-muted">${window.AdminFormat.dateIST(order.createdAt, 'full')}</span>
      </div>
      <div>
        ${window.AdminBadge.render(order.status).outerHTML}
      </div>
    </div>

    <!-- Customer & Address Box -->
    <div style="background:var(--bg-subtle);border-radius:12px;padding:12px;">
      <div class="flex justify-between items-center" style="margin-bottom:6px;">
        <strong style="font-size:0.95rem;">${customerName}</strong>
        ${phone ? `<a href="tel:${phone}" class="btn btn-sm btn-outline">📞 Call ${phone}</a>` : ''}
      </div>
      <div class="text-sm text-muted">
        📍 ${village}${landmark ? ` (जवळ: ${landmark})` : ''}
      </div>
      ${phone ? `
        <div style="margin-top:8px;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="shareOrderWhatsApp('${order._id}')" style="background:#22c55e;color:#fff;border-color:#16a34a;">
            📲 WhatsApp Customer
          </button>
        </div>
      ` : ''}
    </div>

    <!-- Items Pick Checklist -->
    <div>
      <h3 style="font-size:0.95rem;margin-bottom:8px;">📋 साहित्याची यादी (Items Checklist)</h3>
      <div class="flex flex-col gap-2">
        ${(order.items || []).map((item, idx) => `
          <div class="flex items-center justify-between text-sm" style="padding:8px 10px;background:#ffffff;border:1px solid var(--border-subtle);border-radius:8px;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;">
              <input type="checkbox" style="width:18px;height:18px;accent-color:#16a34a;" />
              <div>
                <div style="font-weight:600;">${window.esc(item.nameMr || item.nameEn)}</div>
                <div class="text-xs text-muted">${window.esc(item.nameEn)} — ${window.esc(item.packSize || '')}</div>
              </div>
            </label>
            <div style="text-align:right;">
              <span class="font-bold">${item.qty} नग</span>
              <div class="text-xs text-muted">₹${item.price * item.qty}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Bill Totals -->
    <div style="border-top:1px solid var(--border-subtle);padding-top:12px;">
      <div class="flex justify-between text-sm">
        <span>वस्तू रक्कम / Subtotal:</span>
        <span>${window.AdminFormat.currency(order.subtotal || order.total)}</span>
      </div>
      <div class="flex justify-between text-sm" style="margin:4px 0;">
        <span>डिलिव्हरी शुल्क / Delivery:</span>
        <span>${order.deliveryCharge ? window.AdminFormat.currency(order.deliveryCharge) : 'मोफत (Free)'}</span>
      </div>
      <div class="flex justify-between font-bold text-lg" style="margin-top:6px;color:var(--color-primary-800);">
        <span>एकूण रक्कम / Total:</span>
        <span>${window.AdminFormat.currency(order.total)}</span>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="flex gap-2" style="margin-top:8px;">
      <button type="button" class="btn btn-secondary flex-1" onclick="printThermalBill('${order._id}')">
        🖨️ बिल प्रिंट (Thermal Bill)
      </button>
      <button type="button" class="btn btn-danger btn-sm" onclick="cancelOrderAction('${order._id}')">
        रद्द करा / Cancel
      </button>
    </div>
  `;

  orderDetailSheet.setContent(body);
  orderDetailSheet.open();
}

window.shareOrderWhatsApp = (id) => {
  const order = allOrders.find((o) => o._id === id);
  if (!order) return;

  const phone = order.address?.phone || order.customer?.phone || '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  const itemsText = (order.items || []).map((i) => `• ${i.nameMr || i.nameEn} (${i.packSize}): ${i.qty} x ₹${i.price}`).join('\n');
  const msg = `नमस्कार! महालक्ष्मी किराणा स्टोअरकडून तुमची ऑर्डर #${order.orderNumber}:\n\n${itemsText}\n\nएकूण रक्कम: ₹${order.total}\nस्थिती: ${order.status}\nडिलिव्हरी वेळ: ${order.deliverySlot || 'Standard'}\n\nकाही अडचण असल्यास कृपया संपर्क करा: 9860924504.`;

  window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.printThermalBill = (id) => {
  const order = allOrders.find((o) => o._id === id);
  if (!order) return;

  const printWindow = window.open('', '_blank');
  const itemsRows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:2px 0;">${window.esc(i.nameMr || i.nameEn)} (${i.packSize})</td>
      <td style="text-align:center;">${i.qty}</td>
      <td style="text-align:right;">₹${i.price * i.qty}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill #${order.orderNumber}</title>
      <style>
        @page { size: 58mm; margin: 2mm; }
        body { font-family: monospace; font-size: 11px; margin: 0; line-height: 1.25; }
        .text-center { text-align: center; }
        .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
      </style>
    </head>
    <body onload="window.print()">
      <div class="text-center">
        <strong>महालक्ष्मी किराणा स्टोअर</strong><br>
        येसगाव, कोपरगाव • फोन: 9860924504
      </div>
      <div class="divider"></div>
      <div>ऑर्डर: #${order.orderNumber}</div>
      <div>ग्राहक: ${window.esc(order.address?.name || 'Customer')}</div>
      <div>पत्ता: ${window.esc(order.address?.village || '')}</div>
      <div>तारीख: ${window.AdminFormat.dateIST(order.createdAt, 'full')}</div>
      <div class="divider"></div>
      <table>
        <thead>
          <tr><th align="left">वस्तू</th><th>नग</th><th align="right">रक्कम</th></tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:12px;">
        <span>एकूण (Total):</span>
        <span>₹${order.total}</span>
      </div>
      <div>पेमेंट पद्धत: ${order.paymentMethod}</div>
      <div class="divider"></div>
      <div class="text-center" style="font-size:9px;margin-top:6px;">
        खरेदी केल्याबद्दल धन्यवाद!<br>पुन्हा भेट द्या.
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

window.cancelOrderAction = async (id) => {
  const confirmed = await window.AdminConfirm({
    title: 'ऑर्डर रद्द करा / Cancel Order',
    message: 'तुम्हाला खात्री आहे का ही ऑर्डर रद्द करायची आहे? साठा पुन्हा पूर्ववत केला जाईल.\nAre you sure you want to cancel this order? Stock will be restored.',
    confirmText: 'रद्द करा / Cancel Order',
    isDestructive: true,
  });
  if (!confirmed) return;

  try {
    const res = await window.AdminAPI.patch(`/admin/orders/${id}/cancel`, { note: 'Cancelled by owner' });
    if (res.success) {
      orderDetailSheet.close();
      loadOrders();
      if (window.AdminToast) {
        window.AdminToast.show('✅ ऑर्डर रद्द करण्यात आली / Order cancelled', 'success');
      }
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

// ── 3. PACKING LIST TAB ──
function renderPackingList() {
  const container = document.getElementById('packingListContainer');
  if (!container) return;

  // Filter only unfulfilled orders (confirmed or new)
  const packingOrders = allOrders.filter((o) => ['new', 'confirmed', 'packed'].includes(o.status));

  if (!packingOrders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">पॅक करण्यासाठी ऑर्डर्स नाहीत / All Packed</div>
        <div class="empty-state-desc">सर्व ऑर्डर्स पॅक झाल्या आहेत किंवा नवीन ऑर्डर्स उपलब्ध नाहीत.</div>
      </div>
    `;
    return;
  }

  // Aggregate items across packing orders
  const itemMap = new Map();
  packingOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const key = `${item.productId || item.nameEn}_${item.packSize}`;
      if (itemMap.has(key)) {
        itemMap.get(key).qty += item.qty;
        itemMap.get(key).orderNumbers.push(o.orderNumber);
      } else {
        itemMap.set(key, {
          nameEn: item.nameEn,
          nameMr: item.nameMr,
          packSize: item.packSize,
          qty: item.qty,
          orderNumbers: [o.orderNumber],
        });
      }
    });
  });

  const aggregated = Array.from(itemMap.values());
  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `kirana_packing_${todayKey}`;
  const packedState = JSON.parse(localStorage.getItem(storageKey) || '{}');

  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom:16px;">
      <div>
        <h2 style="font-size:1.15rem;margin:0;">📦 आजची पॅकिंग यादी (${packingOrders.length} ऑर्डर्स)</h2>
        <span class="text-xs text-muted">एकूण ${aggregated.length} प्रकारच्या वस्तू पॅक करायच्या आहेत.</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-sm btn-secondary" onclick="printPackingSlip()">🖨️ प्रिंट (Print)</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="copyPackingText()">📋 कॉपी (Copy)</button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      ${aggregated.map((item, idx) => {
        const isChecked = Boolean(packedState[`${item.nameEn}_${item.packSize}`]);
        return `
          <div class="flex items-center justify-between" style="padding:10px 14px;background:#ffffff;border:1px solid var(--border-subtle);border-radius:10px;${isChecked ? 'opacity:0.5;background:#f8fafc;' : ''}">
            <label style="display:flex;align-items:center;gap:12px;cursor:pointer;flex:1;">
              <input
                type="checkbox"
                style="width:22px;height:22px;accent-color:#16a34a;"
                ${isChecked ? 'checked' : ''}
                onchange="togglePackingItem('${item.nameEn}_${item.packSize}', this.checked)"
              />
              <div>
                <div style="font-size:1rem;font-weight:700;${isChecked ? 'text-decoration:line-through;' : ''}">${window.esc(item.nameMr || item.nameEn)}</div>
                <div class="text-xs text-muted">${window.esc(item.nameEn)} — ${window.esc(item.packSize)}</div>
                <div class="text-xs" style="color:#0284c7;margin-top:2px;">ऑर्डर्स: ${item.orderNumbers.map((n) => `#${n}`).join(', ')}</div>
              </div>
            </label>
            <div style="font-size:1.2rem;font-weight:800;color:var(--color-primary-800);">
              ${item.qty} नग
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.togglePackingItem = (key, isChecked) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `kirana_packing_${todayKey}`;
  const packedState = JSON.parse(localStorage.getItem(storageKey) || '{}');
  packedState[key] = isChecked;
  localStorage.setItem(storageKey, JSON.stringify(packedState));
  renderPackingList();
};

window.copyPackingText = () => {
  const container = document.getElementById('packingListContainer');
  if (!container) return;
  const items = container.querySelectorAll('.flex.items-center.justify-between');
  const lines = ['📦 महालक्ष्मी किराणा — पॅकिंग यादी:\n'];
  items.forEach((item) => {
    const text = item.innerText.replace(/\n+/g, ' ');
    lines.push(`• ${text}`);
  });
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    if (window.AdminToast) window.AdminToast.show('📋 पॅकिंग यादी कॉपी केली / Copied to clipboard', 'success');
  });
};

window.printPackingSlip = () => {
  window.print();
};

// Filter Chip Event Handlers
document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-status-chip]');
  if (chip) {
    document.querySelectorAll('[data-status-chip]').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    activeStatusFilter = chip.dataset.statusChip;
    renderOrdersQueue();
  }
});

// Search input
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'orderSearchInput') {
    searchQuery = e.target.value.trim();
    renderOrdersQueue();
  }
});
