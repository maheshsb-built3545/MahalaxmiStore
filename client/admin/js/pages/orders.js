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

  // Background polling every 30s
  setInterval(() => {
    pollNewOrders();
  }, 30000);
});

let previousNewOrdersCount = null;
async function pollNewOrders() {
  try {
    const res = await window.AdminAPI.get('/admin/orders?limit=100');
    if (res.success && Array.isArray(res.data)) {
      const newOrders = res.data.filter((o) => o.status === 'new');
      if (previousNewOrdersCount !== null && newOrders.length > previousNewOrdersCount) {
        if (window.shell?.playOrderChime) window.shell.playOrderChime();
        if (window.AdminToast) {
          window.AdminToast.show(`नवीन ऑर्डर आली! (${newOrders.length - previousNewOrdersCount}) / New order received!`, 'info');
        }
      }
      previousNewOrdersCount = newOrders.length;
      allOrders = res.data;
      updateStatusCounts();
      if (currentTab === 'queue' && !advancingOrderIds.size && !window._activeActionSheet?.isOpen && !window._activePaymentSheet?.isOpen) {
        renderOrdersQueue();
      } else if (currentTab === 'packing') {
        renderPackingList();
      }
    }
  } catch (e) {
    // Silent fail on polling
  }
}

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

async function loadOrders(search = searchQuery) {
  const listEl = document.getElementById('ordersListContainer');
  if (listEl && !search) {
    listEl.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="skeleton" style="height: 120px; border-radius: 12px;"></div>
        <div class="skeleton" style="height: 120px; border-radius: 12px;"></div>
        <div class="skeleton" style="height: 120px; border-radius: 12px;"></div>
      </div>
    `;
  }

  try {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const res = await window.AdminAPI.get(`/admin/orders?limit=100${query}`);
    if (!res.success) throw new Error(res.message);
    allOrders = res.data || [];
    const newOrders = allOrders.filter((o) => o.status === 'new');
    if (previousNewOrdersCount === null) {
      previousNewOrdersCount = newOrders.length;
    }
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
          <div class="empty-state-icon"><svg class="icon icon--xl" aria-hidden="true"><use href="/images/icons.svg#warning"></use></svg></div>
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
        <div class="empty-state-icon"><svg class="icon icon--xl" aria-hidden="true"><use href="/images/icons.svg#box"></use></svg></div>
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
  let bg = '#f1f5f9';

  if (method === 'upi_qr') {
    label = status === 'paid' ? 'UPI Paid' : 'UPI Unverified';
    color = status === 'paid' ? '#166534' : '#b45309';
    bg = status === 'paid' ? '#dcfce7' : '#fef3c7';
  } else if (method === 'udhar') {
    label = 'उधारी (Udhar)';
    color = '#991b1b';
    bg = '#fee2e2';
  }

  return `<button type="button" onclick="event.stopPropagation(); window.openPaymentActionsModal('${order._id}')" style="cursor:pointer;font-weight:700;color:${color};background:${bg};border:1px solid ${color}40;border-radius:12px;padding:3px 8px;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px;" title="पेमेंट स्थिती बदला / Change Payment Status">${label} <svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#settings"></use></svg></button>`;
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
    btn.onclick = () => advanceOrderStatus(order, next.status, btn);
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
  const customerName = window.esc(order.customerName || order.address?.name || order.customer?.name || 'Customer');
  const village = window.esc(order.address?.line || order.address?.village || order.address?.area || 'Yesgaon');
  const phone = order.customerPhone || order.address?.phone || order.customer?.phone || '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  const itemsCount = (order.items || []).length;
  const statusMsg = `नमस्कार ${customerName}! महालक्ष्मी किराणाकडून तुमची ऑर्डर #${order.orderNumber} स्थिती: ${order.status}. एकूण रक्कम: ₹${order.total}. डिलिव्हरी वेळ: ${order.deliverySlot || 'Standard'}. काही अडचण असल्यास संपर्क करा: 9860924504.`;

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
    <div class="item-card-footer" style="display:flex;gap:6px;align-items:center;">
      ${next ? `
        <button type="button" class="btn btn-primary" id="btnAdvance_${order._id}" style="flex:1;" onclick="advanceOrderStatusById('${order._id}', '${next.status}')">
          ${next.label}
        </button>
      ` : '<span class="text-sm font-semibold" style="color:#16a34a;flex:1;display:inline-flex;align-items:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#check"></use></svg> पूर्ण झाले / Completed</span>'}
      ${phone ? `
        <a href="https://wa.me/91${digits}?text=${encodeURIComponent(statusMsg)}" target="_blank" class="btn btn-secondary" style="min-width:44px;min-height:44px;padding:0 10px;color:#16a34a;display:inline-flex;align-items:center;justify-content:center;" title="WhatsApp Customer">
          <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#whatsapp"></use></svg>
        </a>
      ` : ''}
      <button type="button" class="btn btn-secondary" style="min-width:44px;min-height:44px;padding:0 12px;font-size:1.25rem;" onclick="openOrderActionsSheetById('${order._id}')" title="अधिक पर्याय / More Actions">
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

window.openOrderActionsSheetById = (id) => {
  const order = allOrders.find((o) => o._id === id);
  if (order) openOrderActionsSheet(order);
};

function openOrderActionsSheet(order) {
  const phone = order.customerPhone || order.address?.phone || '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  const statusMsg = `नमस्कार! महालक्ष्मी किराणाकडून तुमची ऑर्डर #${order.orderNumber} स्थिती: ${order.status}. एकूण रक्कम: ₹${order.total}. संपर्क: 9860924504.`;

  const sheet = new window.AdminBottomSheet({
    title: `ऑर्डर #${order.orderNumber} कृती / Actions`,
    isSheetOnMobile: true,
  });

  const list = document.createElement('div');
  list.className = 'flex flex-col gap-2';
  list.style.padding = '8px 0';

  list.innerHTML = `
    <button type="button" class="btn btn-secondary" style="justify-content:flex-start;min-height:48px;display:inline-flex;align-items:center;gap:8px;" onclick="orderActionSheet_view('${order._id}')">
      <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#eye"></use></svg> संपूर्ण ऑर्डर तपशील / View Details
    </button>
    ${phone ? `
      <a href="tel:${phone}" class="btn btn-secondary" style="justify-content:flex-start;min-height:48px;display:inline-flex;align-items:center;gap:8px;">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#phone"></use></svg> ग्राहकाला कॉल करा / Call (${phone})
      </a>
      <a href="https://wa.me/91${digits}?text=${encodeURIComponent(statusMsg)}" target="_blank" class="btn btn-secondary" style="justify-content:flex-start;min-height:48px;color:#16a34a;display:inline-flex;align-items:center;gap:8px;">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#whatsapp"></use></svg> WhatsApp संदेश / WhatsApp
      </a>
    ` : ''}
    <button type="button" class="btn btn-secondary" style="justify-content:flex-start;min-height:48px;display:inline-flex;align-items:center;gap:8px;" onclick="printThermalBill('${order._id}')">
      <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#print"></use></svg> थर्मल पावती प्रिंट / Print Slip
    </button>
    <button type="button" class="btn btn-secondary" style="justify-content:flex-start;min-height:48px;display:inline-flex;align-items:center;gap:8px;" onclick="openPaymentActionsModal('${order._id}')">
      <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#credit"></use></svg> पेमेंट स्थिती / Payment Actions (${order.paymentStatus || 'pending'})
    </button>
    ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
      <button type="button" class="btn btn-danger" style="justify-content:flex-start;min-height:48px;margin-top:8px;display:inline-flex;align-items:center;gap:8px;" onclick="promptCancelOrder('${order._id}')">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#close"></use></svg> ऑर्डर रद्द करा (साठा पूर्ववत होईल) / Cancel Order
      </button>
    ` : ''}
  `;

  sheet.setContent(list);
  sheet.open();
  window._activeActionSheet = sheet;
}

window.orderActionSheet_view = (id) => {
  if (window._activeActionSheet) window._activeActionSheet.close();
  const order = allOrders.find((o) => o._id === id);
  if (order) openOrderDetail(order);
};

window.openPaymentActionsModal = (id) => {
  if (window._activeActionSheet) window._activeActionSheet.close();
  const order = allOrders.find((o) => o._id === id);
  if (!order) return;

  const sheet = new window.AdminBottomSheet({
    title: `पेमेंट कृती — ऑर्डर #${order.orderNumber}`,
    isSheetOnMobile: true,
  });

  const content = document.createElement('div');
  content.className = 'flex flex-col gap-3';
  content.style.padding = '12px 0';

  content.innerHTML = `
    <div style="background:var(--bg-subtle);padding:12px;border-radius:10px;font-size:0.9rem;">
      <div><strong>पद्धत / Method:</strong> ${order.paymentMethod}</div>
      <div><strong>सध्याची स्थिती / Current:</strong> ${order.paymentStatus}</div>
      <div><strong>रक्कम / Amount:</strong> ${window.AdminFormat.currency(order.total)}</div>
    </div>
    <div class="flex flex-col gap-2">
      <button type="button" class="btn btn-primary" style="min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;" onclick="submitPaymentStatus('${order._id}', 'paid')">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#check"></use></svg> पेमेंट जमा (खात्री करा) / Mark Paid
      </button>
      <button type="button" class="btn btn-secondary" style="min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;" onclick="submitPaymentStatus('${order._id}', 'pending')">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#clock"></use></svg> पेमेंट बाकी / Mark Unpaid
      </button>
    </div>
  `;

  sheet.setContent(content);
  sheet.open();
  window._activePaymentSheet = sheet;
};

window.submitPaymentStatus = async (id, status) => {
  try {
    let utr = '';
    if (status === 'paid') {
      utr = prompt('पर्यायी UPI UTR / Reference ID प्रविष्ट करा (Optional):') || '';
    }
    const res = await window.AdminAPI.patch(`/admin/orders/${id}/payment`, {
      paymentStatus: status,
      paymentRef: utr,
    });
    if (res.success) {
      const order = allOrders.find((o) => o._id === id);
      if (order) {
        order.paymentStatus = status;
        if (utr) order.paymentRef = utr;
      }
      if (window._activePaymentSheet) window._activePaymentSheet.close();
      renderOrdersQueue();
      if (window.AdminToast) {
        window.AdminToast.show(`पेमेंट स्थिती अद्यतनित केली: ${status}`, 'success');
      }
    }
  } catch (err) {
    if (window.AdminToast) window.AdminToast.show('Error: ' + err.message, 'danger');
  }
};

window.promptCancelOrder = async (id) => {
  if (window._activeActionSheet) window._activeActionSheet.close();
  const reason = prompt('ऑर्डर रद्द केल्यास साठा पूर्ववत केला जाईल. कारण प्रविष्ट करा / Order cancellation will restore inventory stock. Enter reason:\n(उदा. ग्राहकाची विनंती / Customer request, माल उपलब्ध नाही / Out of stock)');
  if (!reason || !reason.trim()) {
    if (window.AdminToast) window.AdminToast.show('रद्द करण्याचे कारण आवश्यक आहे / Reason is required to cancel', 'warning');
    return;
  }

  try {
    const res = await window.AdminAPI.patch(`/admin/orders/${id}/cancel`, { note: reason.trim() });
    if (res.success) {
      if (window.AdminToast) {
        window.AdminToast.show('ऑर्डर रद्द केली व साठा पूर्ववत केला / Order cancelled and stock restored', 'success');
      }
      loadOrders();
    }
  } catch (err) {
    if (window.AdminToast) window.AdminToast.show('Error: ' + err.message, 'danger');
  }
};

const advancingOrderIds = new Set();
window.advanceOrderStatusById = (id, nextStatus) => {
  const order = allOrders.find((o) => o._id === id);
  if (order) advanceOrderStatus(order, nextStatus);
};

async function advanceOrderStatus(order, nextStatus, triggerBtn = null) {
  if (advancingOrderIds.has(order._id)) return; // Double-click race guard
  advancingOrderIds.add(order._id);

  const btn = triggerBtn || document.getElementById(`btnAdvance_${order._id}`);
  let oldText = '';
  if (btn) {
    oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'प्रक्रिया चालू... / Updating...';
  }

  try {
    let note = '';
    if (nextStatus === 'delivered' && order.paymentMethod === 'cod') {
      const confirmed = await window.AdminConfirm({
        title: 'रोख रक्कम जमा (Cash Collected)',
        message: `ग्राहकाकडून ₹${order.total} रोख रक्कम मिळाली आहे का?\nDid you collect ${window.AdminFormat.currency(order.total)} cash from customer?`,
        confirmText: 'होय, जमा झाले / Yes, Collected',
        cancelText: 'रद्द करा / Cancel',
      });
      if (!confirmed) return;
      note = 'Cash collected on delivery';
    } else if (nextStatus === 'delivered' && order.paymentMethod === 'udhar') {
      const confirmed = await window.AdminConfirm({
        title: 'उधारी डिलिव्हरी (Udhar Delivery)',
        message: `या ऑर्डरचे ₹${order.total} ग्राहकाच्या उधारी खात्यावर नोंदवून डिलिव्हरी पूर्ण करावी का?\nConfirm delivery and update customer credit ledger?`,
        confirmText: 'होय, पूर्ण करा / Deliver',
        cancelText: 'रद्द करा / Cancel',
      });
      if (!confirmed) return;
      note = 'Delivered on approved Udhar credit';
    }

    const res = await window.AdminAPI.patch(`/admin/orders/${order._id}/status`, {
      currentStatus: order.status,
      nextStatus,
      note,
    });

    if (res.success && res.data) {
      // In-place refresh with server data
      Object.assign(order, res.data);
      updateStatusCounts();
      renderOrdersQueue();
      if (window.AdminToast) {
        window.AdminToast.show(`ऑर्डर #${order.orderNumber} स्थिती: ${nextStatus}`, 'success');
      }
    }
  } catch (err) {
    if (window.AdminToast) {
      window.AdminToast.show(`Error: ${err.message}`, 'danger');
    } else {
      alert(`Error: ${err.message}`);
    }
  } finally {
    advancingOrderIds.delete(order._id);
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText;
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
        ${phone ? `<a href="tel:${phone}" class="btn btn-sm btn-outline" style="display:inline-flex;align-items:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#phone"></use></svg> Call ${phone}</a>` : ''}
      </div>
      <div class="text-sm text-muted" style="display:flex;align-items:center;gap:4px;">
        <svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#map-pin"></use></svg> ${village}${landmark ? ` (जवळ: ${landmark})` : ''}
      </div>
      ${phone ? `
        <div style="margin-top:8px;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="shareOrderWhatsApp('${order._id}')" style="background:#22c55e;color:#fff;border-color:#16a34a;display:inline-flex;align-items:center;gap:6px;">
            <svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#whatsapp"></use></svg> WhatsApp Customer
          </button>
        </div>
      ` : ''}
    </div>

    <!-- Items Pick Checklist -->
    <div>
      <h3 style="font-size:0.95rem;margin-bottom:8px;display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#list"></use></svg> साहित्याची यादी (Items Checklist)</h3>
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
      <button type="button" class="btn btn-secondary flex-1" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="printThermalBill('${order._id}')">
        <svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#print"></use></svg> बिल प्रिंट (Thermal Bill)
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
        window.AdminToast.show('ऑर्डर रद्द करण्यात आली / Order cancelled', 'success');
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
        <div class="empty-state-icon"><svg class="icon icon--xl" aria-hidden="true"><use href="/images/icons.svg#list"></use></svg></div>
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
        <h2 style="font-size:1.15rem;margin:0;display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--md" aria-hidden="true"><use href="/images/icons.svg#box"></use></svg> आजची पॅकिंग यादी (${packingOrders.length} ऑर्डर्स)</h2>
        <span class="text-xs text-muted">एकूण ${aggregated.length} प्रकारच्या वस्तू पॅक करायच्या आहेत.</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-sm btn-secondary" onclick="sharePackingWhatsApp()" style="background:#22c55e;color:#fff;border-color:#16a34a;display:inline-flex;align-items:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#whatsapp"></use></svg> WhatsApp</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="printPackingSlip()" style="display:inline-flex;align-items:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#print"></use></svg> प्रिंट (Print)</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="copyPackingText()" style="display:inline-flex;align-items:center;gap:4px;"><svg class="icon icon--xs" aria-hidden="true"><use href="/images/icons.svg#copy"></use></svg> कॉपी (Copy)</button>
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
  const lines = ['महालक्ष्मी किराणा — पॅकिंग यादी:\n'];
  items.forEach((item) => {
    const text = item.innerText.replace(/\n+/g, ' ');
    lines.push(`• ${text}`);
  });
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    if (window.AdminToast) window.AdminToast.show('पॅकिंग यादी कॉपी केली / Copied to clipboard', 'success');
  });
};

window.sharePackingWhatsApp = () => {
  const container = document.getElementById('packingListContainer');
  if (!container) return;
  const items = container.querySelectorAll('.flex.items-center.justify-between');
  const lines = ['*महालक्ष्मी किराणा — पॅकिंग यादी (Packing List)*\n'];
  items.forEach((item) => {
    const text = item.innerText.replace(/\n+/g, ' ').trim();
    lines.push(`• ${text}`);
  });
  const text = encodeURIComponent(lines.join('\n'));
  window.open(`https://wa.me/?text=${text}`, '_blank');
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

// Search input with debounce
let searchDebounceTimeout = null;
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'orderSearchInput') {
    searchQuery = e.target.value.trim();
    renderOrdersQueue();
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      loadOrders(searchQuery);
    }, 400);
  }
});

