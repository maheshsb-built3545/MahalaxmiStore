# Mahalaxmi Kirana Store — Customer Mobile & Wiring Report

> **Branch:** `fix/customer-mobile`  
> **Environment:** Vanilla HTML5, Vanilla CSS, ES6 JS, Node.js / Express, MongoDB Atlas (`mahalaxmi_kirana`), Dedicated Test DB (`mahalaxmi_kirana_test`)  
> **Target Devices:** 360x740 (Android Small), 390x844 (iPhone 12-15), 412x915 (Samsung/Pixel), 768x1024 (Tablet), 1280x800 (Desktop)  
> **Language Support:** 100% Marathi + English bilingual coverage on all controls, toasts, errors, modals, and empty states.  
> **Live Public Phone Test Tunnel:** `https://improving-budgets-journal-counts.trycloudflare.com`  
> **Date:** October 2026  

---

## 1. Phase 0 — Diagnostics & Mobile Emulation Audit

### 1.1 True Mobile Emulation Diagnostics
*Tested with Puppeteer (`isMobile: true`, `hasTouch: true`, `deviceScaleFactor: 3`) with `overflow-x: hidden` temporarily unmasked to expose real layout boundaries.*

| Viewport | Page | Visual Scale | `scrollWidth` vs `innerWidth` | Overflow Elements Detected | Root Cause & Resolution |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **360x740** (Android Small) | **Home (`index.html`)** | `1.0` | 360px vs 360px | `button.ai-pill-btn` (+10px) | Fixed via `max-width: 100%` and flex-wrap |
| **360x740** | **Home (Logged In)** | `1.0` | 610px vs 360px | Flex action cluster in `.hdr-row` | Refactored mobile header to 56-64px single sticky row |
| **360x740** | **Checkout (`checkout.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Orders (`orders.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Confirmation (`order-confirmation.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Login (`login.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Register (`register.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Inbox (`inbox.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Privacy (`privacy.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Offline (`offline.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **390x844** (iPhone 12-15) | **All Pages** | `1.0` | 390px vs 390px | None | Clean, scale=1 verified |
| **412x915** (Pixel / Galaxy) | **All Pages** | `1.0` | 412px vs 412px | None | Clean, scale=1 verified |
| **768x1024** (Tablet Portrait) | **All Pages** | `1.0` | 768px vs 768px | None | Header media query updated to 1024px |
| **1280x800** (Desktop) | **All Pages** | `1.0` | 1280px vs 1280px | None | Clean full header layout |

---

### 1.2 Viewport Meta Tag Audit
All customer HTML files verified for responsive viewport declaration:
- Required: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Forbidden: `user-scalable=no`, `maximum-scale=1.0` (WCAG 2.1 compliance)
- Attributes added: `lang="mr" translate="no"` on `<html>`, `<meta name="google" content="notranslate">` on all pages.

| Page | Viewport Meta Content | Google Translate Guard | Compliant |
| :--- | :--- | :---: | :---: |
| `client/index.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/checkout.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/orders.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/order-confirmation.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/login.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/register.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/account.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/inbox.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/privacy.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |
| `client/offline.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `notranslate` + `lang="mr"` | ✅ YES |

---

## 2. Phase 1 — Mobile Structure Architecture

1. **Mobile Header (<1024px):** Single row, 60px high, sticky: `[Logo + Brand]` `[Search Icon]` `[Cart Button with live badge]`. All user actions (Orders, Inbox, Logout, Admin, Name) moved into the Account tab and bottom nav. Desktop (`>=1024px`) keeps the full header.
2. **Expandable Mobile Search:** Tapping the search icon smoothly expands a full-width search input overlay with a dedicated close button (`✕`).
3. **Product Grid:** Exactly 2 columns on phones (`grid-template-columns: repeat(2, 1fr)` with 12px gap), 3 columns on tablet, 4-5 on desktop. Product images use fixed `aspect-ratio: 1/1` and `object-fit: cover`.
4. **Cart Bottom Sheet:**
   - Full drag handle with touch-swipe dismissal and backdrop tap close.
   - Sticky footer with subtotal, live delivery charge calculation, free-delivery progress bar ("Add ₹X more for free delivery"), minimum order check, and full-width Checkout button.
   - Footer sits above bottom navigation (`padding-bottom: calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px))`).
   - Body scroll locks while drawer is open and reliably releases on close.
   - Offscreen drawer hidden with `visibility: hidden; pointer-events: none` to prevent layout overflow.
5. **Smart List Floating Button:** Positioned above bottom nav, automatically hides when cart sheet, checkout, or keyboard is open.
6. **Bottom Navigation Bar:** 6 primary tabs (Home, Items, Smart List, Cart with badge, Orders, Account) with bilingual Devanagari labels (`line-height >= 1.3`).
7. **Typography:** Body text $\ge 14\text{px}$, secondary text $\ge 12\text{px}$, strictly zero fonts $< 11\text{px}$ anywhere.

---

## 3. Phase 2 — End-to-End Wiring Implementation

### 3.1 Home / Catalog
- **Phonetic Search:** Server-side search supporting Marathi, English, Devanagari, and common Kirana phonetic variants (`shakkar/sakhar/sugar`, `atta/aata`, `tel/oil`, `tandul/chawal/rice`, `dal/daal`, `haldi/turmeric`, `namak/salt`, `poha/pohe`, `chai/tea`, `mirch/chilli`).
- **AI Misses Logging:** Unmatched customer searches are automatically logged to `AiLog` with `status: 'miss'`, feeding the owner's AI Misses dashboard. Empty state displays a prefilled "व्हॉट्सॲपवर विचारा / Ask on WhatsApp" button.
- **Best Sellers Carousel:** Powered by `GET /api/products/best-sellers`, returning top 8 products by units sold in delivered/confirmed orders in the last 30 days (fallback to featured products).
- **Offers & Mega Deals:** Real discount filter (`mrp > price`). Fake static countdown timers replaced with live deal badges.
- **Announcement Bar & Store Status:** Fetched live from `GET /api/settings/public`. When store is closed, displays warning banner, allows browsing, but blocks checkout with bilingual explanation (`code: 'STORE_CLOSED'`).
- **Cart Independence:** Guests can browse and add items to cart freely. Login is only required at checkout.

### 3.2 Smart List (AI Box)
- **Voice & Text Input:** Web Speech API (`mr-IN` with `hi-IN`/`en-IN` fallback). Friendly bilingual toast on permission denial.
- **Review Step:** Each parsed line presents matched product, unit price, quantity picker, and removal button before anything is committed to cart.
- **Rate Limit & Error Handling:** Friendly bilingual toast on HTTP 429 rate limit and AI service errors.

### 3.3 Checkout Flow (3 Steps)
- **Step 1: Address:** Saved addresses list with radio selection; add/edit/delete address; 6-digit pincode validation against serviceable pincodes (`settings.servicePincodes`); GPS location share button (`📍 चालू लोकेशन जोडा (GPS) / Share Location`) generating a Google Maps link.
- **Step 2: Slot:** Server-validated delivery slots with Asia/Kolkata IST cutoff enforcement ("today" vs "tomorrow").
- **Step 3: Payment:** UPI QR code preview + copy UPI ID + deep link `upi://pay?...`; Cash on Delivery; Udhar credit (only for owner-approved accounts with real-time balance check).
- **Atomic Order Submission:** Server recalculates all prices from DB snapshots, decrements stock atomically via MongoDB transactions, sends notifications to owner and customer, prevents double-submission via `X-Idempotency-Key`, and only clears `kirana_cart` upon HTTP 201 Created.

### 3.4 Orders & Tracking
- Visual status timeline with Devanagari labels and IST timestamps.
- One-tap "📞 Call Store" (`tel:+919860924504`) and "💬 WhatsApp" (`wa.me`) buttons on every order card.
- Customer order cancellation prompts for reason, restores inventory atomically, marks `stockRestored: true`, and notifies owner.
- 30-second live polling for order status changes with real-time toast alerts.
- One-click Reorder endpoint (`GET /api/orders/:id/reorder`) returns available items and reports out-of-stock items.

### 3.5 Auth & Account
- Inline Indian phone validation (`^[6-9]\d{9}$`).
- Show/hide password toggles (👁️ / 🙈) on login and registration.
- "Remember me" checkbox on login.
- Profile editing via `PUT /api/auth/profile`.
- Non-destructive logout: wipes tokens but preserves customer's `kirana_cart`.
- "📲 ॲप इन्स्टॉल करा / Install App" trigger for PWA install prompt.

---

## 4. Phase 3 — Backend Hardening

1. **Compound Indexes:**
   - `Order.index({ userId: 1, createdAt: -1 })`: Fast customer order history lookups.
   - `Order.index({ status: 1, createdAt: -1 })`: Owner dashboard order management & status filters.
   - `Product.index({ categoryId: 1, active: 1 })`: Rapid catalog category filtering.
   - `Product.index({ active: 1, sortOrder: 1 })`: Default catalog sorting.
2. **Rate Limiting:** Multi-tiered defense via `express-rate-limit` with bilingual 429 JSON responses:
   - `authLimiter`: 5 failed attempts per 15 min per IP+phone.
   - `orderLimiter`: Maximum 10 orders per hour per customer.
   - `aiLimiter`: 60 list-parsing requests per 15 min per IP.
   - `adminLimiter`: 600 requests per 15 min per IP.
   - `apiLimiter`: 1,500 requests per 15 min per IP.
3. **Uniform Error Standard:** All endpoints respond with uniform JSON `{ success: boolean, message: string, code?: string, data?: any }`. Unhandled routes return bilingual JSON 404 (`मार्ग सापडला नाही / Route not found.`).
4. **Data Isolation:** All automated mutation tests run strictly against `MONGODB_URI_TEST` (`mahalaxmi_kirana_test`).

---

## 5. Phase 4 — Verification & Test Evidence

### 5.1 Automated Test Suites Run Summary

| Test Suite | File | Tests Run | Result | Evidence / Coverage |
| :--- | :--- | :---: | :---: | :--- |
| **Playbook Fixes** | `server/tests/test_playbook_fixes.js` | 8 | ✅ **PASS** | Phone normalization, rate limiting, stock restoration, atomic operations |
| **Audit Items (1, 3, 4, 7)** | `server/tests/test_audit_items.js` | 5 | ✅ **PASS** | Server price authority, out-of-stock, inactive rejection, slot cutoffs, admin auth |
| **R5 & R6 Verification** | `server/tests/test-r5-r6.js` | 3 | ✅ **PASS** | Substitution acceptance/rejection, stock swap, database backup |
| **Stage 2 E2E Suite** | `server/tests/verify_stage2.js` | 14 | ✅ **PASS** | Auth, order creation, price tampering, isolation, minOrder, pincode, cancel, reorder, NoSQL injection |
| **AI Cart & Login-to-Add** | `server/tests/test_ai_cart_fixes.js` | 27 | ✅ **PASS** | Devanagari numbers, Marathi unit parsing, guest-to-user cart merge, 401 cart preservation |
| **Owner Rebuild Master Suite** | `server/tests/test_owner_rebuild_verification.js` | 28 | ✅ **PASS** | Roles/permissions, stock idempotency, CSV exports, stock inward, profit reports, store-closed |
| **Customer Backend & E2E Suite** | `server/tests/test_customer_wiring.js` | 9 | ✅ **PASS** | Register, profile, 401 gates, GPS address, price tampering, out-of-stock, closed store (403), atomic concurrency (409), cancel & reorder |
| **Admin Pages Browser E2E** | `scratch/verify_admin_pages_e2e.js` | 33 runs (11 pages x 3 viewports) | ✅ **PASS** | 0 console errors, 0 failed requests, 0 horizontal overflows across all admin pages |
| **Customer True Mobile Browser E2E** | `scratch/verify_customer_mobile_deep.js` | 45 runs (9 pages x 5 viewports) | ✅ **PASS** | Visual scale = 1, 0 overflows, 0 fonts < 11px, 0 console errors, interactive controls verified |

---

### 5.2 True Mobile Emulation Metrics Matrix

*Verified with Edge Puppeteer (`isMobile: true`, `hasTouch: true`, `deviceScaleFactor: 3`):*

| Page | 360x740 (Small) | 390x844 (Base iPhone) | 412x915 (Android Large) | 768x1024 (Tablet) | 1280x800 (Desktop) | Scale | Overflow | Fonts <11px | Console Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Storefront (`/`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Checkout (`/checkout.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Orders (`/orders.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Login (`/login.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Register (`/register.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Account (`/account.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Inbox (`/inbox.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Privacy (`/privacy.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |
| **Offline (`/offline.html`)** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | `1.0` | **NO** | **0** | **0** |

---

## 6. Comprehensive Customer Wiring Matrix

| Page | Control / Component | Handler (File:Line) | HTTP Request | Backend Express Route | Test Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Home** | Mobile Search Toggle Button | `client/index.html:471` | DOM Class Toggle | N/A (Client Shell) | Puppeteer automated click | **Working** |
| **Home** | Search Close Button (`✕`) | `client/index.html:477` | DOM Class Toggle | N/A (Client Shell) | Puppeteer automated click | **Working** |
| **Home** | Search Input (Phonetic / Bilingual) | `client/js/catalog.js:464` | `GET /api/products?search=...` | `productRoutes.js:20` | `test_customer_wiring.js` | **Working** |
| **Home** | Category Chips (Horiz. scroll) | `client/js/catalog.js:101` | `GET /api/products?categoryId=...` | `productRoutes.js:20` | Puppeteer click | **Working** |
| **Home** | Department Selector Tab | `client/js/catalog.js:84` | Filter Grid | N/A (Client State) | Puppeteer click | **Working** |
| **Home** | Best Sellers Carousel | `client/js/catalog.js:296` | `GET /api/products/best-sellers` | `productRoutes.js:23` | Route fixed & tested | **Fixed** |
| **Home** | Product Stepper Add (`Add` / `+`) | `client/js/catalog.js:234` | Cart state update | N/A (`kirana_cart`) | Optimistic update + badge | **Working** |
| **Home** | Product Stepper Decrease (`−`) | `client/js/catalog.js:192` | Cart state update | N/A (`kirana_cart`) | Optimistic update + badge | **Working** |
| **Home** | Header Cart Button (`#cartBtn`) | `client/index.html:459` | `ui.openCart()` | N/A (DOM Drawer) | Puppeteer click | **Working** |
| **Home** | Floating WA Button (`#fabWa`) | `client/index.html:444` | Settings link | `GET /api/settings/public` | Prefilled WhatsApp URL | **Working** |
| **Cart Sheet** | Close Drawer (`#closeCartBtn`) | `client/index.html:460` | `ui.closeCart()` | N/A (DOM Drawer) | Puppeteer click | **Working** |
| **Cart Sheet** | Overlay Tap Close (`#overlay`) | `client/index.html:461` | `ui.closeCart()` | N/A (DOM Drawer) | Puppeteer click | **Working** |
| **Cart Sheet** | Drawer Item Steppers (`+` / `−`) | `client/js/ui.js:472` | `cart.change(p, delta)` | N/A (`kirana_cart`) | Live subtotal recalculated | **Working** |
| **Cart Sheet** | Checkout Button (`#checkoutBtn`) | `client/index.html:462` | `ui.checkout()` | Navigates `checkout.html` | Empty cart check + redirect | **Working** |
| **Sticky Bar** | View Cart Bar (`#stickyCartBar`) | `client/index.html:463` | `ui.openCart()` | N/A (DOM Drawer) | Live item count & subtotal | **Working** |
| **AI Box** | Mic Voice Button (`#aiVoiceBtn`) | `client/js/ai-order.js:122` | Web Speech API | N/A (Browser Audio) | Permission denial caught | **Working** |
| **AI Box** | Sample Pill Buttons (`.ai-pill-btn`) | `client/js/ai-order.js:98` | DOM populate | N/A (Input Fill) | Character counter updates | **Working** |
| **AI Box** | Parse List Button (`#aiParseBtn`) | `client/js/ai-order.js:223` | `POST /api/ai/parse-list` | `aiRoutes.js:39` | `test_ai_cart_fixes.js` | **Working** |
| **AI Box** | Add All to Cart Button | `client/js/ai-order.js:487` | `cart.change(p, qty)` | N/A (`kirana_cart`) | `test_ai_cart_fixes.js` | **Working** |
| **Checkout** | Saved Address Radio Selector | `client/js/checkout.js:203` | DOM selection | N/A (Client State) | `test_customer_wiring.js` | **Working** |
| **Checkout** | Share Location (GPS) Button | `client/js/checkout.js:260` | `navigator.geolocation` | N/A (Maps Link Gen) | Formats Google Maps pin | **Working** |
| **Checkout** | Add New Address Form Submit | `client/js/checkout.js:471` | `POST /api/addresses` | `addressRoutes.js:13` | `test_customer_wiring.js` | **Working** |
| **Checkout** | Delivery Slot Selector Buttons | `client/js/checkout.js:145` | DOM selection | N/A (Slot State) | Cutoff time enforced | **Working** |
| **Checkout** | Payment Method Radios (UPI/COD/Udhar) | `client/js/checkout.js:410` | DOM selection | N/A (Payment State) | Udhar balance checked | **Working** |
| **Checkout** | Place Order Button (`#placeOrderBtn`) | `client/js/checkout.js:541` | `POST /api/orders` | `orderRoutes.js:19` | Atomic deduction verified | **Working** |
| **Orders** | Status Filter Tabs (`.order-filter-chip`) | `client/js/orders.js:115` | DOM filter | N/A (Client State) | Filter by status chip | **Working** |
| **Orders** | Pull-to-Refresh Gesture | `client/js/orders.js:82` | `ordersApp.loadOrders()` | `orderRoutes.js:20` | Touch gesture triggers reload | **Working** |
| **Orders** | Call Store Button (`#callStoreBtn`) | `client/js/orders.js:342` | `tel:+919860924504` | N/A (Native Tel) | Direct dial trigger | **Working** |
| **Orders** | WhatsApp Store Button (`#waStoreBtn`) | `client/js/orders.js:358` | `wa.me` deep link | N/A (WhatsApp) | Prefilled order context | **Working** |
| **Orders** | Cancel Order Button | `client/js/orders.js:417` | `PATCH /api/orders/:id/cancel` | `orderRoutes.js:22` | Restores stock atomically | **Working** |
| **Orders** | Reorder Order Button | `client/js/orders.js:462` | `GET /api/orders/:id/reorder` | `orderRoutes.js:23` | Restores items to cart | **Working** |
| **Auth** | Password Show/Hide Toggle Button | `client/login.html:142` | DOM input type | N/A (Password Visibility) | Toggles text / password | **Working** |
| **Auth** | Login Form Submit Button | `client/login.html:162` | `POST /api/auth/login` | `authRoutes.js:11` | `test_customer_wiring.js` | **Working** |
| **Auth** | Register Form Submit Button | `client/register.html:204` | `POST /api/auth/register` | `authRoutes.js:10` | `test_customer_wiring.js` | **Working** |
| **Account** | Edit Name Modal Save Button | `client/account.html:184` | `PUT /api/auth/profile` | `authRoutes.js:13` | `test_customer_wiring.js` | **Working** |
| **Account** | Install App Menu Button | `client/account.html:242` | `beforeinstallprompt.prompt()` | N/A (Browser PWA) | Triggers native install | **Working** |
| **Account** | Logout Button (`#logoutBtn`) | `client/account.html:268` | `auth.clearSession()` | N/A (localStorage) | Preserves `kirana_cart` | **Working** |
| **Inbox** | Mark All as Read Button | `client/inbox.html:378` | `PATCH /api/notifications/read-all`| `notificationRoutes.js:18` | Updates unread badge | **Working** |
| **Inbox** | Notification Card Tap (Deep Link) | `client/inbox.html:363` | `PATCH /api/notifications/:id/read`| `notificationRoutes.js:16` | Navigates to linked order | **Working** |
| **Bottom Nav** | 6 Navigation Items (Home, Items, AI, Cart, Orders, Account) | `client/js/ui.js:162` | Navigation / Sheet Trigger | N/A (Client Shell) | Correct active tab indicator | **Working** |

---

## 7. Git Commit Log on Branch `fix/customer-mobile`

| Commit Hash | Phase | Commit Message | Files Changed |
| :---: | :---: | :--- | :--- |
| `54497cd` | **Phase 0** | `docs(customer): initial mobile diagnostics, viewport audit, and api contract baseline` | `docs/CUSTOMER_WIRING_REPORT.md` |
| `ef5b945` | **Phase 1** | `feat(customer): mobile header refactor, grid responsive layout, cart bottom sheet, and i18n guards` | `client/index.html`, `client/css/style.css`, `client/css/mobile-app.css`, `client/account.html`, `client/checkout.html`, `client/orders.html`, `client/login.html`, `client/register.html`, `client/inbox.html`, `client/privacy.html`, `client/offline.html`, `client/order-confirmation.html` |
| `7254d99` | **Phase 2** | `feat(customer): wire customer controls, checkout, orders, catalog and auth end-to-end` | `client/account.html`, `client/checkout.html`, `client/js/ai-order.js`, `client/js/auth.js`, `client/js/catalog.js`, `client/js/checkout.js`, `client/js/orders.js`, `client/js/pwa.js`, `client/js/ui.js`, `client/login.html`, `client/register.html`, `client/sw.js`, `server/src/controllers/authController.js`, `server/src/controllers/orderController.js`, `server/src/controllers/productController.js`, `server/src/routes/authRoutes.js` |
| `c521220` | **Phase 3** | `feat(backend): harden indexes, bilingual rate limiters, 404 JSON standard, and architecture docs` | `docs/ARCHITECTURE.md`, `server/src/middleware/rateLimiter.js`, `server/src/models/Order.js`, `server/src/models/Product.js`, `server/src/server.js` |
| `1cce5ac` | **Phase 4** | `test(customer): phase 4 verification, test_customer_wiring suite, tablet header fix, and drawer overflow elimination` | `client/css/style.css`, `client/css/mobile-app.css`, `client/js/checkout.js`, `client/js/ui.js`, `server/src/models/Address.js`, `server/src/controllers/addressController.js`, `server/src/controllers/orderController.js`, `server/src/server.js`, `server/package.json`, `server/tests/test_customer_wiring.js`, `server/tests/test_owner_rebuild_verification.js`, `server/tests/verify_stage2.js`, `.gitignore` |

---

## 8. Items Requiring Owner Input / Deployment Defaults
1. **SMS Gateway:** Since no SMS provider credentials are configured, the password reset flow directs customers to WhatsApp store chat (`wa.me/919860924504`).
2. **Web Push VAPID:** Web push notifications gracefully fall back to in-app notification center when VAPID keys are absent.
3. **Public Tunnel Testing:** The server is currently exposed via Cloudflare Tunnel at `https://improving-budgets-journal-counts.trycloudflare.com` for instant real-phone mobile testing.
