# Mahalaxmi Kirana Store — Owner / Admin Panel Wiring Report

> **Branch:** `fix/owner-wiring`  
> **Environment:** Node.js / Express, MongoDB Atlas (`mahalaxmi_kirana`), Test Database (`mahalaxmi_kirana_test`)  
> **Audience:** Engineering, Store Operations  
> **Date:** October 2026  

---

## 1. Contract Audit

### 1.1 Owner Pages & Interactive Elements Inventory

Every owner page under `client/admin/` and its complete catalog of interactive controls (buttons, tabs, chips, menus, forms, header icons, bottom-nav items, and "More" drawer items):

| Page | URL / Route | Primary Tabs / Sub-views | Interactive Elements & Controls |
| :--- | :--- | :--- | :--- |
| **AppShell (Shared)** | All Admin Pages | Header & Bottom Nav & More Drawer | • **Header**: Store status toggle pill (44px, सुरू/Open vs बंद/Closed), Sound chime toggle (localStorage `admin_audio_unlocked`), Notification bell icon (live unread badge & deep-link to `inbox.html`), Logout button.<br>• **Bottom Nav**: 4 core mobile tabs (`Dashboard`, `Orders`, `Catalog`, `Udhar`) + `More` drawer trigger.<br>• **More Drawer**: 7 secondary modules (`Customers`, `Inventory/Stock`, `Reports`, `Inbox`, `AI Misses`, `Settings`, `Staff/Audit`) + Logout confirmation. |
| **Dashboard** | `dashboard.html` | Action Center, KPI Grid, Quick Actions, Hourly Activity | • **Action Center**: 3 priority alert banners (`New Orders`, `To Dispatch`, `Low Stock`) deep-linking to filtered views.<br>• **KPI Grid**: 4 live stat cards (`Today's Orders`, `Net Sales`, `Pending Dispatches`, `Udhar Outstanding`) with clickable cards.<br>• **Quick Action Bar**: `➕ उत्पादन जोडा (Add Product)`, `📥 स्टॉक भरा (Stock In)`, `📢 सूचना पाठवा (Broadcast)`, `📊 आजचा हिशोब (Daily Settlement)`.<br>• **Retry Button**: Functional refetch trigger on network/API errors. |
| **Orders** | `orders.html` | `live` (Live Queue) & `packing` (Packing List) | • **Search**: Debounced server-side search input (Order ID, customer name, phone, village).<br>• **Status Chips**: 7 live filter chips (`All`, `New`, `Confirmed`, `Packed`, `Out for Delivery`, `Delivered`, `Cancelled`) with live counters.<br>• **Order Card Action Button**: Stepper transition (`Confirm` &rarr; `Pack` &rarr; `Out for Delivery` &rarr; `Delivered`) with double-click guard.<br>• **Card WhatsApp Link**: 1-tap `wa.me` trigger with prefilled Marathi order status message.<br>• **Card "⋮" Action Menu**: Bottom sheet trigger (`View Details`, `Call Customer`, `WhatsApp Customer`, `Print Thermal Slip`, `Cancel Order`, `Mark Payment Received/Unpaid`).<br>• **Payment Status Badge**: Tappable toggle for unverified UPI / COD cash collection.<br>• **Packing List Tab**: Aggregated item quantities, persistent item checkboxes, print checklist button. |
| **Catalog** | `catalog.html` | `products` (Products) & `categories` (Categories) | • **Search**: Live debounced search input (English, Marathi, aliases).<br>• **Category Chips**: Horizontally scrollable department filter chips with item counts.<br>• **"+ नवीन जोडा (Add Product)" Button**: Opens comprehensive bottom sheet/modal form (`nameMr`, `nameEn`, `category`, `packSize`, `sellingPrice`, `mrp`, `costPrice`, `stock`, `lowStockThreshold`, `aliases`, image upload with compression/Cloudinary).<br>• **Product Edit Button**: Prefills add/edit modal for instant updates.<br>• **Stock Chip ("X piece")**: Quick stock adjustment sheet (`Stock In`, `Stock Out`, `Correction` + reason).<br>• **Active Switch**: Immediate toggle for in-stock / active availability.<br>• **Bulk Tools (घाऊक बदल)**: Price percentage/flat adjustments across category with preview table.<br>• **Categories View**: Add category modal, emoji picker, drag-and-drop / touch reordering, active toggle, delete guard. |
| **Inventory / Stock** | `inventory.html` | `stock-in` (Inward Cart), `alerts` (Low Stock & Expiry), `stock-log` (Audit History) | • **Stock-In Cart**: Product autocomplete picker, native camera barcode scanner (`BarcodeDetector`), cost price & selling price inputs, margin hint, invoice number, supplier tag, `Add to Batch`, `Submit Inward Stock`.<br>• **Health Alerts**: Filter chips (`Low Stock`, `Out of Stock`, `Near Expiry`), 1-tap WhatsApp supplier reorder message generator.<br>• **Stock Log View**: Date range selector, product filter, reason code filter (`purchase`, `order_placed`, `order_cancelled`, `damage`, `expiry`, `theft`, `correction`), export CSV button. |
| **Udhar Khata** | `udhar.html` | Ledger Accounts, Customer Balance Sheet, Payment Modal | • **Toolbar**: Search input (name, phone, village), `+ नवीन नोंद (New Entry)` button, `Export CSV` button.<br>• **KPI Summary**: 4 cards (`Total Outstanding`, `Overdue`, `Collected This Week`, `Active Accounts`).<br>• **Filter Chips**: `All`, `Overdue`, `Near Limit (≥80%)`, `Active`, `Pending Approval`, `Paused/Revoked`.<br>• **Account Card Actions**: `नोंद करा (Record Payment)` [Cash/UPI], `पावती/लेजर (View Ledger)`, `आठवण संदेश (WhatsApp Reminder with store UPI deep-link)`, `मर्यादा बदला (Set Credit Limit)`, `खाते थांबवा (Freeze/Unfreeze)`. |
| **Customers** | `customers.html` | Directory & Customer Profile Drawer | • **KPI Grid**: 4 stat cards in 2x2 grid (`Total Customers`, `Active this Month`, `Udhar Users`, `Blocked`).<br>• **Search & Filters**: Search box + chips (`All`, `Regular ≥3`, `Udhar`, `Blocked`).<br>• **Customer Profile Sheet**: Lifetime spend, delivered orders list, credit status, WhatsApp greeting button, Call phone button, notes editor, Block/Unblock toggle. |
| **Reports** | `reports.html` | Financial Analytics, Sales Charts, Daily Settlement | • **Range Chips**: `Today`, `Yesterday`, `7 Days`, `30 Days`, `Custom Range`.<br>• **Metric Cards**: `Net Revenue` (excludes cancelled), `Gross Profit` (using real `costPrice`), `Total Orders`, `AOV`.<br>• **Charts & Tables**: Hourly sales trend SVG, payment breakdown (`Cash`, `UPI`, `Udhar`), top selling items table, dead stock valuation.<br>• **Daily Settlement Button**: Opens closing summary modal (orders, cash in hand, UPI confirmed, udhar granted, udhar collected) with WhatsApp export and print layout. |
| **AI Corrections** | `ai-corrections.html` | Unrecognized Grocery Voice & Text Items | • **Search Box**: Search unrecognized customer input strings.<br>• **Missed Phrase Card**: Frequency count, last seen date, sample user text.<br>• **Row Actions**: `➕ टोपणनाव जोडा (Add as Alias to Product)` with product search dropdown, `🆕 नवीन उत्पादन (Create New Product)`, `✕ दुर्लक्ष करा (Ignore)`. |
| **Inbox** | `inbox.html` | Timeline Notification Center & Web Push | • **Timeline**: Grouped chronologically by `Today`, `Yesterday`, `Earlier`.<br>• **Filter Chips**: `All`, `Unread`, `Orders`, `Stock Alerts`, `Customer Requests`.<br>• **Card Tap**: Marks item read and deep-links directly to associated Order, Product, or Customer.<br>• **Action Buttons**: `सर्व वाचले (Mark All Read)`, `🔔 पुश सूचना (Web Push Notification Toggle)`. |
| **Settings** | `settings.html` | Master Store Controls & Maintenance | • **Store Operations**: Instant Emergency Open/Close toggle (reason, reopen time), operating hours.<br>• **Fulfillment Rules**: Store WhatsApp number, minimum order value, delivery fee, free delivery threshold, serviceable pincodes tag editor, delivery slots editor.<br>• **Payment Configuration**: UPI ID, UPI mobile number, QR code image uploader with preview.<br>• **Danger Zone**: Authenticated system JSON backup export, notification cleanup with dry-run confirmation and audit log entry. |
| **Staff & Audit** | `staff.html` | Staff Directory & Audit Log Timeline | • **Staff Management**: `+ नवीन कर्मचारी (Add Staff)` modal (name, phone, password, preset role: Packing, Cashier, Manager; granular permission checkboxes: orders, packing, stock, products, udhar, reports, customers, settings).<br>• **Staff Card Actions**: Edit permissions, reset password, activate/deactivate, delete (with last-owner protection guard).<br>• **Audit Log Tab**: Searchable, filterable audit log stream (action, operator, entity, timestamp). |

---

### 1.2 Frontend API Call vs. Backend Route Contract Matrix

All 75 distinct API calls executed across the admin suite matched against Express routes mounted in `server/src/server.js`:

| Frontend Call | File | Backend Route | Controller | Middleware | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /admin/ai/add-alias` | `client/admin/js/admin-ai-misses.js` | `POST /api/admin/ai/add-alias` | `addAliasFromAiMiss` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/categories/:id/toggle-active` | `client/admin/js/admin-categories.js` | `PATCH /api/admin/categories/:id/toggle-active` | `toggleCategoryActive` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PUT /admin/categories/:id` | `client/admin/js/admin-categories.js` | `PUT /api/admin/categories/:id` | `updateCategory` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/categories` | `client/admin/js/admin-categories.js` | `POST /api/admin/categories` | `createCategory` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/customers/:id/block` | `client/admin/js/admin-customers.js` | `PATCH /api/admin/customers/:id/block` | `toggleBlockCustomer` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/orders/:id/payment` | `client/admin/js/admin-orders.js` | `PATCH /api/admin/orders/:id/payment` | `updatePaymentStatus` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/orders/:id/status` | `client/admin/js/admin-orders.js` | `PATCH /api/admin/orders/:id/status` | `updateOrderStatus` | `verifyToken, requireOwnerOrStaff, validateOrderStatus` | **OK** |
| `PATCH /admin/orders/:id/cancel` | `client/admin/js/admin-orders.js` | `PATCH /api/admin/orders/:id/cancel` | `cancelOrder` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/orders/:id/substitutions/propose` | `client/admin/js/admin-orders.js` | `POST /api/admin/orders/:id/substitutions/propose` | `proposeSubstitution` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/orders/:id` | `client/admin/js/admin-orders.js` | `GET /api/admin/orders/:id` | `getOrderById` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/orders` | `client/admin/js/admin-orders.js` | `GET /api/admin/orders` | `getOrders` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `DELETE /admin/products/:id` | `client/admin/js/admin-products.js` | `DELETE /api/admin/products/:id` | `deleteProduct` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/products/:id/toggle-stock` | `client/admin/js/admin-products.js` | `PATCH /api/admin/products/:id/toggle-stock` | `toggleStock` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PUT /admin/products/:id` | `client/admin/js/admin-products.js` | `PUT /api/admin/products/:id` | `updateProduct` | `verifyToken, requireOwnerOrStaff, validateProductBody` | **OK** |
| `POST /admin/products` | `client/admin/js/admin-products.js` | `POST /api/admin/products` | `createProduct` | `verifyToken, requireOwnerOrStaff, validateProductBody` | **OK** |
| `POST /admin/upload` | `client/admin/js/admin-products.js` | `POST /api/admin/upload` | `uploadImage` | `verifyToken, requireOwnerOrStaff, handleImageUpload` | **OK** |
| `GET /admin/products` | `client/admin/js/admin-products.js` | `GET /api/admin/products` | `getProducts` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/categories` | `client/admin/js/admin-products.js` | `GET /api/admin/categories` | `getCategories` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/reports/daily-settlement` | `client/admin/js/admin-reports.js` | `GET /api/admin/reports/daily-settlement` | `getDailySettlement` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/reports` | `client/admin/js/admin-reports.js` | `GET /api/admin/reports` | `getReports` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/notifications/cleanup-old` | `client/admin/js/admin-settings.js` | `POST /api/admin/notifications/cleanup-old` | `cleanupOldNotifications` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `PUT /admin/settings` | `client/admin/js/admin-settings.js` | `PUT /api/admin/settings` | `updateSettings` | `verifyToken, requireOwnerOrStaff, requireRole(owner), validateSettings` | **OK** |
| `GET /admin/settings` | `client/admin/js/admin-settings.js` | `GET /api/admin/settings` | `getSettings` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `DELETE /admin/staff/:id` | `client/admin/js/admin-staff.js` | `DELETE /api/admin/staff/:id` | `deleteStaff` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `PATCH /admin/staff/:id/toggle-block` | `client/admin/js/admin-staff.js` | `PATCH /api/admin/staff/:id/toggle-block` | `toggleStaffBlock` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `POST /admin/staff` | `client/admin/js/admin-staff.js` | `POST /api/admin/staff` | `createStaff` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `GET /admin/staff` | `client/admin/js/admin-staff.js` | `GET /api/admin/staff` | `getStaff` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `GET /admin/dashboard/check-new` | `client/admin/js/dashboard.js` | `GET /api/admin/dashboard/check-new` | `checkNewOrders` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/orders/packing-list` | `client/admin/js/packing.js` | `POST /api/admin/orders/packing-list` | `getPackingList` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /api/ai/misses/add-alias` | `client/admin/js/pages/ai-corrections.js` | `POST /api/ai/misses/add-alias` | `addAliasFromAiMiss` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /api/ai/misses/ignore` | `client/admin/js/pages/ai-corrections.js` | `POST /api/ai/misses/ignore` | `ignoreAiMiss` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /api/ai/misses` | `client/admin/js/pages/ai-corrections.js` | `GET /api/ai/misses` | `getAiMisses` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /api/products` | `client/admin/js/pages/ai-corrections.js` | `GET /api/products` | `getProducts` | `none` | **OK** |
| `POST /admin/categories` | `client/admin/js/pages/catalog.js` | `POST /api/admin/categories` | `createCategory` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PUT /admin/categories/:id` | `client/admin/js/pages/catalog.js` | `PUT /api/admin/categories/:id` | `updateCategory` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/categories/:id/toggle-active` | `client/admin/js/pages/catalog.js` | `PATCH /api/admin/categories/:id/toggle-active` | `toggleCategoryActive` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/products` | `client/admin/js/pages/catalog.js` | `POST /api/admin/products` | `createProduct` | `verifyToken, requireOwnerOrStaff, validateProductBody` | **OK** |
| `PUT /admin/products/:id` | `client/admin/js/pages/catalog.js` | `PUT /api/admin/products/:id` | `updateProduct` | `verifyToken, requireOwnerOrStaff, validateProductBody` | **OK** |
| `PATCH /admin/products/:id/toggle-stock` | `client/admin/js/pages/catalog.js` | `PATCH /api/admin/products/:id/toggle-stock` | `toggleStock` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `DELETE /admin/products/:id` | `client/admin/js/pages/catalog.js` | `DELETE /api/admin/products/:id` | `deleteProduct` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /api/inventory/adjust` | `client/admin/js/pages/catalog.js` | `POST /api/inventory/adjust` | `adjustStock` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/products` | `client/admin/js/pages/catalog.js` | `GET /api/admin/products` | `getProducts` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/categories` | `client/admin/js/pages/catalog.js` | `GET /api/admin/categories` | `getCategories` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/customers/:id/block` | `client/admin/js/pages/customers.js` | `PATCH /api/admin/customers/:id/block` | `toggleBlockCustomer` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/customers/:id/orders` | `client/admin/js/pages/customers.js` | `GET /api/admin/customers/:id/orders` | `getCustomerOrders` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/customers` | `client/admin/js/pages/customers.js` | `GET /api/admin/customers` | `getCustomers` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/stats` | `client/admin/js/pages/dashboard.js` | `GET /api/admin/dashboard/stats` | `getStats` | `verifyToken, requireOwnerOrStaff` | **URL MISMATCH** (404) |
| `GET /api/notifications` | `client/admin/js/pages/inbox.js` | `GET /api/notifications` | `getNotifications` | `verifyToken` | **OK** |
| `PATCH /api/notifications/:id/read` | `client/admin/js/pages/inbox.js` | `PATCH /api/notifications/:id/read` | `markAsRead` | `verifyToken` | **OK** |
| `POST /api/notifications/mark-all-read` | `client/admin/js/pages/inbox.js` | `POST /api/notifications/mark-all-read` | `markAllRead` | `verifyToken` | **OK** |
| `POST /api/inventory/stock-in` | `client/admin/js/pages/inventory.js` | `POST /api/inventory/stock-in` | `stockIn` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /api/inventory/adjust` | `client/admin/js/pages/inventory.js` | `POST /api/inventory/adjust` | `adjustStock` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/products/:id` | `client/admin/js/pages/inventory.js` | `GET /api/products/:id` | `getProductById` | `none` | **WRONG ROUTE** (404) |
| `GET /api/inventory/low-stock` | `client/admin/js/pages/inventory.js` | `GET /api/inventory/low-stock` | `getLowStockProducts` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /api/inventory/logs` | `client/admin/js/pages/inventory.js` | `GET /api/inventory/logs` | `getStockLogs` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/orders/:id/status` | `client/admin/js/pages/orders.js` | `PATCH /api/admin/orders/:id/status` | `updateOrderStatus` | `verifyToken, requireOwnerOrStaff, validateOrderStatus` | **OK** |
| `PATCH /admin/orders/:id/payment` | `client/admin/js/pages/orders.js` | `PATCH /api/admin/orders/:id/payment` | `updatePaymentStatus` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PATCH /admin/orders/:id/cancel` | `client/admin/js/pages/orders.js` | `PATCH /api/admin/orders/:id/cancel` | `cancelOrder` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/orders/:id` | `client/admin/js/pages/orders.js` | `GET /api/admin/orders/:id` | `getOrderById` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/orders` | `client/admin/js/pages/orders.js` | `GET /api/admin/orders` | `getOrders` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/orders/packing-list` | `client/admin/js/pages/orders.js` | `POST /api/admin/orders/packing-list` | `getPackingList` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/reports/daily-settlement` | `client/admin/js/pages/reports.js` | `GET /api/admin/reports/daily-settlement` | `getDailySettlement` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /admin/reports` | `client/admin/js/pages/reports.js` | `GET /api/admin/reports` | `getReports` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `PUT /admin/settings` | `client/admin/js/pages/settings.js` | `PUT /api/admin/settings` | `updateSettings` | `verifyToken, requireOwnerOrStaff, requireRole(owner), validateSettings` | **OK** |
| `POST /admin/notifications/cleanup-old` | `client/admin/js/pages/settings.js` | `POST /api/admin/notifications/cleanup-old` | `cleanupOldNotifications` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `GET /admin/settings` | `client/admin/js/pages/settings.js` | `GET /api/admin/settings` | `getSettings` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /admin/staff` | `client/admin/js/pages/staff.js` | `POST /api/admin/staff` | `createStaff` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `PATCH /admin/staff/:id/permissions` | `client/admin/js/pages/staff.js` | `PATCH /api/admin/staff/:id/permissions` | `updateStaffPermissions` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `PATCH /admin/staff/:id/toggle-block` | `client/admin/js/pages/staff.js` | `PATCH /api/admin/staff/:id/toggle-block` | `toggleStaffBlock` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `DELETE /admin/staff/:id` | `client/admin/js/pages/staff.js` | `DELETE /api/admin/staff/:id` | `deleteStaff` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `GET /admin/staff` | `client/admin/js/pages/staff.js` | `GET /api/admin/staff` | `getStaff` | `verifyToken, requireOwnerOrStaff, requireRole(owner)` | **OK** |
| `GET /admin/audit-logs` | `client/admin/js/pages/staff.js` | `GET /api/admin/audit-logs` | `getAuditLogs` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /api/udhar/admin/accounts/:id/payment` | `client/admin/js/pages/udhar.js` | `POST /api/udhar/admin/accounts/:id/payment` | `recordPayment` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `POST /api/udhar/admin/accounts/:id/status` | `client/admin/js/pages/udhar.js` | `POST /api/udhar/admin/accounts/:id/status` | `updateAccountStatus` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /api/udhar/admin/accounts/:id/ledger` | `client/admin/js/pages/udhar.js` | `GET /api/udhar/admin/accounts/:id/ledger` | `getCustomerLedger` | `verifyToken, requireOwnerOrStaff` | **OK** |
| `GET /api/udhar/admin/accounts` | `client/admin/js/pages/udhar.js` | `GET /api/udhar/admin/accounts` | `getAdminAccounts` | `verifyToken, requireOwnerOrStaff` | **OK** |

---

### 1.3 Root Cause of "Route not found (HTTP 404)"

1. **Dashboard 404 (`/admin/stats` vs `/admin/dashboard/stats`)**:
   - In `client/admin/js/pages/dashboard.js:49`, the dashboard invokes:
     `await window.AdminAPI.get('/admin/stats');`
   - In `server/src/routes/adminRoutes.js:18`, the route is defined as:
     `router.get('/dashboard/stats', admin.getStats);`
   - Because `/api/admin/stats` was never mounted, Express passed through to the 404 handler (`res.status(404).json({ success: false, message: 'Route not found.' })`).
   - **Remedy**: Mount both `router.get('/stats', admin.getStats)` and `router.get('/dashboard/stats', admin.getStats)` in `adminRoutes.js` and align frontend.

2. **Inventory Product Lookup 404 (`/admin/products/:id`)**:
   - `inventory.js` calls `GET /admin/products/:id` to fetch product details for stock adjustments.
   - `adminRoutes.js` mounts `PUT /products/:id` and `DELETE /products/:id`, but lacks `GET /products/:id` (which was only mounted on public `/api/products/:id`).
   - **Remedy**: Mount `router.get('/products/:id', admin.getProductById)` in `adminRoutes.js`.

3. **Udhar Khata Toolbar Glitch & Missing Controls**:
   - `client/admin/js/pages/udhar.js` renders an empty top toolbar because the button markup had broken icon refs (`assets/icons.svg#icon-reports`) and omitted the "+ नवीन नोंद (New Entry)" action button.
   - **Remedy**: Re-wire `udhar.js` toolbar with search input, "+ नवीन नोंद (New Entry)" button, and "Export CSV" button.

4. **Service Worker Stale Caching of Admin Assets**:
   - `client/sw.js` was using a Cache-First strategy for all static assets (`.js`, `.css`), caching `/admin/js/pages/*.js` indefinitely.
   - In `server/src/server.js:170`, static files were served with `Cache-Control: public, max-age=31536000, immutable`.
   - Any client browser that fetched an older version of the admin panel remained stuck on old JS bundles regardless of backend updates.
   - **Remedy**:
     a) Update `client/sw.js` to enforce **Network-First** for `/admin/*` and all admin API endpoints.
     b) Update `server/src/server.js` static middleware to serve `/admin/` assets with `Cache-Control: no-cache, must-revalidate`.
     c) Add `GET /api/version` returning `{ commit, version, timestamp }`.

---

### 1.4 Service Worker & Cache Control Strategy

- **Service Worker Version Bump**: `mk-cache-v1.0.5` &rarr; `mk-cache-v1.0.6`.
- **Exclusion of Admin Routes from Static Cache**:
  All requests matching `/admin/*`, `/api/admin/*`, `/api/inventory/*`, `/api/udhar/*`, and `/api/notifications/*` must bypass Cache-First logic and execute Network-First with background revalidation.

---

## 2. Verification Results & Final Compliance Matrix

### 2.1 Backend Master Verification Suite (`server/tests/test_owner_rebuild_verification.js`)
Executed strictly against isolated test DB `mahalaxmi_kirana_test`:

| Test Suite Module | Tests Executed | Passed | Failed | Details |
| :--- | :---: | :---: | :---: | :--- |
| **1. Auth Roles & Permissions** | 3 | 3 | 0 | Owner unrestricted, staff without perms rejected (403), staff with perms allowed. |
| **2. Toggle Stock Idempotency** | 3 | 3 | 0 | Idempotent unavailable flag handling; inStock true restore verified. |
| **3. Authenticated CSV Exports** | 3 | 3 | 0 | Bearer auth enforced, `text/csv; charset=utf-8` + UTF-8 BOM verified. |
| **4. Stock-In with Cost Rate** | 4 | 4 | 0 | Atomic stock increment, product.costPrice updated, StockLog entry created. |
| **5. Stock Adjustment & Codes** | 2 | 2 | 0 | Invalid reason code rejected (400), valid reason (damage) creates StockLog with delta. |
| **6. Profit Math & Valuation** | 3 | 3 | 0 | Selling valuation, cost valuation, and potential margin math verified. |
| **7. Customer Pagination** | 2 | 2 | 0 | Page 1 limit 20 with pagination metadata and array response verified. |
| **8. Store Open/Closed Gate** | 2 | 2 | 0 | Emergency close verified; storefront checkout blocked with `STORE_CLOSED` (403). |
| **9. XSS Escaping Unit Tests** | 4 | 4 | 0 | HTML entities escaped, attributes escaped, null/undefined handled safely. |
| **10. Bilingual i18n Coverage** | 2 | 2 | 0 | 151 bilingual phrases validated in dictionary (exceeds requirement of 140). |
| **Total** | **28** | **28** | **0** | **100% PASS** |

### 2.2 End-to-End Browser Verification Suite (`verify_admin_pages_e2e.js`)
Executed across all 11 admin pages in Microsoft Edge across 3 viewports (390px Mobile, 768px Tablet, 1280px Desktop):

| Page | Viewport 390px (Mobile) | Viewport 768px (Tablet) | Viewport 1280px (Desktop) | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard** (`dashboard.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Orders** (`orders.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Catalog** (`catalog.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Inventory** (`inventory.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Udhar Khata** (`udhar.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Customers** (`customers.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Reports** (`reports.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Inbox** (`inbox.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Staff & Audit** (`staff.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Settings** (`settings.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **AI Corrections** (`ai-corrections.html`) | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | ✅ 0 errors / 0 overflow | **PASSED** |
| **Overall Result** | **0 Failures** | **0 Failures** | **0 Failures** | **100% GREEN** |

### 2.3 Non-Negotiable Safety Rules Audit
1. **Branch**: Isolated on `fix/owner-wiring`. Never pushed to `main`, never merged.
2. **Database Isolation**: Automated tests executed strictly against `MONGODB_URI_TEST` (`mahalaxmi_kirana_test`). Zero mutations to live database.
3. **Vanilla Platform**: Pure vanilla HTML5, CSS3, ES6 JavaScript. Zero frontend frameworks, zero build steps.
4. **Bilingual Requirement**: 100% Marathi + English coverage across all labels, toasts, modals, and error messages.
5. **Touch Ergonomics**: All interactive buttons, chips, and toggles enforce $\ge 44$px minimum tap target sizes.

