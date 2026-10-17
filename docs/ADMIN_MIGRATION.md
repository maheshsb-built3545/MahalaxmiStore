# Mahalaxmi Kirana Store — Owner & Staff Panel Migration Guide

> **Target Audience:** Engineering, Store Operations, Support  
> **Release:** Owner Admin Panel Rebuild (Mobile-First, Top-Notch)  
> **Branch:** `feat/owner-panel-rebuild` → `main`  
> **Date:** October 2026  

---

## 1. Executive Summary

Mahalaxmi Kirana Store is a bilingual (मराठी / English) grocery store serving rural and semi-urban customers across Yesgaon and Kopargaon, Maharashtra. Because the store owner operates primarily on a smartphone (360px–390px viewports) on 3G/4G connections, the administration suite was completely re-architected and rebuilt from the ground up:

- **14 Fragmented Legacy Screens Consolidated into 11 Streamlined Modules.**
- **100% Mobile-First Navigation:** Bottom navigation bar (4 primary tabs + "More" drawer) accessible in $\le 2$ thumb taps.
- **100% Bilingual Coverage:** Every UI label, placeholder, error message, toast, and dialog is bilingual (मराठी + English).
- **Zero Client Build Overhead:** Clean Vanilla HTML5, CSS3 Custom Properties, and ES6+ JavaScript.
- **Strict Compliance with Architecture Non-Negotiables:**
  1. Authoritative server-side price calculation (client prices never trusted).
  2. Atomic inventory transactions with `StockLog` ledger entries.
  3. IST (`Asia/Kolkata`) date, time, and cutoff calculation.
  4. Session safety: 401 logout only clears `kirana_token` and `kirana_user`; `kirana_cart` is never cleared.
  5. CSP-clean: No inline `<script>`, no `onclick="..."`.
  6. Secure downloads: CSV reports exported via authenticated `fetch` and `Blob` downloads (no JWT in query strings).

---

## 2. Legacy Page Consolidation & URL Redirection Map

All legacy page URLs retain backwards compatibility through lightweight client-side redirection stubs with query parameter preservation:

| Legacy Page URL | New Page URL / Destination | Key Capabilities & Improvements |
| :--- | :--- | :--- |
| `dashboard.html` | `dashboard.html` | Action center banners (pending orders, low stock, unread msgs), 4 KPI cards with deltas, 24-hr sparkline, slot load distribution, audio alert unlock banner. |
| `orders.html` | `orders.html` | Real-time live queue, 1-tap status stepper advance, COD cash collection check, Udhar credit approval guard, customer details drawer, thermal print. |
| `packing.html` | `orders.html?tab=packing` *(Redirect)* | Streamlined packing queue with persistent checklist in `localStorage`, progress bar, and 1-tap "Mark as Packed" advance. |
| `products.html` | `catalog.html?tab=products` *(Redirect)* | Consolidated catalog with responsive cards (<768px) and tables (≥768px), `costPrice` support, quick stock toggle, bulk price adjustments. |
| `categories.html` | `catalog.html?tab=categories` *(Redirect)* | Touch-friendly category reordering with visual drag/touch indicators, category creation, emoji assignment, and active status switch. |
| `stock-in.html` | `inventory.html?tab=stock-in` *(Redirect)* | Multi-item inward cart with live profit margin hint (`costPrice` vs `sellingPrice`), purchase invoice & supplier tagging, native camera barcode scanner (`BarcodeDetector`). |
| `low-stock.html` | `inventory.html?tab=alerts` *(Redirect)* | Integrated stock health center: Out-of-Stock, Low Stock, and Near-Expiry (30 days) alerts with 1-tap WhatsApp supplier reorder message generator. |
| `udhar.html` | `udhar.html` | Mobile-optimized Khata ledger, instant payment recording (Cash / UPI with ref), WhatsApp payment reminder with store UPI deep-link (`upi://pay`), thermal statement printing. |
| `customers.html` | `customers.html` | Searchable directory with smart segmentation (Regular, New, Dormant, Udhar, Blocked), customer drawer with lifetime spend, recent orders, and block/unblock action. |
| `reports.html` | `reports.html` | Date range selector, gross profit & margin calculation via actual `costPrice`, real SVG line & slot charts, category profitability, WhatsApp daily settlement generator. |
| `ai-misses.html` | `ai-corrections.html` *(Redirect)* | Unrecognized voice/text grocery phrases with frequency count, server-side product autocomplete search, 1-tap product alias mapping, ignore action. |
| `inbox.html` | `inbox.html` | Central notification timeline grouped by Today / Yesterday / Earlier, unread badge counters, order/stock deep-linking, Web Push notifications toggle. |
| `settings.html` | `settings.html` | Master store controls: Emergency Store Open/Close toggle with reason & auto-reopen, delivery fees & free delivery thresholds, serviceable pincode chips, UPI setup, danger zone data cleanup. |
| `staff.html` | `staff.html` | Owner-only staff management: Staff creation with granular permissions (orders, inventory, catalog, udhar, reports), account disabling, last-owner protection, real-time audit log feed. |

---

## 3. Design System & CSS Architecture

The UI is built on a custom, lightweight CSS token architecture located in `client/admin/css/`:

- **`tokens.css`**: Defines CSS variables for colors (Emerald `#15803d` primary, Amber `#f59e0b` accent, Rose `#dc2626` danger, Slate neutrals), typography (Inter, -apple-system, Devanagari system fonts with line-height `1.5` for vowel matras), radii (`8px`, `12px`, `16px`), elevation shadows, and touch-target minimums ($\ge 44\text{px}$).
- **`base.css`**: Normalized layout resets, accessible focus states, high-contrast typography, and responsive container grids.
- **`components.css`**: Modals, bottom sheets, toast notifications, stat cards, filter bars, status badges, skeletons, and offline connection status banners.
- **`pages.css`**: Page-specific micro-layouts and dedicated `@media print` rules for thermal receipts:
  - Supports 58mm ($48\text{mm}$ printable) and 80mm ($72\text{mm}$ printable) roll printers.
  - Automatically hides app shell, headers, and navigation during print.
  - High-contrast monochrome typography with store details and customer QR code.

---

## 4. Frontend Component & Core Utilities

Located in `client/admin/js/`:

- **`core/auth.js`**: Robust auth guard supporting both `owner` and `staff` roles with granular permission checks.
- **`core/api.js`**: Authoritative API request wrapper with in-flight GET de-duplication, automatic 401 redirect without cart eviction, and dynamic origin resolution.
- **`core/dom.js`**: `AdminDOM.escape()` / `AdminDOM.el()` safe DOM builder preventing XSS.
- **`core/i18n.js`**: Fast dictionary-based bilingual translation engine (`t(key)`), supporting 151 core keys.
- **`core/format.js`**: Standardized currency (`₹`), IST date/time, and phone number formatting.
- **`components/shell.js`**: Responsive application shell (`AdminShell`) adapting smoothly between desktop sidebar, tablet icon rail, and mobile bottom bar + drawer.
- **`components/bottom-sheet.js`**: Mobile-optimized touch bottom drawer for quick actions and details inspection.
- **`components/data-list.js`**: Responsive table-on-desktop, card-on-mobile data presenter.
- **`components/filter-bar.js`**: Debounced search input (250ms) with horizontally scrollable filter chips.

---

## 5. Verification & Quality Assurance Results

### 5.1 Backend Verification Suite
- **Script:** `server/tests/test_owner_rebuild_verification.js` (`npm --prefix server run test:rebuild`)
- **Isolation:** Runs strictly against `MONGODB_URI_TEST` with automatic cleanup.
- **Results:** **28 passed, 0 failed** across 10 functional domains:
  1. Auth Roles & Permission Enforcement (Owner full access, Staff 403 on staff routes, Staff catalog access).
  2. Toggle Stock Contract (Idempotent `unavailableFlag` and `inStock` updates).
  3. Authenticated CSV Exports (Orders, Stock Log, Udhar Ledger).
  4. Stock-In with Cost Price & StockLog (Atomic quantity increments, `Product.costPrice` updates, `StockLog` ledger entries).
  5. Stock Adjustment with Mandatory Reason Codes (`damage`, `expiry`, `theft`, `correction`).
  6. Profit Reports Math via `costPrice` & Inventory Valuation.
  7. Customer Directory Pagination & Search.
  8. Store Open/Closed Check on Storefront Checkout (Rejection with `STORE_CLOSED` code).
  9. XSS Escaping Unit Verification.
  10. Bilingual Dictionary Validation (151 phrases verified).

### 5.2 Bilingual Translation Coverage
- **Script:** `server/scripts/check_i18n.js` (`npm --prefix server run i18n:check`)
- **Status:** **PASSED** — Scanned 61 admin files, checked 87 `t('...')` lookups, 0 missing keys.

### 5.3 Real-Browser Visual Verification
- **Script:** `server/scripts/capture_after_screenshots.js`
- **Results:** 44 real-browser screenshots captured across 11 pages $\times$ 4 viewports (360px, 390px, 768px, 1280px) stored in `docs/audit-screenshots/after/`.

---

## 6. Migration & Deployment Instructions

1. **Database Migration:**
   - No breaking schema migrations required.
   - New optional fields added to `Product` (`costPrice`) and `Settings` (`isStoreOpen`, `closureReason`, `reopenAt`, `upiId`). Existing documents default gracefully (`costPrice: 0`, `isStoreOpen: true`).
2. **Web Server / Static Routing:**
   - Ensure the server serves `client/admin/` as a static directory.
   - Legacy URLs (`packing.html`, `products.html`, `categories.html`, `stock-in.html`, `low-stock.html`, `ai-misses.html`) redirect transparently to the corresponding consolidated modules.
3. **Rollback Strategy:**
   - Branch `main` remains untouched during the rebuild phase until full verification.
   - Reverting the Git commit on `main` restores the previous legacy administration files instantly without data loss.
