/**
 * frontend/admin/js/admin-orders.js
 * Admin orders queue, status progression, cancellation modal, WhatsApp alerts, and payment updates.
 */

'use strict';

let currentFilterStatus = 'all';
let currentFilterDate = 'all';
let currentSearch = '';
let currentPage = 1;
let selectedOrderForCancel = null;

const STATUS_TRANSITIONS = {
  new: { next: 'confirmed', label: 'Confirm Order (ऑर्डर निश्चित करा) →' },
  confirmed: { next: 'packed', label: 'Mark Packed (पॅक झाली) →' },
  packed: { next: 'out_for_delivery', label: 'Out for Delivery (डिलिव्हरीसाठी निघाली) →' },
  out_for_delivery: { next: 'delivered', label: 'Mark Delivered (डिलिव्हर झाली) ✓' },
};

function getWhatsAppStatusMessage(order, status) {
  const num = order.orderNumber;
  switch (status) {
    case 'confirmed':
      return `नमस्ते ${order.customerName}, महालक्ष्मी किराणा स्टोअरवरून तुमची ऑर्डर #${num} कन्फर्म झाली आहे. आम्ही लवकरच पॅक करत आहोत.\n\nHello ${order.customerName}, your Mahalaxmi Kirana order #${num} is confirmed and being packed.`;
    case 'packed':
      return `नमस्ते ${order.customerName}, तुमची ऑर्डर #${num} पॅक झाली आहे आणि डिलिव्हरीसाठी तयार आहे.\n\nYour order #${num} is packed and ready for delivery.`;
    case 'out_for_delivery':
      return `नमस्ते ${order.customerName}, तुमची ऑर्डर #${num} डिलिव्हरीसाठी निघाली आहे. कृपया तयार राहा.\n\nYour order #${num} is out for delivery!`;
    case 'delivered':
      return `नमस्ते ${order.customerName}, तुमची ऑर्डर #${num} यशस्वीरित्या डिलिव्हर झाली आहे! महालक्ष्मी किराणामधून खरेदी केल्याबद्दल धन्यवाद.\n\nYour order #${num} has been delivered. Thank you for shopping with Mahalaxmi Kirana!`;
    case 'cancelled':
      return `नमस्ते ${order.customerName}, तुमची ऑर्डर #${num} रद्द करण्यात आली आहे. काही अडचण असल्यास कृपया दुकानाशी संपर्क साधा.\n\nYour order #${num} has been cancelled. Please contact us for queries.`;
    default:
      return `नमस्ते ${order.customerName}, महालक्ष्मी किराणा ऑर्डर #${num} बाबत.\n\nRegarding your order #${num}.`;
  }
}

async function loadOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;

  container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--admin-muted);">Loading orders… / ऑर्डर्स लोड होत आहेत…</div>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      status: currentFilterStatus,
      date: currentFilterDate,
    });
    if (currentSearch) params.set('search', currentSearch);

    const res = await adminFetch(`/admin/orders?${params.toString()}`);
    if (!res.success || !res.data) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center;">Failed to load orders.</div>';
      return;
    }

    if (res.data.length === 0) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--admin-muted);">No orders found matching filters.</div>';
      return;
    }

    container.innerHTML = res.data.map(renderOrderCard).join('');
    renderPagination(res.pagination);
  } catch (err) {
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--admin-danger);">${escapeHtml(err.message)}</div>`;
  }
}

function renderOrderCard(ord) {
  const orderNum = escapeHtml(ord.orderNumber);
  const custName = escapeHtml(ord.customerName);
  const custPhone = escapeHtml(ord.customerPhone);
  const rawPhone = normalizePhone(ord.customerPhone);
  const dateFormatted = auth.formatDateIST(ord.createdAt);
  const status = ord.status;
  const badgeClass = `badge-${escapeHtml(status)}`;
  const displayStatus = escapeHtml(status.replace(/_/g, ' '));
  const isPaid = ord.paymentStatus === 'paid';

  const nextStep = STATUS_TRANSITIONS[status];

  // Action buttons
  let actionHtml = '';

  if (nextStep) {
    actionHtml += `
      <button class="btn-action btn-primary" onclick="advanceOrderStatus('${ord._id}', '${status}', '${nextStep.next}', '${ord.paymentMethod}')">
        ${nextStep.label}
      </button>
    `;
  }

  // WhatsApp notification button
  const waMsg = getWhatsAppStatusMessage(ord, status);
  const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(waMsg)}`;
  actionHtml += `
    <a href="${waUrl}" target="_blank" class="btn-action btn-whatsapp" title="Send status update to customer on WhatsApp">
      💬 WhatsApp Notify
    </a>
  `;

  // Payment mark paid button if not paid
  if (!isPaid && status !== 'cancelled') {
    actionHtml += `
      <button class="btn-action btn-outline" onclick="markOrderPaid('${ord._id}')">
        💳 Mark as Paid
      </button>
    `;
  }

  // Cancel button if not delivered or cancelled
  if (status !== 'delivered' && status !== 'cancelled') {
    actionHtml += `
      <button class="btn-action btn-danger" onclick="openCancelModal('${ord._id}', '${orderNum}')">
        ✕ Cancel
      </button>
    `;
  }

  // R5: Propose Substitute button for new and confirmed orders (ORD-06)
  if (['new', 'confirmed'].includes(status)) {
    actionHtml += `
      <button class="btn-action btn-outline" style="border-color:#d97706;color:#b45309;" onclick="openSubstitutionModal('${ord._id}')">
        🔄 Propose Substitute
      </button>
    `;
  }

  // Item lines preview
  const itemsPreview = ord.items
    .map((it) => `${escapeHtml(it.nameEn)} (${escapeHtml(it.packSize)}) × ${it.qty}`)
    .join(', ');

  // R5: Substitution preview section
  let subHtml = '';
  if (ord.substitutions && ord.substitutions.length > 0) {
    subHtml = `
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:6px;padding:6px 10px;margin:6px 0;font-size:0.8rem;">
        ${ord.substitutions.map((s) => {
          const isPending  = s.status === 'pending';
          const isAccepted = s.status === 'accepted';
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;gap:8px;">
              <span><strong>🔄 Substitution:</strong> <span style="text-decoration:line-through;color:#94a3b8;">${escapeHtml(s.originalNameEn)}</span> ➔ <strong style="color:#047857;">${escapeHtml(s.proposedNameEn)}</strong> (Qty: ${s.proposedQty}, ₹${s.priceDiff >= 0 ? '+' : ''}${s.priceDiff})</span>
              <span style="font-weight:700;font-size:0.75rem;padding:1px 6px;border-radius:8px;${
                isPending ? 'background:#fde047;color:#854d0e;' : (isAccepted ? 'background:#bbf7d0;color:#166534;' : 'background:#fecaca;color:#991b1b;')
              }">${s.status.toUpperCase()}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <div class="order-card" id="order-${ord._id}">
      <div class="order-card-header">
        <div>
          <span class="order-num">${orderNum}</span>
          <div class="order-date">${dateFormatted}</div>
        </div>
        <div>
          <span class="badge ${badgeClass}">${displayStatus}</span>
          <span class="badge" style="background: ${isPaid ? '#dcfce7' : '#fee2e2'}; color: ${isPaid ? '#166534' : '#991b1b'}; margin-left: 4px;">
            ${isPaid ? 'PAID' : 'PAYMENT PENDING'}
          </span>
        </div>
      </div>

      <div class="customer-row">
        <div>
          <strong>${custName}</strong>
          <div style="font-size: 0.8rem; color: var(--admin-muted); margin-top: 2px;">
            📍 ${escapeHtml(ord.address.line)}${ord.address.landmark ? ', ' + escapeHtml(ord.address.landmark) : ''}, ${escapeHtml(ord.address.pincode)}
          </div>
          ${ord.note ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:3px 7px;margin-top:4px;font-size:0.82rem;color:#92400e;"><strong>📝 Note:</strong> ${escapeHtml(ord.note)}</div>` : ''}
          ${ord.locationPin ? `<div style="margin-top:4px;font-size:0.8rem;"><a href="${escapeHtml(ord.locationPin.startsWith('http') ? ord.locationPin : 'https://maps.google.com/?q=' + encodeURIComponent(ord.locationPin))}" target="_blank" rel="noopener" style="color:#047857;font-weight:700;">🗺️ Map / Landmark Link →</a></div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <a href="tel:+${rawPhone}" class="phone-link">📞 ${custPhone}</a>
          <a href="https://maps.google.com/?q=${encodeURIComponent(ord.address.line + ' ' + (ord.address.landmark || '') + ' ' + ord.address.pincode)}" target="_blank" rel="noopener" style="font-size:0.75rem;color:#047857;text-decoration:none;font-weight:600;">📍 Map</a>
        </div>
      </div>

      <div style="font-size: 0.82rem; color: #475569; margin: 0.4rem 0;">
        <strong>Slot:</strong> ${escapeHtml(ord.slot)}${ord.deliveryDate ? ` (${escapeHtml(ord.deliveryDate)})` : ''} | <strong>Method:</strong> ${escapeHtml(ord.paymentMethod.toUpperCase())}
        ${ord.paymentRef ? ` | Ref: <code>${escapeHtml(ord.paymentRef)}</code>` : ''}
      </div>

      <div style="font-size: 0.82rem; color: #334155; margin-bottom: 0.4rem;">
        <strong>Items:</strong> ${itemsPreview}
      </div>

      ${subHtml}

      <div class="order-summary-row">
        <span>Subtotal: ₹${ord.subtotal} + Delivery: ₹${ord.deliveryCharge}</span>
        <strong style="font-size: 1.1rem; color: var(--admin-primary);">Total: ₹${ord.total}</strong>
      </div>

      <div class="order-actions">
        ${actionHtml}
      </div>
    </div>
  `;
}

function renderPagination(pagination) {
  const container = document.getElementById('paginationArea');
  if (!container) return;

  if (pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn-action btn-outline" style="min-width: 80px;" ${pagination.page <= 1 ? 'disabled' : ''} onclick="changePage(${pagination.page - 1})">
        ← Prev
      </button>
      <span style="display: flex; align-items: center; font-size: 0.85rem; color: var(--admin-muted); padding: 0 0.5rem;">
        Page ${pagination.page} of ${pagination.pages}
      </span>
      <button class="btn-action btn-outline" style="min-width: 80px;" ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="changePage(${pagination.page + 1})">
        Next →
      </button>
    </div>
  `;
}

function changePage(page) {
  currentPage = page;
  loadOrders();
}

async function advanceOrderStatus(orderId, currentStatus, nextStatus, paymentMethod) {
  // If moving to delivered and COD payment is still pending, prompt owner
  if (nextStatus === 'delivered' && paymentMethod === 'cod') {
    const markPaid = confirm('This was a Cash on Delivery (COD) order. Has payment been collected? Click OK to mark as Paid.\n\nही COD ऑर्डर होती. पैसे मिळाले का? OK दाबल्यास पेमेंट Paid केले जाईल.');
    if (markPaid) {
      try {
        await adminFetch(`/admin/orders/${orderId}/payment`, {
          method: 'PATCH',
          body: JSON.stringify({ paymentStatus: 'paid' }),
        });
      } catch (payErr) {
        console.warn('Could not mark paid:', payErr.message);
      }
    }
  }

  try {
    const res = await adminFetch(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        currentStatus,
        nextStatus,
        note: `Status updated to ${nextStatus} by store owner.`,
      }),
    });

    if (res.success) {
      loadOrders();
    }
  } catch (err) {
    alert(`Could not update status: ${err.message}`);
    loadOrders(); // reload to get actual status
  }
}

async function markOrderPaid(orderId) {
  try {
    const res = await adminFetch(`/admin/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus: 'paid' }),
    });
    if (res.success) {
      loadOrders();
    }
  } catch (err) {
    alert(`Failed to update payment: ${err.message}`);
  }
}

function openCancelModal(orderId, orderNum) {
  selectedOrderForCancel = orderId;
  document.getElementById('cancelOrderNumText').textContent = orderNum;
  document.getElementById('cancelReasonInput').value = '';
  document.getElementById('cancelModal').style.display = 'flex';
}

function closeCancelModal() {
  selectedOrderForCancel = null;
  document.getElementById('cancelModal').style.display = 'none';
}

async function confirmCancelOrder() {
  if (!selectedOrderForCancel) return;
  const reason = document.getElementById('cancelReasonInput').value.trim() || 'Cancelled by store owner';

  try {
    const res = await adminFetch(`/admin/orders/${selectedOrderForCancel}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ note: reason }),
    });

    if (res.success) {
      closeCancelModal();
      loadOrders();
    }
  } catch (err) {
    alert(`Cancellation failed: ${err.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('orders');

  // Check URL query parameters (e.g. from dashboard search)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  if (searchParam) {
    currentSearch = searchParam;
    const sInput = document.getElementById('orderSearchInput');
    if (sInput) sInput.value = searchParam;
  }

  loadOrders();

  // Status filter pills
  document.querySelectorAll('.filter-pill[data-status]').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill[data-status]').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilterStatus = pill.dataset.status;
      currentPage = 1;
      loadOrders();
    });
  });

  // Date filter pills
  document.querySelectorAll('.filter-pill[data-date]').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill[data-date]').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilterDate = pill.dataset.date;
      currentPage = 1;
      loadOrders();
    });
  });

  // Search input debounced
  const searchInput = document.getElementById('orderSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadOrders();
      }, 350);
    });
  }
});

// ─── Substitution Proposal Modal (ORD-06) ──────────────────────────────────
let _subCatalog = [];
let _selectedOrderForSub = null;

async function openSubstitutionModal(orderId) {
  try {
    const res = await adminFetch(`/admin/orders/${orderId}`);
    if (!res.success || !res.data) {
      alert('Could not load order details.');
      return;
    }
    _selectedOrderForSub = res.data;

    const modal = document.getElementById('subModal');
    const orderNumEl = document.getElementById('subOrderNumText');
    const origSelect = document.getElementById('subOriginalItemSelect');
    const propSelect = document.getElementById('subProposedProductSelect');
    const qtyInput = document.getElementById('subProposedQtyInput');
    const noteInput = document.getElementById('subNoteInput');

    if (!modal || !origSelect || !propSelect) return;

    orderNumEl.textContent = _selectedOrderForSub.orderNumber;
    if (noteInput) noteInput.value = '';
    if (qtyInput) qtyInput.value = 1;

    // 1. Populate original order items
    origSelect.innerHTML = _selectedOrderForSub.items
      .map((it) => `<option value="${it.productId}" data-price="${it.price}" data-qty="${it.qty}">${escapeHtml(it.nameEn)} (${escapeHtml(it.packSize)}) × ${it.qty} — ₹${it.price * it.qty}</option>`)
      .join('');

    // 2. Fetch catalog if not loaded yet
    if (_subCatalog.length === 0) {
      const prodRes = await adminFetch('/admin/products?limit=100');
      if (prodRes.success && prodRes.data) {
        _subCatalog = prodRes.data;
      }
    }

    // 3. Populate proposed replacement products (in stock and active)
    const availableProds = _subCatalog.filter((p) => p.active && p.stockQuantity > 0);
    propSelect.innerHTML = availableProds
      .map((p) => `<option value="${p._id}" data-price="${p.price}" data-stock="${p.stockQuantity}">${escapeHtml(p.nameEn)} (${escapeHtml(p.packSize)}) — ₹${p.price} [शिल्लक: ${p.stockQuantity}]</option>`)
      .join('');

    updateSubPriceCalc();
    modal.classList.add('active');
  } catch (err) {
    alert('Error opening substitution modal: ' + err.message);
  }
}

function closeSubModal() {
  const modal = document.getElementById('subModal');
  if (modal) modal.classList.remove('active');
  _selectedOrderForSub = null;
}

function updateSubPriceCalc() {
  const origSelect = document.getElementById('subOriginalItemSelect');
  const propSelect = document.getElementById('subProposedProductSelect');
  const qtyInput = document.getElementById('subProposedQtyInput');
  const diffEl = document.getElementById('subPriceDiffDisplay');

  if (!origSelect || !propSelect || !qtyInput || !diffEl) return;

  const origOpt = origSelect.selectedOptions[0];
  const propOpt = propSelect.selectedOptions[0];

  if (!origOpt || !propOpt) return;

  const origPrice = parseFloat(origOpt.dataset.price) || 0;
  const origQty = parseFloat(origOpt.dataset.qty) || 1;
  const propPrice = parseFloat(propOpt.dataset.price) || 0;
  const propQty = parseFloat(qtyInput.value) || 1;

  const origTotal = origPrice * origQty;
  const propTotal = propPrice * propQty;
  const diff = propTotal - origTotal;

  diffEl.textContent = (diff >= 0 ? '+' : '') + '₹' + diff;
  diffEl.style.color = diff > 0 ? '#b45309' : (diff < 0 ? '#059669' : '#334155');
}

async function submitSubstitutionProposal() {
  if (!_selectedOrderForSub) return;

  const origSelect = document.getElementById('subOriginalItemSelect');
  const propSelect = document.getElementById('subProposedProductSelect');
  const qtyInput = document.getElementById('subProposedQtyInput');
  const noteInput = document.getElementById('subNoteInput');
  const submitBtn = document.getElementById('btnSubmitSub');

  const originalProductId = origSelect ? origSelect.value : null;
  const proposedProductId = propSelect ? propSelect.value : null;
  const proposedQty = qtyInput ? parseFloat(qtyInput.value) : 1;
  const note = noteInput ? noteInput.value.trim() : '';

  if (!originalProductId || !proposedProductId || isNaN(proposedQty) || proposedQty <= 0) {
    alert('Please select both items and specify a valid quantity.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending proposal...';

  try {
    const res = await adminFetch(`/admin/orders/${_selectedOrderForSub._id}/substitutions/propose`, {
      method: 'POST',
      body: JSON.stringify({
        originalProductId,
        proposedProductId,
        proposedQty,
        note,
      }),
    });

    if (!res.success) {
      alert(res.message || 'Failed to propose substitution.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Proposal →';
      return;
    }

    alert('Substitution proposal sent to customer! They will see it on their orders page.');
    closeSubModal();
    await loadOrders();
  } catch (err) {
    alert('Network error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Proposal →';
  }
}
