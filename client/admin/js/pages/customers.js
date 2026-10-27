/**
 * Mahalaxmi Kirana Store — Customers Directory & Profile Page
 * Specs: 3.6 Customers
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('customers-page-root');
  if (!root) return;

  let customers = [];
  let pagination = { page: 1, limit: 20, pages: 1, total: 0 };
  let activeSegment = 'all';
  let searchQuery = '';
  let isLoading = false;

  async function init() {
    AdminShell.init('customers');
    renderPageSkeleton();
    await loadCustomers();
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
            ${t('nav_customers')}
          </h1>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
            नोंदणीकृत ग्राहक यादी, खरेदी इतिहास व खाते व्यवस्थापन / Registered customer directory, spend history & management
          </p>
        </div>
      </div>

      <!-- KPI Overview Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="customers-kpi-row" style="margin-bottom:16px;">
        <div class="skeleton" style="height:80px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:80px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:80px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:80px;border-radius:var(--radius-md);"></div>
      </div>

      <!-- Filter & Search Bar -->
      <div id="customers-filter-container" style="margin-bottom:16px;"></div>

      <!-- Customers List Container -->
      <div id="customers-list-container">
        ${AdminSkeleton.cardList(5)}
      </div>

      <!-- Pagination Footer -->
      <div id="customers-pagination-container" style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;flex-wrap:wrap;gap:12px;"></div>
    `;

    renderFilterBar();
  }

  function renderFilterBar() {
    const filterContainer = document.getElementById('customers-filter-container');
    if (!filterContainer) return;

    filterContainer.innerHTML = '';
    const bar = AdminFilterBar.create({
      searchPlaceholder: 'नाव किंवा फोन नंबर शोधा... / Search name or phone...',
      onSearch: (q) => {
        searchQuery = q.trim();
        pagination.page = 1;
        loadCustomers();
      },
      chips: [
        { id: 'all', label: 'सर्व ग्राहक / All', active: activeSegment === 'all' },
        { id: 'regular', label: 'नियमित / Regular (≥3)', active: activeSegment === 'regular' },
        { id: 'new', label: 'नवीन / New (<30 days)', active: activeSegment === 'new' },
        { id: 'dormant', label: 'सुप्त / Dormant (>30 days)', active: activeSegment === 'dormant' },
        { id: 'udhar', label: 'उधारी ग्राहक / Udhar Users', active: activeSegment === 'udhar' },
        { id: 'blocked', label: 'ब्लॉक केलेले / Blocked', active: activeSegment === 'blocked' },
      ],
      onFilterChange: (chipId) => {
        activeSegment = chipId;
        pagination.page = 1;
        loadCustomers();
      },
    });
    filterContainer.appendChild(bar);
  }

  async function loadCustomers() {
    isLoading = true;
    try {
      let url = `/api/admin/customers?page=${pagination.page}&limit=${pagination.limit}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (activeSegment !== 'all') url += `&segment=${encodeURIComponent(activeSegment)}`;

      const res = await AdminAPI.get(url);
      if (res.success) {
        customers = res.data || [];
        if (res.pagination) {
          pagination = res.pagination;
        }
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    } finally {
      isLoading = false;
      renderKPIs();
      renderCustomerList();
      renderPagination();
    }
  }

  function renderKPIs() {
    const kpiRow = document.getElementById('customers-kpi-row');
    if (!kpiRow) return;

    kpiRow.innerHTML = '';

    // Total in current view
    kpiRow.appendChild(
      AdminStatCard.create({
        label: 'एकूण ग्राहक / Total Customers',
        value: `${pagination.total || customers.length}`,
        variant: 'primary',
        subtext: 'नोंदणीकृत ग्राहक / Registered',
      })
    );

    // Regular
    const regularCount = customers.filter((c) => (c.orderCount || 0) >= 3).length;
    kpiRow.appendChild(
      AdminStatCard.create({
        label: 'नियमित ग्राहक / Regular',
        value: `${regularCount}`,
        variant: 'success',
        subtext: '३ किंवा अधिक ऑर्डर्स / ≥3 orders',
      })
    );

    // Udhar users
    const udharCount = customers.filter((c) => c.udharAccount).length;
    kpiRow.appendChild(
      AdminStatCard.create({
        label: 'उधारी खाती / Udhar Accounts',
        value: `${udharCount}`,
        variant: 'warning',
        subtext: 'चालू पत मर्यादा / Credit facility',
      })
    );

    // Blocked
    const blockedCount = customers.filter((c) => c.blocked).length;
    kpiRow.appendChild(
      AdminStatCard.create({
        label: 'ब्लॉक खाती / Blocked',
        value: `${blockedCount}`,
        variant: blockedCount > 0 ? 'danger' : 'neutral',
        subtext: 'व्यवहार रोखलेले / Restricted',
      })
    );
  }

  function renderCustomerList() {
    const container = document.getElementById('customers-list-container');
    if (!container) return;

    if (customers.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        AdminEmptyState.create({
          title: t('no_customers_found'),
          description: searchQuery
            ? 'शोधलेली माहिती कोणत्याही ग्राहकाशी जुळत नाही / No customers match search'
            : 'सध्या या विभागात कोणतेही ग्राहक नाहीत / No customers found in this filter',
        })
      );
      return;
    }

    container.innerHTML = `
      <div class="customers-grid" style="display:grid;grid-template-columns:1fr;gap:12px;"></div>
    `;
    const grid = container.querySelector('.customers-grid');

    customers.forEach((c) => {
      grid.appendChild(createCustomerCard(c));
    });
  }

  function createCustomerCard(c) {
    const card = document.createElement('div');
    card.className = 'card customer-card';
    card.style.cssText = 'padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);position:relative;';

    const name = c.name || 'अज्ञात ग्राहक / Unknown';
    const phone = c.phone || '';
    const village = c.village || (c.address?.line) || 'Yesgaon / Kopargaon';
    const orderCount = c.orderCount || 0;
    const spend = c.lifetimeSpend || 0;
    const isBlocked = Boolean(c.blocked);
    const udhar = c.udharAccount;

    const lastOrderText = c.lastOrderDate
      ? `शेवटची ऑर्डर: ${AdminFormat.date(c.lastOrderDate)}`
      : 'अद्याप ऑर्डर नाही / No orders yet';

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="font-size:1.05rem;font-weight:700;margin:0;color:var(--text);">${AdminDOM.escape(name)}</h3>
            ${isBlocked ? '<span class="badge badge-danger">ब्लॉक / Blocked</span>' : ''}
            ${orderCount >= 3 ? '<span class="badge badge-success">नियमित / Regular</span>' : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span><svg class="icon icon-sm"><use href="/images/icons.svg#map-pin"></use></svg> ${AdminDOM.escape(village)}</span>
            ${phone ? `<span><svg class="icon icon-sm"><use href="/images/icons.svg#phone"></use></svg> <a href="tel:${phone}" style="color:var(--primary);font-weight:600;text-decoration:none;">${phone}</a></span>` : ''}
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">एकूण खरेदी (Spent)</div>
          <div style="font-size:1.25rem;font-weight:800;color:var(--primary);">
            ${AdminFormat.currency(spend)}
          </div>
        </div>
      </div>

      <!-- Quick Metrics Strip -->
      <div style="background:var(--bg-muted);padding:10px 12px;border-radius:var(--radius-md);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:0.8rem;">
        <div>
          <span style="color:var(--text-muted);">ऑर्डर्स:</span>
          <strong>${orderCount} ऑर्डर्स</strong>
          <span style="color:var(--text-muted);margin-left:8px;">(${lastOrderText})</span>
        </div>
        ${udhar ? `
          <div>
            <span style="color:var(--text-muted);">उधारी बाकी:</span>
            <strong style="color:${udhar.balance > 0 ? 'var(--danger)' : 'var(--primary)'};">
              ${AdminFormat.currency(udhar.balance || 0)}
            </strong>
          </div>
        ` : ''}
      </div>

      <!-- Actions Row (Thumb friendly >= 44px) -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary btn-view-profile" style="flex:2;min-height:44px;font-size:0.82rem;font-weight:700;">
          <svg class="icon"><use href="/images/icons.svg#user"></use></svg> प्रोफाइल व इतिहास / Profile & Orders
        </button>
        ${phone ? `
          <a href="https://wa.me/91${phone.slice(-10)}" target="_blank" class="btn btn-secondary" style="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:0.82rem;font-weight:600;color:#15803d;border-color:#22c55e;background:#ecfdf5;text-decoration:none;">
            <svg class="icon"><use href="/images/icons.svg#whatsapp"></use></svg> WhatsApp
          </a>
          <a href="tel:${phone}" class="btn btn-secondary" style="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:0.82rem;font-weight:600;text-decoration:none;">
            <svg class="icon"><use href="/images/icons.svg#phone"></use></svg> कॉल
          </a>
        ` : ''}
      </div>
    `;

    card.querySelector('.btn-view-profile')?.addEventListener('click', () => openCustomerDrawer(c));

    return card;
  }

  function renderPagination() {
    const container = document.getElementById('customers-pagination-container');
    if (!container) return;

    if (pagination.pages <= 1) {
      container.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">एकूण: ${pagination.total} ग्राहक / Total ${pagination.total} customers</div>`;
      return;
    }

    container.innerHTML = `
      <div style="font-size:0.82rem;color:var(--text-muted);">
        पान <strong>${pagination.page}</strong> पैकी <strong>${pagination.pages}</strong> (एकूण ${pagination.total} ग्राहक)
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn btn-secondary" id="cust-prev-page" ${pagination.page <= 1 ? 'disabled' : ''} style="min-height:40px;padding:6px 14px;">
          ← मागे / Prev
        </button>
        <button type="button" class="btn btn-secondary" id="cust-next-page" ${pagination.page >= pagination.pages ? 'disabled' : ''} style="min-height:40px;padding:6px 14px;">
          पुढे / Next →
        </button>
      </div>
    `;

    container.querySelector('#cust-prev-page')?.addEventListener('click', () => {
      if (pagination.page > 1) {
        pagination.page--;
        loadCustomers();
      }
    });

    container.querySelector('#cust-next-page')?.addEventListener('click', () => {
      if (pagination.page < pagination.pages) {
        pagination.page++;
        loadCustomers();
      }
    });
  }

  // ── Customer Profile & Orders Drawer ──
  async function openCustomerDrawer(c) {
    const name = c.name || 'ग्राहक';
    const phone = c.phone || '';
    const village = c.village || (c.address?.line) || 'Yesgaon / Kopargaon';

    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <!-- Drawer Header -->
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="font-size:1.2rem;font-weight:800;color:var(--text);margin:0;">
              ${AdminDOM.escape(name)}
            </h3>
            ${c.blocked ? '<span class="badge badge-danger">ब्लॉक / Blocked</span>' : '<span class="badge badge-success">सक्रिय / Active</span>'}
          </div>
          <p style="font-size:0.82rem;color:var(--text-muted);margin:4px 0 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <svg class="icon icon-sm"><use href="/images/icons.svg#phone"></use></svg> ${phone} | <svg class="icon icon-sm"><use href="/images/icons.svg#map-pin"></use></svg> ${AdminDOM.escape(village)} | भाषा: ${c.preferredLanguage ? c.preferredLanguage.toUpperCase() : 'MR'}
          </p>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-block" style="min-height:38px;font-size:0.78rem;">
            ${c.blocked ? '<svg class="icon"><use href="/images/icons.svg#check"></use></svg> अनब्लॉक करा / Unblock' : '<svg class="icon"><use href="/images/icons.svg#close"></use></svg> ब्लॉक करा / Block'}
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-3 gap-2" style="margin-bottom:14px;">
        <div style="background:var(--bg-muted);padding:10px;border-radius:var(--radius-md);text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">एकूण खरेदी</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--primary);margin-top:2px;">
            ${AdminFormat.currency(c.lifetimeSpend || 0)}
          </div>
        </div>
        <div style="background:var(--bg-muted);padding:10px;border-radius:var(--radius-md);text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">ऑर्डर्स</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text);margin-top:2px;">
            ${c.orderCount || 0}
          </div>
        </div>
        <div style="background:var(--bg-muted);padding:10px;border-radius:var(--radius-md);text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">उधारी बाकी</div>
          <div style="font-size:1.1rem;font-weight:800;color:${c.udharAccount?.balance > 0 ? 'var(--danger)' : 'var(--primary)'};margin-top:2px;">
            ${AdminFormat.currency(c.udharAccount?.balance || 0)}
          </div>
        </div>
      </div>

      <div id="drawer-dynamic-content">
        ${AdminSkeleton.cardList(3)}
      </div>
    `;

    const sheet = AdminBottomSheet.open({ content: sheetContent });

    // Block/Unblock toggle handler
    sheetContent.querySelector('#btn-toggle-block')?.addEventListener('click', async () => {
      const willBlock = !c.blocked;
      const confirmed = await AdminConfirm.show({
        title: willBlock ? 'ग्राहक ब्लॉक करायचा का? / Block Customer?' : 'ग्राहक अनब्लॉक करायचा का? / Unblock Customer?',
        message: willBlock
          ? `${name} या ग्राहकाचे खाते तात्पुरते ब्लॉक केले जाईल आणि त्यांना ऑर्डर करता येणार नाही.`
          : `${name} या ग्राहकाचे खाते पुन्हा सक्रिय केले जाईल.`,
        confirmLabel: willBlock ? 'ब्लॉक करा / Block' : 'अनब्लॉक करा / Unblock',
        isDanger: willBlock,
      });

      if (!confirmed) return;

      try {
        const res = await AdminAPI.patch(`/api/admin/customers/${c._id}/block`, { blocked: willBlock });
        if (res.success) {
          AdminToast.success(willBlock ? 'ग्राहक ब्लॉक केला / Customer blocked' : 'ग्राहक अनब्लॉक केला / Customer unblocked');
          c.blocked = willBlock;
          sheet.close();
          await loadCustomers();
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
      }
    });

    // Load recent orders and favorite items
    try {
      const res = await AdminAPI.get(`/api/admin/customers/${c._id}/orders`);
      const dynamicContainer = sheetContent.querySelector('#drawer-dynamic-content');
      if (!res.success || !res.data) {
        dynamicContainer.innerHTML = '<div style="padding:16px;color:var(--text-muted);">माहिती लोड करता आली नाही / Failed to load details</div>';
        return;
      }

      const { orders = [], favoriteItems = [], addresses = [] } = res.data;

      let html = '';

      // Favorite Items Section
      if (favoriteItems.length > 0) {
        html += `
          <div style="margin-bottom:16px;">
            <h4 style="font-size:0.9rem;font-weight:700;color:var(--text);margin:0 0 8px;display:flex;align-items:center;gap:6px;">
              <svg class="icon icon-sm"><use href="/images/icons.svg#tag"></use></svg> ${t('customer_favorite_items')}
            </h4>
            <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;">
              ${favoriteItems.map((fi) => `
                <div style="background:var(--bg-muted);border:1px solid var(--border);border-radius:var(--radius-md);padding:8px 12px;font-size:0.8rem;white-space:nowrap;flex-shrink:0;">
                  <div style="font-weight:700;color:var(--text);">${AdminDOM.escape(fi.nameMr || fi.nameEn)}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">${fi.count} वेळा खरेदी (${fi.packSize || ''})</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Addresses Section
      if (addresses.length > 0) {
        html += `
          <div style="margin-bottom:16px;">
            <h4 style="font-size:0.9rem;font-weight:700;color:var(--text);margin:0 0 8px;display:flex;align-items:center;gap:6px;">
              <svg class="icon icon-sm"><use href="/images/icons.svg#map-pin"></use></svg> ${t('customer_addresses')}
            </h4>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${addresses.map((a) => `
                <div style="background:var(--bg-muted);padding:8px 12px;border-radius:var(--radius-md);font-size:0.8rem;border:1px solid var(--border);">
                  <strong>${AdminDOM.escape(a.line)}</strong>
                  ${a.landmark ? `<span style="color:var(--text-muted);"> (खूण: ${AdminDOM.escape(a.landmark)})</span>` : ''}
                  <span style="color:var(--primary);font-weight:600;margin-left:6px;">पिन: ${a.pincode}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Recent Orders List
      html += `
        <div>
          <h4 style="font-size:0.9rem;font-weight:700;color:var(--text);margin:0 0 8px;display:flex;align-items:center;gap:6px;">
            <svg class="icon icon-sm"><use href="/images/icons.svg#box"></use></svg> ${t('customer_recent_orders')} (${orders.length})
          </h4>
          ${orders.length === 0 ? `
            <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;">
              अद्याप कोणतीही ऑर्डर केलेली नाही / No orders placed yet
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${orders.map((o) => `
                <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 12px;background:var(--surface);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <a href="orders.html?search=${encodeURIComponent(o.orderNumber)}" style="font-weight:700;font-size:0.85rem;color:var(--primary);text-decoration:none;">
                      #${o.orderNumber}
                    </a>
                    <span class="badge badge-neutral" style="font-size:0.7rem;">${o.status.toUpperCase()}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;color:var(--text-muted);">
                    <span>${AdminFormat.date(o.createdAt)} • ${o.items?.length || 0} वस्तू</span>
                    <strong style="color:var(--text);font-size:0.85rem;">${AdminFormat.currency(o.total)}</strong>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      dynamicContainer.innerHTML = html;
    } catch (err) {
      const dynamicContainer = sheetContent.querySelector('#drawer-dynamic-content');
      dynamicContainer.innerHTML = `<div style="padding:12px;color:var(--danger);font-size:0.85rem;">${err.message || t('error_generic')}</div>`;
    }
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
