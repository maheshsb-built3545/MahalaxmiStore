/**
 * frontend/admin/js/admin-reports.js
 *
 * R4 — Business Analytics, Inventory Valuation, and Daily Settlement (ADM-03, WA-04)
 */

let _currentRangeDays = 30;

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('reports');
  setupRangeListeners();
  loadReports();

  // Daily settlement button
  document.getElementById('dailySettlementBtn')?.addEventListener('click', openDailySettlement);
});

function setupRangeListeners() {
  document.querySelectorAll('.range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      _currentRangeDays = parseInt(btn.getAttribute('data-days'), 10);
      loadReports();
    });
  });

  document.getElementById('applyCustomDateBtn')?.addEventListener('click', () => {
    const start = document.getElementById('reportStartDate')?.value;
    const end = document.getElementById('reportEndDate')?.value;
    if (!start || !end) {
      alert('Please select both start and end dates.');
      return;
    }
    document.querySelectorAll('.range-btn').forEach((b) => b.classList.remove('active'));
    loadReports(start, end);
  });
}

async function loadReports(customStart = null, customEnd = null) {
  try {
    let url = '/admin/reports';
    if (customStart && customEnd) {
      url += `?startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
    } else {
      const start = new Date(Date.now() - _currentRangeDays * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();
      url += `?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
    }

    const res = await adminFetch(url);
    if (!res.success) throw new Error(res.message);

    renderReportData(res.data);
  } catch (err) {
    console.error('Failed to load reports:', err);
    alert('Error loading reports: ' + err.message);
  }
}

function renderReportData(data) {
  const {
    netRevenue,
    grossRevenue,
    totalOrders,
    averageOrderValue,
    totalDeliveryFees,
    statusCounts = {},
    paymentSplit = {},
    channelSplit = {},
    topProducts = [],
    slowProducts = [],
    inventoryValuation = {},
  } = data;

  // KPIs
  document.getElementById('statNetRevenue').textContent = `₹${(netRevenue || 0).toLocaleString('en-IN')}`;
  document.getElementById('statGrossRevenue').textContent = `₹${(grossRevenue || 0).toLocaleString('en-IN')}`;
  document.getElementById('statTotalOrders').textContent = (totalOrders || 0).toLocaleString('en-IN');
  document.getElementById('statAov').textContent = `₹${(averageOrderValue || 0).toLocaleString('en-IN')}`;
  document.getElementById('statDeliveryFees').textContent = `₹${(totalDeliveryFees || 0).toLocaleString('en-IN')}`;
  document.getElementById('statCancelledCount').textContent = `${statusCounts.cancelled || 0} रद्द ऑर्डर्स (Cancelled)`;

  // Payment Breakdown
  const totalPayment = (paymentSplit.cod?.amount || 0) + (paymentSplit.upi_qr?.amount || 0) + (paymentSplit.udhar?.amount || 0);
  const upiAmt = paymentSplit.upi_qr?.amount || 0;
  const cashAmt = paymentSplit.cod?.amount || 0;
  const udharAmt = paymentSplit.udhar?.amount || 0;

  const upiPct = totalPayment > 0 ? Math.round((upiAmt / totalPayment) * 100) : 0;
  const cashPct = totalPayment > 0 ? Math.round((cashAmt / totalPayment) * 100) : 0;
  const udharPct = totalPayment > 0 ? Math.round((udharAmt / totalPayment) * 100) : 0;

  document.getElementById('valUpiAmount').textContent = `₹${upiAmt.toLocaleString('en-IN')} (${upiPct}%)`;
  document.getElementById('barUpi').style.width = `${upiPct}%`;

  document.getElementById('valCashAmount').textContent = `₹${cashAmt.toLocaleString('en-IN')} (${cashPct}%)`;
  document.getElementById('barCash').style.width = `${cashPct}%`;

  document.getElementById('valUdharAmount').textContent = `₹${udharAmt.toLocaleString('en-IN')} (${udharPct}%)`;
  document.getElementById('barUdhar').style.width = `${udharPct}%`;

  // Channel Breakdown
  const totalChannelOrders = (channelSplit.website || 0) + (channelSplit.ai_box || 0);
  const aiOrders = channelSplit.ai_box || 0;
  const webOrders = channelSplit.website || 0;
  const aiPct = totalChannelOrders > 0 ? Math.round((aiOrders / totalChannelOrders) * 100) : 0;
  const webPct = totalChannelOrders > 0 ? Math.round((webOrders / totalChannelOrders) * 100) : 0;

  document.getElementById('valAiBoxCount').textContent = `${aiOrders} ऑर्डर्स (${aiPct}%)`;
  document.getElementById('barAiBox').style.width = `${aiPct}%`;

  document.getElementById('valWebsiteCount').textContent = `${webOrders} ऑर्डर्स (${webPct}%)`;
  document.getElementById('barWebsite').style.width = `${webPct}%`;

  // Warehouse Inventory Valuation
  document.getElementById('valTotalUnits').textContent = (inventoryValuation.totalStockUnits || 0).toLocaleString('en-IN');
  document.getElementById('valCostValuation').textContent = `₹${Math.round(inventoryValuation.costValuation || 0).toLocaleString('en-IN')}`;
  document.getElementById('valMrpValuation').textContent = `₹${Math.round(inventoryValuation.mrpValuation || 0).toLocaleString('en-IN')}`;
  document.getElementById('valPotentialMargin').textContent = `₹${Math.round(inventoryValuation.potentialMargin || 0).toLocaleString('en-IN')}`;

  // Top Selling Products Table
  const topBody = document.getElementById('topProductsBody');
  topBody.innerHTML = '';
  if (!topProducts.length) {
    topBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:#64748b;">कोणतीही विक्री आढळली नाही.</td></tr>';
  } else {
    topProducts.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span style="font-weight:700;color:#047857;margin-right:4px;">#${idx + 1}</span>
          <strong>${p.nameMr || p.nameEn}</strong>
          <span style="font-size:0.75rem;color:#64748b;display:block;">${p.nameEn}</span>
        </td>
        <td style="font-weight:700;">${p.totalUnits}</td>
        <td style="font-weight:800;color:#04251a;">₹${p.totalRevenue.toLocaleString('en-IN')}</td>
      `;
      topBody.appendChild(tr);
    });
  }

  // Slow Moving Products Table
  const slowBody = document.getElementById('slowProductsBody');
  slowBody.innerHTML = '';
  if (!slowProducts.length) {
    slowBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:#059669;">सर्व उत्पादने वेगाने विकली जात आहेत! (No slow products)</td></tr>';
  } else {
    slowProducts.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${p.nameMr || p.nameEn}</strong>
          <span style="font-size:0.75rem;color:#64748b;display:block;">${p.nameEn} (${p.packSize || ''})</span>
        </td>
        <td style="font-weight:700;color:#b45309;">${p.stockQuantity}</td>
        <td>₹${p.price}</td>
      `;
      slowBody.appendChild(tr);
    });
  }
}

// ── Daily Settlement Modal (WA-04) ────────────────────────────────────────────
async function openDailySettlement() {
  const modal = document.getElementById('settlementModal');
  const pre = document.getElementById('settlementPre');
  const waLink = document.getElementById('settlementWaLink');

  pre.textContent = 'हिशोब तयार होत आहे... (Generating daily settlement)';
  modal.style.display = 'flex';

  try {
    const res = await adminFetch('/admin/reports/daily-settlement');
    if (!res.success) throw new Error(res.message);

    pre.textContent = res.data.waSummary;
    waLink.href = res.data.waUrl;
  } catch (err) {
    pre.textContent = 'Failed to load settlement: ' + err.message;
  }
}

function closeSettlementModal() {
  document.getElementById('settlementModal').style.display = 'none';
}

async function copySettlementText() {
  const pre = document.getElementById('settlementPre');
  if (!pre) return;
  try {
    await navigator.clipboard.writeText(pre.textContent);
    alert('📋 हिशोब कॉपी झाला! (Copied to clipboard)');
  } catch (_) {
    alert('Could not copy text automatically.');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettlementModal();
});
