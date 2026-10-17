# ADMIN REBUILD PLAN (PHASE 0 OUTPUT)

**Project:** Mahalaxmi Kirana Store — Owner & Staff Admin Panel Rebuild  
**Branch:** `feat/owner-panel-rebuild`  
**Execution Context:** Test Database (`mahalaxmi_kirana_test`)  
**Baseline Real-Browser Verification:** Captured 56 baseline screenshots across all 14 pages and 4 viewports (360px, 390px, 768px, 1280px) stored in `docs/audit-screenshots/before/`.

---

## 1. Confirmed Baseline Findings & Visual Verification

1. **Storage Key Mismatch:** `low-stock.html` and `stock-in.html` read `mk_token` and `mk_role`, booting authenticated users back to login. Verified.
2. **Crash in Low Stock:** Calling `escapeHtml()` throws `ReferenceError` when products are returned. Verified.
3. **Staff Lockout:** `admin-common.js` blocks `staff` role with `alert()` + redirect to `index.html`. Verified.
4. **Visual Breakage on 360px & 390px:** Confirmed via real Chrome screenshots in `docs/audit-screenshots/before/`:
   - `products_360px.png`: Table overflows horizontally; edit/archive buttons pushed off-screen.
   - `categories_360px.png`: Two-column layout squashes into stacked overflowing table.
   - `stock-in_360px.png` & `low-stock_360px.png`: Purple (`#7c3aed`) sidebar conflicts with emerald theme.
   - `orders_360px.png`: Action buttons take over 400px vertical height per order card.
   - `settings_360px.png`: Form 2-column inputs are cramped into ~160px width.
5. **Contract Bugs:**
   - `toggleStock()` sends `{ inStock }` while backend checks `req.body.unavailableFlag`.
   - CSV export links (`<a download>`) fail with 401 Unauthorized due to lack of bearer authorization headers.
   - `admin-settings.js` line 176 has syntax typo `<button onclick="..." , style="...">`.
   - Reports compute cost valuation using selling price instead of purchase cost.
6. **Baseline Tests:**
   - Test suites: 50 passed, 1 failed (slot cutoff date math).
   - Test DB demo dataset seeded: 34 products, 8 categories, 15 orders, 5 udhar accounts, 10 customers, 2 staff, 1 owner.

---

## 2. Information Architecture & Final Page Map

### Desktop View (>= 1024px)
Collapsible left sidebar with emerald theme (`#15803d`):
1. **📊 Dashboard (`dashboard.html`)** — Daily sales, orders count, action center, hourly sparkline, quick actions.
2. **📦 Orders (`orders.html`)** — Live order processing queue + consolidated packing slip tab.
3. **📥 Inventory (`inventory.html`)** — Merged workspace: Fast Stock-In (camera barcode) | Low Stock & Expiry | Stock Log & Adjustments.
4. **🛍️ Catalog (`catalog.html`)** — Merged workspace: Products (stepper stock, bilingual modal) | Categories (drag-and-drop sort).
5. **📖 Udhar / Khata (`udhar.html`)** — Customer credit ledger, 1-tap WhatsApp reminders with UPI link, statements.
6. **👥 Customers (`customers.html`)** — Customer directory, order history drawer, RFM loyalty segments.
7. **📈 Reports (`reports.html`)** — True gross profit, sales analytics, daily settlement WhatsApp generator, authenticated CSV exports.
8. **🤖 AI Corrections (`ai-corrections.html`)** — Map unrecognised grocery list terms to catalog products.
9. **🔔 Inbox (`inbox.html`)** — Alerts, deep links to orders and low stock, push notifications toggle.
10. **⚙️ Settings (`settings.html`)** — Store open/close emergency toggle, delivery rules, UPI QR, backup download, staff & permissions (owner only).

### Mobile View (< 768px)
Fixed bottom bar with 4 core tabs + "More" drawer:
- **📊 Home** -> `dashboard.html`
- **📦 Orders** -> `orders.html`
- **📥 Stock** -> `inventory.html`
- **📖 Udhar** -> `udhar.html`
- **☰ More** -> Slide-up bottom sheet with instant access to:
  - 🛍️ Catalog (`catalog.html`)
  - 👥 Customers (`customers.html`)
  - 📈 Reports (`reports.html`)
  - 🤖 AI Corrections (`ai-corrections.html`)
  - 🔔 Inbox (`inbox.html`)
  - ⚙️ Settings (`settings.html`)
  - 🧑‍💼 Staff & Permissions (`staff.html`)

### Legacy URL Redirects
Old URLs will automatically redirect so existing bookmarks and links work:
- `stock-in.html` -> `inventory.html?tab=stock-in`
- `low-stock.html` -> `inventory.html?tab=alerts`
- `products.html` -> `catalog.html?tab=products`
- `categories.html` -> `catalog.html?tab=categories`
- `packing.html` -> `orders.html?tab=packing`
- `ai-misses.html` -> `ai-corrections.html`

---

## 3. Component Architecture (Vanilla HTML/CSS/JS)

1. **`AppShell` (`client/admin/js/components/shell.js`)**: Single responsive shell for all pages (desktop sidebar + mobile bottom nav + "More" drawer + top bar with store open/closed indicator).
2. **`BottomSheet` (`client/admin/js/components/bottom-sheet.js`)**: Mobile slide-up sheet, desktop centered modal, with swipe-down to close and focus trap.
3. **`ResponsiveDataList` (`client/admin/js/components/data-list.js`)**: Desktop table (>= 768px) that transforms into swipeable touch-friendly cards on mobile (< 768px).
4. **`StatCard` (`client/admin/js/components/stat-card.js`)**: Standardized KPI tile with title, value, delta, and optional sparkline.
5. **`FilterBar` (`client/admin/js/components/filter-bar.js`)**: Debounced search input + horizontal scrollable filter chips.
6. **`StatusBadge` (`client/admin/js/components/badge.js`)**: Semantic color-coded pill.
7. **`QtyStepper` (`client/admin/js/components/stepper.js`)**: `- [qty] +` stepper for mobile stock updates.
8. **`TouchButton` (`client/admin/js/components/button.js`)**: 44px minimum touch target with double-submit guard and loading spinner.
9. **`ToastQueue` (`client/admin/js/core/toast.js`)**: Global queue for bilingual toast messages (`success`, `error`, `info`).
10. **`Chart` (`client/admin/js/components/chart.js`)**: Lightweight inline SVG line and bar chart generator (no heavy chart library).
11. **`i18n` (`client/admin/js/core/i18n.js`)**: Central bilingual dictionary with `t('key')` helper and fallback.
12. **`Api` (`client/admin/js/core/api.js`)**: Unified fetch wrapper with bearer auth, 401 handling, retry, and authenticated Blob download.

---

## 4. Phase Execution Sequence

- **Phase 1: Hotfixes** (Targeting existing pages immediately, own commit & push)
- **Phase 2: Design System & App Shell** (Tokens, base CSS, core JS, app shell, i18n)
- **Phase 3: Pages Rebuild** (Mobile-first implementations of all 10 unified pages + legacy redirects)
- **Phase 4: Backend Support** (`costPrice`, store open/close, staff permissions middleware, customer search)
- **Phase 5: Quality, A11y & Performance** (XSS audit, CSP compliance, Lighthouse checks)
- **Phase 6: Final Verification, Migration Docs & Ship** (After-screenshots, test runs, merge to main)
