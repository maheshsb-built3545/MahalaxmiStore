/**
 * Mahalaxmi Kirana Store — Udhar (Credit Khata) Page
 * Specs: 3.5 Udhar (Khata), UDH-01 to UDH-06, WA-05
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('udhar-page-root');
  if (!root) return;

  let accounts = [];
  let summary = {
    totalOutstanding: 0,
    activeCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    collectedThisWeek: 0,
  };
  let activeFilter = 'all';
  let searchQuery = '';
  let isLoading = false;

  async function init() {
    AdminShell.init('udhar');
    renderPageSkeleton();
    await loadAccounts();
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
            ${t('nav_udhar')}
          </h1>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
            ग्राहकांची उधारी नोंद, जमा पावती व आठवण संदेश / Customer credit ledger, payments & reminders
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" id="btn-new-udhar-entry" style="min-height:44px;font-weight:700;">
            ➕ नवीन नोंद / New Entry
          </button>
          <button type="button" class="btn btn-secondary" id="btn-export-udhar" style="min-height:44px;">
            <svg class="icon icon-sm"><use href="assets/icons.svg#icon-reports"></use></svg>
            ${t('export_csv')}
          </button>
        </div>
      </div>

      <!-- KPI Summary Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="udhar-kpi-row" style="margin-bottom:16px;">
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
      </div>

      <!-- Filter & Search Bar -->
      <div id="udhar-filter-container" style="margin-bottom:16px;"></div>

      <!-- Accounts Container -->
      <div id="udhar-accounts-container">
        ${AdminSkeleton.cardList(4)}
      </div>
    `;

    document.getElementById('btn-new-udhar-entry')?.addEventListener('click', openNewEntrySheet);

    document.getElementById('btn-export-udhar')?.addEventListener('click', () => {
      AdminAPI.downloadAuthed('/api/admin/export/udhar-ledger.csv', 'mahalaxmi-udhar-ledger.csv');
    });

    renderFilterBar();
  }

  function renderFilterBar() {
    const filterContainer = document.getElementById('udhar-filter-container');
    if (!filterContainer) return;

    filterContainer.innerHTML = '';
    const bar = AdminFilterBar.create({
      searchPlaceholder: 'नाव, फोन किंवा गाव शोधा... / Search name, phone or village...',
      onSearch: (q) => {
        searchQuery = q.toLowerCase().trim();
        renderAccountList();
      },
      chips: [
        { id: 'all', label: 'सर्व खाती / All', active: activeFilter === 'all' },
        { id: 'overdue', label: '⚠️ थकीत / Overdue', active: activeFilter === 'overdue' },
        { id: 'near_limit', label: 'मर्यादा संपत आलेली / Near Limit (≥80%)', active: activeFilter === 'near_limit' },
        { id: 'active', label: 'सक्रिय / Active', active: activeFilter === 'active' },
        { id: 'pending', label: 'प्रलंबित / Pending', active: activeFilter === 'pending' },
        { id: 'paused_revoked', label: 'थांबवले/रद्द / Paused', active: activeFilter === 'paused_revoked' },
      ],
      onFilterChange: (chipId) => {
        activeFilter = chipId;
        renderAccountList();
      },
    });
    filterContainer.appendChild(bar);
  }

  async function loadAccounts() {
    isLoading = true;
    try {
      const res = await AdminAPI.get('/api/udhar/admin/accounts');
      if (res.success && res.data) {
        accounts = res.data.accounts || [];
        summary = {
          totalOutstanding: res.data.totalOutstanding || 0,
          activeCount: res.data.activeCount || 0,
          pendingCount: res.data.pendingCount || 0,
          overdueCount: res.data.overdueCount || 0,
          collectedThisWeek: res.data.collectedThisWeek || 0,
        };
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    } finally {
      isLoading = false;
      renderKPIs();
      renderAccountList();
    }
  }

  function renderKPIs() {
    const kpiRow = document.getElementById('udhar-kpi-row');
    if (!kpiRow) return;

    kpiRow.innerHTML = '';
    
    // Total Outstanding
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('udhar_total_outstanding'),
        value: AdminFormat.currency(summary.totalOutstanding),
        variant: summary.totalOutstanding > 15000 ? 'danger' : 'warning',
        subtext: 'चालू येणे बाकी / Total credit given',
      })
    );

    // Overdue
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('udhar_overdue'),
        value: `${summary.overdueCount} खाती`,
        variant: summary.overdueCount > 0 ? 'danger' : 'neutral',
        subtext: '३० दिवसांपेक्षा जास्त बाकी / >30 days unpaid',
      })
    );

    // Collected this week
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('udhar_collected_week'),
        value: AdminFormat.currency(summary.collectedThisWeek),
        variant: 'success',
        subtext: 'गेल्या ७ दिवसांत जमा / Last 7 days',
      })
    );

    // Active Accounts
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('udhar_active_accounts'),
        value: `${summary.activeCount} / ${accounts.length}`,
        variant: 'primary',
        subtext: `प्रलंबित: ${summary.pendingCount} खाती / Pending`,
      })
    );
  }

  function getFilteredAccounts() {
    return accounts.filter((acc) => {
      const cust = acc.customer || {};
      const name = (cust.name || '').toLowerCase();
      const phone = (cust.phone || '').toLowerCase();
      const village = (acc.customerVillage || '').toLowerCase();

      // Search match
      if (searchQuery) {
        const matches = name.includes(searchQuery) || phone.includes(searchQuery) || village.includes(searchQuery);
        if (!matches) return false;
      }

      // Filter match
      if (activeFilter === 'overdue') return acc.isOverdue;
      if (activeFilter === 'near_limit') return acc.limitUsagePercent >= 80;
      if (activeFilter === 'active') return acc.status === 'active';
      if (activeFilter === 'pending') return acc.status === 'pending';
      if (activeFilter === 'paused_revoked') return ['paused', 'revoked'].includes(acc.status);

      return true;
    });
  }

  function renderAccountList() {
    const container = document.getElementById('udhar-accounts-container');
    if (!container) return;

    const filtered = getFilteredAccounts();
    if (filtered.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        AdminEmptyState.create({
          title: t('no_udhar_accounts'),
          description: searchQuery
            ? 'शोधलेली माहिती कोणत्याही खात्यात सापडली नाही / No matching customer accounts'
            : 'सध्या उधारीसाठी कोणतेही खाते नाही / No accounts in this section',
        })
      );
      return;
    }

    container.innerHTML = `
      <div class="udhar-accounts-grid" style="display:grid;grid-template-columns:1fr;gap:12px;"></div>
    `;
    const grid = container.querySelector('.udhar-accounts-grid');

    filtered.forEach((acc) => {
      grid.appendChild(createAccountCard(acc));
    });
  }

  function createAccountCard(acc) {
    const card = document.createElement('div');
    card.className = 'card account-card';
    card.style.cssText = 'padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);position:relative;';

    const cust = acc.customer || {};
    const name = cust.name || 'अज्ञात ग्राहक / Unknown';
    const phone = cust.phone || '';
    const village = acc.customerVillage || 'Yesgaon / Kopargaon';
    const balance = acc.balance || 0;
    const limit = acc.creditLimit || 2000;
    const usagePercent = acc.limitUsagePercent || (limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0);

    // Color coding for balance & progress
    let usageColor = 'var(--primary)';
    if (usagePercent >= 80) usageColor = 'var(--danger)';
    else if (usagePercent >= 50) usageColor = 'var(--accent)';

    // Status badge text & color
    let statusBadgeColor = 'neutral';
    let statusText = 'प्रलंबित / Pending';
    if (acc.status === 'active') {
      statusBadgeColor = 'success';
      statusText = 'सक्रिय / Active';
    } else if (acc.status === 'paused') {
      statusBadgeColor = 'warning';
      statusText = 'थांबवले / Paused';
    } else if (acc.status === 'revoked') {
      statusBadgeColor = 'danger';
      statusText = 'रद्द / Revoked';
    }

    // Last payment note
    let lastPaymentText = 'अद्याप जमा नाही / No payments recorded';
    if (acc.lastPayment && acc.lastPayment.createdAt) {
      lastPaymentText = `शेवटची जमा: ₹${acc.lastPayment.amount} (${AdminFormat.date(acc.lastPayment.createdAt)})`;
    }

    card.innerHTML = `
      <!-- Card Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="font-size:1.05rem;font-weight:700;margin:0;color:var(--text);">${AdminDOM.escape(name)}</h3>
            <span class="badge badge-${statusBadgeColor}">${statusText}</span>
            ${acc.isOverdue ? '<span class="badge badge-danger">⚠️ थकीत / Overdue</span>' : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span>📍 ${AdminDOM.escape(village)}</span>
            ${phone ? `<span>📞 <a href="tel:${phone}" style="color:var(--primary);font-weight:600;text-decoration:none;">${phone}</a></span>` : ''}
          </div>
        </div>

        <!-- Current Balance Callout -->
        <div style="text-align:right;">
          <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">चालू बाकी (Balance)</div>
          <div style="font-size:1.35rem;font-weight:800;color:${balance > 0 ? 'var(--danger)' : 'var(--primary)'};">
            ${AdminFormat.currency(balance)}
          </div>
        </div>
      </div>

      <!-- Limit Progress Bar -->
      <div style="margin-bottom:14px;background:var(--bg-muted);padding:10px 12px;border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;margin-bottom:6px;">
          <span style="color:var(--text-muted);">
            मर्यादा: <strong>${AdminFormat.currency(limit)}</strong>
          </span>
          <span style="font-weight:700;color:${usageColor};">
            ${usagePercent}% वापरले (${AdminFormat.currency(balance)})
          </span>
        </div>
        <div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${usagePercent}%;background:${usageColor};border-radius:4px;transition:width 0.3s ease;"></div>
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;display:flex;justify-content:space-between;">
          <span>${lastPaymentText}</span>
          <span>मुदत: ${acc.creditDays || 30} दिवस</span>
        </div>
      </div>

      <!-- Action Buttons (Thumb friendly >= 44px) -->
      <div class="account-actions" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;">
        <button type="button" class="btn btn-primary btn-record-pay" style="min-height:44px;font-size:0.82rem;font-weight:700;">
          💰 जमा करा / Pay
        </button>
        <button type="button" class="btn btn-secondary btn-reminder" style="min-height:44px;font-size:0.82rem;font-weight:600;border-color:#22c55e;color:#15803d;background:#ecfdf5;">
          💬 तगादा / Reminder
        </button>
        <button type="button" class="btn btn-secondary btn-view-ledger" style="min-height:44px;font-size:0.82rem;font-weight:600;">
          📖 वही / Ledger
        </button>
        <button type="button" class="btn btn-secondary btn-edit-account" style="min-height:44px;font-size:0.82rem;font-weight:600;">
          ⚙️ मर्यादा / Limit
        </button>
      </div>
    `;

    // Event listeners
    card.querySelector('.btn-record-pay')?.addEventListener('click', () => openRecordPaymentSheet(acc));
    card.querySelector('.btn-reminder')?.addEventListener('click', () => triggerWhatsAppReminder(acc));
    card.querySelector('.btn-view-ledger')?.addEventListener('click', () => openLedgerSheet(acc));
    card.querySelector('.btn-edit-account')?.addEventListener('click', () => openEditAccountModal(acc));

    return card;
  }

  // ── Global New Entry BottomSheet (Debit or Payment) ──
  function openNewEntrySheet() {
    if (!accounts.length) {
      AdminToast.warning('कोणतेही उधारी खाते उपलब्ध नाही / No credit accounts available');
      return;
    }

    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:16px;">
        <h3 style="font-size:1.15rem;font-weight:800;color:var(--text);margin:0;">
          ➕ नवीन उधारी नोंद / New Entry
        </h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
          उधारी खरेदी (Debit) किंवा जमा पावती (Payment) नोंदवा.
        </p>
      </div>

      <form id="new-entry-form" style="display:flex;flex-direction:column;gap:14px;">
        <!-- Customer Select -->
        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
            ग्राहक निवडा (Select Customer) *
          </label>
          <select id="new-entry-account" class="input" style="height:46px;padding:8px 12px;font-size:0.95rem;" required>
            <option value="">-- ग्राहक निवडा --</option>
            ${accounts.map((a) => {
              const c = a.customer || {};
              return `<option value="${a._id}">${AdminDOM.escape(c.name || 'ग्राहक')} (${c.phone || ''}) — चालू बाकी: ₹${a.balance || 0}</option>`;
            }).join('')}
          </select>
        </div>

        <!-- Entry Type: Debit vs Payment -->
        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
            नोंदीचा प्रकार (Entry Type) *
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label class="radio-label" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
              <input type="radio" name="new-entry-type" value="debit" checked />
              <span style="font-weight:600;font-size:0.85rem;">🛒 उधारी खरेदी (Debit)</span>
            </label>
            <label class="radio-label" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
              <input type="radio" name="new-entry-type" value="payment" />
              <span style="font-weight:600;font-size:0.85rem;">💰 जमा पावती (Payment)</span>
            </label>
          </div>
        </div>

        <!-- Amount -->
        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
            रक्कम (Amount ₹) *
          </label>
          <input type="number" id="new-entry-amount" class="input" step="1" min="1" placeholder="रक्कम टाका (e.g. 250)" required style="font-size:1.3rem;font-weight:800;padding:10px 14px;height:48px;" />
        </div>

        <!-- Method (only for payment) -->
        <div class="form-group" id="new-entry-method-wrap" style="display:none;">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
            जमा माध्यम (Method)
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label class="radio-label" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
              <input type="radio" name="new-entry-method" value="cash" checked />
              <span style="font-weight:600;font-size:0.85rem;">💵 रोख (Cash)</span>
            </label>
            <label class="radio-label" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
              <input type="radio" name="new-entry-method" value="upi" />
              <span style="font-weight:600;font-size:0.85rem;">📱 UPI / ऑनलाईन</span>
            </label>
          </div>
        </div>

        <!-- Note -->
        <div class="form-group">
          <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">
            तपशील / टीप (Note)
          </label>
          <input type="text" id="new-entry-note" class="input" placeholder="उदा. किराणा सामान किंवा दुकानात रोख जमा" style="height:42px;" />
        </div>

        <!-- Submit -->
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary" id="new-entry-cancel" style="flex:1;min-height:46px;">
            ${t('cancel')}
          </button>
          <button type="submit" class="btn btn-primary" id="new-entry-submit" style="flex:2;min-height:46px;font-weight:700;">
            ✓ नोंद जतन करा / Save Entry
          </button>
        </div>
      </form>
    `;

    const sheet = AdminBottomSheet.open({ content: sheetContent });

    const form = sheetContent.querySelector('#new-entry-form');
    const methodWrap = sheetContent.querySelector('#new-entry-method-wrap');

    sheetContent.querySelectorAll('input[name="new-entry-type"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        methodWrap.style.display = radio.value === 'payment' ? 'block' : 'none';
      });
    });

    sheetContent.querySelector('#new-entry-cancel')?.addEventListener('click', () => sheet.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const accountId = sheetContent.querySelector('#new-entry-account').value;
      const amount = parseFloat(sheetContent.querySelector('#new-entry-amount').value);
      const type = form.querySelector('input[name="new-entry-type"]:checked')?.value || 'debit';
      const method = form.querySelector('input[name="new-entry-method"]:checked')?.value || 'cash';
      const note = sheetContent.querySelector('#new-entry-note')?.value.trim();

      if (!accountId || isNaN(amount) || amount <= 0) {
        AdminToast.warning('कृपया ग्राहक आणि योग्य रक्कम निवडा');
        return;
      }

      const submitBtn = sheetContent.querySelector('#new-entry-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'नोंदणी सुरू आहे... / Saving...';

      try {
        if (type === 'payment') {
          await AdminAPI.post(`/api/udhar/admin/accounts/${accountId}/payment`, {
            amount,
            paymentMethod: method,
            note,
          });
          AdminToast.success(`₹${amount} जमा पावती यशस्वीरित्या नोंदवली!`);
        } else {
          await AdminAPI.post(`/api/udhar/admin/accounts/${accountId}/debit`, {
            amount,
            note,
          });
          AdminToast.success(`₹${amount} उधारी खरेदी यशस्वीरित्या नोंदवली!`);
        }
        sheet.close();
        await loadAccounts();
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ नोंद जतन करा / Save Entry';
      }
    });
  }

  // ── Record Payment BottomSheet ──
  function openRecordPaymentSheet(acc) {
    const cust = acc.customer || {};
    const name = cust.name || 'ग्राहक';
    const balance = acc.balance || 0;

    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:16px;">
        <h3 style="font-size:1.15rem;font-weight:800;color:var(--text);margin:0;">
          💰 जमा पावती नोंदवा / Record Payment
        </h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
          ग्राहक: <strong>${AdminDOM.escape(name)}</strong> | चालू बाकी: <strong style="color:var(--danger);">${AdminFormat.currency(balance)}</strong>
        </p>
      </div>

      <form id="pay-form" style="display:flex;flex-direction:column;gap:14px;">
        <!-- Amount Input -->
        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
            जमा रक्कम (Payment Amount ₹) *
          </label>
          <input type="number" id="pay-amount" class="input" step="1" min="1" max="${balance || 100000}" 
            placeholder="रक्कम टाका (e.g. 500)" inputmode="decimal" required 
            style="font-size:1.3rem;font-weight:800;padding:10px 14px;height:48px;" />
        </div>

        <!-- Quick Presets -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-preset" data-val="100" style="padding:6px 12px;font-size:0.78rem;">+₹100</button>
          <button type="button" class="btn btn-secondary btn-preset" data-val="500" style="padding:6px 12px;font-size:0.78rem;">+₹500</button>
          <button type="button" class="btn btn-secondary btn-preset" data-val="1000" style="padding:6px 12px;font-size:0.78rem;">+₹1,000</button>
          <button type="button" class="btn btn-secondary btn-preset" data-val="${balance}" style="padding:6px 12px;font-size:0.78rem;font-weight:700;color:var(--primary);border-color:var(--primary);">
            पूर्ण बाकी (₹${balance})
          </button>
        </div>

        <!-- Payment Method -->
        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:6px;">
            माध्यम (Payment Method) *
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label class="radio-label" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
              <input type="radio" name="pay-method" value="cash" checked />
              <span style="font-weight:600;font-size:0.85rem;">💵 रोख (Cash)</span>
            </label>
            <label class="radio-label" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
              <input type="radio" name="pay-method" value="upi" />
              <span style="font-weight:600;font-size:0.85rem;">📱 UPI / ऑनलाईन</span>
            </label>
          </div>
        </div>

        <!-- Optional Note / Ref -->
        <div class="form-group">
          <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">
            नोंद किंवा UPI संदर्भ क्र. (Optional Note / UPI Ref)
          </label>
          <input type="text" id="pay-note" class="input" placeholder="उदा. दुकानात रोख दिले किंवा UTR क्र." style="height:42px;" />
        </div>

        <!-- Submit Button -->
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary" id="pay-cancel-btn" style="flex:1;min-height:46px;">
            ${t('cancel')}
          </button>
          <button type="submit" class="btn btn-primary" id="pay-submit-btn" style="flex:2;min-height:46px;font-weight:700;">
            ✓ जमा पावती नोंदवा / Save Payment
          </button>
        </div>
      </form>
    `;

    const sheet = AdminBottomSheet.open({
      content: sheetContent,
      onClose: () => {},
    });

    // Preset handlers
    const amountInput = sheetContent.querySelector('#pay-amount');
    sheetContent.querySelectorAll('.btn-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        amountInput.value = btn.dataset.val;
        amountInput.focus();
      });
    });

    sheetContent.querySelector('#pay-cancel-btn')?.addEventListener('click', () => sheet.close());

    // Submit handler
    const form = sheetContent.querySelector('#pay-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(amountInput.value);
      if (isNaN(amount) || amount <= 0) {
        AdminToast.warning('कृपया योग्य रक्कम टाका / Enter valid positive amount');
        return;
      }

      const method = form.querySelector('input[name="pay-method"]:checked')?.value || 'cash';
      const note = sheetContent.querySelector('#pay-note')?.value.trim();

      const submitBtn = sheetContent.querySelector('#pay-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'नोंदणी सुरू आहे... / Saving...';

      try {
        const res = await AdminAPI.post(`/api/udhar/admin/accounts/${acc._id}/payment`, {
          amount,
          paymentMethod: method,
          note,
        });

        if (res.success) {
          AdminToast.success(`₹${amount} यशस्वीरित्या जमा झाले / Payment recorded!`);
          sheet.close();
          await loadAccounts();
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ जमा पावती नोंदवा / Save Payment';
      }
    });
  }

  // ── WhatsApp Reminder with UPI Link ──
  async function triggerWhatsAppReminder(acc) {
    try {
      AdminToast.info('तगादा संदेश तयार होत आहे... / Generating reminder...');
      const res = await AdminAPI.get(`/api/udhar/admin/reminder/${acc._id}`);
      if (res.success && res.data) {
        const { waUrl, reminderText, upiPayLink } = res.data;
        if (waUrl) {
          window.open(waUrl, '_blank');
        } else {
          // If no phone on customer, show modal to copy reminder & UPI link
          openReminderPreviewModal(acc, reminderText, upiPayLink);
        }
      }
    } catch (err) {
      AdminToast.error(err.message || 'तगादा तयार करताना चूक झाली / Failed to get reminder');
    }
  }

  function openReminderPreviewModal(acc, text, upiLink) {
    const cust = acc.customer || {};
    const content = document.createElement('div');
    content.innerHTML = `
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 8px;">
        💬 उधारी तगादा संदेश / Payment Reminder
      </h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;">
        ग्राहक: <strong>${AdminDOM.escape(cust.name || 'ग्राहक')}</strong> (फोन नंबर उपलब्ध नाही)
      </p>

      <div style="background:var(--bg-muted);padding:12px;border-radius:var(--radius-md);font-size:0.88rem;white-space:pre-wrap;line-height:1.5;margin-bottom:12px;border:1px solid var(--border);">
        ${AdminDOM.escape(text)}
      </div>

      ${upiLink ? `
        <div style="background:#f0fdf4;padding:10px 12px;border-radius:var(--radius-md);margin-bottom:12px;border:1px solid #86efac;">
          <div style="font-size:0.78rem;font-weight:700;color:#166534;">UPI Direct Intent Link:</div>
          <code style="font-size:0.75rem;word-break:break-all;color:#15803d;">${upiLink}</code>
        </div>
      ` : ''}

      <div style="display:flex;gap:8px;">
        <button type="button" class="btn btn-secondary" id="copy-reminder-btn" style="flex:1;min-height:44px;">
          📋 संदेश कॉपी करा / Copy Text
        </button>
        <button type="button" class="btn btn-primary" id="close-reminder-btn" style="flex:1;min-height:44px;">
          ${t('close')}
        </button>
      </div>
    `;

    const sheet = AdminBottomSheet.open({ content });
    content.querySelector('#copy-reminder-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(text);
      AdminToast.success('संदेश कॉपी केला! / Text copied!');
    });
    content.querySelector('#close-reminder-btn')?.addEventListener('click', () => sheet.close());
  }

  // ── Customer Ledger History Drawer ──
  async function openLedgerSheet(acc) {
    const cust = acc.customer || {};
    const name = cust.name || 'ग्राहक';

    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:1.15rem;font-weight:800;color:var(--text);margin:0;">
            📖 उधारी हिशोब वही / Ledger History
          </h3>
          <p style="font-size:0.82rem;color:var(--text-muted);margin:3px 0 0;">
            ग्राहक: <strong>${AdminDOM.escape(name)}</strong> | चालू बाकी: <strong style="color:var(--danger);">${AdminFormat.currency(acc.balance)}</strong>
          </p>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-share-ledger-wa" style="min-height:36px;font-size:0.75rem;">
            💬 WhatsApp शेअर
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-print-ledger" style="min-height:36px;font-size:0.75rem;">
            🖨️ प्रिंट / Print
          </button>
        </div>
      </div>

      <div id="ledger-entries-container">
        ${AdminSkeleton.cardList(3)}
      </div>
    `;

    const sheet = AdminBottomSheet.open({ content: sheetContent });

    try {
      const res = await AdminAPI.get(`/api/udhar/admin/accounts/${acc._id}/ledger`);
      const container = sheetContent.querySelector('#ledger-entries-container');
      if (!res.success || !res.data || !res.data.entries || res.data.entries.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.9rem;">
            कोणत्याही नोंदी उपलब्ध नाहीत / No ledger entries recorded
          </div>
        `;
        return;
      }

      const entries = res.data.entries;
      renderLedgerTable(container, entries);

      // WhatsApp Statement share handler
      sheetContent.querySelector('#btn-share-ledger-wa')?.addEventListener('click', () => {
        shareLedgerOnWhatsApp(acc, entries);
      });

      // Print handler
      sheetContent.querySelector('#btn-print-ledger')?.addEventListener('click', () => {
        window.print();
      });
    } catch (err) {
      const container = sheetContent.querySelector('#ledger-entries-container');
      container.innerHTML = `<div class="error-box" style="padding:12px;color:var(--danger);font-size:0.85rem;">${err.message || t('error_generic')}</div>`;
    }
  }

  function renderLedgerTable(container, entries) {
    let rowsHtml = '';
    entries.forEach((e) => {
      const isPurchase = e.type === 'purchase';
      const isPayment = e.type === 'payment';
      const typeBadge = isPurchase
        ? '<span class="badge badge-danger">उधारी खरेदी / Purchase</span>'
        : isPayment
        ? '<span class="badge badge-success">जमा / Payment</span>'
        : '<span class="badge badge-warning">समायोजन / Adjust</span>';

      const amountColor = isPurchase ? 'var(--danger)' : 'var(--primary)';
      const sign = isPurchase ? '+' : '-';

      rowsHtml += `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 8px;font-size:0.8rem;white-space:nowrap;">
            ${AdminFormat.date(e.createdAt)}
          </td>
          <td style="padding:10px 8px;font-size:0.8rem;">
            ${typeBadge}
            ${e.note ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${AdminDOM.escape(e.note)}</div>` : ''}
          </td>
          <td style="padding:10px 8px;font-size:0.85rem;font-weight:700;color:${amountColor};text-align:right;">
            ${sign}${AdminFormat.currency(e.amount)}
          </td>
          <td style="padding:10px 8px;font-size:0.85rem;font-weight:800;color:var(--text);text-align:right;">
            ${AdminFormat.currency(e.balanceAfter)}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead>
            <tr style="background:var(--bg-muted);border-bottom:1px solid var(--border);text-align:left;font-size:0.75rem;color:var(--text-muted);">
              <th style="padding:8px;">तारीख / Date</th>
              <th style="padding:8px;">तपशील / Detail</th>
              <th style="padding:8px;text-align:right;">रक्कम / Amount</th>
              <th style="padding:8px;text-align:right;">शिल्लक बाकी / Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function shareLedgerOnWhatsApp(acc, entries) {
    const cust = acc.customer || {};
    const name = cust.name || 'ग्राहक';
    const phone = cust.phone ? cust.phone.replace(/[^0-9]/g, '').slice(-10) : '';

    let text = `*महालक्ष्मी किराणा स्टोअर्स (येसगाव) — उधारी हिशोब वही*\n`;
    text += `ग्राहक: *${name}*\n`;
    text += `चालू शिल्लक बाकी: *₹${acc.balance}*\n\n`;
    text += `*शेवटच्या नोंदी:*\n`;

    entries.slice(0, 5).forEach((e) => {
      const typeStr = e.type === 'purchase' ? 'उधारी खरेदी' : 'जमा';
      const sign = e.type === 'purchase' ? '+' : '-';
      text += `• ${AdminFormat.date(e.createdAt)}: ${typeStr} ${sign}₹${e.amount} (बाकी: ₹${e.balanceAfter})\n`;
    });

    text += `\nकृपया थकबाकी दुकानात अथवा UPI द्वारे जमा करावी. धन्यवाद!\n— किरण गायकवाड (9860924504)`;

    const waUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }

  // ── Edit Status, Limit & Credit Days Modal ──
  function openEditAccountModal(acc) {
    const cust = acc.customer || {};
    const name = cust.name || 'ग्राहक';

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:14px;">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0;">
          ⚙️ खाते स्थिती व मर्यादा / Status & Limit
        </h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin:3px 0 0;">
          ग्राहक: <strong>${AdminDOM.escape(name)}</strong>
        </p>
      </div>

      <form id="status-edit-form" style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:4px;">
            खाते स्थिती (Account Status) *
          </label>
          <select id="select-status" class="input" style="height:44px;">
            <option value="active" ${acc.status === 'active' ? 'selected' : ''}>सक्रिय / Active</option>
            <option value="pending" ${acc.status === 'pending' ? 'selected' : ''}>प्रलंबित / Pending</option>
            <option value="paused" ${acc.status === 'paused' ? 'selected' : ''}>तात्पुरते थांबवले / Paused</option>
            <option value="revoked" ${acc.status === 'revoked' ? 'selected' : ''}>रद्द केले / Revoked</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:4px;">
            उधारी मर्यादा (Credit Limit in ₹) *
          </label>
          <input type="number" id="input-limit" class="input" step="100" min="0" value="${acc.creditLimit || 2000}" required style="height:44px;" />
        </div>

        <div class="form-group">
          <label style="font-weight:700;font-size:0.85rem;display:block;margin-bottom:4px;">
            उधारी मुदत (Credit Terms in Days) *
          </label>
          <input type="number" id="input-credit-days" class="input" step="1" min="1" max="180" value="${acc.creditDays || 30}" required style="height:44px;" />
          <span style="font-size:0.75rem;color:var(--text-muted);">ह्या कालावधीनंतर खाते थकीत (Overdue) मानले जाईल / Marks as overdue after this period</span>
        </div>

        <div class="form-group">
          <label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">
            मालकाची टीप (Owner Note)
          </label>
          <input type="text" id="input-status-note" class="input" value="${AdminDOM.escape(acc.notes || '')}" placeholder="उदा. नियमित ग्राहक, ₹५००० मर्यादा वाढवली" style="height:44px;" />
        </div>

        <div style="margin-top:10px;display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-status" style="flex:1;min-height:44px;">
            ${t('cancel')}
          </button>
          <button type="submit" class="btn btn-primary" id="btn-save-status" style="flex:2;min-height:44px;font-weight:700;">
            ${t('save')}
          </button>
        </div>
      </form>
    `;

    const sheet = AdminBottomSheet.open({ content: modalContent });
    modalContent.querySelector('#btn-cancel-status')?.addEventListener('click', () => sheet.close());

    const form = modalContent.querySelector('#status-edit-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = modalContent.querySelector('#select-status')?.value;
      const creditLimit = parseFloat(modalContent.querySelector('#input-limit')?.value);
      const creditDays = parseInt(modalContent.querySelector('#input-credit-days')?.value, 10);
      const notes = modalContent.querySelector('#input-status-note')?.value.trim();

      const saveBtn = modalContent.querySelector('#btn-save-status');
      saveBtn.disabled = true;
      saveBtn.textContent = 'जतन होत आहे... / Saving...';

      try {
        const res = await AdminAPI.post(`/api/udhar/admin/accounts/${acc._id}/status`, {
          status,
          creditLimit,
          creditDays,
          notes,
        });

        if (res.success) {
          AdminToast.success(t('udhar_status_updated'));
          sheet.close();
          await loadAccounts();
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
        saveBtn.disabled = false;
        saveBtn.textContent = t('save');
      }
    });
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
