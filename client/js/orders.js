/**
 * frontend/js/orders.js
 *
 * Orders page logic:
 * 1. Checks login status (redirects to login.html?redirect=orders.html if not authenticated)
 * 2. Fetches customer's orders from GET /api/orders
 * 3. Renders orders with bilingual status badges and IST timestamps
 * 4. Rule 11: Handles atomic order cancellation for 'new' and 'confirmed' orders
 * 5. Rule 14: Handles reordering with current price check and merge/replace prompt
 */

const ordersApp = (() => {
  let _orders = [];

  const STATUS_LABELS = {
    new: { en: 'New', mr: 'नवीन', cls: 'status-new' },
    confirmed: { en: 'Confirmed', mr: 'पुष्टी केली', cls: 'status-confirmed' },
    packed: { en: 'Packed', mr: 'पॅक केले', cls: 'status-packed' },
    out_for_delivery: { en: 'Out for Delivery', mr: 'डिलिव्हरीसाठी बाहेर', cls: 'status-out' },
    delivered: { en: 'Delivered', mr: 'पोहोचवले', cls: 'status-delivered' },
    cancelled: { en: 'Cancelled', mr: 'रद्द केले', cls: 'status-cancelled' },
  };

  function fmt(n) { return '₹' + n; }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function init() {
    if (!auth.isLoggedIn()) {
      window.location.href = 'login.html?redirect=orders.html';
      return;
    }

    auth.renderAuthHeader();
    await Promise.all([loadOrders(), loadUdharStatus()]);
  }

  // ── Customer Udhar Account (UDH-01, UDH-04) ──────────────────────────────
  async function loadUdharStatus() {
    const card = document.getElementById('udharCreditCard');
    if (!card) return;

    try {
      const res = await authFetch(`${CONFIG.API_BASE}/udhar/my-account`);
      const data = await res.json();
      if (!res.ok || !data.success) return;

      const acc = data.data;
      card.style.display = 'block';

      if (acc.hasAccount && acc.approved && acc.status === 'active') {
        const isDebt = acc.balance > 0;
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
            <div>
              <div style="display:flex;align-items:center;gap:6px;">
                <h3 style="margin:0;font-size:1.15rem;color:#04251a;">📝 माझे उधारी खाते (My Udhar Account)</h3>
                <span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;">सक्रिय (ACTIVE)</span>
              </div>
              <p style="margin:4px 0 0;font-size:0.85rem;color:#64748b;">महालक्ष्मी किराणा स्टोअर्स येसगाव — मंजूर खाते</p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.8rem;color:#64748b;">चालू बाकी (Outstanding):</span>
              <div style="font-size:1.5rem;font-weight:800;color:${isDebt ? '#b91c1c' : '#059669'};">
                ₹${acc.balance.toLocaleString('en-IN')}
              </div>
              <span style="font-size:0.75rem;color:#047857;">शिल्लक मर्यादा: ₹${acc.availableCredit.toLocaleString('en-IN')} / एकूण ₹${acc.creditLimit}</span>
            </div>
          </div>
          ${acc.entries && acc.entries.length > 0 ? `
            <div style="margin-top:1rem;border-top:1px dashed #cbd5e1;padding-top:0.75rem;">
              <button type="button" id="toggleLedgerBtn" class="btn btn-secondary btn-sm" style="font-size:0.78rem;">
                📜 हिशोब पावती इतिहास दाखवा (${acc.entries.length} नोंदी)
              </button>
              <div id="customerLedgerTray" style="display:none;margin-top:0.75rem;max-height:220px;overflow-y:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                  <thead>
                    <tr style="background:#f8fafc;color:#64748b;text-align:left;">
                      <th style="padding:6px;">तारीख</th>
                      <th style="padding:6px;">प्रकार</th>
                      <th style="padding:6px;">रक्कम</th>
                      <th style="padding:6px;">शिल्लक बाकी</th>
                      <th style="padding:6px;">टीप</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${acc.entries.map((e) => `
                      <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:6px;white-space:nowrap;">${new Date(e.createdAt).toLocaleDateString('mr-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                        <td style="padding:6px;font-weight:700;color:${e.type === 'purchase' ? '#dc2626' : '#16a34a'};">${e.type === 'purchase' ? 'खरेदी' : (e.type === 'payment' ? 'जमा' : 'दुरुस्ती')}</td>
                        <td style="padding:6px;font-weight:700;">₹${e.amount}</td>
                        <td style="padding:6px;font-weight:800;">₹${e.balanceAfter}</td>
                        <td style="padding:6px;color:#64748b;">${escapeHtml(e.note || '-')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        `;

        const toggleBtn = document.getElementById('toggleLedgerBtn');
        const tray = document.getElementById('customerLedgerTray');
        if (toggleBtn && tray) {
          toggleBtn.addEventListener('click', () => {
            const isHidden = tray.style.display === 'none';
            tray.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '▲ हिशोब लपवा' : `📜 हिशोब पावती इतिहास दाखवा (${acc.entries.length} नोंदी)`;
          });
        }
      } else if (acc.hasAccount && acc.status === 'pending') {
        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:1.8rem;">⏳</span>
            <div>
              <h4 style="margin:0;color:#92400e;">उधारी खाते अर्ज प्रलंबित आहे (Request Pending Approval)</h4>
              <p style="margin:2px 0 0;font-size:0.85rem;color:#78350f;">
                आपला उधारी अर्ज किरण गायकवाड (दुकान मालक) यांच्याकडे मंजुरीसाठी पाठवला आहे. पडताळणीनंतर खाते सक्रिय होईल.
              </p>
            </div>
          </div>
        `;
      } else {
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
            <div>
              <h4 style="margin:0;color:#04251a;">📝 गावात राहणाऱ्या ग्राहकांसाठी उधारी खाते सुविधा (Udhar Credit)</h4>
              <p style="margin:3px 0 0;font-size:0.85rem;color:#64748b;">
                येसगाव व कोपरगाव परिसरातील नियमित ग्राहकांसाठी मासिक खाते सुविधा उपलब्ध.
              </p>
            </div>
            <button type="button" id="applyUdharBtn" class="btn btn-primary btn-sm">
              + उधारी खात्यासाठी अर्ज करा (Apply Now)
            </button>
          </div>
        `;

        document.getElementById('applyUdharBtn')?.addEventListener('click', async () => {
          const btn = document.getElementById('applyUdharBtn');
          btn.disabled = true;
          btn.textContent = 'अर्ज पाठवत आहे...';
          try {
            const r = await authFetch(`${CONFIG.API_BASE}/udhar/request`, { method: 'POST' });
            const d = await r.json();
            if (!r.ok || !d.success) throw new Error(d.message);
            alert('उधारी अर्ज यशस्वीरीत्या पाठवला! मालकांच्या मंजुरीनंतर कळवले जाईल.');
            await loadUdharStatus();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = '+ उधारी खात्यासाठी अर्ज करा (Apply Now)';
          }
        });
      }
    } catch (_) {
      // Ignore network errors
    }
  }

  async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    container.textContent = '';
    const loadingEl = document.createElement('p');
    loadingEl.className = 'loading-text';
    loadingEl.textContent = 'Loading your orders… / तुमच्या ऑर्डर्स आणत आहे…';
    container.appendChild(loadingEl);

    try {
      const res = await authFetch(`${CONFIG.API_BASE}/orders`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        showError('Could not load orders: ' + (data.message || 'Unknown error.'));
        return;
      }

      _orders = data.data;
      renderOrdersList();
    } catch (err) {
      showError('Network error while loading orders. Please check your connection.');
    }
  }

  function renderOrdersList() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    container.textContent = '';

    if (!_orders.length) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'empty-orders-card';

      const icon = document.createElement('div');
      icon.className = 'empty-icon';
      icon.textContent = '📦';
      emptyCard.appendChild(icon);

      const title = document.createElement('h3');
      title.textContent = 'No orders yet / अद्याप कोणतीही ऑर्डर नाही';
      emptyCard.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = 'Your placed orders will appear here. Browse our fresh grocery catalog to start shopping!';
      emptyCard.appendChild(desc);

      const shopBtn = document.createElement('a');
      shopBtn.href = 'index.html';
      shopBtn.className = 'btn btn-primary';
      shopBtn.textContent = 'Browse Catalog / किराणा खरेदी करा';
      emptyCard.appendChild(shopBtn);

      container.appendChild(emptyCard);
      return;
    }

    _orders.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'order-card';
      card.dataset.orderId = order._id;

      // ── Card Header ───────────────────────────────────────────────
      const head = document.createElement('div');
      head.className = 'order-card-head';

      const headLeft = document.createElement('div');
      const orderNum = document.createElement('span');
      orderNum.className = 'order-num';
      orderNum.textContent = order.orderNumber;

      const dateSpan = document.createElement('span');
      dateSpan.className = 'order-date';
      dateSpan.textContent = auth.formatDateIST(order.createdAt);

      headLeft.appendChild(orderNum);
      headLeft.appendChild(dateSpan);

      const statusMeta = STATUS_LABELS[order.status] || { en: order.status, mr: '', cls: 'status-new' };
      const statusPill = document.createElement('span');
      statusPill.className = `status-pill ${statusMeta.cls}`;
      statusPill.textContent = `${statusMeta.en} / ${statusMeta.mr}`;

      head.appendChild(headLeft);
      head.appendChild(statusPill);
      card.appendChild(head);

      // ── Card Body (Items) ─────────────────────────────────────────
      const body = document.createElement('div');
      body.className = 'order-card-body';

      const itemsList = document.createElement('div');
      itemsList.className = 'order-items-list';

      order.items.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'order-item-line';

        const nameEl = document.createElement('span');
        nameEl.className = 'item-name';
        nameEl.textContent = `${item.nameEn} (${item.packSize}) × ${item.qty}`;

        const priceEl = document.createElement('span');
        priceEl.className = 'item-price';
        priceEl.textContent = fmt(item.price * item.qty);

        itemRow.appendChild(nameEl);
        itemRow.appendChild(priceEl);
        itemsList.appendChild(itemRow);
      });

      body.appendChild(itemsList);

      // R5: Owner-proposed item substitutions (ORD-06)
      if (order.substitutions && order.substitutions.length > 0) {
        const subBox = document.createElement('div');
        subBox.className = 'order-substitutions-box';
        subBox.style.cssText = 'margin-top:0.75rem;padding:0.75rem;border-radius:8px;background:#fefce8;border:1px solid #fef08a;';

        order.substitutions.forEach((sub) => {
          const subItem = document.createElement('div');
          subItem.style.cssText = 'margin-bottom:0.5rem;font-size:0.85rem;';

          const isPending  = sub.status === 'pending';
          const isAccepted = sub.status === 'accepted';
          const diffText   = sub.priceDiff > 0 ? `+₹${sub.priceDiff}` : (sub.priceDiff < 0 ? `-₹${Math.abs(sub.priceDiff)}` : '₹0');

          subItem.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;">
              <strong style="color:#78350f;">🔄 वस्तू बदल प्रस्ताव (Substitution Proposal):</strong>
              <span style="font-weight:700;font-size:0.75rem;padding:2px 8px;border-radius:12px;${
                isPending ? 'background:#fde047;color:#854d0e;' : (isAccepted ? 'background:#bbf7d0;color:#166534;' : 'background:#fecaca;color:#991b1b;')
              }">
                ${isPending ? '⏳ उत्तराची प्रतीक्षा (Pending)' : (isAccepted ? '✓ स्वीकारले (Accepted)' : '✕ नाकारले (Rejected)')}
              </span>
            </div>
            <div style="margin-top:4px;color:#334155;">
              <span style="text-decoration:line-through;color:#94a3b8;">${escapeHtml(sub.originalNameMr || sub.originalNameEn)} (${escapeHtml(sub.originalPackSize || '')}) × ${sub.originalQty}</span>
              &nbsp;➔&nbsp;
              <strong style="color:#047857;">${escapeHtml(sub.proposedNameMr || sub.proposedNameEn)} (${escapeHtml(sub.proposedPackSize || '')}) × ${sub.proposedQty}</strong>
              &nbsp;(${diffText})
            </div>
            ${sub.note ? `<div style="font-size:0.75rem;color:#78350f;margin-top:2px;">टीप: ${escapeHtml(sub.note)}</div>` : ''}
          `;

          if (isPending) {
            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

            const acceptBtn = document.createElement('button');
            acceptBtn.type = 'button';
            acceptBtn.className = 'btn btn-primary btn-sm';
            acceptBtn.style.cssText = 'font-size:0.78rem;padding:4px 10px;background:#059669;border-color:#059669;';
            acceptBtn.textContent = '✓ स्वीकारा (Accept)';
            acceptBtn.addEventListener('click', () => handleRespondSubstitution(order._id, sub._id, 'accept'));

            const rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.className = 'btn btn-outline btn-sm btn-danger-outline';
            rejectBtn.style.cssText = 'font-size:0.78rem;padding:4px 10px;';
            rejectBtn.textContent = '✕ नाकारा (Reject)';
            rejectBtn.addEventListener('click', () => handleRespondSubstitution(order._id, sub._id, 'reject'));

            btnGroup.appendChild(acceptBtn);
            btnGroup.appendChild(rejectBtn);
            subItem.appendChild(btnGroup);
          }

          subBox.appendChild(subItem);
        });

        body.appendChild(subBox);
      }

      // ── Meta Details (Slot & Address) ────────────────────────────
      const metaRow = document.createElement('div');
      metaRow.className = 'order-meta-info';

      const slotInfo = document.createElement('div');
      const slotB = document.createElement('b');
      slotB.textContent = 'Timing: ';
      slotInfo.textContent = '⏰ ';
      slotInfo.appendChild(slotB);
      slotInfo.appendChild(document.createTextNode(order.slot));
      metaRow.appendChild(slotInfo);

      const addrInfo = document.createElement('div');
      const addrB = document.createElement('b');
      addrB.textContent = 'Delivery: ';
      addrInfo.textContent = '📍 ';
      addrInfo.appendChild(addrB);
      addrInfo.appendChild(document.createTextNode(`${order.address.line} (${order.address.pincode})`));
      metaRow.appendChild(addrInfo);

      body.appendChild(metaRow);
      card.appendChild(body);

      // ── Card Foot (Totals & Actions) ──────────────────────────────
      const foot = document.createElement('div');
      foot.className = 'order-card-foot';

      const totalBox = document.createElement('div');
      totalBox.className = 'order-total-box';
      totalBox.appendChild(document.createTextNode('Total: '));
      const totalStrong = document.createElement('strong');
      totalStrong.textContent = fmt(order.total);
      totalBox.appendChild(totalStrong);
      totalBox.appendChild(document.createTextNode(` (${order.paymentMethod === 'upi_qr' ? 'UPI' : 'Cash'})`));
      foot.appendChild(totalBox);

      const actions = document.createElement('div');
      actions.className = 'order-actions';

      // Rule 11: Cancel button (only allowed for 'new' and 'confirmed')
      if (['new', 'confirmed'].includes(order.status)) {
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-outline btn-sm btn-danger-outline';
        cancelBtn.textContent = 'Cancel Order / रद्द करा';
        cancelBtn.addEventListener('click', () => handleCancelOrder(order));
        actions.appendChild(cancelBtn);
      }

      // Rule 14: Reorder button
      const reorderBtn = document.createElement('button');
      reorderBtn.type = 'button';
      reorderBtn.className = 'btn btn-primary btn-sm';
      reorderBtn.textContent = 'Reorder / पुन्हा मागवा';
      reorderBtn.addEventListener('click', () => handleReorder(order));
      actions.appendChild(reorderBtn);

      foot.appendChild(actions);
      card.appendChild(foot);

      container.appendChild(card);
    });
  }

  // ── Handle Order Cancellation (Rule 11) ───────────────────────────────────
  async function handleCancelOrder(order) {
    const confirmed = confirm(
      `Are you sure you want to cancel order ${order.orderNumber}?\nतुम्हाला ही ऑर्डर नक्की रद्द करायची आहे का?`
    );
    if (!confirmed) return;

    try {
      const res = await authFetch(`${CONFIG.API_BASE}/orders/${order._id}/cancel`, {
        method: 'PATCH',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Could not cancel order.');
        return;
      }

      alert(`Order ${order.orderNumber} has been cancelled successfully.`);
      await loadOrders();
    } catch (err) {
      alert('Network error. Could not cancel order.');
    }
  }

  // ── Handle Customer Response to Item Substitution (ORD-06) ─────────────────
  async function handleRespondSubstitution(orderId, subId, action) {
    const actionLabel = action === 'accept' ? 'स्वीकारायचा' : 'नाकारायचा';
    if (!confirm(`तुम्हाला हा वस्तू बदल पर्याय नक्की ${actionLabel} आहे का?\nAre you sure you want to ${action} this substitution?`)) {
      return;
    }

    try {
      const res = await authFetch(`${CONFIG.API_BASE}/orders/${orderId}/substitutions/${subId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Error processing response.');
        return;
      }
      alert(data.message);
      await loadOrders();
    } catch (err) {
      alert('Network error. Could not record response.');
    }
  }

  // ── Handle Reorder with Merge/Replace Prompt (Rule 14) ─────────────────────
  async function handleReorder(order) {
    try {
      const res = await authFetch(`${CONFIG.API_BASE}/orders/${order._id}/reorder`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to check item availability.');
        return;
      }

      const { available, unavailable } = data;

      if (!available || available.length === 0) {
        alert('Sorry, none of the items from this order are currently available in stock.');
        return;
      }

      // If some items are unavailable, notify user
      if (unavailable && unavailable.length > 0) {
        const skippedNames = unavailable.map((u) => u.nameMr ? `${u.nameMr} (${u.nameEn})` : u.nameEn).join(', ');
        alert(`काही वस्तू सध्या संपल्या असल्याने वगळल्या आहेत:\nThe following items are currently out of stock and were skipped:\n• ${skippedNames}`);
      }

      // If some items changed price, notify user (Pass 3.3)
      const changedItems = available.filter((i) => i.priceChanged);
      if (changedItems.length > 0) {
        const priceNotes = changedItems
          .map((i) => `• ${i.nameMr || i.nameEn}: जुनी किंमत ₹${i.originalPrice} ➔ नवीन किंमत ₹${i.price}`)
          .join('\n');
        alert(`काही वस्तूंच्या किमतींमध्ये बदल झाला आहे (नवीन किमती लागू):\nPrice updates in current catalog:\n${priceNotes}`);
      }

      // Rule 14: Check if cart already has items
      const existingCount = cart.itemCount();
      if (existingCount > 0) {
        showReorderPromptModal(available);
      } else {
        // Cart is empty: directly add all available items
        populateCartWithItems(available, true);
        window.location.href = 'checkout.html';
      }
    } catch (err) {
      alert('Network error. Could not prepare reorder.');
    }
  }

  function populateCartWithItems(items, replace = false) {
    if (replace) {
      cart.clear();
    }
    items.forEach((item) => {
      cart.change(
        {
          _id: item.productId,
          nameEn: item.nameEn,
          nameMr: item.nameMr,
          packSize: item.packSize,
          price: item.price,
          mrp: item.mrp,
          emoji: item.emoji,
          inStock: true,
        },
        item.qty
      );
    });
  }

  function showReorderPromptModal(availableItems) {
    const modal = document.getElementById('reorderModal');
    if (!modal) return;

    modal.style.display = 'flex';

    document.getElementById('reorderReplaceBtn').onclick = () => {
      populateCartWithItems(availableItems, true);
      modal.style.display = 'none';
      window.location.href = 'checkout.html';
    };

    document.getElementById('reorderMergeBtn').onclick = () => {
      populateCartWithItems(availableItems, false);
      modal.style.display = 'none';
      window.location.href = 'checkout.html';
    };

    document.getElementById('reorderCancelBtn').onclick = () => {
      modal.style.display = 'none';
    };
  }

  function showError(msg) {
    const container = document.getElementById('ordersContainer');
    if (container) {
      container.textContent = '';
      const errEl = document.createElement('div');
      errEl.className = 'alert-box';
      errEl.textContent = msg;
      container.appendChild(errEl);
    }
  }

  return { init };
})();

// Boot orders app
cart.init(() => {
  ordersApp.init();
});
