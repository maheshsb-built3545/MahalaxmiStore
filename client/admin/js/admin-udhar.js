/**
 * frontend/admin/js/admin-udhar.js
 *
 * R4 — Udhar (Credit Ledger) Admin Controller
 * Specifications: UDH-01 through UDH-06, WA-05
 */

let _currentAccounts = [];
let _activeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  renderAdminNavigation('udhar');
  setupEventListeners();
  await loadAccounts();
});

function setupEventListeners() {
  // Status filter tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      _activeFilter = btn.getAttribute('data-status');
      loadAccounts();
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById('udharSearchInput');
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadAccounts();
      }, 350);
    });
  }

  // Payment form submit
  const paymentForm = document.getElementById('paymentForm');
  if (paymentForm) {
    paymentForm.addEventListener('submit', handleRecordPaymentSubmit);
  }

  // Status form submit
  const statusForm = document.getElementById('statusForm');
  if (statusForm) {
    statusForm.addEventListener('submit', handleUpdateStatusSubmit);
  }
}

// ── Load Accounts ─────────────────────────────────────────────────────────────
async function loadAccounts() {
  const tbody = document.getElementById('udharTableBody');
  const search = document.getElementById('udharSearchInput')?.value.trim() || '';

  try {
    const query = new URLSearchParams();
    if (_activeFilter && _activeFilter !== 'all') query.set('status', _activeFilter);
    if (search) query.set('search', search);

    const res = await adminFetch(`/udhar/admin/accounts?${query.toString()}`);
    if (!res.success) throw new Error(res.message);

    const { accounts, totalOutstanding, activeCount, pendingCount, totalCount } = res.data;
    _currentAccounts = accounts;

    // Update KPI metrics
    document.getElementById('kpiTotalOutstanding').textContent = `₹${(totalOutstanding || 0).toLocaleString('en-IN')}`;
    document.getElementById('kpiActiveAccounts').textContent = activeCount || 0;
    document.getElementById('kpiPendingRequests').textContent = pendingCount || 0;
    document.getElementById('kpiTotalAccounts').textContent = totalCount || 0;

    renderAccountsTable(accounts);
  } catch (err) {
    console.error('Failed to load udhar accounts:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ── Render Table ──────────────────────────────────────────────────────────────
function renderAccountsTable(accounts) {
  const tbody = document.getElementById('udharTableBody');
  tbody.innerHTML = '';

  if (!accounts || accounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#64748b;">कोणतीही उधारी खाती सापडली नाहीत. (No credit accounts found)</td></tr>`;
    return;
  }

  accounts.forEach((acc) => {
    const tr = document.createElement('tr');
    const customer = acc.customer || { name: 'Unknown', phone: '' };
    const balance = acc.balance || 0;
    const limit = acc.creditLimit || 0;
    const available = Math.max(0, limit - balance);

    const isHighBal = balance > 0;
    const balanceClass = isHighBal ? 'balance-high' : 'balance-zero';

    tr.innerHTML = `
      <td>
        <strong>${customer.name || 'ग्राहक'}</strong>
        <div style="font-size:0.8rem;color:#64748b;">📞 ${customer.phone || 'No phone'}</div>
      </td>
      <td>
        <span class="badge-status ${acc.status}">${acc.status}</span>
      </td>
      <td>
        <span class="${balanceClass}">₹${balance.toLocaleString('en-IN')}</span>
      </td>
      <td>
        ₹${limit.toLocaleString('en-IN')}
      </td>
      <td>
        <span style="color:#047857;font-weight:700;">₹${available.toLocaleString('en-IN')}</span>
      </td>
      <td>
        <div class="action-btn-group">
          <button type="button" class="btn-action-sm green" onclick="openPaymentModal('${acc._id}')" title="रक्कम जमा करा">
            💵 जमा
          </button>
          ${balance > 0 ? `
            <button type="button" class="btn-action-sm wa" onclick="triggerWhatsAppReminder('${acc._id}')" title="WhatsApp तगादा पाठवा">
              📲 तगादा
            </button>
          ` : ''}
          <button type="button" class="btn-action-sm" onclick="openLedgerModal('${acc._id}')" title="हिशोब वही पहा">
            📖 हिशोब
          </button>
          <button type="button" class="btn-action-sm" onclick="openStatusModal('${acc._id}')" title="स्थिती व मर्यादा बदला">
            ⚙️ स्थिती
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Payment Modal Flow ────────────────────────────────────────────────────────
function openPaymentModal(accountId) {
  const account = _currentAccounts.find((a) => a._id === accountId);
  if (!account) return;

  document.getElementById('payAccountId').value = account._id;
  document.getElementById('payCustomerInfo').textContent =
    `ग्राहक: ${account.customer?.name || ''} (${account.customer?.phone || ''}) | चालू बाकी: ₹${account.balance}`;
  document.getElementById('payAmount').value = account.balance > 0 ? account.balance : '';
  document.getElementById('payRef').value = '';
  document.getElementById('payNote').value = '';

  document.getElementById('paymentModal').style.display = 'flex';
  document.getElementById('payAmount').focus();
}

async function handleRecordPaymentSubmit(e) {
  e.preventDefault();
  const accountId = document.getElementById('payAccountId').value;
  const amount = parseFloat(document.getElementById('payAmount').value);
  const paymentMethod = document.querySelector('input[name="payMethod"]:checked').value;
  const paymentRef = document.getElementById('payRef').value.trim();
  const note = document.getElementById('payNote').value.trim();
  const submitBtn = document.getElementById('submitPaymentBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'नोंदवत आहे...';

  try {
    const res = await adminFetch(`/udhar/admin/accounts/${accountId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod, paymentRef, note }),
    });

    if (!res.success) throw new Error(res.message);

    closeModals();
    alert(`₹${amount} जमा पावती यशस्वीरीत्या नोंदवली गेली!`);
    await loadAccounts();
  } catch (err) {
    alert(`Payment error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✓ जमा नोंदवा (Confirm Payment)';
  }
}

// ── WhatsApp Reminder Flow (WA-05) ───────────────────────────────────────────
async function triggerWhatsAppReminder(accountId) {
  try {
    const res = await adminFetch(`/udhar/admin/reminder/${accountId}`);
    if (!res.success) throw new Error(res.message);

    const { waUrl, reminderText } = res.data;

    // Copy reminder text to clipboard
    try {
      await navigator.clipboard.writeText(reminderText);
    } catch (_) {}

    if (waUrl) {
      window.open(waUrl, '_blank');
    } else {
      alert(`Reminder text copied to clipboard:\n\n${reminderText}`);
    }
  } catch (err) {
    alert(`Could not generate reminder: ${err.message}`);
  }
}

// ── Ledger Modal Flow ─────────────────────────────────────────────────────────
async function openLedgerModal(accountId) {
  const tbody = document.getElementById('ledgerTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;">हिशोब लोड होत आहे...</td></tr>';
  document.getElementById('ledgerModal').style.display = 'flex';

  try {
    const res = await adminFetch(`/udhar/admin/accounts/${accountId}/ledger`);
    if (!res.success) throw new Error(res.message);

    const { account, entries } = res.data;
    document.getElementById('ledgerModalTitle').textContent = `📖 उधारी वही: ${account.customer?.name || ''}`;
    document.getElementById('ledgerModalSub').textContent = `मोबाईल: ${account.customer?.phone || ''} | चालू बाकी: ₹${account.balance} | उधारी मर्यादा: ₹${account.creditLimit}`;

    tbody.innerHTML = '';
    if (!entries || entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b;">कोणताही व्यवहार आढळला नाही.</td></tr>';
      return;
    }

    entries.forEach((entry) => {
      const tr = document.createElement('tr');
      const dt = new Date(entry.createdAt).toLocaleDateString('mr-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const typeLabels = {
        purchase: '<span class="ledger-type-purchase">खरेदी (Purchase)</span>',
        payment: '<span class="ledger-type-payment">जमा (Payment)</span>',
        adjustment: '<span class="ledger-type-adjustment">दुरुस्ती (Adjustment)</span>',
      };

      tr.innerHTML = `
        <td style="white-space:nowrap;font-size:0.78rem;">${dt}</td>
        <td>${typeLabels[entry.type] || entry.type}</td>
        <td style="font-weight:700;">₹${entry.amount}</td>
        <td style="font-weight:800;color:#04251a;">₹${entry.balanceAfter}</td>
        <td><span style="font-size:0.75rem;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${entry.paymentMethod || '-'}</span></td>
        <td style="font-size:0.75rem;color:#64748b;">${entry.actor?.name || 'System'}${entry.note ? ` • ${entry.note}` : ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#ef4444;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ── Status Modal Flow ─────────────────────────────────────────────────────────
function openStatusModal(accountId) {
  const account = _currentAccounts.find((a) => a._id === accountId);
  if (!account) return;

  document.getElementById('statusAccountId').value = account._id;
  document.getElementById('selectAccountStatus').value = account.status;
  document.getElementById('editCreditLimit').value = account.creditLimit || 2000;
  document.getElementById('statusNotes').value = account.notes || '';

  document.getElementById('statusModal').style.display = 'flex';
}

async function handleUpdateStatusSubmit(e) {
  e.preventDefault();
  const accountId = document.getElementById('statusAccountId').value;
  const status = document.getElementById('selectAccountStatus').value;
  const creditLimit = parseFloat(document.getElementById('editCreditLimit').value);
  const notes = document.getElementById('statusNotes').value.trim();
  const submitBtn = document.getElementById('submitStatusBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'जतन करत आहे...';

  try {
    const res = await adminFetch(`/udhar/admin/accounts/${accountId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, creditLimit, notes }),
    });

    if (!res.success) throw new Error(res.message);

    closeModals();
    alert('खाते स्थिती व मर्यादा यशस्वीरीत्या अद्ययावत झाली!');
    await loadAccounts();
  } catch (err) {
    alert(`Status update error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✓ बदल जतन करा (Save Changes)';
  }
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    m.style.display = 'none';
  });
}

// ESC key closes modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModals();
});
