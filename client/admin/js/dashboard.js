/**
 * frontend/admin/js/dashboard.js
 * Admin dashboard metrics, 30s live polling, and new order notifications.
 */

'use strict';

let latestOrderTimestamp = null;
let pollTimer = null;

async function loadDashboardStats() {
  try {
    const res = await adminFetch('/admin/dashboard/stats');
    if (!res.success) return;

    const data = res.data;

    document.getElementById('statTodayOrders').textContent = data.todayOrders;
    document.getElementById('statTodaySales').textContent = `₹${data.todaySales}`;
    if (document.getElementById('statCollectedSales')) {
      document.getElementById('statCollectedSales').textContent = `₹${data.collectedSales || 0}`;
    }
    if (document.getElementById('statPendingPayment')) {
      document.getElementById('statPendingPayment').textContent = `₹${data.pendingPaymentSales || 0}`;
    }
    document.getElementById('statPending').textContent = data.pendingCount;
    document.getElementById('statToDeliver').textContent = data.toDeliverCount;
    document.getElementById('statNewOrders').textContent = data.newOrdersCount;
    if (document.getElementById('statLowStock')) {
      document.getElementById('statLowStock').textContent = data.lowStockCount || 0;
    }
    if (document.getElementById('statUnreadMessages')) {
      document.getElementById('statUnreadMessages').textContent = data.unreadMessagesCount || 0;
    }
    if (document.getElementById('statUdharOutstanding')) {
      document.getElementById('statUdharOutstanding').textContent = `₹${data.udharOutstanding || 0}`;
    }

    if (data.latestOrderTimestamp) {
      latestOrderTimestamp = data.latestOrderTimestamp;
    }
  } catch (err) {
    console.error('Error loading dashboard metrics:', err);
  }
}

async function checkNewOrders() {
  if (!latestOrderTimestamp) return;

  try {
    const res = await adminFetch(`/admin/dashboard/check-new?since=${encodeURIComponent(latestOrderTimestamp)}`);
    if (res.success && res.hasNew) {
      // Show notification banner
      const banner = document.getElementById('newOrderBanner');
      const bannerText = document.getElementById('newOrderBannerText');
      if (banner && bannerText) {
        bannerText.textContent = `🔔 ${res.count} नवीन ऑर्डर आली आहे! / ${res.count} New order received!`;
        banner.style.display = 'flex';
      }

      // Play chime
      playNewOrderChime();

      // Update timestamp and reload stats
      if (res.latestTimestamp) {
        latestOrderTimestamp = res.latestTimestamp;
      }
      loadDashboardStats();
      loadRecentOrders();
    }
  } catch (err) {
    console.warn('Polling check failed:', err.message);
  }
}

async function loadRecentOrders() {
  const container = document.getElementById('recentOrdersList');
  if (!container) return;

  try {
    const res = await adminFetch('/admin/orders?limit=5');
    if (!res.success || !res.data) return;

    if (res.data.length === 0) {
      container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--admin-muted);">No orders yet / अद्याप कोणतीही ऑर्डर नाही.</div>';
      return;
    }

    container.innerHTML = res.data
      .map((ord) => {
        const dateFormatted = auth.formatDateIST(ord.createdAt);
        const customerName = escapeHtml(ord.customerName);
        const orderNum = escapeHtml(ord.orderNumber);
        const statusBadge = `<span class="badge badge-${escapeHtml(ord.status)}">${escapeHtml(ord.status.replace(/_/g, ' '))}</span>`;

        return `
          <div class="order-card">
            <div class="order-card-header">
              <div>
                <span class="order-num">${orderNum}</span>
                <div class="order-date">${dateFormatted}</div>
              </div>
              ${statusBadge}
            </div>
            <div class="customer-row">
              <strong>${customerName}</strong>
              <a href="tel:+${normalizePhone(ord.customerPhone)}" class="phone-link">📞 ${escapeHtml(ord.customerPhone)}</a>
            </div>
            <div class="order-summary-row">
              <span>Items: ${ord.items.length}</span>
              <strong>₹${ord.total}</strong>
            </div>
            <div class="order-actions">
              <a href="orders.html?search=${encodeURIComponent(ord.orderNumber)}" class="btn-action btn-outline">View Order →</a>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Error loading recent orders:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('dashboard');
  loadDashboardStats();
  loadRecentOrders();

  // Start 30-second live polling (Rule 2 & 9)
  pollTimer = setInterval(checkNewOrders, 30000);
});
