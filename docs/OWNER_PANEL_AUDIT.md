# OWNER / ADMIN PANEL: FULL FRONTEND AUDIT & PRE-PLAN (READ-ONLY)

**Target System:** Mahalaxmi Kirana Store — Owner & Staff Admin Panel (`client/admin/*`)  
**Document Classification:** Comprehensive Pre-Plan & Technical Audit  
**Author:** Senior QA Engineer, UX Auditor & Frontend Architect  

---

## 0. Metadata

- **Audit Date & Time:** 2026-10-17 22:42:09 +05:30 (Asia/Kolkata / IST)
- **Git Branch:** `main`
- **Git Commit Hash:** `9765f64436d459880d60dd7e9f9737b5a5b15f3c` (Author: Mahesh, Date: Sat Oct 17 22:26:20 2026 +0530, Clean working tree)
- **Runtime Environment:** Node.js `v24.15.0`, npm `11.12.1`, Express 4.19.2 API backend
- **Database Context:** Safe Test Database (`MONGODB_URI_TEST`). Zero mutations executed against live production database (`MONGO_URI`).
- **Testing & Verification Tools:** Node.js static AST & syntax verification, grep pattern analysis, HTTP contract probing against test server, viewport layout computation against viewport widths: **360px** (entry Android / budget mobile), **390px** (modern standard mobile), **768px** (tablet portrait), **1024px** (tablet landscape / small laptop), **1440px** (desktop workstation).
- **Tooling Constraint Note:** Headless browser subagent automation aborted due to Azure Edge CDN binary download failure (Playwright 1.57.0 win32 404). All layout and behavioral defects are evidenced via direct DOM structure inspection, CSS breakpoint math, and JavaScript execution paths.

---

## 1. Executive Verdict

**Overall Health Rating:** **RED (Severely Degraded / Architecturally Fractured)**

1. **Catastrophic Auth & Storage Key Incompatibility:** `low-stock.html` and `stock-in.html` attempt to read `localStorage.getItem('mk_token')` and `mk_role`, whereas the application's login system (`client/js/auth.js`) stores credentials exclusively under `kirana_token` and `kirana_user`. Consequently, any authenticated user navigating to these inventory pages is immediately kicked back to the login page.
2. **Broken Navigation Map on Mobile:** 9 out of the 14 admin pages (`products`, `categories`, `packing`, `stock-in`, `udhar`, `customers`, `staff`, `reports`, `ai-misses`) have zero links in the mobile bottom bar. Furthermore, `categories.html`, `packing.html`, and `customers.html` are omitted entirely from the desktop navigation, rendering them unreachable orphans.
3. **Severe Visual Distortion on Small Screens:** Critical pages like `products.html`, `categories.html`, and `customers.html` enforce hardcoded desktop `<table>` elements with `min-width: 500px` to `600px`. On 360px and 390px mobile screens, action buttons (`Edit`, `Archive`, `Block`) overflow horizontally past the viewport edge without affordance.
4. **Runtime Code Crashes:** `low-stock.html` calls `escapeHtml()` 10 times across template strings, but `function escapeHtml()` is never defined or imported in that file, throwing a fatal `ReferenceError` whenever items are fetched.
5. **Architectural Schism (Emerald vs. Purple Themes):** Half the panel (`dashboard`, `orders`, `products`) uses an Emerald theme (`#15803d`) with top navigation, while `stock-in` and `low-stock` inject standalone fixed desktop sidebars, inline Google Fonts, and a Purple color scheme (`#7c3aed`), creating a jarring, disjointed experience.

**Salvageable vs. Rebuild:**
- *Salvageable:* The Express API endpoints (`/api/admin/*`, `/api/inventory/*`, `/api/udhar/*`) and controllers are robust, supporting atomic inventory transactions, database recalculation, and IST formatting.
- *Must Be Rebuilt:* The client-side admin frontend (`client/admin/*`). It is fractured across two conflicting layouts, riddled with copy-pasted CSS, broken auth keys, and unusable on mobile devices where the shopkeeper spends 90% of their operational time.

**Recommendation:** **REBUILD THE ADMIN FRONTEND**  
A ground-up rebuild of the admin frontend as a unified, mobile-first, vanilla HTML/CSS/JS shell (with zero heavy framework dependencies). Fixing in place would require duct-taping two completely different layout systems, resolving dozens of inline style overrides, and patching unmaintainable spaghetti code.

---

## 2. Page Inventory & Navigation Map

### Page Inventory Table

| Page Title | File Path | Primary Purpose | Scripts Loaded | Styles Loaded | Inline Code Size | Shared Shell? | Reachable from Nav? | Overall Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `client/admin/dashboard.html` | Daily sales, active orders, chime alerts | `config.js`, `auth.js`, `admin-common.js`, `dashboard.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | Yes (Desktop & Mobile) | **Working** |
| **Orders** | `client/admin/orders.html` | Order workflow, substitutions, cancellations | `config.js`, `auth.js`, `admin-common.js`, `admin-orders.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | Yes (Desktop & Mobile) | **Working** |
| **Packing List** | `client/admin/packing.html` | Consolidated dispatch packing by slot | `config.js`, `auth.js`, `admin-common.js`, `packing.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | **No (Dead link / Orphan)** | **Partial** |
| **Products** | `client/admin/products.html` | Catalog management, pricing, image upload | `config.js`, `auth.js`, `admin-common.js`, `admin-products.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | Desktop Only (Hidden on Mobile) | **Partial (Mobile Overflow)** |
| **Categories** | `client/admin/categories.html` | Category taxonomy, emoji, active toggle | `config.js`, `auth.js`, `admin-common.js`, `admin-categories.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | **No (Dead link / Orphan)** | **Partial (Mobile Overflow)** |
| **Stock In** | `client/admin/stock-in.html` | Search product, add inventory batch | Inline `<script>` (220 lines) | `css/admin.css`, Inline `<style>` (120 lines) | 340 lines | **No (Custom Purple Sidebar)** | Desktop Only (Hidden on Mobile) | **Broken (Wrong Auth Key)** |
| **Low Stock** | `client/admin/low-stock.html` | Out-of-stock & near-expiry alerts | Inline `<script>` (235 lines) | `css/admin.css`, Inline `<style>` (105 lines) | 340 lines | **No (Custom Purple Sidebar)** | Desktop & Mobile | **Broken (Crash + Auth Key)** |
| **Udhar Ledger** | `client/admin/udhar.html` | Village credit accounts, payments, reminders | `config.js`, `auth.js`, `admin-common.js`, `admin-udhar.js` | `css/admin.css`, Inline `<style>` (95 lines) | 95 lines | Yes (`adminNavbar`) | Desktop Only (Hidden on Mobile) | **Partial (Broken CSV link)** |
| **Customers** | `client/admin/customers.html` | Customer list, order count, block/unblock | `config.js`, `auth.js`, `admin-common.js`, `admin-customers.js` | `css/admin.css`, Inline styles | 15 lines | Yes (`adminNavbar`) | **No (Dead link / Orphan)** | **Partial (Barebones, Mobile Overflow)** |
| **Staff** | `client/admin/staff.html` | Create/remove staff accounts, permissions | `config.js`, `auth.js`, `admin-common.js`, `admin-staff.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | Desktop Only (Hidden on Mobile) | **Partial (Staff Auth Gate Bug)** |
| **Settings** | `client/admin/settings.html` | Delivery fees, thresholds, QR code, backup | `config.js`, `auth.js`, `admin-common.js`, `admin-settings.js` | `css/admin.css` | 0 lines | Yes (`adminNavbar`) | Yes (Desktop & Mobile) | **Working** |
| **Reports** | `client/admin/reports.html` | Sales analytics, settlements, valuation | `config.js`, `auth.js`, `admin-common.js`, `admin-reports.js` | `css/admin.css`, Inline `<style>` (115 lines) | 115 lines | Yes (`adminNavbar`) | Desktop Only (Hidden on Mobile) | **Partial (Broken CSV links)** |
| **Inbox** | `client/admin/inbox.html` | System notifications, cancellations, stock | `config.js`, `auth.js`, `admin-common.js`, Inline `<script>` (120 lines) | `../css/style.css`, `css/admin.css`, Inline `<style>` (130 lines) | 250 lines | Yes (`adminNavbar`) | Yes (Desktop & Mobile) | **Working (CSS Conflicts)** |
| **AI Misses** | `client/admin/ai-misses.html` | Catalog alias mapping from failed searches | `config.js`, `auth.js`, `admin-common.js`, `admin-ai-misses.js` | `css/admin.css`, Inline `<style>` (20 lines) | 20 lines | Yes (`adminNavbar`) | **No (Dead link / Orphan)** | **Partial** |

### Navigation Flow Map

```
CURRENT ARCHITECTURE (FRAGILE & DISCONNECTED)

[Desktop Navigation Bar (admin-common.js)]
   ├── Dashboard ──────────> dashboard.html
   ├── Orders ─────────────> orders.html
   ├── Products ───────────> products.html
   ├── Stock In ───────────> stock-in.html (Renders different purple sidebar!)
   ├── Low Stock ──────────> low-stock.html (Renders different purple sidebar!)
   ├── Udhar ──────────────> udhar.html
   ├── Staff ──────────────> staff.html
   ├── Reports ────────────> reports.html
   ├── Settings ───────────> settings.html
   └── Inbox ──────────────> inbox.html
   [ORPHANED - NOT IN NAVBAR]: categories.html, packing.html, customers.html, ai-misses.html

[Mobile Bottom Navigation Bar (admin-common.js - 5 Tabs)]
   ├── 📊 Dashboard ───────> dashboard.html
   ├── 🔔 Inbox ───────────> inbox.html
   ├── 📦 Orders ──────────> orders.html
   ├── ⚠️ Low Stock ───────> low-stock.html (BOOTS USER OUT DUE TO AUTH KEY BUG)
   └── ⚙️ Settings ────────> settings.html
   [COMPLETELY INACCESSIBLE ON MOBILE (NO "MORE" MENU)]:
   products.html, categories.html, packing.html, stock-in.html, udhar.html,
   customers.html, staff.html, reports.html, ai-misses.html
```

---

## 3. Page-by-Page Findings

---

### 3.1. Dashboard (`dashboard.html` & `dashboard.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Top navbar items wrap awkwardly. The 4 stat KPI cards collapse into a 2x2 grid (`.stats-grid`); 6-digit currency figures (e.g. `₹1,45,200`) truncate or wrap inside narrow 150px cards. Recent order cards display long address lines that push map and call buttons off the visible thumb-zone.
  - **768px, 1024px & 1440px:** Stretches across the desktop with abundant whitespace. Lacks visual charts, sparklines, or hourly order volume graphs.
- **Functional Defects:**
  - `client/admin/js/dashboard.js:10`: Polling runs every 12 seconds via `setInterval(checkNewOrders, 12000)`. If browser audio autoplay is blocked, sound alerts fail silently without user-facing audio unlock prompts.
- **Missing States:** Loading state is raw unstyled text (`Loading dashboard stats…`); no skeleton card loaders; no offline network banner.
- **Backend Contract Problems:** Calls `GET /api/admin/dashboard/stats` and `GET /api/admin/dashboard/check-new`. Backend response shape matches UI expectations.
- **Severity:** **Medium**
- **What should be on this page in a top-notch version:**
  - Today-at-a-glance hero: Net revenue, orders count, pending dispatches, pending Udhar collection.
  - Urgent action triggers: 1-tap buttons for "3 New Orders Waiting", "2 Items Out of Stock", "1 Substitution Pending".
  - Live sound/vibration toggle with prominent audio-permission request.
  - Mini hourly sales sparkline.
  - Quick action floating bar: Add Product, Instant Stock-In, Record Udhar Payment.

---

### 3.2. Orders Queue (`orders.html` & `admin-orders.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Status filter pills (`.filter-row`) require awkward horizontal scrolling. Order action buttons (`Confirm Order`, `WhatsApp Notify`, `Mark as Paid`, `Cancel`, `Propose Substitute`) stack into a massive vertical pile (over 400px height per order card), forcing excessive scrolling.
  - **768px, 1024px & 1440px:** Single-column layout does not take advantage of wide monitors; would benefit from a two-pane list/detail layout.
- **Functional Defects:**
  - `client/admin/js/admin-orders.js:242`: When advancing status to `delivered`, only `cod` orders prompt for payment collection confirmation. `udhar` orders are transitioned without validating customer credit balance or prompting ledger entry.
  - `client/admin/js/admin-orders.js:404`: `openSubstitutionModal` fetches `/admin/products?limit=100`. In catalogs with >100 products, proposed substitutes outside the first 100 cannot be selected.
- **Missing States:** No empty state per filter (e.g. "No orders out for delivery"); no optimistic UI update when advancing order states.
- **Backend Contract Problems:** `PATCH /api/admin/orders/:id/status` correctly updates orders in MongoDB with atomic status transitions.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - Swipe-to-progress gestures (swipe right to advance status: New -> Confirmed -> Packed -> Dispatched -> Delivered).
  - Prominent WhatsApp 1-tap message preview with template picker (Marathi/English).
  - Delivery boy assignment dropdown with automated WhatsApp dispatch broadcast.
  - Inline substitution drawer with live customer catalog search.
  - Batch status updater ("Select all 5 morning orders -> Mark Packed").

---

### 3.3. Packing List (`packing.html` & `packing.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Item aggregation table compresses into unreadable columns; small checkboxes are impossible to tap with dusty hands in a store environment.
  - **768px, 1024px & 1440px:** A4 print styles exist, but table lacks 58mm / 80mm thermal receipt printer formatting.
- **Functional Defects:**
  - **Navigation Orphan:** Completely omitted from `renderAdminNavigation()` in `admin-common.js`. Cannot be reached from any header or footer link.
- **Missing States:** No persistent state for checked off items (if the browser refreshes, all checkmarks reset).
- **Backend Contract Problems:** `POST /api/admin/orders/packing-list` correctly aggregates order items by delivery slot.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - LocalStorage persistence for completed item checkboxes.
  - 58mm / 80mm thermal roll print mode for POS slip printers.
  - Grouping by shop rack / department (e.g. Grains, Spices, Dairy, Soaps).
  - Voice readout of packing list items for hands-free packing.

---

### 3.4. Products Catalog (`products.html` & `admin-products.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Table enforces `min-width: 600px` inside a rigid card. Horizontal scrolling is required to view price and action buttons. The stock toggle switch is pushed off-screen.
  - **768px, 1024px & 1440px:** Functional desktop table.
- **Functional Defects:**
  - **Contract Flaw (`admin-products.js:160`):** `toggleStock()` sends `{ inStock: newStatus }`. Backend `adminController.js:833` expects `req.body.unavailableFlag`. Because `unavailableFlag` is undefined, the backend blindly inverts the flag rather than respecting `newStatus`.
  - **Missing Critical Fields:** Product Add/Edit form (`admin-products.js:342`) omits `stockQuantity`, `unitType`, `reorderLevel`, `aliases`, `nameHi`, and `expiryDate`.
- **Missing States:** No visual indicator for products that are out-of-stock vs. manually disabled.
- **Backend Contract Problems:** Product creation payload does not send inventory fields; inventory must be initialized via a separate API route.
- **Severity:** **Critical**
- **What should be on this page in a top-notch version:**
  - Mobile card view with fast stock counter (`+ / -` stepper).
  - Barcode scanner via phone camera (ZXing / QuaggaJS) for 1-second product lookup.
  - Comprehensive bilingual editing modal with unit selector (`kg`, `g`, `litre`, `pack`).
  - Batch price updater (e.g. increase all cooking oil by ₹5).

---

### 3.5. Categories Management (`categories.html` & `admin-categories.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Table enforces `min-width: 500px`. The "Add Category" form stacks above the list, forcing long scrolling.
  - **768px, 1024px & 1440px:** Clean two-column split.
- **Functional Defects:**
  - **Navigation Orphan:** Excluded from `admin-common.js` desktop navbar and mobile bottom bar.
  - No category reordering support (drag & drop or sort order numeric inputs).
- **Missing States:** No count of products assigned to each category; no warning when disabling a category with active products.
- **Backend Contract Problems:** `GET/POST/PUT /api/admin/categories` functions as designed.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - Visual product count badge per category.
  - Drag-and-drop sort ordering.
  - Emoji picker helper for non-technical store owners.

---

### 3.6. Stock In Hub (`stock-in.html` - Standalone)

- **Visual / Layout Issues:**
  - **360px & 390px:** Standalone sidebar (`.admin-sidebar`) conflicts with standard mobile viewports. Layout breaks into distorted flex containers.
  - **All Viewports:** Uses `#7c3aed` (Purple) styling, contrasting with the application's emerald theme.
- **Functional Defects:**
  - **Fatal Auth Bug (`stock-in.html:216`):** Reads `localStorage.getItem('mk_token')`. Since `client/login.html` stores `kirana_token`, authenticated owners are immediately kicked back to `../login.html`.
  - **Destructive Logout (`stock-in.html:232`):** Logout button executes `localStorage.clear()`, wiping the customer shopping cart in direct violation of project non-negotiables.
- **Missing States:** Product search does not show recent stock-in history.
- **Backend Contract Problems:** Uses raw unauthenticated `fetch()` instead of `adminFetch()`.
- **Severity:** **Critical (Completely Broken)**
- **What should be on this page in a top-notch version:**
  - Fast barcode scanning with camera.
  - Supplier name and purchase invoice number fields.
  - Quick calculator for purchase rate vs. selling price vs. MRP margin.
  - Integration into the main emerald app shell.

---

### 3.7. Low Stock Alerts (`low-stock.html` - Standalone)

- **Visual / Layout Issues:**
  - **360px & 390px:** Clashing purple sidebar; modal sheet overflows on small screen heights.
  - **All Viewports:** Styling disconnected from `admin.css`.
- **Functional Defects:**
  - **Fatal Auth Bug (`low-stock.html:174`):** Reads `mk_token` and redirects to login.
  - **Fatal Runtime Crash (`low-stock.html:265, 268, 270, 308, 310`):** Calls `escapeHtml()`, which is never defined in the file. Execution immediately halts with `ReferenceError: escapeHtml is not defined`.
- **Missing States:** No loading skeleton.
- **Backend Contract Problems:** Backend endpoint `/api/inventory/low-stock` and `/api/inventory/near-expiry` work, but frontend cannot render them.
- **Severity:** **Critical (Completely Broken)**
- **What should be on this page in a top-notch version:**
  - 1-tap reorder list generator to send directly to wholesale distributors via WhatsApp.
  - Expiry date badge with day countdown (e.g. "Expires in 4 days").
  - Unified into a single "Inventory" tab with Stock In.

---

### 3.8. Udhar Credit Ledger (`udhar.html` & `admin-udhar.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** 4 KPI stat boxes take up 350px of vertical space. 6-column table causes horizontal scrolling. Action button cluster (`जमा`, `तगादा`, `हिशोब`, `स्थिती`) is prone to accidental taps.
  - **768px, 1024px & 1440px:** Clean layout, but lacks pagination for stores with hundreds of customers.
- **Functional Defects:**
  - **Broken CSV Export (`udhar.html:126`):** Uses `<a href="/api/admin/export/udhar-ledger.csv" download>`. Standard link clicks do not attach the `Authorization: Bearer <token>` header, resulting in a `401 Unauthorized` JSON error.
- **Missing States:** No overdue payment indicator or bad-debt warning.
- **Backend Contract Problems:** `/api/udhar/admin/*` endpoints function correctly.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - Customer search by name, phone, or village area.
  - 1-tap WhatsApp payment reminder with instant UPI payment QR link.
  - Customer statement PDF generator for dispute resolution.
  - Due date tracker with customizable credit terms (e.g. 15 days, 30 days).

---

### 3.9. Customers Directory (`customers.html` & `admin-customers.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Enforces `min-width: 550px` table styling. User cannot see order counts or block actions without horizontal scrolling.
  - **All Viewports:** Barebones table with minimal information.
- **Functional Defects:**
  - **Navigation Orphan:** Missing from desktop top navigation and mobile bottom bar.
  - **No Search or Filter:** In `admin-customers.js`, all customers are loaded into DOM without search input or pagination.
- **Missing States:** No individual customer order history view.
- **Backend Contract Problems:** `GET /api/admin/customers` returns array; lacks pagination metadata.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - Customer profile drawer: lifetime spend, order count, favorite items, Udhar balance.
  - Filter by loyalty tier (Frequent, Occasional, Inactive/Dormant).
  - Direct WhatsApp chat button.

---

### 3.10. Staff Management (`staff.html` & `admin-staff.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Two-column grid collapses into vertical stack. Form fields and table look acceptable.
  - **All Viewports:** Basic layout.
- **Functional Defects:**
  - **Auth Guard Lockout (`admin-common.js:15`):** The shared script checks `if (!user || user.role !== 'owner')` and throws an alert + redirect. Staff accounts created on this page cannot log in to any admin page on the client side, even though backend permissions allow them.
- **Missing States:** No audit log preview of staff actions.
- **Backend Contract Problems:** `GET/POST/DELETE /api/admin/staff` and toggle-block endpoints work.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - Granular role toggle (e.g. "Can change order status", "Can take Udhar payments", "Cannot see store profits").
  - Real-time audit log stream showing staff actions (e.g. "Staff Rahul marked Order #1042 Delivered").

---

### 3.11. Store Settings (`settings.html` & `admin-settings.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Two-column grid (`1fr 1fr`) on lines 34 and 67 creates cramped 160px inputs for Min Order and Delivery Fee.
  - **All Viewports:** Centered 700px form.
- **Functional Defects:**
  - **HTML Syntax Typo (`admin-settings.js:176`):** Errant comma in button string produces invalid attribute: `<button onclick="..." , style="...">`.
  - **Missing Crucial Controls:** No store open/close switch; no emergency holiday mode; no delivery boy contact numbers.
- **Missing States:** No confirmation dialog before updating delivery fee thresholds.
- **Backend Contract Problems:** `PUT /api/admin/settings` correctly persists settings.
- **Severity:** **Medium**
- **What should be on this page in a top-notch version:**
  - Prominent "Store Open / Closed" toggle switch at top of dashboard.
  - Pincode chip tagger (replace messy comma-separated textarea).
  - Slot capacity limits (e.g. max 15 orders per morning slot).

---

### 3.12. Reports & Settlement (`reports.html` & `admin-reports.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** 5 KPI boxes stack into a long scroll. Visual metrics use plain HTML progress bars instead of real charts.
  - **All Viewports:** Stretches across desktop without modern visual charts.
- **Functional Defects:**
  - **Broken CSV Links (`reports.html:144-145`):** `<a href="/api/admin/export/orders.csv">` and `stock-log.csv` fail with 401 Unauthorized because bearer token is not attached.
  - **Economically Flawed Valuation (`adminController.js:1551`):** Backend computes "Cost Valuation" by multiplying `stockQuantity * price` (selling price, not purchase cost) and "Potential Margin" as `mrp - price` (customer discount, not store profit).
- **Missing States:** No date comparison (e.g. vs. last month / last week).
- **Backend Contract Problems:** CSV export routes require header auth not provided by `<a>` links.
- **Severity:** **High**
- **What should be on this page in a top-notch version:**
  - Interactive sales charts (revenue vs. orders over 7d / 30d / 90d).
  - True profit calculations with wholesale purchase price field.
  - 1-tap WhatsApp Daily Settlement report with copy/share buttons (the text generation works nicely).
  - Authenticated blob download for CSV files.

---

### 3.13. Admin Inbox (`inbox.html`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Clean card stack, but suffers from CSS conflicts due to loading both `style.css` and `admin.css`.
  - **All Viewports:** Functional layout.
- **Functional Defects:**
  - Uses inline scripts and styles rather than standard modular files.
- **Missing States:** No filter for notification age.
- **Backend Contract Problems:** `/api/notifications/*` routes function as designed.
- **Severity:** **Medium**
- **What should be on this page in a top-notch version:**
  - Push notification subscription toggle.
  - Direct 1-tap navigation from notification card to order or low-stock item.

---

### 3.14. AI Misses & Aliases (`ai-misses.html` & `admin-ai-misses.js`)

- **Visual / Layout Issues:**
  - **360px & 390px:** Table layout wraps heavily. Modal dropdown contains up to 500 catalog items in an unsearchable native `<select>`.
  - **All Viewports:** Basic table layout.
- **Functional Defects:**
  - **Navigation Orphan:** Excluded from both desktop navbar and mobile bottom bar.
- **Missing States:** No confirmation of alias effectiveness.
- **Backend Contract Problems:** `POST /api/admin/ai/add-alias` and `GET /api/ai/misses` work correctly.
- **Severity:** **Medium**
- **What should be on this page in a top-notch version:**
  - Searchable autocomplete input for selecting target product.
  - Suggestion chip to automatically link similar products via Levenshtein distance.

---

## 4. Cross-Cutting Problems

### 4.1. Layout & Navigation Duplication
- **Split Shells:** The panel is fractured into two distinct layout paradigms:
  1. *Emerald Top/Bottom Shell (`admin-common.js`):* Used by 12 pages.
  2. *Purple Fixed Sidebar Shell:* Hardcoded in `stock-in.html` and `low-stock.html`.
- **Navigation Blindspots:** 9 out of 14 pages are inaccessible on mobile devices. 4 pages are completely orphaned from desktop navigation.

### 4.2. CSS Conflicts & Style Inconsistencies
- `inbox.html` loads `client/css/style.css` (storefront rules) before `css/admin.css`, causing container width overrides and font-size collisions.
- Conflicting CSS variable definitions:
  - `--admin-primary: #15803d;` (Emerald Green in `admin.css`)
  - `--color-primary: #7c3aed;` (Vibrant Purple in `stock-in.html` & `low-stock.html`)
- Multiple conflicting modal styles (`.modal-overlay` + `.modal-box` vs. `.modal-content` vs. `.modal-sheet`).

### 4.3. Authentication & Role Enforcement Gaps
- `client/admin/js/admin-common.js:15` strictly enforces `role === 'owner'`, blocking staff accounts from accessing any admin page, directly contradicting the backend RBAC which explicitly permits staff for inventory, orders, and Udhar.
- Inconsistent token keys: `kirana_token` (used by auth.js) vs. `mk_token` (hardcoded in stock-in and low-stock).

### 4.4. Security, XSS & CSP
- **Direct `innerHTML` Injection:** Dynamic DOM insertion in `orders.html`, `dashboard.html`, and `stock-in.html` uses template literals with unescaped fields (e.g. `ord.note`, `p.packSize`), creating XSS vulnerabilities.
- **Unauthenticated CSV Endpoints:** Direct `<a>` links expose download URLs to 401 failures rather than using secure bearer token blob fetching.

### 4.5. Performance & Mobile Usability
- Unpaginated API requests in `customers.html` and `ai-misses.html` load hundreds of DOM nodes at once.
- Dashboard polling runs on a rigid 12-second interval regardless of tab visibility (`document.visibilityState`).
- Touch targets in data tables measure under 32px height on mobile screens, violating the 44px minimum touch target standard.

### 4.6. Bilingual Coverage (Marathi / English)
- **Coverage Estimate:** ~48%
- While page headers and major buttons have Marathi translations, error messages, toast popups, modal confirmation dialogs, and table column headers default to English.

---

## 5. Frontend / Backend Contract Matrix

| UI Action / Feature | Admin Page | API Endpoint Called | Route Exists? | Controller Handler | Response Matches UI? | Contract Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Load Dashboard Stats | `dashboard.html` | `GET /api/admin/dashboard/stats` | Yes (`adminRoutes.js:18`) | `admin.getStats` | Yes | **MATCH** |
| Poll New Orders | `dashboard.html` | `GET /api/admin/dashboard/check-new` | Yes (`adminRoutes.js:19`) | `admin.checkNewOrders` | Yes | **MATCH** |
| Fetch Orders List | `orders.html` | `GET /api/admin/orders` | Yes (`adminRoutes.js:22`) | `admin.getOrders` | Yes | **MATCH** |
| Advance Order Status | `orders.html` | `PATCH /api/admin/orders/:id/status` | Yes (`adminRoutes.js:24`) | `admin.updateOrderStatus` | Yes | **MATCH** |
| Cancel Order | `orders.html` | `PATCH /api/admin/orders/:id/cancel` | Yes (`adminRoutes.js:25`) | `admin.cancelOrder` | Yes | **MATCH** |
| Update Payment Status | `orders.html` | `PATCH /api/admin/orders/:id/payment` | Yes (`adminRoutes.js:26`) | `admin.updatePaymentStatus` | Yes | **MATCH** |
| Generate Packing List | `packing.html` | `POST /api/admin/orders/packing-list` | Yes (`adminRoutes.js:27`) | `admin.getPackingList` | Yes | **MATCH** |
| Propose Substitution | `orders.html` | `POST /api/admin/orders/:id/substitutions/propose` | Yes (`adminRoutes.js:75`) | `admin.proposeSubstitution` | Yes | **MATCH** |
| Fetch Products Catalog | `products.html` | `GET /api/admin/products` | Yes (`adminRoutes.js:30`) | `admin.getProducts` | Yes | **MATCH** |
| Create Product | `products.html` | `POST /api/admin/products` | Yes (`adminRoutes.js:31`) | `admin.createProduct` | Partial (UI omits inventory fields) | **PARTIAL MISMATCH** |
| Update Product | `products.html` | `PUT /api/admin/products/:id` | Yes (`adminRoutes.js:32`) | `admin.updateProduct` | Partial (UI omits inventory fields) | **PARTIAL MISMATCH** |
| Toggle Stock Availability | `products.html` | `PATCH /api/admin/products/:id/toggle-stock` | Yes (`adminRoutes.js:33`) | `admin.toggleStock` | **No (UI sends inStock, API checks unavailableFlag)** | **CONTRACT DEFECT** |
| Archive Product | `products.html` | `DELETE /api/admin/products/:id` | Yes (`adminRoutes.js:34`) | `admin.deleteProduct` | Yes | **MATCH** |
| Fetch Categories | `categories.html`| `GET /api/admin/categories` | Yes (`adminRoutes.js:37`) | `admin.getCategories` | Yes | **MATCH** |
| Create Category | `categories.html`| `POST /api/admin/categories` | Yes (`adminRoutes.js:38`) | `admin.createCategory` | Yes | **MATCH** |
| Update Category | `categories.html`| `PUT /api/admin/categories/:id` | Yes (`adminRoutes.js:39`) | `admin.updateCategory` | Yes | **MATCH** |
| Toggle Category Active | `categories.html`| `PATCH /api/admin/categories/:id/toggle-active` | Yes (`adminRoutes.js:40`) | `admin.toggleCategoryActive` | Yes | **MATCH** |
| Load Store Settings | `settings.html` | `GET /api/admin/settings` | Yes (`adminRoutes.js:43`) | `admin.getSettings` | Yes | **MATCH** |
| Save Store Settings | `settings.html` | `PUT /api/admin/settings` | Yes (`adminRoutes.js:44`) | `admin.updateSettings` | Yes | **MATCH** |
| Fetch Customers Directory | `customers.html`| `GET /api/admin/customers` | Yes (`adminRoutes.js:47`) | `admin.getCustomers` | Yes | **MATCH** |
| Toggle Customer Block | `customers.html`| `PATCH /api/admin/customers/:id/block` | Yes (`adminRoutes.js:48`) | `admin.toggleBlockCustomer` | Yes | **MATCH** |
| Fetch Staff Members | `staff.html` | `GET /api/admin/staff` | Yes (`adminRoutes.js:51`) | `admin.getStaff` | Yes | **MATCH (Blocked by UI Guard)** |
| Create Staff Account | `staff.html` | `POST /api/admin/staff` | Yes (`adminRoutes.js:52`) | `admin.createStaff` | Yes | **MATCH** |
| Remove Staff Account | `staff.html` | `DELETE /api/admin/staff/:id` | Yes (`adminRoutes.js:53`) | `admin.deleteStaff` | Yes | **MATCH** |
| Toggle Staff Block | `staff.html` | `PATCH /api/admin/staff/:id/toggle-block` | Yes (`adminRoutes.js:54`) | `admin.toggleStaffBlock` | Yes | **MATCH** |
| Fetch Analytics Reports | `reports.html` | `GET /api/admin/reports` | Yes (`adminRoutes.js:60`) | `admin.getReports` | Partial (Flawed valuation logic) | **SEMANTIC DEFECT** |
| Daily Settlement Summary | `reports.html` | `GET /api/admin/reports/daily-settlement` | Yes (`adminRoutes.js:61`) | `admin.getDailySettlement` | Yes | **MATCH** |
| Export Orders CSV | `reports.html` | `GET /api/admin/export/orders.csv` | Yes (`adminRoutes.js:64`) | `admin.exportOrdersCsv` | **No (401 on `<a>` click)** | **AUTH BROKEN IN UI** |
| Export Stock Log CSV | `reports.html` | `GET /api/admin/export/stock-log.csv` | Yes (`adminRoutes.js:65`) | `admin.exportStockLogsCsv` | **No (401 on `<a>` click)** | **AUTH BROKEN IN UI** |
| Export Udhar Ledger CSV | `udhar.html` | `GET /api/admin/export/udhar-ledger.csv` | Yes (`adminRoutes.js:66`) | `admin.exportUdharLedgerCsv` | **No (401 on `<a>` click)** | **AUTH BROKEN IN UI** |
| Add AI Synonym Alias | `ai-misses.html` | `POST /api/admin/ai/add-alias` | Yes (`adminRoutes.js:69`) | `admin.addAliasFromAiMiss` | Yes | **MATCH** |
| Cloudinary Image Upload | `products.html` | `POST /api/admin/upload` | Yes (`adminRoutes.js:72`) | `admin.uploadImage` | Yes | **MATCH** |
| Export Database Backup | `settings.html` | `GET /api/admin/backup/export` | Yes (`adminRoutes.js:76`) | `admin.exportBackup` | Yes (Uses blob fetch) | **MATCH** |
| Cleanup Notifications | `settings.html` | `POST /api/admin/notifications/cleanup-old` | Yes (`adminRoutes.js:77`) | `admin.cleanupOldNotifications` | Yes | **MATCH** |
| Fetch Low Stock Items | `low-stock.html`| `GET /api/inventory/low-stock` | Yes (`inventoryRoutes.js:17`) | `inv.getLowStock` | **No (Wrong token key + crash)** | **BROKEN IN UI** |
| Fetch Near Expiry Items | `low-stock.html`| `GET /api/inventory/near-expiry` | Yes (`inventoryRoutes.js:20`) | `inv.getNearExpiry` | **No (Wrong token key + crash)** | **BROKEN IN UI** |
| Fast Stock-In | `stock-in.html` | `POST /api/inventory/stock-in` | Yes (`inventoryRoutes.js:26`) | `inv.stockIn` | **No (Wrong token key)** | **BROKEN IN UI** |
| Toggle Product Unavail | `low-stock.html`| `PATCH /api/inventory/unavailable/:id` | Yes (`inventoryRoutes.js:32`) | `inv.setUnavailable` | Yes | **MATCH** |
| Fetch Udhar Accounts | `udhar.html` | `GET /api/udhar/admin/accounts` | Yes (`udharRoutes.js:21`) | `udhar.getAdminAccounts` | Yes | **MATCH** |
| Record Udhar Payment | `udhar.html` | `POST /api/udhar/admin/accounts/:id/payment` | Yes (`udharRoutes.js:23`) | `udhar.recordPayment` | Yes | **MATCH** |
| View Customer Ledger | `udhar.html` | `GET /api/udhar/admin/accounts/:id/ledger` | Yes (`udharRoutes.js:24`) | `udhar.getCustomerLedger` | Yes | **MATCH** |
| WhatsApp Udhar Reminder | `udhar.html` | `GET /api/udhar/admin/reminder/:id` | Yes (`udharRoutes.js:25`) | `udhar.getWhatsAppReminder` | Yes | **MATCH** |
| Fetch Notifications | `inbox.html` | `GET /api/notifications` | Yes (`notificationRoutes.js:11`) | `notif.getNotifications` | Yes | **MATCH** |
| Mark Notifications Read | `inbox.html` | `PATCH /api/notifications/read-all` | Yes (`notificationRoutes.js:13`) | `notif.markAllAsRead` | Yes | **MATCH** |
| Fetch AI Misses | `ai-misses.html` | `GET /api/ai/misses` | Yes (`aiRoutes.js:44`) | `ai.getAiMisses` | Yes | **MATCH** |

---

## 6. Gap Analysis vs. Top-Notch Kirana Owner Panel

| Capability | Current State | Business Value | Redesign Effort | Backend Support Exists? |
| :--- | :--- | :--- | :--- | :--- |
| **Today-at-a-Glance Home** | **Partial** (Stats exist, but missing low-stock/pending udhar alerts) | High (Immediate morning overview) | Small | Yes |
| **Fast Order Processing (1-2 Taps)** | **Partial** (Multi-screen jumps, excessive scrolling) | High (Speed during rush hours) | Medium | Yes |
| **Delivery Boy Management & Route View** | **Missing** (No delivery partner assignment) | High (Rural delivery coordination) | Large | Partial (Needs delivery boy model) |
| **Barcode / Camera Scanning** | **Missing** (Manual text search only) | Critical (Speed at physical counter) | Medium | Yes (Client-side camera scanner) |
| **Quick Stock-In with Supplier Details** | **Partial** (Stock-in broken by auth bug, no supplier field) | High (Accurate wholesale tracking) | Medium | Partial |
| **Near-Expiry & Expiry Alerts** | **Partial** (API exists, but frontend crashes on render) | High (Prevents unsellable waste) | Small | Yes (`/api/inventory/near-expiry`) |
| **Stock Adjustments with Reason Codes** | **Partial** (API `/adjust` exists, no UI screen) | Medium (Theft, damage, return audit) | Small | Yes (`/api/inventory/adjust`) |
| **Pricing & Promotions Engine** | **Missing** (No deal builder or coupon engine) | Medium (Seasonal festival sales) | Medium | Partial (`offerPercent` exists) |
| **Customer Insights (RFM / Retention)** | **Missing** (Only basic customer table with order count) | High (Identifies lost customers) | Medium | Partial |
| **Udhar WhatsApp Statements & Due Dates** | **Partial** (Reminders work, but no statement PDF or due dates) | Critical (Village cash-flow survival) | Medium | Yes |
| **True Margin & Profit Reports** | **Partial** (Reports flawed: computes price as cost) | Critical (Owner knows real profit) | Medium | Partial (Needs `costPrice` field) |
| **GST / Tax Invoice Generation** | **Missing** (No formal bill generator) | Low/Medium (Optional for small kirana) | Large | No |
| **Staff Granular Permissions & Audit** | **Partial** (Audit log exists, but UI locks out staff) | High (Accountability for employees) | Medium | Yes |
| **Native Sound & Push Notifications** | **Partial** (Web chime exists, no Web Push API) | High (Immediate order awareness) | Medium | Partial (Push endpoint exists) |
| **Store Controls (Open/Close & Holiday)** | **Missing** (Cannot close store temporarily) | Critical (Prevents unfulfillable orders) | Small | Partial (Needs `isOpen` boolean) |
| **Secure CSV & Backup Export** | **Partial** (Backup works, CSV links fail with 401) | Medium (Accountant data sharing) | Small | Yes |
| **100% Bilingual UI (Marathi / English)** | **Partial** (~48% coverage) | Critical (Comfort for local operators) | Medium | Yes |
| **58mm / 80mm Thermal Receipt Print** | **Missing** (Only desktop A4 print mode) | High (Fast slip generation at counter) | Small | Yes (CSS thermal print format) |
| **Global Spotlight Search Everywhere** | **Missing** (Separate search boxes per page) | High (Find any order, product, customer) | Medium | Partial |
| **Mobile-First Bottom Nav for All Pages** | **Missing** (Only 5 tabs; 9 pages inaccessible) | Critical (Owner uses mobile phone) | Medium | Yes |

---

## 7. Current Design System Inventory

### Existing Design Tokens (`client/admin/css/admin.css`)
- **Primary Brand:** `--admin-primary: #15803d;` (Emerald Green)
- **Primary Dark:** `--admin-primary-dark: #166534;`
- **Primary Light / Background:** `--admin-primary-light: #dcfce7;`
- **Accent Gold:** `--admin-accent: #f59e0b;`
- **Danger Red:** `--admin-danger: #dc2626;`
- **Backgrounds:** `--admin-bg: #f8fafc;`, `--admin-card: #ffffff;`
- **Borders & Shadows:** `--admin-border: #e2e8f0;`, `--admin-radius: 12px;`

### Inconsistencies & Collisions
1. **Purple Rogue Theme:** `stock-in.html` and `low-stock.html` declare `--color-primary: #7c3aed` and load Google Fonts (`Inter`, `Noto Sans Devanagari`) independently.
2. **Typography Duplication:** `admin.css` relies on system fonts, whereas `udhar.html`, `reports.html`, and `staff.html` pull `Outfit`, `Plus Jakarta Sans`, and `Noto Sans Devanagari` from Google Fonts with redundant `<link>` tags.
3. **Form Controls:** Varying input heights (38px vs. 42px vs. 48px) and border colors (`#cbd5e1` vs. `#e2e8f0` vs. `#e5e7eb`).
4. **Button Variants:** Classes like `.btn-primary`, `.btn-action`, `.btn-save`, `.btn-confirm`, and `.btn-stock-in` define duplicate styles with conflicting padding and hover states.

### Minimal Reusable Components Needed in Rebuild
1. **`AppShell`:** Unified responsive layout (collapsible emerald sidebar on desktop, fixed bottom navigation bar + "More" drawer on mobile).
2. **`StatCard`:** Standardized KPI widget with label, value, subtext, and trend indicator.
3. **`ResponsiveDataList`:** Renders as a data table on desktop (>=768px) and automatically transforms into swipeable cards on mobile (<768px).
4. **`BottomSheetModal`:** Bottom sheet drawer on mobile phones, centered backdrop modal on desktop.
5. **`ToastQueue`:** Single global toast notification queue (`success`, `error`, `info`).
6. **`FilterBar`:** Debounced search input combined with horizontal scrolling filter chips.
7. **`StatusBadge`:** Semantic color-coded pill (`new`, `confirmed`, `packed`, `dispatched`, `delivered`, `cancelled`).
8. **`TouchButton`:** Guaranteed 44px minimum touch-target button with built-in loading spinner state.

---

## 8. Technical Constraints & Must-Keep Rules

1. **Never Trust Client Prices:** Totals must always be recalculated from the database in `orderController.js`.
2. **Atomic Stock Changes Only:** All stock mutations must continue to use `findOneAndUpdate({ _id, stockQuantity: { $gte: qty } })` or MongoDB sessions.
3. **Strict IST (`Asia/Kolkata`):** All dates, timestamps, order slots, and daily settlement cutoffs must be computed in IST.
4. **Bilingual Requirement:** Every user-facing label, button, modal prompt, and error message must be bilingual (मराठी + English).
5. **Protect Customer Cart:** Never purge `localStorage.getItem('kirana_cart')` on 401 Unauthorized or admin logout. Only auth tokens (`kirana_token`, `kirana_user`) may be cleared.
6. **Vanilla Frontend Architecture:** Zero heavy frameworks (no React, Next.js, Vue, or Angular). Keep plain HTML5, CSS3, and modern vanilla JavaScript without a mandatory build step.
7. **Helmet CSP Alignment:** Strict adherence to server Content Security Policy (no inline `<script>` tags; all JS must reside in external `.js` files).
8. **Auth Key Canonicalization:** Admin pages must read `CONFIG.AUTH_TOKEN_KEY` (`'kirana_token'`) and `CONFIG.USER_KEY` (`'kirana_user'`) from `config.js`.

---

## 9. Proposed Redesign Blueprint (Pre-Plan)

### Information Architecture & Navigation

```
PROPOSED UNIFIED SHELL

[Desktop View: Collapsible Left Sidebar]
   ├── 🏪 Mahalaxmi Kirana Header
   ├── 📊 Dashboard (Home)
   ├── 📦 Orders & Dispatch
   │     ├── Live Orders Queue
   │     └── Consolidated Packing Slip
   ├── 📥 Inventory & Stock
   │     ├── Fast Stock-In (Camera Barcode)
   │     ├── Low Stock & Expiry Alerts
   │     ├── Product Catalog (Add/Edit)
   │     └── Category Taxonomy
   ├── 📖 Udhar & Customers
   │     ├── Udhar Credit Ledger (Khata)
   │     └── Customer Directory
   ├── 📈 Business & Reports
   │     ├── Daily Settlement (WhatsApp)
   │     └── Profit & Sales Analytics
   └── ⚙️ Management
         ├── Store Settings (Open/Close)
         ├── Staff Permissions & Audit
         ├── AI Synonym Corrections
         └── Database Backup

[Mobile View (< 768px): Bottom Bar (4 Core Tabs + "More" Drawer)]
   ├── 📊 Home (Daily KPIs & Alerts)
   ├── 📦 Orders (Live Processing Queue)
   ├── 📥 Stock (Fast Stock-In & Alerts)
   ├── 📖 Udhar (Khata & WhatsApp Reminders)
   └── ☰ More (Slide-up drawer for Catalog, Reports, Customers, Settings, Staff)
```

### Page Consolidation Plan
1. **Merge `stock-in.html` and `low-stock.html` -> `inventory.html`:**  
   Single unified inventory workspace with 3 tabs: (1) Fast Stock-In / Barcode Scan, (2) Low Stock & Expiry Alerts, (3) Stock Audit Log.
2. **Merge `orders.html` and `packing.html`:**  
   Packing list becomes an accessible sub-view or tab within the Orders section.
3. **Merge `products.html` and `categories.html` -> `catalog.html`:**  
   Combined catalog view where categories are managed as filterable tabs or a side-panel.

### Phased Implementation Roadmap

- **Phase 1: Emergency Hotfixes & Auth Standardization (Immediate)**
  - Unify auth keys across `stock-in.html` and `low-stock.html` (`mk_token` -> `kirana_token`).
  - Fix fatal `ReferenceError: escapeHtml` in `low-stock.html`.
  - Fix staff lockout bug in `admin-common.js` (allow `role === 'staff'`).
  - Convert broken CSV `<a>` download links to authenticated blob fetches.
  - *Risk:* Low. *Effort:* Small.

- **Phase 2: Unified App Shell & Mobile Navigation (Core Rebuild)**
  - Build single responsive layout (collapsible emerald sidebar on desktop, bottom navigation + "More" drawer on mobile).
  - Migrate all 14 pages into the unified shell, eliminating duplicate headers, rogue purple styles, and conflicting scripts.
  - *Risk:* Medium. *Effort:* Medium.

- **Phase 3: Mobile-First Component Refactoring (UX Transformation)**
  - Replace rigid desktop tables on mobile with responsive card layouts (Product cards, Order cards, Udhar cards).
  - Standardize 44px touch targets and full bilingual (Marathi/English) micro-copy.
  - Add native-feeling bottom sheets for modals.
  - *Risk:* Medium. *Effort:* Medium.

- **Phase 4: Advanced Kirana Operations (Power Tools)**
  - Integrate client-side camera barcode scanner for instant product lookup and stock-in.
  - Add 58mm / 80mm thermal receipt print format.
  - Add Store Open/Close emergency toggle switch in header.
  - Add `costPrice` to Product model for true profit margin calculation.
  - *Risk:* Low. *Effort:* Medium.

### Backend Changes Required
1. **Product Schema Update:** Add `costPrice: { type: Number, default: 0, min: 0 }` to track wholesale purchase price for accurate margin reporting.
2. **Settings Schema Update:** Add `isStoreOpen: { type: Boolean, default: true }` and `closureReason: { type: String, default: '' }` to support instant store holiday/emergency mode.
3. **Delivery Boy Assignment:** Add `deliveryBoy: { name: String, phone: String }` to `Order` schema.
4. **Export CSV Route Authentication:** Support query param token auth (e.g. `?token=...`) or temporary download tokens for native browser downloads without CORS fetch overhead.

---

## 10. Prioritized Backlog

1. `[CRIT-01]` **Unify Auth Token Storage Keys** | Pages: `stock-in.html`, `low-stock.html` | Severity: Critical | Effort: S | Depends on: None  
   *Replace `mk_token` and `mk_role` with `CONFIG.AUTH_TOKEN_KEY` and `CONFIG.USER_KEY`.*
2. `[CRIT-02]` **Fix Fatal `escapeHtml` Crash in Low Stock** | Pages: `low-stock.html` | Severity: Critical | Effort: S | Depends on: None  
   *Define or import `escapeHtml()` to eliminate runtime `ReferenceError`.*
3. `[CRIT-03]` **Resolve Staff Lockout Bug** | Pages: `admin-common.js`, `staff.html` | Severity: Critical | Effort: S | Depends on: None  
   *Update `enforceAdminAuth()` to permit both `owner` and `staff` roles.*
4. `[CRIT-04]` **Fix Broken CSV Downloads** | Pages: `reports.html`, `udhar.html` | Severity: High | Effort: S | Depends on: None  
   *Implement authenticated blob fetch for order, stock, and Udhar CSV downloads.*
5. `[CRIT-05]` **Fix Stock Toggle Contract Inversion** | Pages: `products.html`, `admin-products.js` | Severity: High | Effort: S | Depends on: None  
   *Send `unavailableFlag: !newStatus` instead of `{ inStock }` in `toggleStock()`.*
6. `[REBLD-01]` **Unified Emerald App Shell & Sidebar** | Pages: All 14 pages | Severity: High | Effort: M | Depends on: None  
   *Eliminate purple sidebar; implement unified desktop sidebar and mobile bottom nav.*
7. `[REBLD-02]` **Mobile "More" Slide-up Drawer** | Pages: Mobile layout | Severity: High | Effort: M | Depends on: REBLD-01  
   *Give mobile owners 1-tap access to Products, Udhar, Reports, Customers, Settings.*
8. `[REBLD-03]` **Responsive Order Cards & Swipe Actions** | Pages: `orders.html` | Severity: High | Effort: M | Depends on: REBLD-01  
   *Replace cluttered button piles with streamlined status transitions.*
9. `[REBLD-04]` **Responsive Product Catalog Cards** | Pages: `products.html` | Severity: High | Effort: M | Depends on: REBLD-01  
   *Eliminate `min-width: 600px` table; create touch-friendly card list on mobile.*
10. `[REBLD-05]` **Consolidate Stock-In & Low Stock into Inventory Workspace** | Pages: `stock-in.html`, `low-stock.html` | Severity: High | Effort: M | Depends on: REBLD-01  
    *Combine fast stock-in, low stock, and near expiry into a single tabbed hub.*
11. `[REBLD-06]` **Bilingual Form Inputs in Product Modal** | Pages: `products.html` | Severity: Medium | Effort: S | Depends on: REBLD-04  
    *Add missing fields: `stockQuantity`, `unitType`, `reorderLevel`, `aliases`, `expiryDate`.*
12. `[REBLD-07]` **Udhar Mobile Card Layout & Quick Payment** | Pages: `udhar.html` | Severity: High | Effort: M | Depends on: REBLD-01  
    *Replace 6-column table with customer cards and 44px payment buttons.*
13. `[REBLD-08]` **Customers Directory Search & Pagination** | Pages: `customers.html` | Severity: Medium | Effort: S | Depends on: REBLD-01  
    *Add search input and customer detail history modal.*
14. `[REBLD-09]` **Packing List Thermal Print (58mm / 80mm)** | Pages: `packing.html` | Severity: Medium | Effort: S | Depends on: REBLD-01  
    *Add dedicated thermal printer CSS media query.*
15. `[REBLD-10]` **Fix Typo and Clean Settings Form** | Pages: `settings.html`, `admin-settings.js` | Severity: Low | Effort: S | Depends on: None  
    *Fix errant comma in line 176 and convert pincode textarea to chips.*
16. `[FEAT-01]` **Store Open / Closed Emergency Toggle** | Pages: Header / `settings.html` | Severity: High | Effort: S | Depends on: Backend setting  
    *Add 1-tap store open/close switch in header with immediate storefront feedback.*
17. `[FEAT-02]` **Camera Barcode Scanner for Fast Stock-In** | Pages: Inventory hub | Severity: High | Effort: M | Depends on: REBLD-05  
    *Use device camera for 1-second barcode lookup.*
18. `[FEAT-03]` **True Profit Margin Calculation** | Pages: `reports.html`, backend | Severity: Medium | Effort: M | Depends on: `costPrice` model  
    *Implement real wholesale purchase rate to display true gross profit.*
19. `[FEAT-04]` **Audio Permission Prompt & Reliable Chimes** | Pages: `dashboard.html` | Severity: Medium | Effort: S | Depends on: None  
    *Add user gesture audio unlock banner to ensure new order chimes always fire.*
20. `[FEAT-05]` **Full Bilingual Micro-Copy Audit** | Pages: All 14 pages | Severity: Medium | Effort: M | Depends on: REBLD-01  
    *Reach 100% Marathi + English coverage across all toasts, alerts, and tables.*
21. `[FEAT-06]` **Category Reordering via Drag & Drop** | Pages: `categories.html` | Severity: Low | Effort: S | Depends on: REBLD-01  
    *Allow store owner to sort storefront category priority.*
22. `[FEAT-07]` **AI Misses Autocomplete Dropdown** | Pages: `ai-misses.html` | Severity: Low | Effort: S | Depends on: REBLD-01  
    *Replace 500-item `<select>` with searchable input.*
23. `[FEAT-08]` **WhatsApp Statement Sharing with UPI Link** | Pages: `udhar.html` | Severity: High | Effort: S | Depends on: REBLD-07  
    *Embed instant GPay/PhonePe UPI deep-link in Udhar WhatsApp reminder text.*
24. `[FEAT-09]` **Consolidated Packing List Rack Grouping** | Pages: `packing.html` | Severity: Low | Effort: S | Depends on: None  
    *Group packing items by shop department.*
25. `[FEAT-10]` **Offline Indicator Banner** | Pages: Global Shell | Severity: Medium | Effort: S | Depends on: REBLD-01  
    *Display non-intrusive warning when internet connectivity drops.*

---

## 11. Assumptions & Unverified Items

1. **Audio Chime Autoplay Policy (`UNVERIFIED` in automated CI):** Web Audio chimes on `dashboard.html` (`new-order-banner`) depend on user gesture activation in Chromium-based browsers. Unverified on cold mobile background tabs without user touch.
2. **Cloudinary Upload Credentials:** Image upload was verified via endpoint presence (`/api/admin/upload`), but actual Cloudinary cloud upload requires valid `CLOUDINARY_URL` in `.env`.
3. **Web Push Subscription Support:** Endpoint `/api/notifications/subscribe` exists in `notificationRoutes.js`, but frontend lacks Service Worker VAPID key registration. Marked as unverified in production.
4. **Hardware Thermal Print Output:** ESC/POS raw printing commands were not tested on physical Bluetooth/USB 58mm thermal printers; evaluated strictly via browser `@media print` rules.

---

## 12. PASTE-BACK SUMMARY (<= 150 lines)

```markdown
### MAHALAXMI KIRANA STORE: OWNER / ADMIN PANEL MASTER AUDIT DIGEST

**1. Executive Verdict & Health:**
- Overall Health: RED (Severely Degraded / Broken Layouts / Critical Auth Mismatches).
- Recommendation: REBUILD ADMIN FRONTEND (Keep Express API & backend models intact; replace client/admin with a unified, mobile-first vanilla HTML/CSS/JS architecture).
- Top 5 Critical Defects:
  1. Auth Key Incompatibility: low-stock.html and stock-in.html read 'mk_token' instead of 'kirana_token', kicking logged-in owners back to login page.
  2. Mobile Navigation Blindspot: 9 out of 14 admin pages have zero links on mobile bottom nav. No "More" menu exists.
  3. Fatal Runtime Crash: low-stock.html calls escapeHtml() 10 times without defining it, throwing a fatal ReferenceError on load.
  4. Visual Distortion: products.html, categories.html, and customers.html use min-width: 500-600px tables that break on 360px phones.
  5. Inverted Stock Toggle: products.html sends { inStock } while backend checks req.body.unavailableFlag, inverting status blindly.

**2. Navigation & Architecture Reality:**
- Split Shells: dashboard, orders, products use Emerald (#15803d) navbar; stock-in and low-stock use a rogue Purple (#7c3aed) sidebar.
- Orphan Pages (zero links in desktop navbar): categories.html, packing.html, customers.html, ai-misses.html.
- Mobile Bottom Bar: Only displays Dashboard, Inbox, Orders, Low Stock, Settings. Products, Udhar, Reports, Stock-In are unreachable.

**3. Frontend/Backend Contract Gaps:**
- CSV Exports (/api/admin/export/*.csv): Linked via <a download> tags without Authorization header -> 401 Unauthorized error.
- Product Creation: UI omits stockQuantity, unitType, reorderLevel, aliases, expiryDate.
- Financial Valuation: Backend calculates cost valuation as (stockQuantity * price) and potential margin as (mrp - price), misrepresenting customer discounts as store profit margins.
- Staff Lockout: admin-common.js blocks staff role with alert/redirect, contradicting backend RBAC.

**4. Technical Constraints & Rules:**
- Never trust client prices (server recalculates in orderController.js).
- Stock changes must remain atomic (findOneAndUpdate with $gte).
- IST (Asia/Kolkata) for all timestamps and cutoffs.
- Bilingual (मराठी + English) for all UI micro-copy.
- Never clear localStorage key 'kirana_cart' on admin logout or 401.
- No heavy frameworks; keep vanilla JS/HTML/CSS without build steps.

**5. Proposed Blueprint:**
- Navigation: Desktop collapsible emerald sidebar + Mobile 4-tab bottom bar (Home, Orders, Stock, Udhar) with "More" slide-up drawer.
- Consolidations: Merge stock-in + low-stock into Inventory Hub; merge products + categories into Catalog Hub.
- Mobile Data Display: Replace rigid desktop tables with swipeable responsive cards.
- Add Thermal 58mm/80mm receipt printing and Store Open/Close toggle.

**6. Top Backlog Items:**
1. [CRIT-01] Fix token key mismatch ('mk_token' -> 'kirana_token') in stock-in and low-stock.
2. [CRIT-02] Define escapeHtml() in low-stock.html to resolve crash.
3. [CRIT-03] Update admin-common.js auth guard to permit staff role.
4. [CRIT-04] Convert CSV downloads to authenticated blob fetches.
5. [CRIT-05] Fix toggleStock() contract to pass unavailableFlag properly.
6. [REBLD-01] Implement unified Emerald AppShell across all pages.
7. [REBLD-02] Add mobile "More" slide-up drawer for all remaining pages.
8. [REBLD-03] Mobile-first card list for Orders with swipeable status actions.
9. [REBLD-04] Mobile card view for Product Catalog with stepper counters.
10. [REBLD-05] Unified Inventory workspace (Stock-In + Alerts + Expiry).
11. [REBLD-06] Add missing inventory fields to Product modal.
12. [REBLD-07] Mobile Udhar Khata cards with 44px payment buttons.
13. [REBLD-08] Customer directory search and order history drawer.
14. [REBLD-09] 58mm/80mm thermal receipt printing format.
15. [FEAT-01] Instant Store Open/Closed switch in header.
16. [FEAT-02] Phone camera barcode scanner for product search.
17. [FEAT-03] Wholesale cost price field for real gross margin analytics.
18. [FEAT-04] Reliable audio unlock prompt for new order chimes.
19. [FEAT-05] 100% Marathi + English bilingual micro-copy completion.
20. [FEAT-08] WhatsApp statement generator with instant UPI payment QR link.
```
