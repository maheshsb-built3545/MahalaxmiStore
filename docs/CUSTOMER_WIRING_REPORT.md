# Mahalaxmi Kirana Store — Customer Mobile & Wiring Report

> **Branch:** `fix/customer-mobile`  
> **Environment:** Vanilla HTML5, Vanilla CSS, ES6 JS, Node.js / Express, MongoDB Atlas (`mahalaxmi_kirana`), Isolated Test DB (`mahalaxmi_kirana_test`)  
> **Target Devices:** 360x740 (Android Small), 390x844 (iPhone 12-15), 412x915 (Samsung/Pixel), 768x1024 (Tablet), 1280x800 (Desktop)  
> **Language Support:** 100% Marathi + English bilingual coverage on all controls, toasts, errors, and empty states.  
> **Date:** October 2026  

---

## 1. Phase 0 — Diagnostics & Mobile Emulation Audit

### 1.1 True Mobile Emulation Diagnostics
*Tested with Puppeteer (`isMobile: true`, `hasTouch: true`, `deviceScaleFactor: 3`) with `overflow-x: hidden` temporarily unmasked to expose real layout boundaries.*

| Viewport | Page | Visual Scale | `scrollWidth` vs `innerWidth` | Overflow Elements Detected | File & Rule |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **360x740** (Android Small) | **Home (`index.html`)** | `1.0` | 360px vs 360px | `button.ai-pill-btn` (331px width, right: 370px, **+10px**) | `client/css/style.css:322` (`.ai-pill-btn`) |
| **360x740** | **Home (Logged In)** | `1.0` | 610px vs 360px | `.hdr-row` flex action cluster: Username + Orders + Bell + Admin + Logout + Cart in single row | `client/css/style.css:122` (`.hdr-row`) |
| **360x740** | **Checkout (`checkout.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Orders (`orders.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Confirmation (`order-confirmation.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Login (`login.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Register (`register.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Inbox (`inbox.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Privacy (`privacy.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **360x740** | **Offline (`offline.html`)** | `1.0` | 360px vs 360px | None | Clean |
| **390x844** (iPhone 12-15) | **Home (`index.html`)** | `1.0` | 390px vs 390px | None (guest); Header blowout when logged in | `client/css/style.css:122` (`.hdr-row`) |
| **390x844** | All other pages | `1.0` | 390px vs 390px | None | Clean |
| **412x915** (Pixel / Galaxy) | **Home (`index.html`)** | `1.0` | 412px vs 412px | None (guest); Header blowout when logged in | `client/css/style.css:122` (`.hdr-row`) |
| **412x915** | All other pages | `1.0` | 412px vs 412px | None | Clean |

---

### 1.2 Viewport Meta Tag Audit
All customer HTML files verified for responsive viewport declaration:
- Required: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Forbidden: `user-scalable=no`, `maximum-scale=1.0` (WCAG 2.1 zoom violation)

| Page | Viewport Meta Content | Compliant |
| :--- | :--- | :---: |
| `client/index.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/checkout.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/orders.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/order-confirmation.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/login.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/register.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/inbox.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/privacy.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |
| `client/offline.html` | `width=device-width, initial-scale=1.0, viewport-fit=cover` | ✅ YES |

---

### 1.3 Customer Pages & Interactive Controls Inventory

| Page / Component | Key Elements & Interactive Controls | Handlers & Wiring Target |
| :--- | :--- | :--- |
| **Storefront Header** (`<header>`) | • Store logo & bilingual brand text<br>• Search bar (`#searchInput`) with `⌘K` keyboard shortcut<br>• Mobile Search Expand toggle<br>• Cart trigger (`#cartBtn`) with live badge pop animation | `client/js/ui.js`<br>`client/js/catalog.js` |
| **Hero Section** | • Live store hours & open/closed status pill (`#statusLine`)<br>• "Browse Catalog" CTA (`#catalog`)<br>• "Order on WhatsApp" CTA (`#heroWaLink`) with prefilled cart summary | `client/js/ui.js` |
| **Smart List (AI Box)** | • Voice input toggle (`#aiVoiceBtn`, Web Speech API with fallback)<br>• Textarea input (`#aiListInput`) with char count<br>• Sample quick pills (`.ai-pill-btn`)<br>• Submit button (`#aiParseBtn`)<br>• Review modal (item editor, quantity changer, remove line, unmatched items list, Add All to Cart) | `client/js/ai-order.js`<br>`POST /api/ai/parse-list`<br>`POST /api/ai/log-add-result` |
| **Catalog & Offers** | • Department selector & category filter chips (`.chip`, horizontally scrollable)<br>• Best Sellers Carousel (`#bestSellersCarousel`, units sold in last 30 days)<br>• Product Cards: 2-column mobile grid, 1:1 image, bilingual title, pack size, price, MRP, discount badge, Stepper (`Add` / `−` / `qty` / `+`)<br>• Mega Deals section with verified discount filter | `client/js/catalog.js`<br>`client/js/cart.js`<br>`GET /api/categories`<br>`GET /api/products` |
| **Cart Bottom Sheet** | • Header with drag handle and close button<br>• Scrollable items list with thumbnail, name, pack size, unit price, quantity stepper<br>• Sticky footer with subtotal, delivery fee, free delivery progress bar, minimum order guard, and Checkout CTA (`#checkoutBtn`) | `client/js/ui.js`<br>`client/js/cart.js` |
| **Checkout Flow** (`checkout.html`) | • **Step 1: Address**: Saved address selector, Add Address sheet (`line`, `pincode`, `landmark`, `isDefault`), Geolocation button<br>• **Step 2: Slot**: IST delivery slots selector (Today/Tomorrow, cutoff enforcement)<br>• **Step 3: Payment**: UPI (QR preview, copy UPI ID, `upi://` deep link), COD, and Udhar credit (if owner approved)<br>• **Place Order**: Atomic double-submit lock, server recalculation, stock deduction, notification dispatch | `client/js/checkout.js`<br>`GET /api/addresses`<br>`POST /api/addresses`<br>`GET /api/settings/public`<br>`GET /api/udhar/my-account`<br>`POST /api/orders` |
| **Order Confirmation** | • Order summary card (#orderNumber, date, items, total, status)<br>• "Share on WhatsApp" CTA with order details<br>• "Track Order" link | `client/order-confirmation.html` |
| **Orders & Tracking** (`orders.html`) | • Status filter chips (`All`, `New`, `Confirmed`, `Packed`, `Out for Delivery`, `Delivered`, `Cancelled`)<br>• Order cards with live status timeline (IST timestamps)<br>• Cancel Order modal (with stock restoration)<br>• Item substitution response (Accept / Reject)<br>• Reorder button (adds available items back to cart)<br>• Call Store & WhatsApp Store buttons<br>• 30s background polling for live order updates | `client/js/orders.js`<br>`GET /api/orders`<br>`PATCH /api/orders/:id/cancel`<br>`POST /api/orders/:id/substitutions/:subId/respond`<br>`POST /api/orders/:id/reorder` |
| **Auth: Login & Register** | • Mobile input with Indian 10-digit validation (`^[6-9]\d{9}$`)<br>• Password field with show/hide toggle<br>• Safe redirect parameter forwarding (`next`/`redirect`)<br>• Non-destructive session management (never purges `kirana_cart` on logout/401) | `client/js/auth.js`<br>`POST /api/auth/login`<br>`POST /api/auth/register` |
| **Customer Account Page** (`account.html`) | • Customer Profile summary (name, phone, member date)<br>• Navigation items: Saved Addresses, My Orders, Inbox with live unread badge, Language preference<br>• PWA Install App button<br>• Owner/Staff Admin panel deep-link (shown only for owner/staff roles)<br>• Logout CTA | `client/account.html`<br>`client/js/auth.js` |
| **Inbox & Notifications** (`inbox.html`) | • Notification timeline (`Today`, `Yesterday`, `Earlier`)<br>• Filter tabs (`All`, `Unread`)<br>• Notification card tap: mark read, deep-link to associated order/product<br>• Mark All as Read button | `client/inbox.html`<br>`GET /api/notifications`<br>`PATCH /api/notifications/:id/read`<br>`PATCH /api/notifications/read-all` |
| **Mobile Bottom Nav** (`.mobile-bottom-nav`) | 6 primary tabs: Home, Items, Smart List (highlighted), Cart (live count badge), Orders, Account. Correct active state on all pages; line-height $\ge 1.3$ for Devanagari. | `client/js/ui.js` |
| **PWA & Offline** | Dismissible install banner (respects localStorage `kirana_pwa_dismissed`), offline page with direct dial button (`tel:+919860924504`). | `client/js/pwa.js`<br>`client/sw.js` |

---

### 1.4 API Contract Table (Customer Endpoints)

| Method & Frontend URL | Source File:Line | Backend Express Route | Controller | Middleware | Contract Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `POST /api/auth/login` | `login.html:162` | `POST /api/auth/login` | `authController.login` | Public | **OK** |
| `POST /api/auth/register` | `register.html:204` | `POST /api/auth/register` | `authController.register` | Public | **OK** |
| `GET /api/settings/public` | `checkout.js:80` | `GET /api/settings/public` | `settingsController.getPublicSettings` | Public | **OK** |
| `GET /api/categories` | `catalog.js:37` | `GET /api/categories` | `categoryController.getCategories` | Public | **OK** |
| `GET /api/products` | `catalog.js:44` | `GET /api/products` | `productController.getProducts` | Public | **OK** |
| `GET /api/products/bestsellers` | `catalog.js:297` | `GET /api/products/best-sellers` | `productController.getBestSellers` | Public | **Route Slug Mismatch** (`bestsellers` vs `best-sellers`) |
| `GET /api/products/offers` | `catalog.js:330` | `GET /api/products/offers` | `productController.getOffers` | Public | **OK** |
| `GET /api/testimonials` | `catalog.js:383` | `GET /api/testimonials` | `testimonialController.getApproved` | Public | **OK** |
| `POST /api/ai/parse-list` | `ai-order.js:223` | `POST /api/ai/parse-list` | `aiController.parseGroceryList` | Rate limiter | **OK** |
| `POST /api/ai/log-add-result` | `ai-order.js:589` | `POST /api/ai/log-add-result` | `aiController.logAddResult` | Public | **OK** |
| `GET /api/addresses` | `checkout.js:99` | `GET /api/addresses` | `addressController.getAddresses` | `verifyToken` | **OK** |
| `POST /api/addresses` | `checkout.js:471` | `POST /api/addresses` | `addressController.createAddress` | `verifyToken` | **OK** |
| `POST /api/orders` | `checkout.js:541` | `POST /api/orders` | `orderController.createOrder` | `verifyToken` | **OK** |
| `GET /api/orders` | `orders.js:180` | `GET /api/orders` | `orderController.getMyOrders` | `verifyToken` | **OK** |
| `PATCH /api/orders/:id/cancel` | `orders.js:417` | `PATCH /api/orders/:id/cancel` | `orderController.cancelOrder` | `verifyToken` | **OK** |
| `POST /api/orders/:id/substitutions/:subId/respond` | `orders.js:442` | `POST /api/orders/:id/substitutions/:subId/respond` | `orderController.respondToSubstitution` | `verifyToken` | **OK** |
| `POST /api/orders/:id/reorder` | `orders.js:462` | `POST /api/orders/:id/reorder` | `orderController.reorder` | `verifyToken` | **OK** |
| `GET /api/udhar/my-account` | `checkout.js:58` | `GET /api/udhar/my-account` | `udharController.getMyAccount` | `verifyToken` | **OK** |
| `POST /api/udhar/request` | `orders.js:152` | `POST /api/udhar/request` | `udharController.requestCreditAccount` | `verifyToken` | **OK** |
| `GET /api/notifications` | `inbox.html:301` | `GET /api/notifications` | `notificationController.getMyNotifications` | `verifyToken` | **OK** |
| `GET /api/notifications/unread-count` | `auth.js:313` | `GET /api/notifications/unread-count` | `notificationController.getUnreadCount` | `verifyToken` | **OK** |
| `PATCH /api/notifications/:id/read` | `inbox.html:363` | `PATCH /api/notifications/:id/read` | `notificationController.markRead` | `verifyToken` | **OK** |
| `PATCH /api/notifications/read-all` | `inbox.html:378` | `PATCH /api/notifications/read-all` | `notificationController.markAllRead` | `verifyToken` | **OK** |

> **Audit Finding (Route Slug Mismatch)**: `client/js/catalog.js:297` requested `/api/products/bestsellers` (without hyphen), whereas `server/src/routes/productRoutes.js:23` defines `/api/products/best-sellers`. Alignment required in Phase 1 & 2.
