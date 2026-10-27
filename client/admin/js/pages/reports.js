/**
 * Mahalaxmi Kirana Store — Reports & Profit Analytics Page
 * Specs: 3.7 Reports
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('reports-page-root');
  if (!root) return;

  let reportData = null;
  let activePreset = '30d';
  let customStartDate = '';
  let customEndDate = '';
  let activeTab = 'sales';
  let isLoading = false;

  async function init() {
    AdminShell.init('reports');
    renderPageSkeleton();
    await loadReports();
  }

  function getDateRangeForPreset(preset) {
    const end = new Date();
    let start = new Date();

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (preset === '7d') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (preset === '30d') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'this_month') {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      const customEnd = new Date(customEndDate);
      customEnd.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: customEnd.toISOString() };
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
            ${t('nav_reports')}
          </h1>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
            खरेदी खर्च (Cost Price) आधारित खरा नफा, विक्री कल व दैनिक हिशोब / Cost-based profit analytics & settlement
          </p>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-primary" id="btn-daily-settlement" style="min-height:44px;font-weight:700;">
            <svg class="icon"><use href="/images/icons.svg#list"></use></svg> आजचा हिशोब / Daily Settlement
          </button>
        </div>
      </div>

      <!-- Date Presets Bar -->
      <div class="reports-presets-bar" style="background:var(--surface);padding:10px 14px;border-radius:var(--radius-lg);border:1px solid var(--border);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;" id="presets-chips-container">
          <button type="button" class="chip ${activePreset === 'today' ? 'active' : ''}" data-preset="today">आज / Today</button>
          <button type="button" class="chip ${activePreset === 'yesterday' ? 'active' : ''}" data-preset="yesterday">काल / Yesterday</button>
          <button type="button" class="chip ${activePreset === '7d' ? 'active' : ''}" data-preset="7d">७ दिवस / 7 Days</button>
          <button type="button" class="chip ${activePreset === '30d' ? 'active' : ''}" data-preset="30d">३० दिवस / 30 Days</button>
          <button type="button" class="chip ${activePreset === 'this_month' ? 'active' : ''}" data-preset="this_month">हा महिना / Month</button>
          <button type="button" class="chip ${activePreset === 'custom' ? 'active' : ''}" data-preset="custom">सानुकूल / Custom</button>
        </div>
        <div id="custom-date-container" style="display:${activePreset === 'custom' ? 'flex' : 'none'};gap:6px;align-items:center;">
          <input type="date" id="input-custom-start" class="input" style="height:36px;padding:4px 8px;font-size:0.8rem;" />
          <span style="color:var(--text-muted);font-size:0.8rem;">ते</span>
          <input type="date" id="input-custom-end" class="input" style="height:36px;padding:4px 8px;font-size:0.8rem;" />
          <button type="button" class="btn btn-secondary btn-sm" id="btn-apply-custom-date" style="height:36px;">लागू करा / Apply</button>
        </div>
      </div>

      <!-- Top KPI Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="reports-kpi-row" style="margin-bottom:16px;">
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
        <div class="skeleton" style="height:90px;border-radius:var(--radius-md);"></div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-container" style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px;gap:8px;">
        <button type="button" class="tab-btn active" data-tab="sales" style="padding:10px 16px;font-weight:700;font-size:0.85rem;background:none;border:none;border-bottom:2px solid var(--primary);color:var(--primary);cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#chart"></use></svg> विक्री व नफा / Sales & Profit
        </button>
        <button type="button" class="tab-btn" data-tab="valuation" style="padding:10px 16px;font-weight:600;font-size:0.85rem;background:none;border:none;color:var(--text-muted);cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#store"></use></svg> साठा मूल्य व उधारी / Valuation & Aging
        </button>
        <button type="button" class="tab-btn" data-tab="export" style="padding:10px 16px;font-weight:600;font-size:0.85rem;background:none;border:none;color:var(--text-muted);cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#box"></use></svg> CSV डाऊनलोड / Exports
        </button>
      </div>

      <!-- Dynamic Tab Content -->
      <div id="reports-tab-content">
        ${AdminSkeleton.cardList(3)}
      </div>
    `;

    bindPresetEvents();
    bindTabEvents();
    document.getElementById('btn-daily-settlement')?.addEventListener('click', openDailySettlementModal);
  }

  function bindPresetEvents() {
    const chips = root.querySelectorAll('#presets-chips-container .chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        activePreset = chip.dataset.preset;

        const customBox = document.getElementById('custom-date-container');
        if (activePreset === 'custom') {
          if (customBox) customBox.style.display = 'flex';
        } else {
          if (customBox) customBox.style.display = 'none';
          loadReports();
        }
      });
    });

    document.getElementById('btn-apply-custom-date')?.addEventListener('click', () => {
      customStartDate = document.getElementById('input-custom-start')?.value;
      customEndDate = document.getElementById('input-custom-end')?.value;
      if (!customStartDate || !customEndDate) {
        AdminToast.warning('कृपया दोन्ही तारखा निवडा / Please select both dates');
        return;
      }
      loadReports();
    });
  }

  function bindTabEvents() {
    const tabButtons = root.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((b) => {
          b.classList.remove('active');
          b.style.borderBottom = 'none';
          b.style.color = 'var(--text-muted)';
          b.style.fontWeight = '600';
        });
        btn.classList.add('active');
        btn.style.borderBottom = '2px solid var(--primary)';
        btn.style.color = 'var(--primary)';
        btn.style.fontWeight = '700';

        activeTab = btn.dataset.tab;
        renderTabContent();
      });
    });
  }

  async function loadReports() {
    isLoading = true;
    try {
      const { start, end } = getDateRangeForPreset(activePreset);
      const res = await AdminAPI.get(`/api/admin/reports?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
      if (res.success && res.data) {
        reportData = res.data;
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    } finally {
      isLoading = false;
      renderKPIs();
      renderTabContent();
    }
  }

  function renderKPIs() {
    const kpiRow = document.getElementById('reports-kpi-row');
    if (!kpiRow || !reportData) return;

    kpiRow.innerHTML = '';

    const netRev = reportData.netRevenue || 0;
    const grossProfit = reportData.profitMetrics?.grossProfit || 0;
    const marginPct = reportData.profitMetrics?.grossMarginPercent || 0;
    const totalOrders = reportData.totalOrders || 0;
    const aov = reportData.averageOrderValue || 0;

    // Revenue growth delta
    const revGrowth = reportData.comparison?.revenueGrowthPercent || 0;
    const revGrowthStr = revGrowth !== 0 ? `${revGrowth > 0 ? '+' : ''}${revGrowth}% vs मागील काळ` : 'मागील काळाशी तुलना';

    // 1. Net Revenue
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('revenue'),
        value: AdminFormat.currency(netRev),
        variant: 'primary',
        subtext: revGrowthStr,
      })
    );

    // 2. Gross Profit
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('gross_profit'),
        value: AdminFormat.currency(grossProfit),
        variant: 'success',
        subtext: `खरा नफा दर: ${marginPct}% (खरेदी वजा करून)`,
      })
    );

    // 3. Orders Count
    const ordGrowth = reportData.comparison?.ordersGrowthPercent || 0;
    const ordGrowthStr = ordGrowth !== 0 ? `${ordGrowth > 0 ? '+' : ''}${ordGrowth}% vs मागील` : 'यशस्वी ऑर्डर्स';
    kpiRow.appendChild(
      AdminStatCard.create({
        label: 'एकूण ऑर्डर्स / Orders',
        value: `${totalOrders}`,
        variant: 'neutral',
        subtext: ordGrowthStr,
      })
    );

    // 4. AOV
    kpiRow.appendChild(
      AdminStatCard.create({
        label: t('reports_avg_order_value'),
        value: AdminFormat.currency(aov),
        variant: 'neutral',
        subtext: 'प्रति ऑर्डर सरासरी बिल / Per order',
      })
    );
  }

  function renderTabContent() {
    const container = document.getElementById('reports-tab-content');
    if (!container || !reportData) return;

    if (activeTab === 'sales') {
      renderSalesAndProfitTab(container);
    } else if (activeTab === 'valuation') {
      renderValuationAndAgingTab(container);
    } else if (activeTab === 'export') {
      renderExportsTab(container);
    }
  }

  // ── Tab 1: Sales & Profit Analysis ──
  function renderSalesAndProfitTab(container) {
    const daily = reportData.dailyStats || [];
    const profit = reportData.profitMetrics || {};
    const categories = profit.categoryBreakdown || [];
    const slots = reportData.slotBreakdown || [];
    const missingCosts = profit.missingCostItemsCount || 0;

    const chartItems = daily.map((d) => ({
      label: d.date.slice(5), // MM-DD
      value: d.revenue,
    }));

    container.innerHTML = `
      ${missingCosts > 0 ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-md);padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="font-size:0.85rem;color:#b45309;font-weight:600;display:flex;align-items:center;gap:6px;">
            <svg class="icon" style="color:var(--warning);"><use href="/images/icons.svg#warning"></use></svg> <strong>${missingCosts} विक्री झालेल्या वस्तूंना खरेदी किंमत (Cost Price) जोडलेली नाही!</strong> अचूक नफ्यासाठी कॅटलॉगमध्ये खरेदी दर अपडेट करा.
          </div>
          <a href="catalog.html" class="btn btn-secondary btn-sm" style="min-height:36px;font-size:0.78rem;">
            खरेदी दर भरा / Update Cost
          </a>
        </div>
      ` : ''}

      <!-- Daily Sales Trend Chart Card -->
      <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <h3 style="font-size:1.05rem;font-weight:700;margin:0;color:var(--text);display:flex;align-items:center;gap:6px;">
              <svg class="icon"><use href="/images/icons.svg#chart"></use></svg> ${t('reports_daily_trend')}
            </h3>
            <p style="font-size:0.78rem;color:var(--text-muted);margin:2px 0 0;">
              निवडलेल्या कालावधीतील दैनिक विक्री कल / Daily net revenue trend
            </p>
          </div>
        </div>
        ${AdminChart.renderLineChart(chartItems, { height: 180 })}
      </div>

      <!-- Two Column Layout: Category Profit Breakdown & Slot Load -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="margin-bottom:16px;">
        <!-- Category Breakdown -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h3 style="font-size:1rem;font-weight:700;margin:0 0 12px;color:var(--text);display:flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#tag"></use></svg> ${t('reports_category_profit')}
          </h3>
          ${categories.length === 0 ? `
            <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem;">माहिती उपलब्ध नाही / No data</div>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead>
                  <tr style="background:var(--bg-muted);border-bottom:1px solid var(--border);text-align:left;color:var(--text-muted);font-size:0.75rem;">
                    <th style="padding:8px;">वर्ग / Category</th>
                    <th style="padding:8px;text-align:right;">विक्री / Rev</th>
                    <th style="padding:8px;text-align:right;">खरेदी / COGS</th>
                    <th style="padding:8px;text-align:right;">नफा / Profit</th>
                  </tr>
                </thead>
                <tbody>
                  ${categories.map((c) => `
                    <tr style="border-bottom:1px solid var(--border);">
                      <td style="padding:8px;font-weight:600;">${AdminDOM.escape(c.category)}</td>
                      <td style="padding:8px;text-align:right;">${AdminFormat.currency(c.revenue)}</td>
                      <td style="padding:8px;text-align:right;color:var(--text-muted);">${AdminFormat.currency(c.cost)}</td>
                      <td style="padding:8px;text-align:right;font-weight:700;color:var(--primary);">
                        ${AdminFormat.currency(c.profit)} <span style="font-size:0.7rem;color:var(--text-muted);">(${c.marginPercent}%)</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Slot Load -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h3 style="font-size:1rem;font-weight:700;margin:0 0 12px;color:var(--text);">
            ⏰ ${t('reports_slot_load')}
          </h3>
          ${slots.length === 0 ? `
            <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.85rem;">माहिती उपलब्ध नाही / No data</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${slots.map((s) => {
                const totalSlotRev = slots.reduce((acc, curr) => acc + curr.revenue, 0) || 1;
                const pct = Math.round((s.revenue / totalSlotRev) * 100);
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                      <strong>${AdminDOM.escape(s.slot)}</strong>
                      <span>${AdminFormat.currency(s.revenue)} (${s.count} ऑर्डर्स)</span>
                    </div>
                    <div style="height:8px;background:var(--bg-muted);border-radius:4px;overflow:hidden;">
                      <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:4px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ── Tab 2: Stock Valuation & Udhar Aging ──
  function renderValuationAndAgingTab(container) {
    const inv = reportData.inventoryValuation || {};
    const aging = reportData.udharAging || {};

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="margin-bottom:16px;">
        <!-- Warehouse Stock Valuation -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#store"></use></svg> ${t('reports_stock_valuation')}
          </h3>
          <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 14px;">
            खरेदी दरानुसार गोदाम साठ्याचे वास्तव मूल्यांकन / Real cost-based warehouse valuation
          </p>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="background:var(--bg-muted);padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">खरेदी मूल्य (Cost Valuation)</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">स्टॉक खरेदी किंमत बेरीज</div>
              </div>
              <div style="font-size:1.35rem;font-weight:800;color:var(--primary);">
                ${AdminFormat.currency(inv.costValuation || 0)}
              </div>
            </div>

            <div style="background:var(--bg-muted);padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">विक्री मूल्य (Selling Valuation)</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">दुकानातील विक्री दरानुसार</div>
              </div>
              <div style="font-size:1.35rem;font-weight:800;color:var(--text);">
                ${AdminFormat.currency(inv.sellingValuation || 0)}
              </div>
            </div>

            <div style="background:#ecfdf5;border:1px solid #86efac;padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.75rem;color:#166534;font-weight:700;">संभाव्य एकूण नफा (Potential Margin)</div>
                <div style="font-size:0.75rem;color:#15803d;">विक्री मूल्य वजा खरेदी मूल्य</div>
              </div>
              <div style="font-size:1.35rem;font-weight:800;color:#15803d;">
                ${AdminFormat.currency(inv.potentialMargin || 0)}
              </div>
            </div>

            <div style="background:var(--bg-muted);padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">ग्राहक बचत (Customer Savings)</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">MRP वजा विक्री दर सूट</div>
              </div>
              <div style="font-size:1.15rem;font-weight:700;color:var(--accent);">
                ${AdminFormat.currency(inv.customerSavings || 0)}
              </div>
            </div>
          </div>
        </div>

        <!-- Udhar Aging Analysis -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#clock"></use></svg> ${t('reports_udhar_aging')}
          </h3>
          <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 14px;">
            उधारी वसुली मुदत विश्लेषण / Credit collection aging timeline
          </p>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.8rem;color:#166534;font-weight:700;">० ते ३० दिवस (नियमित / Under 30 Days)</div>
                <div style="font-size:0.75rem;color:#15803d;">मुदतीत असलेली सुरक्षित उधारी</div>
              </div>
              <div style="font-size:1.25rem;font-weight:800;color:#166534;">
                ${AdminFormat.currency(aging.under30Days || 0)}
              </div>
            </div>

            <div style="background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.8rem;color:#b45309;font-weight:700;">३० ते ६० दिवस (तगादा आवश्यक / 30-60 Days)</div>
                <div style="font-size:0.75rem;color:#92400e;">आठवण संदेश पाठवणे गरजेचे</div>
              </div>
              <div style="font-size:1.25rem;font-weight:800;color:#b45309;">
                ${AdminFormat.currency(aging.between30and60Days || 0)}
              </div>
            </div>

            <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:0.8rem;color:#991b1b;font-weight:700;">६० दिवसांपेक्षा जास्त (थकीत धोका / >60 Days)</div>
                <div style="font-size:0.75rem;color:#b91c1c;">खाते थांबवणे किंवा थेट संपर्क साधावा</div>
              </div>
              <div style="font-size:1.25rem;font-weight:800;color:#991b1b;">
                ${AdminFormat.currency(aging.over60Days || 0)}
              </div>
            </div>

            <div style="padding:10px 12px;background:var(--bg-muted);border-radius:var(--radius-md);text-align:right;">
              <span style="font-size:0.8rem;color:var(--text-muted);">एकूण येणे उधारी बाकी:</span>
              <strong style="font-size:1.1rem;color:var(--text);margin-left:6px;">
                ${AdminFormat.currency(aging.totalOutstanding || 0)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Tab 3: Data Exports (Authenticated CSV) ──
  function renderExportsTab(container) {
    container.innerHTML = `
      <div class="card" style="padding:20px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 6px;color:var(--text);display:flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#box"></use></svg> अधिकृत CSV डाऊनलोड (Authenticated CSV Exports)
        </h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 16px;">
          Bearer Token द्वारे सुरक्षितपणे डेटा Excel / Sheets मध्ये वापरण्यासाठी डाउनलोड करा.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;background:var(--bg-muted);display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
            <div>
              <h4 style="font-size:1rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
                <svg class="icon icon-sm"><use href="/images/icons.svg#box"></use></svg> ${t('reports_export_orders')}
              </h4>
              <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">
                सर्व ऑर्डर्स, ग्राहक नाव, गाव, रक्कम, पेमेंट मोड आणि स्थिती.
              </p>
            </div>
            <button type="button" class="btn btn-primary" id="btn-dl-orders-csv" style="min-height:44px;font-weight:700;">
              <svg class="icon"><use href="/images/icons.svg#box"></use></svg> Orders CSV डाऊनलोड
            </button>
          </div>

          <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;background:var(--bg-muted);display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
            <div>
              <h4 style="font-size:1rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
                <svg class="icon icon-sm"><use href="/images/icons.svg#list"></use></svg> ${t('reports_export_stock')}
              </h4>
              <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">
                स्टॉक आवक, जावक, फेरफार आणि बॅलन्स नोंदी (Stock Log).
              </p>
            </div>
            <button type="button" class="btn btn-primary" id="btn-dl-stock-csv" style="min-height:44px;font-weight:700;">
              <svg class="icon"><use href="/images/icons.svg#box"></use></svg> Stock Log CSV डाऊनलोड
            </button>
          </div>

          <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;background:var(--bg-muted);display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
            <div>
              <h4 style="font-size:1rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
                <svg class="icon icon-sm"><use href="/images/icons.svg#book"></use></svg> ${t('reports_export_udhar')}
              </h4>
              <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">
                उधारी खरेदी, जमा पावती आणि प्रत्येक ग्राहकाची शिल्लक वही.
              </p>
            </div>
            <button type="button" class="btn btn-primary" id="btn-dl-udhar-csv" style="min-height:44px;font-weight:700;">
              <svg class="icon"><use href="/images/icons.svg#box"></use></svg> Udhar CSV डाऊनलोड
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-dl-orders-csv')?.addEventListener('click', () => {
      AdminAPI.downloadAuthed('/api/admin/export/orders.csv', 'mahalaxmi-orders.csv');
    });

    container.querySelector('#btn-dl-stock-csv')?.addEventListener('click', () => {
      AdminAPI.downloadAuthed('/api/admin/export/stock-log.csv', 'mahalaxmi-stock-log.csv');
    });

    container.querySelector('#btn-dl-udhar-csv')?.addEventListener('click', () => {
      AdminAPI.downloadAuthed('/api/admin/export/udhar-ledger.csv', 'mahalaxmi-udhar-ledger.csv');
    });
  }

  // ── Daily Settlement Modal ──
  async function openDailySettlementModal() {
    AdminToast.info('दैनिक हिशोब तयार होत आहे... / Generating settlement...');
    try {
      const res = await AdminAPI.get('/api/admin/reports/daily-settlement');
      if (res.success && res.data) {
        const text = res.data.whatsappSummary || res.data.summary || '';

        const modalContent = document.createElement('div');
        modalContent.innerHTML = `
          <div style="padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px;">
            <h3 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--text);display:flex;align-items:center;gap:6px;">
              <svg class="icon"><use href="/images/icons.svg#list"></use></svg> आजचा दैनिक हिशोब / Daily Settlement
            </h3>
            <p style="font-size:0.8rem;color:var(--text-muted);margin:3px 0 0;">
              आजच्या सर्व व्यवहारांचा संक्षेप (IST) / Today's shop closure settlement
            </p>
          </div>

          <pre style="background:var(--bg-muted);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;font-size:0.88rem;white-space:pre-wrap;line-height:1.5;font-family:inherit;margin-bottom:14px;">${AdminDOM.escape(text)}</pre>

          <div style="display:flex;gap:8px;">
            <button type="button" class="btn btn-secondary" id="btn-copy-settlement" style="flex:1;min-height:44px;">
              <svg class="icon"><use href="/images/icons.svg#copy"></use></svg> कॉपी करा / Copy Text
            </button>
            <a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" class="btn btn-primary" id="btn-share-settlement" style="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#15803d;border-color:#15803d;text-decoration:none;font-weight:700;">
              <svg class="icon"><use href="/images/icons.svg#whatsapp"></use></svg> WhatsApp शेअर
            </a>
          </div>
        `;

        const sheet = AdminBottomSheet.open({ content: modalContent });
        modalContent.querySelector('#btn-copy-settlement')?.addEventListener('click', () => {
          navigator.clipboard?.writeText(text);
          AdminToast.success('हिशोब मजकूर कॉपी केला! / Settlement text copied!');
        });
      }
    } catch (err) {
      AdminToast.error(err.message || 'हिशोब लोड करताना अडचण आली / Failed to load settlement');
    }
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
