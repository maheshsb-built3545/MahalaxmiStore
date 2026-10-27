/**
 * Mahalaxmi Kirana Store — Dashboard (Home) Controller
 * Real-time business overview, action center alerts, quick actions, and hourly chart.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize AppShell with 'dashboard' route
  window.shell = new window.AdminShell({
    activeRoute: 'dashboard',
    pageTitle: 'डॅशबोर्ड / Dashboard',
  });

  initAudioBanner();
  loadDashboardData();
});

function initAudioBanner() {
  const isUnlocked = localStorage.getItem('admin_audio_unlocked') === 'true';
  const banner = document.getElementById('audioBanner');
  if (!banner) return;

  if (!isUnlocked) {
    banner.style.display = 'flex';
    const enableBtn = document.getElementById('enableAudioBtn');
    if (enableBtn) {
      enableBtn.onclick = () => {
        localStorage.setItem('admin_audio_unlocked', 'true');
        banner.style.display = 'none';
        if (window.shell) {
          window.shell.playOrderChime();
        }
        if (window.AdminToast) {
          window.AdminToast.show('ऑडिओ इशारे सुरू केले / Order alert sounds enabled', 'success');
        }
      };
    }
  } else {
    banner.style.display = 'none';
  }
}

async function loadDashboardData() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 16px 0;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
        <div class="stat-card"><div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div><div class="skeleton" style="height:32px;width:40%;"></div></div>
        <div class="stat-card"><div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div><div class="skeleton" style="height:32px;width:40%;"></div></div>
        <div class="stat-card"><div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div><div class="skeleton" style="height:32px;width:40%;"></div></div>
        <div class="stat-card"><div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div><div class="skeleton" style="height:32px;width:40%;"></div></div>
      </div>
    </div>
  `;

  try {
    const statsRes = await window.AdminAPI.get('/admin/stats');
    if (!statsRes.success) throw new Error(statsRes.message);
    renderDashboard(statsRes.data);
  } catch (err) {
    container.innerHTML = '';
    const errEl = window.AdminEmptyState.renderError({
      title: 'माहिती लोड करण्यात त्रुटी / Failed to load dashboard',
      description: err.message,
      onRetry: () => loadDashboardData(),
    });
    container.appendChild(errEl);
  }
}

function renderDashboard(data) {
  const container = document.getElementById('dashboardContent');
  if (!container) return;
  container.innerHTML = '';

  const today = data.today || {};
  const actionCounts = data.actionCounts || {};
  const newOrdersCount = today.newOrders || data.newOrdersCount || 0;
  const lowStockCount = data.lowStockCount || 0;
  const udharOutstanding = data.udharOutstanding || 0;
  const netSales = today.sales || data.todaySales || 0;

  // ── 1. ACTION CENTER (Big Tappable Priority Badges) ──
  const actionCenter = document.createElement('div');
  actionCenter.style.display = 'grid';
  actionCenter.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
  actionCenter.style.gap = '12px';
  actionCenter.style.marginBottom = '20px';

  const actionItems = [
    {
      count: newOrdersCount,
      label: 'नवीन ऑर्डर्स / New Orders',
      icon: 'bell',
      color: '#fee2e2',
      textColor: '#991b1b',
      href: 'orders.html?status=new',
      show: newOrdersCount > 0,
    },
    {
      count: today.pendingDispatches || data.toDeliverCount || 0,
      label: 'डिलिव्हरी बाकी / To Dispatch',
      icon: 'truck',
      color: '#ffedd5',
      textColor: '#9a3412',
      href: 'orders.html?status=packed',
      show: (today.pendingDispatches || data.toDeliverCount || 0) > 0,
    },
    {
      count: lowStockCount,
      label: 'कमी साठा वस्तू / Low Stock',
      icon: 'warning',
      color: '#fef3c7',
      textColor: '#92400e',
      href: 'inventory.html?tab=alerts',
      show: lowStockCount > 0,
    },
  ];

  const visibleActions = actionItems.filter((i) => i.show);
  if (visibleActions.length > 0) {
    visibleActions.forEach((item) => {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'btn';
      a.style.background = item.color;
      a.style.color = item.textColor;
      a.style.display = 'flex';
      a.style.alignItems = 'center';
      a.style.justifyContent = 'space-between';
      a.style.padding = '12px 16px';
      a.style.borderRadius = '12px';
      a.style.fontWeight = '700';
      a.style.boxShadow = 'var(--shadow-xs)';
      a.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-flex;align-items:center;"><svg class="icon icon--md" aria-hidden="true"><use href="/images/icons.svg#${item.icon}"></use></svg></span>
          <span>${item.label}</span>
        </div>
        <span style="background:${item.textColor};color:#fff;border-radius:20px;padding:2px 8px;font-size:0.85rem;">${item.count}</span>
      `;
      actionCenter.appendChild(a);
    });
    container.appendChild(actionCenter);
  }

  // ── 2. QUICK ACTIONS BAR ──
  const quickActions = document.createElement('div');
  quickActions.style.display = 'flex';
  quickActions.style.gap = '8px';
  quickActions.style.overflowX = 'auto';
  quickActions.style.paddingBottom = '12px';
  quickActions.style.marginBottom = '16px';

  quickActions.innerHTML = `
    <a href="catalog.html?action=add" class="btn btn-sm btn-primary" style="display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#plus"></use></svg> <span>उत्पादन जोडा (Add Product)</span></a>
    <a href="inventory.html?tab=stock-in" class="btn btn-sm btn-secondary" style="display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#box"></use></svg> <span>स्टॉक भरा (Stock In)</span></a>
    <a href="udhar.html" class="btn btn-sm btn-secondary" style="display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#credit"></use></svg> <span>उधारी नोंद (Record Udhar)</span></a>
    <a href="orders.html?tab=packing" class="btn btn-sm btn-secondary" style="display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#print"></use></svg> <span>पॅकिंग यादी (Packing List)</span></a>
  `;
  container.appendChild(quickActions);

  // ── 3. HERO KPI STATS GRID ──
  const statsGrid = document.createElement('div');
  statsGrid.style.display = 'grid';
  statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
  statsGrid.style.gap = '14px';
  statsGrid.style.marginBottom = '24px';

  statsGrid.appendChild(window.AdminStatCard.render({
    label: 'आजची विक्री / Today Sales',
    value: window.AdminFormat.currency(netSales),
    note: 'रद्द वगळून / Non-cancelled',
    icon: 'wallet',
    href: 'reports.html?range=today',
  }));

  statsGrid.appendChild(window.AdminStatCard.render({
    label: 'आजच्या ऑर्डर्स / Today Orders',
    value: String(today.orders || data.todayOrders || 0),
    note: `${today.deliveredOrders || data.deliveredOrders || 0} डिलिव्हर पूर्ण`,
    icon: 'orders',
    href: 'orders.html',
  }));

  statsGrid.appendChild(window.AdminStatCard.render({
    label: 'उधारी बाकी / Udhar Outstanding',
    value: window.AdminFormat.currency(udharOutstanding),
    note: 'सक्रिय खाती / Active Credit',
    icon: 'credit',
    href: 'udhar.html',
  }));

  statsGrid.appendChild(window.AdminStatCard.render({
    label: 'जमा रक्कम / Collected Today',
    value: window.AdminFormat.currency(today.collectedSales || data.collectedSales || 0),
    note: 'रोख व UPI जमा / Paid',
    icon: 'check',
    href: 'reports.html?range=today',
  }));

  container.appendChild(statsGrid);

  // ── 4. HOURLY LOAD SPARKLINE & SLOT-WISE LOAD ──
  const chartsRow = document.createElement('div');
  chartsRow.style.display = 'grid';
  chartsRow.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
  chartsRow.style.gap = '16px';
  chartsRow.style.marginBottom = '24px';

  // Slot Load Card
  const slotsCard = document.createElement('div');
  slotsCard.className = 'chart-card';
  const slotsData = data.slotCounts || { morning: 0, afternoon: 0, evening: 0 };
  slotsCard.innerHTML = `
    <h3 style="font-size:1rem;margin-bottom:12px;display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#clock"></use></svg> आजचे डिलिव्हरी स्लॉट्स (Slot Load)</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div>
        <div class="flex justify-between text-sm" style="margin-bottom:4px;">
          <span>सकाळ (Morning: 7-11 AM)</span>
          <span class="font-bold">${slotsData.morning || 0} ऑर्डर्स</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
          <div style="width:${Math.min(100, (slotsData.morning || 0) * 10)}%;height:100%;background:#16a34a;"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-sm" style="margin-bottom:4px;">
          <span>दुपार (Afternoon: 12-4 PM)</span>
          <span class="font-bold">${slotsData.afternoon || 0} ऑर्डर्स</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
          <div style="width:${Math.min(100, (slotsData.afternoon || 0) * 10)}%;height:100%;background:#0284c7;"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-sm" style="margin-bottom:4px;">
          <span>संध्याकाळ (Evening: 5-9 PM)</span>
          <span class="font-bold">${slotsData.evening || 0} ऑर्डर्स</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
          <div style="width:${Math.min(100, (slotsData.evening || 0) * 10)}%;height:100%;background:#f59e0b;"></div>
        </div>
      </div>
    </div>
  `;
  chartsRow.appendChild(slotsCard);

  // Top Products Spark Card
  const topProductsCard = document.createElement('div');
  topProductsCard.className = 'chart-card';
  const topItems = (data.topProductsToday || []).slice(0, 4);
  topProductsCard.innerHTML = `
    <h3 style="font-size:1rem;margin-bottom:12px;display:inline-flex;align-items:center;gap:6px;"><svg class="icon icon--sm" aria-hidden="true"><use href="/images/icons.svg#trending-up"></use></svg> आज सर्वाधिक खपणारी उत्पादने (Top Selling Today)</h3>
    ${topItems.length ? `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${topItems.map((item) => `
          <div class="flex justify-between items-center text-sm" style="padding-bottom:6px;border-bottom:1px solid var(--border-subtle);">
            <div>
              <div style="font-weight:600;">${window.esc(item.nameMr || item.nameEn)}</div>
              <div class="text-xs text-muted">${window.esc(item.nameEn)}</div>
            </div>
            <div style="text-align:right;">
              <span class="font-bold" style="color:var(--color-primary-700);">${item.totalUnits} नग</span>
              <div class="text-xs text-muted">₹${item.totalRevenue}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `<p class="text-sm text-muted">आज अद्याप कोणतीही विक्री झालेली नाही / No items sold yet today</p>`}
  `;
  chartsRow.appendChild(topProductsCard);
  container.appendChild(chartsRow);

  // ── 5. RECENT ORDERS LIST PREVIEW ──
  const recentOrdersHeader = document.createElement('div');
  recentOrdersHeader.className = 'flex justify-between items-center';
  recentOrdersHeader.style.marginBottom = '12px';
  recentOrdersHeader.innerHTML = `
    <h2 style="font-size:1.1rem;font-weight:700;">ताजी ऑर्डर यादी / Recent Orders</h2>
    <a href="orders.html" class="btn btn-sm btn-outline">सर्व पहा / View All →</a>
  `;
  container.appendChild(recentOrdersHeader);

  const recentList = document.createElement('div');
  recentList.id = 'recentOrdersList';
  container.appendChild(recentList);

  const recentOrders = (data.recentOrders || []).slice(0, 5);
  new window.AdminDataList({
    container: recentList,
    items: recentOrders,
    columns: [
      { field: 'orderNumber', label: 'ऑर्डर क्र. / Order No.', render: (v) => `<strong>#${v}</strong>` },
      { field: 'customer', label: 'ग्राहक / Customer', render: (_, o) => `${window.esc(o.customer?.name || o.address?.name || 'Customer')}` },
      { field: 'total', label: 'रक्कम / Total', render: (v) => `<strong>${window.AdminFormat.currency(v)}</strong>` },
      { field: 'status', label: 'स्थिती / Status', render: (v) => window.AdminBadge.render(v) },
      { field: 'createdAt', label: 'वेळ / Time', render: (v) => window.AdminFormat.relativeTime(v) },
    ],
    renderCard: (order) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-header">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">#${window.esc(order.orderNumber)}</div>
            <div class="text-xs text-muted">${window.esc(order.customer?.name || order.address?.name || 'Customer')} • ${window.AdminFormat.relativeTime(order.createdAt)}</div>
          </div>
          <div>${window.AdminBadge.render(order.status).outerHTML}</div>
        </div>
        <div class="item-card-footer">
          <strong style="color:var(--color-primary-800);">${window.AdminFormat.currency(order.total)}</strong>
          <a href="orders.html?id=${order._id}" class="btn btn-sm btn-primary">ऑर्डर पहा / View</a>
        </div>
      `;
      return card;
    },
  });
}
