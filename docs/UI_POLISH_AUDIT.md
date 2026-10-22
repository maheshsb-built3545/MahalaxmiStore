# UI Polish Audit — Mahalaxmi Kirana Store
**Phase 1 — Comprehensive Read-Only Audit (No Code Modified)**  
**Date:** 2026-10-22 | **Branch:** `main` | **Target Platform:** Mobile-First Web App & PWA  
**Scan Scope:** `client/` (HTML, JS, CSS, i18n/*.json) + `server/seed/*.js`  
**Total Emoji Occurrences Found:** 632 lines across 56 files  

---

## Table of Contents
1. [Audit Summary & Breakdown](#1-audit-summary--breakdown)
2. [Comprehensive Emoji Inventory by File](#2-comprehensive-emoji-inventory-by-file)
3. [Heavy Text & Redundancy Audit](#3-heavy-text--redundancy-audit)
4. [Proposed SVG Icon Sprite Specification](#4-proposed-svg-icon-sprite-specification)
5. [Category-to-Icon Mapping Matrix](#5-category-to-icon-mapping-matrix)
6. [Intentional Exceptions](#6-intentional-exceptions)
7. [Phase 2 & Phase 3 Execution Plan](#7-phase-2--phase-3-execution-plan)

---

## 1. Audit Summary & Breakdown

| File | Emoji Occurrences | Primary Contexts |
| :--- | :---: | :--- |
| `client/admin/js/pages/catalog.js` | **41** | UI text / component icon, Empty state illustration, Button (Add/New) |
| `server/seed/seed.js` | **40** | Seed script, Seed DB field (category/product), Server seed log |
| `client/index.html` | **35** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `client/admin/js/components/shell.js` | **31** | UI text / component icon, Filter chip / Status badge |
| `client/admin/js/pages/orders.js` | **29** | Empty state illustration, Button label, UI text / component icon |
| `client/admin/js/pages/udhar.js` | **27** | UI text / component icon, Filter chip / Status badge, Phone contact link |
| `server/seed/seedDemo.js` | **24** | Seed script, Seed DB field (category/product), Server seed log |
| `client/admin/js/pages/inventory.js` | **22** | Button (Add/New), UI text / component icon, Empty state illustration |
| `client/admin/js/admin-common.js` | **21** | UI text / component icon, Navigation link, Button label |
| `client/admin/js/pages/staff.js` | **21** | UI text / component icon, Filter chip / Status badge, Phone contact link |
| `client/js/ui.js` | **21** | UI text / component icon, Button (Close/Cancel), Toast alert message |
| `client/account.html` | **20** | Filter chip / Status badge, UI text / component icon, Button (Close/Cancel) |
| `client/admin/js/pages/reports.js` | **20** | UI text / component icon |
| `client/js/orders.js` | **19** | Toast alert message, Heading / Title, UI text / component icon |
| `client/admin/js/pages/customers.js` | **18** | UI text / component icon, Filter chip / Status badge, Phone contact link |
| `client/inbox.html` | **15** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `client/admin/js/pages/dashboard.js` | **14** | UI text / component icon, Button (Add/New), Button label |
| `client/admin/js/pages/settings.js` | **14** | UI text / component icon, Button (Close/Cancel) |
| `client/admin/js/pages/inbox.js` | **13** | UI text / component icon, Button label |
| `client/js/catalog.js` | **12** | UI text / component icon, Category / Filter chip, WhatsApp CTA / link |
| `client/js/checkout.js` | **12** | UI text / component icon, Toast alert message |
| `client/admin/js/admin-orders.js` | **11** | UI text / component icon, Navigation link, Phone contact link |
| `client/checkout.html` | **11** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `client/admin/js/admin-settings.js` | **9** | UI text / component icon, Rating indicator, Password visibility toggle |
| `client/admin/js/core/toast.js` | **9** | Toast alert message |
| `client/admin/js/admin-udhar.js` | **8** | UI text / component icon |
| `client/js/ai-order.js` | **8** | UI text / component icon, Button (Close/Cancel), Filter chip / Status badge |
| `client/order-confirmation.html` | **8** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `client/register.html` | **8** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `server/seed/seedOwner.js` | **7** | Seed script, Server seed log |
| `client/admin/inventory.html` | **6** | UI text / component icon |
| `client/admin/orders.html` | **6** | UI text / component icon |
| `client/js/auth.js` | **6** | Toast alert message, UI text / component icon, Filter chip / Status badge |
| `client/login.html` | **6** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `client/admin/catalog.html` | **5** | UI text / component icon |
| `client/admin/js/admin-categories.js` | **5** | UI text / component icon |
| `client/admin/js/admin-products.js` | **5** | UI text / component icon |
| `client/admin/js/components/empty-state.js` | **4** | Empty state illustration |
| `client/admin/js/core/i18n.js` | **4** | i18n dictionary value |
| `client/admin/js/pages/ai-corrections.js` | **4** | UI text / component icon |
| `client/orders.html` | **4** | UI text / component icon, Phone contact link, Filter chip / Status badge |
| `client/admin/js/admin-staff.js` | **3** | UI text / component icon |
| `client/admin/js/packing.js` | **3** | Heading / Title, UI text / component icon |
| `client/offline.html` | **3** | UI text / component icon |
| `client/privacy.html` | **3** | UI text / component icon, Heading / Title |
| `client/admin/dashboard.html` | **2** | UI text / component icon |
| `client/admin/js/admin-ai-misses.js` | **2** | UI text / component icon |
| `client/admin/js/components/filter-bar.js` | **2** | UI text / component icon, Button (Close/Cancel) |
| `client/admin/js/core/api.js` | **2** | UI text / component icon |
| `client/admin/js/core/net.js` | **2** | UI text / component icon |
| `client/admin/js/dashboard.js` | **2** | UI text / component icon, Phone contact link |
| `client/admin/js/admin-customers.js` | **1** | Phone contact link |
| `client/admin/js/admin-reports.js` | **1** | UI text / component icon |
| `client/admin/js/components/bottom-sheet.js` | **1** | UI text / component icon |
| `client/admin/js/components/data-list.js` | **1** | UI text / component icon |
| `client/js/pwa.js` | **1** | Toast alert message |

**Grand Total:** 632 emoji instances across 56 files.

---

## 2. Comprehensive Emoji Inventory by File

> Table columns: **Line** (source line number), **Emoji** (detected Unicode glyph), **Current Text Snippet** (trimmed representation), **Where / Context** (UI placement), **Proposed Replacement** (SVG symbol or removal).

### `client/admin/js/pages/catalog.js` (41 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 137 | `🏷 ️` | `<span>${c.emoji \|\| '🏷️'} ${window.esc(c.nameMr \|\| c.nameEn)}` | UI text / component icon | SVG icon or clean text |
| 177 | `🏷 ️` | `<div class="empty-state-icon">🏷️</div>` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 180 | `➕` | `<button type="button" class="btn btn-primary" onclick="openProduc` | Button (Add/New) | SVG #plus icon |
| 217 | `✏ ️` | `${v} ${p.unitType \|\| 'piece'} ✏️` | UI text / component icon | SVG icon or clean text |
| 226 | `🚫 ✅` | `${flag ? '🚫 बंद / Out' : '✅ सुरू / In Stock'}` | UI text / component icon | SVG icon or clean text |
| 235 | `✏ ️` | `<button type="button" class="btn btn-sm btn-secondary" onclick="o` | Button (Edit) | SVG #edit icon |
| 236 | `📦` | `<button type="button" class="btn btn-sm btn-outline" onclick="ope` | Button label | SVG icon + short label |
| 270 | `✏ ️` | `${isOut ? 'साठा संपला ✏️' : `${p.stockQuantity} ${p.unitType \|\|` | UI text / component icon | SVG icon or clean text |
| 273 | `🚫 ✅` | `${p.unavailableFlag ? '🚫 बंद' : '✅ चालू'}` | UI text / component icon | SVG icon or clean text |
| 277 | `✏ ️` | `✏️ बदला (Edit)` | UI text / component icon | SVG icon or clean text |
| 324 | `📥` | `<button type="button" class="btn btn-secondary active" id="btnMod` | Button label | SVG icon + short label |
| 325 | `📉` | `<button type="button" class="btn btn-secondary" id="btnModeOut" o` | Button label | SVG icon + short label |
| 326 | `✏ ️` | `<button type="button" class="btn btn-secondary" id="btnModeSet" o` | Button (Edit) | SVG #edit icon |
| 354 | `✅` | `<button type="submit" class="btn btn-primary" id="saveQuickAdjust` | Button (Save/Confirm) | SVG #check icon |
| 359 | `📦` | `stockAdjustSheet.setTitle(`📦 साठा दुरुस्ती — ${window.esc(p.name` | UI text / component icon | SVG icon or clean text |
| 430 | `✅` | `window.AdminToast.show('✅ साठा यशस्वीरीत्या अद्यतनित केला! / Stoc` | UI text / component icon | SVG icon or clean text |
| 435 | `✅` | `saveBtn.textContent = '✅ साठा जतन करा (Save)';` | UI text / component icon | SVG icon or clean text |
| 496 | `📷` | `📷 फोटो निवडा / कॅमेरा (Upload Image)` | UI text / component icon | SVG icon or clean text |
| 532 | `🏷 ️` | `${allCategories.map((c) => `<option value="${c._id}" ${p && (p.ca` | UI text / component icon | SVG icon or clean text |
| 584 | `🗑 ️` | `🗑️ हटवा (Delete)` | UI text / component icon | SVG icon or clean text |
| 590 | `✅` | `<button type="submit" class="btn btn-primary" id="saveProductBtn"` | Button (Save/Confirm) | SVG #check icon |
| 596 | `✏ ️ ➕` | `productModal.setTitle(id ? '✏️ उत्पादन बदला (Edit Product)' : '➕ ` | UI text / component icon | SVG icon or clean text |
| 623 | `⏳` | `if (statusEl) statusEl.textContent = '⏳ फोटो कॉम्प्रेस व अपलोड हो` | UI text / component icon | SVG icon or clean text |
| 634 | `✅` | `if (statusEl) statusEl.textContent = '✅ फोटो अपलोड यशस्वी! / Uplo` | UI text / component icon | SVG icon or clean text |
| 639 | `❌` | `if (statusEl) statusEl.textContent = `❌ अपलोड अयशस्वी: ${err.mess` | UI text / component icon | SVG icon or clean text |
| 693 | `✅` | `window.AdminToast.show('✅ उत्पादन यशस्वीरीत्या जतन झाले!', 'succe` | UI text / component icon | SVG icon or clean text |
| 733 | `🏷 ️` | `<h2 style="font-size:1.15rem;margin:0;">🏷️ वर्ग व्यवस्थापन (Cate` | Heading / Title | Remove decorative emoji; clean concise heading |
| 737 | `➕` | `➕ नवीन वर्ग (Add Category)` | UI text / component icon | SVG icon or clean text |
| 748 | `🏷 ️` | `<span style="font-size:1.5rem;">${c.emoji \|\| '🏷️'}</span>` | UI text / component icon | SVG icon or clean text |
| 758 | `✏ ️` | `<button type="button" class="btn btn-sm btn-outline" onclick="ope` | Button (Edit) | SVG #edit icon |
| 759 | `🗑 ️` | `<button type="button" class="btn btn-sm btn-outline" style="color` | Button (Delete) | SVG #trash icon |
| 798 | `🏷 ️` | `<input type="text" class="form-input" id="formCatEmoji" value="${` | UI text / component icon | SVG icon or clean text |
| 816 | `✅` | `<button type="submit" class="btn btn-primary" id="saveCatBtn">✅ ज` | Button (Save/Confirm) | SVG #check icon |
| 821 | `✏ ️ ➕` | `categoryModal.setTitle(id ? '✏️ वर्ग बदला (Edit Category)' : '➕ न` | UI text / component icon | SVG icon or clean text |
| 827 | `🏷 ️` | `const emoji = body.querySelector('#formCatEmoji').value.trim() \|` | UI text / component icon | SVG icon or clean text |
| 843 | `✅` | `if (window.AdminToast) window.AdminToast.show('✅ वर्ग जतन केला!',` | UI text / component icon | SVG icon or clean text |
| 885 | `⚖ ️` | `<h3 style="font-size:1.15rem;margin-bottom:8px;">⚖️ घाऊक दर बदल स` | Heading / Title | Remove decorative emoji; clean concise heading |
| 894 | `🏷 ️` | `${allCategories.map((c) => `<option value="${c._id}">${c.emoji \|` | UI text / component icon | SVG icon or clean text |
| 920 | `🔍` | `🔍 बदल तपासा व जतन करा (Confirm & Apply)` | UI text / component icon | SVG icon or clean text |
| 1028 | `🔍` | `submitBtn.textContent = '🔍 बदल तपासा व जतन करा (Confirm & Apply)` | UI text / component icon | SVG icon or clean text |
| 1032 | `✅` | `window.AdminToast.show(`✅ ${count} उत्पादनांचे दर यशस्वीरीत्या बद` | UI text / component icon | SVG icon or clean text |

### `server/seed/seed.js` (40 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 17 | `❌` | `console.error('❌  FATAL: Seeding is blocked in production environ` | Seed script | Icon name string |
| 29 | `🌾` | `{ nameEn: 'Atta & Grains',   nameMr: 'आटा आणि धान्य',     emoji: ` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 30 | `🫘` | `{ nameEn: 'Dals & Pulses',   nameMr: 'डाळ आणि कडधान्ये',  emoji: ` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 31 | `🫒` | `{ nameEn: 'Oils & Ghee',     nameMr: 'तेल आणि तूप',        emoji:` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 32 | `🥛` | `{ nameEn: 'Dairy & Drinks',  nameMr: 'दूध आणि पेये',       emoji:` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 33 | `🌶 ️` | `{ nameEn: 'Spices',          nameMr: 'मसाले',               emoji` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 34 | `🍪` | `{ nameEn: 'Snacks',          nameMr: 'नाश्ता',              emoji` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 35 | `🥤` | `{ nameEn: 'Beverages',       nameMr: 'पेये',                emoji` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 36 | `🧽` | `{ nameEn: 'Home Care',       nameMr: 'घरगुती काळजी',        emoji` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 37 | `🧴` | `{ nameEn: 'Personal Care',   nameMr: 'वैयक्तिक काळजी',     emoji:` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 38 | `✏ ️` | `{ nameEn: 'Stationery',      nameMr: 'स्टेशनरी',            emoji` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 43 | `🌾` | `{ c: 'Atta & Grains',  nameEn: 'Wheat Atta',        nameMr: 'गहू ` | Seed script | Icon name string |
| 44 | `🍚` | `{ c: 'Atta & Grains',  nameEn: 'Basmati Rice',      nameMr: 'बासम` | Seed script | Icon name string |
| 45 | `🍬` | `{ c: 'Atta & Grains',  nameEn: 'Sugar',             nameMr: 'साखर` | Seed script | Icon name string |
| 47 | `🫘` | `{ c: 'Dals & Pulses',  nameEn: 'Toor Dal',          nameMr: 'तूर ` | Seed script | Icon name string |
| 48 | `🫛` | `{ c: 'Dals & Pulses',  nameEn: 'Moong Dal',         nameMr: 'मूग ` | Seed script | Icon name string |
| 50 | `🫒` | `{ c: 'Oils & Ghee',    nameEn: 'Sunflower Oil',     nameMr: 'सूर्` | Seed script | Icon name string |
| 51 | `🧈` | `{ c: 'Oils & Ghee',    nameEn: 'Cow Ghee',          nameMr: 'गाय ` | Seed script | Icon name string |
| 53 | `🥛` | `{ c: 'Dairy & Drinks', nameEn: 'Toned Milk',        nameMr: 'टोन्` | Seed script | Icon name string |
| 54 | `🍶` | `{ c: 'Dairy & Drinks', nameEn: 'Curd',              nameMr: 'दही'` | Seed script | Icon name string |
| 56 | `🌶 ️` | `{ c: 'Spices',         nameEn: 'Turmeric Powder',   nameMr: 'हळद ` | Seed script | Icon name string |
| 57 | `🌶 ️` | `{ c: 'Spices',         nameEn: 'Red Chilli Powder', nameMr: 'लाल ` | Seed script | Icon name string |
| 59 | `🍪` | `{ c: 'Snacks',         nameEn: 'Namkeen Mix',       nameMr: 'नमकी` | Seed script | Icon name string |
| 60 | `🍪` | `{ c: 'Snacks',         nameEn: 'Biscuits Pack',     nameMr: 'बिस्` | Seed script | Icon name string |
| 62 | `🥤` | `{ c: 'Beverages',      nameEn: 'Cold Drink',        nameMr: 'कोल्` | Seed script | Icon name string |
| 63 | `🍵` | `{ c: 'Beverages',      nameEn: 'Tea Powder',        nameMr: 'चहा ` | Seed script | Icon name string |
| 65 | `🧽` | `{ c: 'Home Care',      nameEn: 'Dish Wash Bar',     nameMr: 'भांड` | Seed script | Icon name string |
| 66 | `🧼` | `{ c: 'Home Care',      nameEn: 'Detergent Powder',  nameMr: 'कपडे` | Seed script | Icon name string |
| 68 | `🧴` | `{ c: 'Personal Care',  nameEn: 'Toothpaste',        nameMr: 'टूथप` | Seed script | Icon name string |
| 69 | `🧼` | `{ c: 'Personal Care',  nameEn: 'Bath Soap',         nameMr: 'आंघो` | Seed script | Icon name string |
| 71 | `📓` | `{ c: 'Stationery',     nameEn: 'Notebook',          nameMr: 'वही'` | Seed script | Icon name string |
| 72 | `✏ ️` | `{ c: 'Stationery',     nameEn: 'Pen Set',           nameMr: 'पेन ` | Seed script | Icon name string |
| 80 | `✅` | `console.log('✅  Connected to MongoDB');` | Server seed log | Intentional exception (developer console log) |
| 85 | `🗑 ️` | `console.log('🗑️   Cleared existing categories and products');` | Server seed log | Intentional exception (developer console log) |
| 91 | `📂` | `console.log(`📂  Inserted ${insertedCats.length} categories`);` | Server seed log | Intentional exception (developer console log) |
| 117 | `📦` | `console.log(`📦  Inserted ${insertedProds.length} products`);` | Server seed log | Intentional exception (developer console log) |
| 137 | `⚙ ️` | `console.log('⚙️   Created initial Settings with Stage 2 default p` | Server seed log | Intentional exception (developer console log) |
| 139 | `️` | `console.log('ℹ️   Settings already exist; preserved existing conf` | Server seed log | Intentional exception (developer console log) |
| 142 | `🌱` | `console.log('\n🌱  Catalog & Settings seed complete!');` | Server seed log | Intentional exception (developer console log) |
| 144 | `❌` | `console.error('❌  Seed failed:', err.message);` | Seed script | Icon name string |

### `client/index.html` (35 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 84 | `⚡` | `<span>⚡ 30-min delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 85 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 100 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 104 | `⌘` | `<span class="kbd hide-mobile">⌘K</span>` | UI text / component icon | SVG icon or clean text |
| 105 | `✕` | `<button type="button" class="search-close-btn" id="searchCloseBtn` | Button (Close/Cancel) | SVG #close icon |
| 115 | `🔍` | `<button type="button" class="search-toggle-btn mobile-only" id="s` | Button label | SVG icon + short label |
| 119 | `🛒` | `🛒 <span class="hide-mobile">Cart</span><span class="badge" id="c` | Filter chip / Status badge | SVG icon / styled status badge |
| 132 | `🏪` | `<div class="trust hero-animate-1">🏪 येसगाव व कोपरगावचे विश्वासू ` | UI text / component icon | SVG icon or clean text |
| 154 | `📸` | `<p>📸 हाताने लिहिलेली यादी आहे? फोटो पाठवा — आम्ही सामान भरून ठेव` | UI text / component icon | SVG icon or clean text |
| 165 | `✨` | `<span class="ai-hint-icon">✨</span>` | UI text / component icon | SVG icon or clean text |
| 171 | `✕` | `<button type="button" id="dismissAiHintBtn" class="ai-hint-dismis` | Button (Close/Cancel) | SVG #close icon |
| 177 | `✨` | `<span class="ai-smart-badge">✨ Smart AI List • स्मार्ट यादी</span` | Filter chip / Status badge | SVG icon / styled status badge |
| 191 | `💡` | `<span class="ai-pills-label">💡 उदाहरणे (क्लिक करा):</span>` | UI text / component icon | SVG icon or clean text |
| 211 | `🎙 ️` | `<span class="voice-icon">🎙️</span>` | UI text / component icon | SVG icon or clean text |
| 219 | `✨` | `<span class="ai-btn-text">यादी तपासा • Build Cart ✨</span>` | Button label | SVG icon + short label |
| 240 | `⚡` | `<span id="aiFallbackBadge" class="badge-fallback" style="display:` | Filter chip / Status badge | SVG icon / styled status badge |
| 247 | `✅` | `<h4 class="ai-group-heading">✅ ओळखलेल्या वस्तू (<span id="aiMatch` | Heading / Title | Remove decorative emoji; clean concise heading |
| 253 | `⚠ ️` | `<h4 class="ai-group-heading amber">⚠️ नक्की कोणती वस्तू हवी आहे? ` | Heading / Title | Remove decorative emoji; clean concise heading |
| 259 | `❓` | `<h4 class="ai-group-heading gray">❓ कॅटलॉगमध्ये थेट न सापडलेल्या ` | Heading / Title | Remove decorative emoji; clean concise heading |
| 271 | `🛒` | `🛒 सर्व वस्तू कार्टमध्ये जोडा (Add All to Cart) →` | UI text / component icon | SVG icon or clean text |
| 297 | `🏪` | `<span class="photo-tag">🏪 Store front</span>` | UI text / component icon | SVG icon or clean text |
| 307 | `📦` | `<span class="photo-tag">📦 Inside</span>` | UI text / component icon | SVG icon or clean text |
| 333 | `📍` | `<div class="info-row"><span class="ic">📍</span><div><b>Address</` | UI text / component icon | SVG icon or clean text |
| 334 | `⏰` | `<div class="info-row"><span class="ic">⏰</span><div><b>Hours</b><` | UI text / component icon | SVG icon or clean text |
| 335 | `📞` | `<div class="info-row"><span class="ic">📞</span><div><b>Phone</b>` | Phone contact link | SVG #phone icon |
| 336 | `🛵` | `<div class="info-row"><span class="ic">🛵</span><div><b>Delivery<` | UI text / component icon | SVG icon or clean text |
| 337 | `💳` | `<div class="info-row"><span class="ic">💳</span><div><b>Payment</` | UI text / component icon | SVG icon or clean text |
| 340 | `📍` | `<a href="https://www.google.com/maps/search/?api=1&query=19.90256` | Map/Location link | SVG #map-pin icon |
| 341 | `📞` | `<a href="tel:+919860924504" class="btn btn-gold store-btn">📞 Cal` | Button (Call) | SVG #phone icon |
| 364 | `🔥` | `<h2>🔥 सर्वाधिक पसंतीची उत्पादने <span style="color:#5b7a6f;font-` | Heading / Title | Remove decorative emoji; clean concise heading |
| 398 | `💬` | `<h2>💬 ग्राहकांचे मनोगत <span style="color:#5b7a6f;font-weight:50` | Heading / Title | Remove decorative emoji; clean concise heading |
| 413 | `🔒` | `<a href="privacy.html" style="color:inherit;text-decoration:under` | Navigation link | SVG icon or text |
| 423 | `✨` | `<a href="#aiOrderBox" class="drawer-ai-link" onclick="ui.closeCar` | Navigation link | SVG icon or text |
| 425 | `✕` | `<button id="closeCartBtn" aria-label="Close cart">✕</button>` | Button (Close/Cancel) | SVG #close icon |
| 444 | `💬` | `<a class="fab" id="fabWa" href="#" target="_blank" rel="noopener"` | Navigation link | SVG icon or text |

### `client/admin/js/components/shell.js` (31 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 71 | `📊` | `{ id: 'dashboard', href: 'dashboard.html', icon: '📊', label: 'डॅ` | UI text / component icon | SVG icon or clean text |
| 72 | `📦` | `{ id: 'orders', href: 'orders.html', icon: '📦', label: 'ऑर्डर्स ` | Filter chip / Status badge | SVG icon / styled status badge |
| 73 | `📥` | `{ id: 'inventory', href: 'inventory.html', icon: '📥', label: 'स्` | Filter chip / Status badge | SVG icon / styled status badge |
| 79 | `🏷 ️` | `{ id: 'catalog', href: 'catalog.html', icon: '🏷️', label: 'उत्पा` | UI text / component icon | SVG icon or clean text |
| 80 | `📝` | `{ id: 'udhar', href: 'udhar.html', icon: '📝', label: 'उधारी वही ` | UI text / component icon | SVG icon or clean text |
| 81 | `👥` | `{ id: 'customers', href: 'customers.html', icon: '👥', label: 'ग्` | UI text / component icon | SVG icon or clean text |
| 87 | `📈` | `{ id: 'reports', href: 'reports.html', icon: '📈', label: 'अहवाल ` | UI text / component icon | SVG icon or clean text |
| 88 | `🤖` | `{ id: 'ai-corrections', href: 'ai-corrections.html', icon: '🤖', ` | UI text / component icon | SVG icon or clean text |
| 89 | `🔔` | `{ id: 'inbox', href: 'inbox.html', icon: '🔔', label: 'सूचना / In` | Filter chip / Status badge | SVG icon / styled status badge |
| 90 | `⚙ ️` | `{ id: 'settings', href: 'settings.html', icon: '⚙️', label: 'सेटि` | UI text / component icon | SVG icon or clean text |
| 91 | `👤` | `{ id: 'staff', href: 'staff.html', icon: '👤', label: 'कर्मचारी /` | UI text / component icon | SVG icon or clean text |
| 132 | `🏪` | `<span class="sidebar-brand-icon">🏪</span>` | UI text / component icon | SVG icon or clean text |
| 154 | `🚪` | `🚪` | UI text / component icon | SVG icon or clean text |
| 179 | `🔊` | `🔊` | UI text / component icon | SVG icon or clean text |
| 184 | `🔔` | `🔔` | UI text / component icon | SVG icon or clean text |
| 210 | `📊` | `<span class="tab-icon">📊</span>` | Filter chip / Status badge | SVG icon / styled status badge |
| 214 | `📦` | `<span class="tab-icon">📦</span>` | Filter chip / Status badge | SVG icon / styled status badge |
| 219 | `📥` | `<span class="tab-icon">📥</span>` | Filter chip / Status badge | SVG icon / styled status badge |
| 223 | `📝` | `<span class="tab-icon">📝</span>` | Filter chip / Status badge | SVG icon / styled status badge |
| 227 | `☰` | `<span class="tab-icon">☰</span>` | Filter chip / Status badge | SVG icon / styled status badge |
| 277 | `🏷 ️` | `{ href: 'catalog.html', icon: '🏷️', label: 'उत्पादने व वर्ग (Cat` | UI text / component icon | SVG icon or clean text |
| 278 | `👥` | `{ href: 'customers.html', icon: '👥', label: 'ग्राहक व्यवस्थापन (` | UI text / component icon | SVG icon or clean text |
| 279 | `📈` | `{ href: 'reports.html', icon: '📈', label: 'अहवाल व नफा (Reports)` | UI text / component icon | SVG icon or clean text |
| 280 | `🤖` | `{ href: 'ai-corrections.html', icon: '🤖', label: 'AI सुधारणा (AI` | UI text / component icon | SVG icon or clean text |
| 281 | `🔔` | `{ href: 'inbox.html', icon: '🔔', label: 'सूचना व संदेश (Inbox)' ` | UI text / component icon | SVG icon or clean text |
| 282 | `⚙ ️` | `{ href: 'settings.html', icon: '⚙️', label: 'दुकान सेटिंग्ज (Sett` | UI text / component icon | SVG icon or clean text |
| 283 | `👤` | `{ href: 'staff.html', icon: '👤', label: 'कर्मचारी व्यवस्थापन (St` | UI text / component icon | SVG icon or clean text |
| 385 | `✅ 🛑` | `window.AdminToast.show(nextState ? '✅ दुकान सुरू केले / Store Ope` | UI text / component icon | SVG icon or clean text |
| 390 | `❌` | `window.AdminToast.show('❌ Error: ' + err.message, 'danger');` | UI text / component icon | SVG icon or clean text |
| 432 | `🔇 🔊` | `audioBtn.innerHTML = isMuted ? '🔇' : '🔊';` | UI text / component icon | SVG icon or clean text |
| 443 | `🔇 🔊` | `audioBtn.innerHTML = next ? '🔇' : '🔊';` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/pages/orders.js` (29 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 148 | `⚠ ️` | `<div class="empty-state-icon">⚠️</div>` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 215 | `📦` | `<div class="empty-state-icon">📦</div>` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 260 | `⚙ ️` | `return `<button type="button" onclick="event.stopPropagation(); w` | Button label | SVG icon + short label |
| 327 | `✓` | `` : '<span class="text-sm font-semibold" style="color:#16a34a;fle` | UI text / component icon | SVG icon or clean text |
| 330 | `💬` | `💬` | UI text / component icon | SVG icon or clean text |
| 378 | `👁 ️` | `👁️ संपूर्ण ऑर्डर तपशील / View Order Details` | Password visibility toggle | SVG #eye / #eye-off icon or text |
| 382 | `📞` | `📞 ग्राहकाला कॉल करा / Call Customer (${phone})` | UI text / component icon | SVG icon or clean text |
| 385 | `💬` | `💬 WhatsApp वर संदेश पाठवा / WhatsApp Customer` | UI text / component icon | SVG icon or clean text |
| 389 | `🖨 ️` | `🖨️ थर्मल पावती प्रिंट / Print Slip` | UI text / component icon | SVG icon or clean text |
| 392 | `💳` | `💳 पेमेंट स्थिती बदला / Payment Actions (${order.paymentStatus \|` | UI text / component icon | SVG icon or clean text |
| 396 | `❌` | `❌ ऑर्डर रद्द करा / Cancel Order (Restore Stock)` | UI text / component icon | SVG icon or clean text |
| 434 | `✅` | `✅ पेमेंट जमा झाले / Mark Paid (Verified)` | UI text / component icon | SVG icon or clean text |
| 437 | `⏳` | `⏳ पेमेंट बाकी / Mark Unpaid (Pending)` | UI text / component icon | SVG icon or clean text |
| 517 | `💵` | `title: '💵 रोख रक्कम जमा (Cash Collected)',` | UI text / component icon | SVG icon or clean text |
| 526 | `📝` | `title: '📝 उधारी डिलिव्हरी (Udhar Delivery)',` | UI text / component icon | SVG icon or clean text |
| 592 | `📞` | `${phone ? `<a href="tel:${phone}" class="btn btn-sm btn-outline">` | Button (Call) | SVG #phone icon |
| 595 | `📍` | `📍 ${village}${landmark ? ` (जवळ: ${landmark})` : ''}` | UI text / component icon | SVG icon or clean text |
| 600 | `📲` | `📲 WhatsApp Customer` | UI text / component icon | SVG icon or clean text |
| 608 | `📋` | `<h3 style="font-size:0.95rem;margin-bottom:8px;">📋 साहित्याची या` | Heading / Title | Remove decorative emoji; clean concise heading |
| 647 | `🖨 ️` | `🖨️ बिल प्रिंट (Thermal Bill)` | UI text / component icon | SVG icon or clean text |
| 747 | `✅` | `window.AdminToast.show('✅ ऑर्डर रद्द करण्यात आली / Order cancelle` | UI text / component icon | SVG icon or clean text |
| 766 | `📋` | `<div class="empty-state-icon">📋</div>` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 802 | `📦` | `<h2 style="font-size:1.15rem;margin:0;">📦 आजची पॅकिंग यादी (${pa` | Heading / Title | Remove decorative emoji; clean concise heading |
| 806 | `📲` | `<button type="button" class="btn btn-sm btn-secondary" onclick="s` | Button label | SVG icon + short label |
| 807 | `🖨 ️` | `<button type="button" class="btn btn-sm btn-secondary" onclick="p` | Button (Print) | SVG #print icon |
| 808 | `📋` | `<button type="button" class="btn btn-sm btn-secondary" onclick="c` | Button label | SVG icon + short label |
| 852 | `📦` | `const lines = ['📦 महालक्ष्मी किराणा — पॅकिंग यादी:\n'];` | UI text / component icon | SVG icon or clean text |
| 858 | `📋` | `if (window.AdminToast) window.AdminToast.show('📋 पॅकिंग यादी कॉप` | UI text / component icon | SVG icon or clean text |
| 866 | `📦` | `const lines = ['📦 *महालक्ष्मी किराणा — पॅकिंग यादी (Packing List` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/pages/udhar.js` (27 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 44 | `➕` | `➕ नवीन नोंद / New Entry` | UI text / component icon | SVG icon or clean text |
| 92 | `⚠ ️` | `{ id: 'overdue', label: '⚠️ थकीत / Overdue', active: activeFilter` | UI text / component icon | SVG icon or clean text |
| 273 | `⚠ ️` | `${acc.isOverdue ? '<span class="badge badge-danger">⚠️ थकीत / Ove` | Filter chip / Status badge | SVG icon / styled status badge |
| 276 | `📍` | `<span>📍 ${AdminDOM.escape(village)}</span>` | UI text / component icon | SVG icon or clean text |
| 277 | `📞` | `${phone ? `<span>📞 <a href="tel:${phone}" style="color:var(--pri` | Phone contact link | SVG #phone icon |
| 312 | `💰` | `💰 जमा करा / Pay` | UI text / component icon | SVG icon or clean text |
| 315 | `💬` | `💬 तगादा / Reminder` | UI text / component icon | SVG icon or clean text |
| 318 | `📖` | `📖 वही / Ledger` | UI text / component icon | SVG icon or clean text |
| 321 | `⚙ ️` | `⚙️ मर्यादा / Limit` | UI text / component icon | SVG icon or clean text |
| 346 | `➕` | `➕ नवीन उधारी नोंद / New Entry` | UI text / component icon | SVG icon or clean text |
| 376 | `🛒` | `<span style="font-weight:600;font-size:0.85rem;">🛒 उधारी खरेदी (` | UI text / component icon | SVG icon or clean text |
| 380 | `💰` | `<span style="font-weight:600;font-size:0.85rem;">💰 जमा पावती (Pa` | UI text / component icon | SVG icon or clean text |
| 401 | `💵` | `<span style="font-weight:600;font-size:0.85rem;">💵 रोख (Cash)</s` | UI text / component icon | SVG icon or clean text |
| 405 | `📱` | `<span style="font-weight:600;font-size:0.85rem;">📱 UPI / ऑनलाईन<` | UI text / component icon | SVG icon or clean text |
| 424 | `✓` | `✓ नोंद जतन करा / Save Entry` | UI text / component icon | SVG icon or clean text |
| 480 | `✓` | `submitBtn.textContent = '✓ नोंद जतन करा / Save Entry';` | UI text / component icon | SVG icon or clean text |
| 495 | `💰` | `💰 जमा पावती नोंदवा / Record Payment` | UI text / component icon | SVG icon or clean text |
| 531 | `💵` | `<span style="font-weight:600;font-size:0.85rem;">💵 रोख (Cash)</s` | UI text / component icon | SVG icon or clean text |
| 535 | `📱` | `<span style="font-weight:600;font-size:0.85rem;">📱 UPI / ऑनलाईन<` | UI text / component icon | SVG icon or clean text |
| 554 | `✓` | `✓ जमा पावती नोंदवा / Save Payment` | UI text / component icon | SVG icon or clean text |
| 608 | `✓` | `submitBtn.textContent = '✓ जमा पावती नोंदवा / Save Payment';` | UI text / component icon | SVG icon or clean text |
| 637 | `💬` | `💬 उधारी तगादा संदेश / Payment Reminder` | UI text / component icon | SVG icon or clean text |
| 656 | `📋` | `📋 संदेश कॉपी करा / Copy Text` | UI text / component icon | SVG icon or clean text |
| 682 | `📖` | `📖 उधारी हिशोब वही / Ledger History` | UI text / component icon | SVG icon or clean text |
| 690 | `💬` | `💬 WhatsApp शेअर` | UI text / component icon | SVG icon or clean text |
| 693 | `🖨 ️` | `🖨️ प्रिंट / Print` | UI text / component icon | SVG icon or clean text |
| 820 | `⚙ ️` | `⚙️ खाते स्थिती व मर्यादा / Status & Limit` | UI text / component icon | SVG icon or clean text |

### `server/seed/seedDemo.js` (24 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 19 | `❌` | `console.error('❌ FATAL: MONGODB_URI_TEST is not set in server/.en` | Seed script | Icon name string |
| 24 | `❌` | `console.error('❌ FATAL: MONGODB_URI_TEST must not equal productio` | Seed script | Icon name string |
| 43 | `🌾` | `{ nameEn: 'Atta & Grains', nameMr: 'आटा आणि धान्य', emoji: '🌾', ` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 44 | `🫘` | `{ nameEn: 'Dals & Pulses', nameMr: 'डाळ आणि कडधान्ये', emoji: '🫘` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 45 | `🫒` | `{ nameEn: 'Oils & Ghee', nameMr: 'तेल आणि तूप', emoji: '🫒', sort` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 46 | `🥛` | `{ nameEn: 'Dairy & Drinks', nameMr: 'दूध आणि पेये', emoji: '🥛', ` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 47 | `🌶 ️` | `{ nameEn: 'Spices', nameMr: 'मसाले', emoji: '🌶️', sortOrder: 5 }` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 48 | `🍪` | `{ nameEn: 'Snacks & Biscuits', nameMr: 'नाश्ता आणि बिस्किटे', emo` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 49 | `🧽` | `{ nameEn: 'Cleaning & Home', nameMr: 'स्वच्छता आणि घरगुती', emoji` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 50 | `🧴` | `{ nameEn: 'Personal Care', nameMr: 'वैयक्तिक स्वच्छता', emoji: '�` | Seed DB field (category/product) | Change to SVG icon name string (e.g. "grains", "dals") |
| 107 | `🌱` | `console.log('🌱 SEEDING DEMO DATASET FOR OWNER PANEL REBUILD');` | Server seed log | Intentional exception (developer console log) |
| 113 | `✅` | `console.log(`✅ Connected to DB: "${currentDb}"`);` | Server seed log | Intentional exception (developer console log) |
| 116 | `❌` | `console.error(`❌ FATAL: Connected to database "${currentDb}" whic` | Seed script | Icon name string |
| 121 | `🧹` | `console.log('🧹 Purging prior test collections...');` | Server seed log | Intentional exception (developer console log) |
| 135 | `📦` | `console.log('📦 Seeding Categories...');` | Server seed log | Intentional exception (developer console log) |
| 141 | `🛍 ️` | `console.log('🛍️ Seeding 34 Products...');` | Server seed log | Intentional exception (developer console log) |
| 171 | `✓` | `console.log(`✓ Inserted ${createdProducts.length} products.`);` | Server seed log | Intentional exception (developer console log) |
| 174 | `🧑 💼` | `console.log('🧑‍💼 Seeding Store Owner & 2 Staff accounts...');` | Server seed log | Intentional exception (developer console log) |
| 203 | `👥` | `console.log('👥 Seeding 10 Customers...');` | Server seed log | Intentional exception (developer console log) |
| 230 | `📝` | `console.log('📝 Seeding 5 Udhar Accounts & Ledgers...');` | Server seed log | Intentional exception (developer console log) |
| 265 | `📦` | `console.log('📦 Seeding 15 Orders in diverse statuses...');` | Server seed log | Intentional exception (developer console log) |
| 334 | `🔔` | `console.log('🔔 Seeding System Notifications...');` | Server seed log | Intentional exception (developer console log) |
| 360 | `⚙ ️` | `console.log('⚙️ Ensuring Store Settings in Test DB...');` | Server seed log | Intentional exception (developer console log) |
| 380 | `🎉` | `console.log('🎉 DEMO DATASET SEEDING COMPLETE FOR TEST DB!');` | Server seed log | Intentional exception (developer console log) |

### `client/admin/js/pages/inventory.js` (22 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 122 | `➕` | `<button type="button" class="btn btn-sm btn-primary" onclick="add` | Button (Add/New) | SVG #plus icon |
| 157 | `📥` | `window.AdminToast.show(`📥 ${p.nameMr \|\| p.nameEn} साठ्यात जोडण` | UI text / component icon | SVG icon or clean text |
| 173 | `📥` | `<div class="empty-state-icon">📥</div>` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 204 | `✕` | `<button type="button" class="btn btn-sm btn-secondary" onclick="r` | Button (Close/Cancel) | SVG #close icon |
| 276 | `⏳` | `btn.textContent = '⏳ साठा जतन होत आहे / Saving...';` | Button label | SVG icon + short label |
| 298 | `✅` | `btn.textContent = '✅ सर्व साठा जतन करा (Save All Stock)';` | Button (Save/Confirm) | SVG #check icon |
| 305 | `✅` | `window.AdminToast.show(`✅ ${successCount} उत्पादनांचा साठा यशस्वी` | UI text / component icon | SVG icon or clean text |
| 317 | `📷` | `title: '📷 बारकोड स्कॅनर (Scan Barcode)',` | UI text / component icon | SVG icon or clean text |
| 407 | `⚠ ️` | `<h2 style="font-size:1.15rem;margin:0;">⚠️ साठा इशारे व पुनर्खरेद` | Heading / Title | Remove decorative emoji; clean concise heading |
| 411 | `📲` | `📲 पुरवठादार ऑर्डर तयार करा` | UI text / component icon | SVG icon or clean text |
| 417 | `🛑` | `<h3 style="font-size:0.95rem;color:#dc2626;margin-bottom:8px;">🛑` | Heading / Title | Remove decorative emoji; clean concise heading |
| 427 | `⚠ ️` | `<h3 style="font-size:0.95rem;color:#d97706;margin-bottom:8px;">⚠️` | Heading / Title | Remove decorative emoji; clean concise heading |
| 437 | `📅` | `<h3 style="font-size:0.95rem;color:#c2410c;margin-bottom:8px;">📅` | Heading / Title | Remove decorative emoji; clean concise heading |
| 475 | `📥` | `📥 स्टॉक भरा` | UI text / component icon | SVG icon or clean text |
| 510 | `📋` | `const lines = ['📋 महालक्ष्मी किराणा — पुरवठादार माल ऑर्डर यादी:\` | UI text / component icon | SVG icon or clean text |
| 519 | `📋` | `window.AdminToast.show('📋 पुरवठादार ऑर्डर यादी कॉपी केली! (Copie` | UI text / component icon | SVG icon or clean text |
| 543 | `📝` | `<h2 style="font-size:1.15rem;margin:0;">📝 स्टॉक नोंदवही व दुरुस्` | Heading / Title | Remove decorative emoji; clean concise heading |
| 548 | `📥` | `📥 CSV डाऊनलोड` | UI text / component icon | SVG icon or clean text |
| 551 | `⚖ ️` | `⚖️ साठा दुरुस्ती (Adjust)` | UI text / component icon | SVG icon or clean text |
| 587 | `⚖ ️` | `title: '⚖️ साठा दुरुस्ती नोंद (Stock Adjustment)',` | UI text / component icon | SVG icon or clean text |
| 626 | `✅` | `<button type="submit" class="btn btn-primary" style="margin-top:1` | Button (Save/Confirm) | SVG #check icon |
| 655 | `✅` | `window.AdminToast.show('✅ साठा दुरुस्ती यशस्वीरीत्या नोंदवली!', '` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-common.js` (21 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 167 | `🔊` | `enableBtn.textContent = '🔊 Enable Sound / आवाज सुरू करा';` | UI text / component icon | SVG icon or clean text |
| 177 | `🔇 🔊` | `muteBtn.textContent = isMuted ? '🔇 Unmute' : '🔊 Mute Sound';` | UI text / component icon | SVG icon or clean text |
| 275 | `🏪` | `🏪 <span>Mahalaxmi ${currentLang === 'mr' ? 'व्यवस्थापन' : 'Admin` | UI text / component icon | SVG icon or clean text |
| 278 | `📊` | `<li><a href="dashboard.html" class="${activePage === 'dashboard' ` | Navigation link | SVG icon or text |
| 279 | `🔔` | `<li><a href="inbox.html" class="${activePage === 'inbox' ? 'activ` | Navigation link | SVG icon or text |
| 280 | `📦` | `<li><a href="orders.html" class="${activePage === 'orders' ? 'act` | Navigation link | SVG icon or text |
| 281 | `📝` | `<li><a href="udhar.html" class="${activePage === 'udhar' ? 'activ` | Navigation link | SVG icon or text |
| 282 | `📈` | `<li><a href="reports.html" class="${activePage === 'reports' ? 'a` | Navigation link | SVG icon or text |
| 283 | `📥` | `<li><a href="stock-in.html" class="${activePage === 'stock-in' ? ` | Navigation link | SVG icon or text |
| 284 | `⚠ ️` | `<li><a href="low-stock.html" class="${activePage === 'low-stock' ` | Navigation link | SVG icon or text |
| 285 | `🏷 ️` | `<li><a href="products.html" class="${activePage === 'products' ? ` | Navigation link | SVG icon or text |
| 286 | `🤖` | `<li><a href="ai-misses.html" class="${activePage === 'ai-misses' ` | Navigation link | SVG icon or text |
| 287 | `🧑 💼` | `${isOwner ? `<li><a href="staff.html" class="${activePage === 'st` | Navigation link | SVG icon or text |
| 288 | `⚙ ️` | `<li><a href="settings.html" class="${activePage === 'settings' ? ` | Navigation link | SVG icon or text |
| 292 | `🌐` | `🌐 ${currentLang === 'mr' ? 'English' : 'मराठी'}` | UI text / component icon | SVG icon or clean text |
| 295 | `🌐` | `<a href="../index.html" class="btn-storefront" target="_blank" ti` | Button label | SVG icon + short label |
| 317 | `📊` | `<span class="icon">📊</span>` | UI text / component icon | SVG icon or clean text |
| 321 | `🔔` | `<span class="icon">🔔</span>` | UI text / component icon | SVG icon or clean text |
| 325 | `📦` | `<span class="icon">📦</span>` | UI text / component icon | SVG icon or clean text |
| 329 | `⚠ ️` | `<span class="icon">⚠️</span>` | UI text / component icon | SVG icon or clean text |
| 333 | `⚙ ️` | `<span class="icon">⚙️</span>` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/pages/staff.js` (21 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 19 | `📦` | `{ id: 'orders_view', label: '📦 ऑर्डर्स व पॅकिंग पाहणे / View Ord` | UI text / component icon | SVG icon or clean text |
| 20 | `🚚` | `{ id: 'orders_status', label: '🚚 ऑर्डर स्थिती पुढे नेणे / Advanc` | UI text / component icon | SVG icon or clean text |
| 21 | `💰` | `{ id: 'udhar_payments', label: '💰 उधारी जमा घेणे / Take Udhar Pa` | UI text / component icon | SVG icon or clean text |
| 22 | `📦` | `{ id: 'stock_manage', label: '📦 साठा भरणे व फेरफार / Inward Stoc` | UI text / component icon | SVG icon or clean text |
| 23 | `🏷 ️` | `{ id: 'catalog_edit', label: '🏷️ उत्पादने व किंमत बदल / Edit Cat` | UI text / component icon | SVG icon or clean text |
| 24 | `📈` | `{ id: 'reports_view', label: '📈 नफा व विक्री अहवाल / View Profit` | UI text / component icon | SVG icon or clean text |
| 25 | `👥` | `{ id: 'customers_manage', label: '👥 ग्राहक व्यवस्थापन / Manage C` | UI text / component icon | SVG icon or clean text |
| 45 | `🔒` | `<span style="font-size:3rem;line-height:1;">🔒</span>` | UI text / component icon | SVG icon or clean text |
| 79 | `️` | `<span>ℹ️</span>` | UI text / component icon | SVG icon or clean text |
| 89 | `👥` | `👥 ${t('nav_staff')}` | UI text / component icon | SVG icon or clean text |
| 92 | `📜` | `📜 ${t('staff_audit_feed')}` | UI text / component icon | SVG icon or clean text |
| 192 | `🚫` | `${isBlocked ? '<span class="badge badge-danger">🚫 ब्लॉक / Blocke` | Filter chip / Status badge | SVG icon / styled status badge |
| 195 | `📞` | `📞 <a href="tel:${s.phone}" style="color:var(--primary);font-weig` | Phone contact link | SVG #phone icon |
| 214 | `⚙ ️` | `⚙️ अधिकार बदला / Permissions` | UI text / component icon | SVG icon or clean text |
| 217 | `✓ 🚫` | `${isBlocked ? '✓ अनब्लॉक' : '🚫 ब्लॉक'}` | UI text / component icon | SVG icon or clean text |
| 220 | `🗑 ️` | `🗑️ काढा` | UI text / component icon | SVG icon or clean text |
| 289 | `⚙ ️` | `⚙️ कर्मचारी अधिकार बदला (Edit Permissions)` | UI text / component icon | SVG icon or clean text |
| 351 | `➕` | `➕ ${t('staff_add_title')}` | UI text / component icon | SVG icon or clean text |
| 400 | `✓` | `✓ खाते तयार करा / Create Staff` | UI text / component icon | SVG icon or clean text |
| 437 | `✓` | `submitBtn.textContent = '✓ खाते तयार करा / Create Staff';` | UI text / component icon | SVG icon or clean text |
| 476 | `👤` | `👤 ${AdminDOM.escape(log.actor?.name \|\| 'Unknown')} <span style` | UI text / component icon | SVG icon or clean text |

### `client/js/ui.js` (21 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 72 | `⚠ ️` | `closedBanner.innerHTML = `⚠️ दुकान सध्या बंद आहे (${s.closureReas` | UI text / component icon | SVG icon or clean text |
| 110 | `📞` | `announcePhone.textContent = `📞 +91 ${displayPhone}`;` | UI text / component icon | SVG icon or clean text |
| 118 | `🔥` | `el.textContent = '🔥 विशेष सवलत • Limited Deal';` | UI text / component icon | SVG icon or clean text |
| 291 | `🔐` | `<span class="login-sheet-icon">🔐</span>` | UI text / component icon | SVG icon or clean text |
| 302 | `✕` | `<button type="button" class="login-sheet-close" id="loginPromptCl` | Button (Close/Cancel) | SVG #close icon |
| 305 | `✨` | `<span class="reassurance-sparkle">✨</span>` | UI text / component icon | SVG icon or clean text |
| 422 | `🛒` | `const icon = el('div', '', '🛒');` | UI text / component icon | SVG icon or clean text |
| 451 | `🛒` | `itemImg.onerror = () => { itemImg.replaceWith(el('div', 'em', p.e` | UI text / component icon | SVG icon or clean text |
| 454 | `🛒` | `const emEl = el('div', 'em', p.emoji \|\| '🛒');` | UI text / component icon | SVG icon or clean text |
| 514 | `🎉` | `? '🎉 मोफत डिलिव्हरी लागू! / Free Delivery Unlocked!'` | UI text / component icon | SVG icon or clean text |
| 542 | `⚠ ️` | `⚠️ दुकान सध्या बंद आहे (${s.closureReason \|\| 'तात्पुरते बंद'}).` | UI text / component icon | SVG icon or clean text |
| 546 | `⚠ ️` | `⚠️ किमान ऑर्डर रक्कम ₹${minOrder} आहे. कृपया अजून ₹${minOrder - s` | UI text / component icon | SVG icon or clean text |
| 578 | `⚠ ️` | `showToast('⚠️ दुकान सध्या बंद आहे. ऑर्डर स्वीकारणे बंद आहे. / Sto` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 584 | `⚠ ️` | `showToast(`⚠️ किमान ऑर्डर रक्कम ₹${minOrder} आहे. / Minimum order` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 828 | `✨` | `<span class="fab-icon">✨</span>` | UI text / component icon | SVG icon or clean text |
| 868 | `🏠` | `<span class="mbn-icon">🏠</span>` | UI text / component icon | SVG icon or clean text |
| 872 | `🗂 ️` | `<span class="mbn-icon">🗂️</span>` | UI text / component icon | SVG icon or clean text |
| 876 | `✨` | `<span class="mbn-icon">✨</span>` | UI text / component icon | SVG icon or clean text |
| 881 | `🛒` | `<span class="mbn-icon">🛒</span>` | UI text / component icon | SVG icon or clean text |
| 887 | `📋` | `<span class="mbn-icon">📋</span>` | UI text / component icon | SVG icon or clean text |
| 891 | `👤` | `<span class="mbn-icon">👤</span>` | UI text / component icon | SVG icon or clean text |

### `client/account.html` (20 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 182 | `🛒` | `🛒 Cart<span class="badge" id="cartBadge">0</span>` | Filter chip / Status badge | SVG icon / styled status badge |
| 196 | `✏ ️` | `✏️ नाव बदला / Edit` | UI text / component icon | SVG icon or clean text |
| 199 | `📞` | `<p class="profile-phone" id="profilePhone">📞 9876543210</p>` | UI text / component icon | SVG icon or clean text |
| 209 | `📦` | `<span class="menu-icon">📦</span>` | UI text / component icon | SVG icon or clean text |
| 219 | `🔔` | `<span class="menu-icon">🔔</span>` | UI text / component icon | SVG icon or clean text |
| 234 | `📍` | `<span class="menu-icon">📍</span>` | UI text / component icon | SVG icon or clean text |
| 244 | `📲` | `<span class="menu-icon">📲</span>` | UI text / component icon | SVG icon or clean text |
| 253 | `🌐` | `<span class="menu-icon">🌐</span>` | UI text / component icon | SVG icon or clean text |
| 262 | `💬` | `<span class="menu-icon">💬</span>` | UI text / component icon | SVG icon or clean text |
| 272 | `🔒` | `<span class="menu-icon">🔒</span>` | UI text / component icon | SVG icon or clean text |
| 286 | `🛠 ️` | `<span class="menu-icon">🛠️</span>` | UI text / component icon | SVG icon or clean text |
| 298 | `🚪` | `🚪 बाहेर पडा / Log Out` | UI text / component icon | SVG icon or clean text |
| 305 | `👤` | `<span style="font-size:3rem;display:block;margin-bottom:12px;">👤` | UI text / component icon | SVG icon or clean text |
| 327 | `💬` | `<span class="menu-icon">💬</span>` | UI text / component icon | SVG icon or clean text |
| 336 | `🔒` | `<span class="menu-icon">🔒</span>` | UI text / component icon | SVG icon or clean text |
| 356 | `✕` | `<button class="drawer-close" onclick="closeCart()" aria-label="Cl` | Button (Close/Cancel) | SVG #close icon |
| 391 | `📞` | `document.getElementById('profilePhone').textContent = `📞 ${user.` | UI text / component icon | SVG icon or clean text |
| 396 | `👑` | `roleContainer.innerHTML = '<span class="role-badge" style="backgr` | Filter chip / Status badge | SVG icon / styled status badge |
| 399 | `👔` | `roleContainer.innerHTML = '<span class="role-badge" style="backgr` | Filter chip / Status badge | SVG icon / styled status badge |
| 402 | `⭐` | `roleContainer.innerHTML = '<span class="role-badge">⭐ नियमित ग्रा` | Filter chip / Status badge | SVG icon / styled status badge |

### `client/admin/js/pages/reports.js` (20 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 69 | `📋` | `📋 आजचा हिशोब / Daily Settlement` | UI text / component icon | SVG icon or clean text |
| 103 | `📈` | `📈 विक्री व नफा / Sales & Profit` | UI text / component icon | SVG icon or clean text |
| 106 | `🏬` | `🏬 साठा मूल्य व उधारी / Valuation & Aging` | UI text / component icon | SVG icon or clean text |
| 109 | `📥` | `📥 CSV डाऊनलोड / Exports` | UI text / component icon | SVG icon or clean text |
| 280 | `⚠ ️` | `⚠️ <strong>${missingCosts} विक्री झालेल्या वस्तूंना खरेदी किंमत (` | UI text / component icon | SVG icon or clean text |
| 293 | `📈` | `📈 ${t('reports_daily_trend')}` | UI text / component icon | SVG icon or clean text |
| 308 | `🏷 ️` | `🏷️ ${t('reports_category_profit')}` | UI text / component icon | SVG icon or clean text |
| 343 | `⏰` | `⏰ ${t('reports_slot_load')}` | UI text / component icon | SVG icon or clean text |
| 381 | `🏬` | `🏬 ${t('reports_stock_valuation')}` | UI text / component icon | SVG icon or clean text |
| 433 | `⏳` | `⏳ ${t('reports_udhar_aging')}` | UI text / component icon | SVG icon or clean text |
| 487 | `📥` | `📥 अधिकृत CSV डाऊनलोड (Authenticated CSV Exports)` | UI text / component icon | SVG icon or clean text |
| 497 | `📦` | `📦 ${t('reports_export_orders')}` | UI text / component icon | SVG icon or clean text |
| 504 | `📥` | `📥 Orders CSV डाऊनलोड` | UI text / component icon | SVG icon or clean text |
| 511 | `📋` | `📋 ${t('reports_export_stock')}` | UI text / component icon | SVG icon or clean text |
| 518 | `📥` | `📥 Stock Log CSV डाऊनलोड` | UI text / component icon | SVG icon or clean text |
| 525 | `📖` | `📖 ${t('reports_export_udhar')}` | UI text / component icon | SVG icon or clean text |
| 532 | `📥` | `📥 Udhar CSV डाऊनलोड` | UI text / component icon | SVG icon or clean text |
| 564 | `📋` | `📋 आजचा दैनिक हिशोब / Daily Settlement` | UI text / component icon | SVG icon or clean text |
| 575 | `📋` | `📋 कॉपी करा / Copy Text` | UI text / component icon | SVG icon or clean text |
| 578 | `📲` | `📲 WhatsApp शेअर` | UI text / component icon | SVG icon or clean text |

### `client/js/orders.js` (19 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 62 | `🔔` | `ui.showToast(`🔔 ऑर्डर #${ord.orderNumber} स्थिती: ${meta.mr} (${` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 95 | `📝` | `<h3 style="margin:0;font-size:1.15rem;color:#04251a;">📝 माझे उधा` | Heading / Title | Remove decorative emoji; clean concise heading |
| 111 | `📜` | `📜 हिशोब पावती इतिहास दाखवा (${acc.entries.length} नोंदी)` | UI text / component icon | SVG icon or clean text |
| 147 | `📜` | `toggleBtn.textContent = isHidden ? '▲ हिशोब लपवा' : `📜 हिशोब पाव` | UI text / component icon | SVG icon or clean text |
| 153 | `⏳` | `<span style="font-size:1.8rem;">⏳</span>` | UI text / component icon | SVG icon or clean text |
| 166 | `📝` | `<h4 style="margin:0;color:#04251a;">📝 गावात राहणाऱ्या ग्राहकांसा` | Heading / Title | Remove decorative emoji; clean concise heading |
| 237 | `📦` | `icon.textContent = '📦';` | UI text / component icon | SVG icon or clean text |
| 330 | `🔄` | `<strong style="color:#78350f;">🔄 वस्तू बदल प्रस्ताव (Substitutio` | UI text / component icon | SVG icon or clean text |
| 334 | `⏳ ✓ ✕` | `${isPending ? '⏳ उत्तराची प्रतीक्षा (Pending)' : (isAccepted ? '✓` | UI text / component icon | SVG icon or clean text |
| 339 | `➔` | `&nbsp;➔&nbsp;` | UI text / component icon | SVG icon or clean text |
| 354 | `✓` | `acceptBtn.textContent = '✓ स्वीकारा (Accept)';` | UI text / component icon | SVG icon or clean text |
| 361 | `✕` | `rejectBtn.textContent = '✕ नाकारा (Reject)';` | UI text / component icon | SVG icon or clean text |
| 382 | `⏰` | `slotInfo.textContent = '⏰ ';` | UI text / component icon | SVG icon or clean text |
| 390 | `📍` | `addrInfo.textContent = '📍 ';` | UI text / component icon | SVG icon or clean text |
| 412 | `❌` | `timeline.innerHTML = '<div style="color:#dc2626;font-weight:700;"` | UI text / component icon | SVG icon or clean text |
| 420 | `✓` | `<div style="width:16px;height:16px;border-radius:50%;background:$` | UI text / component icon | SVG icon or clean text |
| 449 | `📞` | `callStore.textContent = '📞 कॉल करा / Call';` | UI text / component icon | SVG icon or clean text |
| 460 | `💬` | `waStore.textContent = '💬 WhatsApp';` | UI text / component icon | SVG icon or clean text |
| 569 | `➔` | `.map((i) => `• ${i.nameMr \|\| i.nameEn}: जुनी किंमत ₹${i.origina` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/pages/customers.js` (18 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 75 | `⭐` | `{ id: 'regular', label: '⭐ नियमित / Regular (≥3 orders)', active:` | UI text / component icon | SVG icon or clean text |
| 76 | `🌱` | `{ id: 'new', label: '🌱 नवीन / New (<30 days)', active: activeSeg` | UI text / component icon | SVG icon or clean text |
| 77 | `💤` | `{ id: 'dormant', label: '💤 सुप्त / Dormant (>30 days)', active: ` | UI text / component icon | SVG icon or clean text |
| 78 | `📖` | `{ id: 'udhar', label: '📖 उधारी ग्राहक / Udhar Users', active: ac` | UI text / component icon | SVG icon or clean text |
| 79 | `🚫` | `{ id: 'blocked', label: '🚫 ब्लॉक केलेले / Blocked', active: acti` | UI text / component icon | SVG icon or clean text |
| 213 | `🚫` | `${isBlocked ? '<span class="badge badge-danger">🚫 ब्लॉक / Blocke` | Filter chip / Status badge | SVG icon / styled status badge |
| 214 | `⭐` | `${orderCount >= 3 ? '<span class="badge badge-success">⭐ नियमित /` | Filter chip / Status badge | SVG icon / styled status badge |
| 217 | `📍` | `<span>📍 ${AdminDOM.escape(village)}</span>` | UI text / component icon | SVG icon or clean text |
| 218 | `📞` | `${phone ? `<span>📞 <a href="tel:${phone}" style="color:var(--pri` | Phone contact link | SVG #phone icon |
| 250 | `👤` | `👤 प्रोफाइल व इतिहास / Profile & Orders` | UI text / component icon | SVG icon or clean text |
| 254 | `💬` | `💬 WhatsApp` | UI text / component icon | SVG icon or clean text |
| 257 | `📞` | `📞 कॉल` | UI text / component icon | SVG icon or clean text |
| 321 | `🚫` | `${c.blocked ? '<span class="badge badge-danger">🚫 ब्लॉक / Blocke` | Filter chip / Status badge | SVG icon / styled status badge |
| 324 | `📞 📍` | `📞 ${phone} \| 📍 ${AdminDOM.escape(village)} \| भाषा: ${c.prefer` | UI text / component icon | SVG icon or clean text |
| 329 | `✓ 🚫` | `${c.blocked ? '✓ अनब्लॉक करा / Unblock' : '🚫 ब्लॉक करा / Block'}` | UI text / component icon | SVG icon or clean text |
| 408 | `🌟` | `🌟 ${t('customer_favorite_items')}` | UI text / component icon | SVG icon or clean text |
| 427 | `📍` | `📍 ${t('customer_addresses')}` | UI text / component icon | SVG icon or clean text |
| 446 | `📦` | `📦 ${t('customer_recent_orders')} (${orders.length})` | UI text / component icon | SVG icon or clean text |

### `client/inbox.html` (15 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 204 | `⚡` | `<span>⚡ 30-min grocery delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 205 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 219 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 228 | `🔔` | `<h1>🔔 संदेश आणि सूचना <span style="font-size:1rem;font-weight:50` | Heading / Title | Remove decorative emoji; clean concise heading |
| 233 | `✓` | `✓ सर्व वाचले म्हणून खूण करा (Mark All Read)` | UI text / component icon | SVG icon or clean text |
| 241 | `📲` | `<span class="bell-icon">📲</span>` | UI text / component icon | SVG icon or clean text |
| 248 | `🔔` | `🔔 सुरू करा (Enable)` | UI text / component icon | SVG icon or clean text |
| 284 | `📦` | `return '📦';` | UI text / component icon | SVG icon or clean text |
| 286 | `❌` | `return '❌';` | UI text / component icon | SVG icon or clean text |
| 288 | `⚠ ️` | `return '⚠️';` | UI text / component icon | SVG icon or clean text |
| 290 | `📢` | `return '📢';` | UI text / component icon | SVG icon or clean text |
| 293 | `💰` | `return '💰';` | UI text / component icon | SVG icon or clean text |
| 295 | `🔔` | `return '🔔';` | UI text / component icon | SVG icon or clean text |
| 330 | `📭` | `<div class="icon">📭</div>` | UI text / component icon | SVG icon or clean text |
| 354 | `✓` | `${isUnread ? `<button class="btn-inbox-action btn-inbox-read" onc` | Button (Save/Confirm) | SVG #check icon |

### `client/admin/js/pages/dashboard.js` (14 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 35 | `🔊` | `window.AdminToast.show('🔊 ऑडिओ इशारे सुरू केले / Order alert sou` | UI text / component icon | SVG icon or clean text |
| 97 | `🔔` | `icon: '🔔',` | UI text / component icon | SVG icon or clean text |
| 106 | `🚚` | `icon: '🚚',` | UI text / component icon | SVG icon or clean text |
| 115 | `⚠ ️` | `icon: '⚠️',` | UI text / component icon | SVG icon or clean text |
| 159 | `➕` | `<a href="catalog.html?action=add" class="btn btn-sm btn-primary">` | Button (Add/New) | SVG #plus icon |
| 160 | `📥` | `<a href="inventory.html?tab=stock-in" class="btn btn-sm btn-secon` | Button label | SVG icon + short label |
| 161 | `📝` | `<a href="udhar.html" class="btn btn-sm btn-secondary">📝 उधारी नो` | Button label | SVG icon + short label |
| 162 | `📋` | `<a href="orders.html?tab=packing" class="btn btn-sm btn-secondary` | Button label | SVG icon + short label |
| 177 | `💰` | `icon: '💰',` | UI text / component icon | SVG icon or clean text |
| 185 | `📦` | `icon: '📦',` | UI text / component icon | SVG icon or clean text |
| 193 | `📝` | `icon: '📝',` | UI text / component icon | SVG icon or clean text |
| 201 | `✅` | `icon: '✅',` | UI text / component icon | SVG icon or clean text |
| 219 | `🕒` | `<h3 style="font-size:1rem;margin-bottom:12px;">🕒 आजचे डिलिव्हरी ` | Heading / Title | Remove decorative emoji; clean concise heading |
| 257 | `🔥` | `<h3 style="font-size:1rem;margin-bottom:12px;">🔥 आज सर्वाधिक खपण` | Heading / Title | Remove decorative emoji; clean concise heading |

### `client/admin/js/pages/settings.js` (14 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 81 | `🏪` | `🏪 दुकान चालू / बंद स्थिती (Store Open Status)` | UI text / component icon | SVG icon or clean text |
| 129 | `🚚` | `🚚 ${t('settings_delivery_rules')}` | UI text / component icon | SVG icon or clean text |
| 164 | `📍` | `📍 ${t('settings_pincodes')} (६ अंकी भारतीय पिनकोड) *` | UI text / component icon | SVG icon or clean text |
| 176 | `⏰` | `⏰ डिलिव्हरी वेळा / स्लॉट्स (Delivery Slots - प्रति ओळ एक) *` | UI text / component icon | SVG icon or clean text |
| 185 | `💳` | `💳 UPI व पेमेंट पर्याय (Payments & UPI)` | UI text / component icon | SVG icon or clean text |
| 218 | `📁` | `📁 नवीन QR अपलोड करा (Upload QR)` | UI text / component icon | SVG icon or clean text |
| 232 | `💾` | `💾 डेटा बॅकअप व सुरक्षा (Backup & Danger Zone)` | UI text / component icon | SVG icon or clean text |
| 240 | `📦` | `<strong>📦 संपूर्ण डेटाबेस बॅकअप (Full DB Snapshot)</strong>` | UI text / component icon | SVG icon or clean text |
| 244 | `📥` | `📥 बॅकअप डाउनलोड करा / Export` | UI text / component icon | SVG icon or clean text |
| 250 | `🗑 ️` | `<strong style="color:#991b1b;">🗑️ जुन्या सूचनांची स्वच्छता (Clea` | UI text / component icon | SVG icon or clean text |
| 265 | `✓` | `✓ ${t('save')}` | UI text / component icon | SVG icon or clean text |
| 284 | `✕` | `chip.innerHTML = `${pin} <button type="button" style="border:none` | Button (Close/Cancel) | SVG #close icon |
| 371 | `📁` | `uploadBtn.textContent = '📁 नवीन QR अपलोड करा (Upload QR)';` | UI text / component icon | SVG icon or clean text |
| 474 | `✓` | `saveBtn.textContent = `✓ ${t('save')}`;` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/pages/inbox.js` (13 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 36 | `🔔` | `🔔 ${t('inbox_push_toggle')}` | UI text / component icon | SVG icon or clean text |
| 39 | `✓` | `✓ ${t('inbox_mark_all_read')}` | UI text / component icon | SVG icon or clean text |
| 47 | `🔴` | `<button type="button" class="chip" data-filter="unread">🔴 न वाचल` | Button label | SVG icon + short label |
| 48 | `📦` | `<button type="button" class="chip" data-filter="orders">📦 ऑर्डर्` | Button label | SVG icon + short label |
| 49 | `⚠ ️` | `<button type="button" class="chip" data-filter="stock">⚠️ साठा / ` | Button label | SVG icon + short label |
| 50 | `📖` | `<button type="button" class="chip" data-filter="udhar">📖 उधारी /` | Button label | SVG icon + short label |
| 220 | `📅` | `div.innerHTML = `<span>📅 ${AdminDOM.escape(title)}</span> <span ` | UI text / component icon | SVG icon or clean text |
| 263 | `🔔` | `let icon = '🔔';` | UI text / component icon | SVG icon or clean text |
| 264 | `🛒` | `if (n.type === 'order_new') icon = '🛒';` | UI text / component icon | SVG icon or clean text |
| 265 | `🚚` | `else if (n.type === 'order_status') icon = '🚚';` | UI text / component icon | SVG icon or clean text |
| 266 | `❌` | `else if (n.type === 'order_cancelled') icon = '❌';` | UI text / component icon | SVG icon or clean text |
| 267 | `⚠ ️` | `else if (n.type === 'low_stock') icon = '⚠️';` | UI text / component icon | SVG icon or clean text |
| 268 | `📖` | `else if (n.type === 'udhar_request' \|\| n.type === 'udhar_status` | UI text / component icon | SVG icon or clean text |

### `client/js/catalog.js` (12 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 60 | `🛒` | `const allEm  = el('span', 'em', '🛒');` | UI text / component icon | SVG icon or clean text |
| 137 | `🛒` | `const catEmoji = (p.categoryId && p.categoryId.emoji) \|\| p.emoj` | UI text / component icon | SVG icon or clean text |
| 169 | `⚠ ️` | `const lowBadge = el('span', 'low-stock-badge', `⚠️ फक्त ${stock} ` | Category / Filter chip | SVG symbol via CATEGORY_ICONS map |
| 276 | `🔍` | `const icon = el('div', '', '🔍');` | UI text / component icon | SVG icon or clean text |
| 284 | `💬` | `const waBtn = el('a', 'btn btn-outline', '💬 व्हॉट्सॲपवर विचारा /` | WhatsApp CTA / link | SVG #whatsapp icon + clean text |
| 378 | `🛒` | `dImg.onerror = () => { dImg.replaceWith(el('div', 'em', p.emoji \` | UI text / component icon | SVG icon or clean text |
| 381 | `🛒` | `card.appendChild(el('div', 'em', p.emoji \|\| '🛒'));` | UI text / component icon | SVG icon or clean text |
| 385 | `🔥` | `const dealBadge = el('div', 'timer', '🔥 महा ऑफर • Mega Deal');` | UI text / component icon | SVG icon or clean text |
| 413 | `★` | `const stars = el('div', 'testimonial-stars', '★'.repeat(item.rati` | Rating indicator | Intentional exception (typographic star) |
| 436 | `📍` | `const authorArea = el('div', 'testimonial-area', `📍 ${item.area ` | UI text / component icon | SVG icon or clean text |
| 484 | `⚠ ️` | `const icon = el('div', '', '⚠️');` | UI text / component icon | SVG icon or clean text |
| 493 | `🔄` | `const retryBtn = el('button', 'btn btn-primary', '🔄 पुन्हा प्रयत` | Button (Retry/Refresh) | SVG #refresh icon |

### `client/js/checkout.js` (12 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 187 | `⭐` | `defBtn.textContent = '⭐ मुख्य पत्ता करा / Make Default';` | UI text / component icon | SVG icon or clean text |
| 199 | `🗑 ️` | `delBtn.textContent = '🗑️ हटवा / Delete';` | UI text / component icon | SVG icon or clean text |
| 240 | `⚠ ️` | `warning.textContent = `⚠️ We currently only deliver to: ${_settin` | UI text / component icon | SVG icon or clean text |
| 398 | `⚠ ️` | `minOrderAlert.textContent = `⚠️ Minimum order is ₹${_settings.min` | UI text / component icon | SVG icon or clean text |
| 412 | `💡` | `freeDeliveryHint.textContent = `💡 Add ₹${needed} more to get FRE` | UI text / component icon | SVG icon or clean text |
| 415 | `🎉` | `freeDeliveryHint.textContent = '🎉 You unlocked FREE delivery on ` | UI text / component icon | SVG icon or clean text |
| 428 | `⚠ ️` | `subTitle.textContent = `⚠️ मर्यादा संपली (Limit Exceeded) • शिल्ल` | UI text / component icon | SVG icon or clean text |
| 501 | `📍` | `shareLocBtn.textContent = '📍 शोधत आहे... / Locating...';` | UI text / component icon | SVG icon or clean text |
| 510 | `📍` | `ui.showToast('📍 चालू लोकेशन लिंक जोडली! / Location link added!')` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 514 | `📍` | `shareLocBtn.textContent = '📍 चालू लोकेशन जोडा (GPS) / Share Loca` | UI text / component icon | SVG icon or clean text |
| 520 | `📍` | `shareLocBtn.textContent = '📍 चालू लोकेशन जोडा (GPS) / Share Loca` | UI text / component icon | SVG icon or clean text |
| 670 | `⚠ ️` | `showGlobalError('⚠️ दुकान सध्या बंद आहे. नवीन ऑर्डर्स तात्पुरत्या` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-orders.js` (11 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 18 | `✓` | `out_for_delivery: { next: 'delivered', label: 'Mark Delivered (डि` | UI text / component icon | SVG icon or clean text |
| 101 | `💬` | `💬 WhatsApp Notify` | UI text / component icon | SVG icon or clean text |
| 109 | `💳` | `💳 Mark as Paid` | UI text / component icon | SVG icon or clean text |
| 118 | `✕` | `✕ Cancel` | UI text / component icon | SVG icon or clean text |
| 127 | `🔄` | `🔄 Propose Substitute` | UI text / component icon | SVG icon or clean text |
| 147 | `🔄 ➔` | `<span><strong>🔄 Substitution:</strong> <span style="text-decorat` | UI text / component icon | SVG icon or clean text |
| 177 | `📍` | `📍 ${escapeHtml(ord.address.line)}${ord.address.landmark ? ', ' +` | UI text / component icon | SVG icon or clean text |
| 179 | `📝` | `${ord.note ? `<div style="background:#fef3c7;border:1px solid #fd` | UI text / component icon | SVG icon or clean text |
| 180 | `🗺 ️` | `${ord.locationPin ? `<div style="margin-top:4px;font-size:0.8rem;` | Navigation link | SVG icon or text |
| 183 | `📞` | `<a href="tel:+${rawPhone}" class="phone-link">📞 ${custPhone}</a>` | Phone contact link | SVG #phone icon |
| 184 | `📍` | `<a href="https://maps.google.com/?q=${encodeURIComponent(ord.addr` | Map/Location link | SVG #map-pin icon |

### `client/checkout.html` (11 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `⚡` | `<span>⚡ 30-min grocery delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 28 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 42 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 127 | `✍ ️` | `<span class="step-num">✍️</span>` | UI text / component icon | SVG icon or clean text |
| 144 | `📍` | `📍 चालू लोकेशन जोडा (GPS) / Share Location` | UI text / component icon | SVG icon or clean text |
| 179 | `📝` | `<b>📝 खाते (Udhar Credit) <span class="badge-udhar" id="udharCred` | Filter chip / Status badge | SVG icon / styled status badge |
| 200 | `️` | `ℹ️ <b>Manual Owner Verification:</b> Please pay using your UPI ap` | UI text / component icon | SVG icon or clean text |
| 205 | `📱` | `📱 Open UPI App (GPay/PhonePe/Paytm) / थेट ॲपने भरा →` | UI text / component icon | SVG icon or clean text |
| 227 | `💵` | `<p>💵 Please keep the exact cash ready when your groceries arrive` | UI text / component icon | SVG icon or clean text |
| 233 | `📝` | `<p>📝 <b>खात्यावर नोंद (Udhar Credit):</b> या ऑर्डरची रक्कम आपल्य` | UI text / component icon | SVG icon or clean text |
| 271 | `🔒` | `🔒 Your order is saved securely before dispatch. The owner packs ` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-settings.js` (9 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 69 | `✅` | `uploadStatus.textContent = '✅ UPI QR image uploaded!';` | UI text / component icon | SVG icon or clean text |
| 72 | `❌` | `uploadStatus.textContent = `❌ Upload failed: ${res.message \|\| '` | UI text / component icon | SVG icon or clean text |
| 76 | `❌` | `uploadStatus.textContent = `❌ Upload failed: ${err.message}`;` | UI text / component icon | SVG icon or clean text |
| 167 | `★` | `<span style="font-size: 0.75rem; color: #f59e0b;">${'★'.repeat(it` | Rating indicator | Intentional exception (typographic star) |
| 174 | `👁 ️ 🙈` | `${isVisible ? '👁️ Visible (Hide)' : '🙈 Hidden (Show)'}` | Password visibility toggle | SVG #eye / #eye-off icon or text |
| 249 | `⏳` | `backupBtn.textContent = '⏳ Preparing backup snapshot...';` | UI text / component icon | SVG icon or clean text |
| 281 | `✅` | `statusMsg.textContent = '✅ Backup successfully downloaded to your` | UI text / component icon | SVG icon or clean text |
| 286 | `❌` | `statusMsg.textContent = `❌ Backup error: ${err.message}`;` | UI text / component icon | SVG icon or clean text |
| 290 | `📥` | `backupBtn.textContent = '📥 Download Full Database Backup (.json)` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/core/toast.js` (9 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 46 | `✅` | `success: '✅',` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 47 | `❌` | `danger: '❌',` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 48 | `❌` | `error: '❌',` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 49 | `⚠ ️` | `warning: '⚠️',` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 50 | `️` | `info: 'ℹ️',` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 53 | `❌` | `// Strip leading emojis from message text to avoid doubled icons ` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 55 | `✅ ❌ ⚠ ️ 🛑 🚨` | `const leadingEmojiRegex = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 63 | `️` | `iconSpan.textContent = iconMap[normVariant] \|\| 'ℹ️';` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 73 | `✕` | `closeBtn.textContent = '✕';` | Toast alert message | Remove emoji; render SVG icon via toast system |

### `client/admin/js/admin-udhar.js` (8 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 105 | `📞` | `<div style="font-size:0.8rem;color:#64748b;">📞 ${customer.phone ` | UI text / component icon | SVG icon or clean text |
| 122 | `💵` | `💵 जमा` | UI text / component icon | SVG icon or clean text |
| 126 | `📲` | `📲 तगादा` | UI text / component icon | SVG icon or clean text |
| 130 | `📖` | `📖 हिशोब` | UI text / component icon | SVG icon or clean text |
| 133 | `⚙ ️` | `⚙️ स्थिती` | UI text / component icon | SVG icon or clean text |
| 185 | `✓` | `submitBtn.textContent = '✓ जमा नोंदवा (Confirm Payment)';` | UI text / component icon | SVG icon or clean text |
| 223 | `📖` | `document.getElementById('ledgerModalTitle').textContent = `📖 उधा` | UI text / component icon | SVG icon or clean text |
| 303 | `✓` | `submitBtn.textContent = '✓ बदल जतन करा (Save Changes)';` | UI text / component icon | SVG icon or clean text |

### `client/js/ai-order.js` (8 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 144 | `🎙 ️` | `$voiceStatusText.textContent = `🎙️ ऐकत आहे... / Listening (${lab` | UI text / component icon | SVG icon or clean text |
| 331 | `💡` | `<span class="ai-subs-label">💡 पर्यायी वस्तू निवडा:</span>` | UI text / component icon | SVG icon or clean text |
| 347 | `✕` | `<button type="button" class="ai-item-remove" data-index="${index}` | Button (Close/Cancel) | SVG #close icon |
| 430 | `⚠ ️` | `<span class="ai-amb-icon">⚠️</span>` | UI text / component icon | SVG icon or clean text |
| 434 | `✕` | `<button type="button" class="ai-amb-dismiss" data-index="${ambIdx` | Button (Close/Cancel) | SVG #close icon |
| 443 | `✓` | `<div class="chip-price">₹${c.price} ${c.inStock ? '✓ उपलब्ध' : '(` | Filter chip / Status badge | SVG icon / styled status badge |
| 527 | `🛒` | `$addBtn.innerHTML = `🛒 सर्व ${inStockCount} वस्तू कार्टमध्ये जोड` | UI text / component icon | SVG icon or clean text |
| 593 | `🎉` | `let summaryMsg = `🎉 ${addedCount} वस्तू कार्टमध्ये जोडल्या! / ${` | UI text / component icon | SVG icon or clean text |

### `client/order-confirmation.html` (8 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `⚡` | `<span>⚡ 30-min grocery delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 28 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 42 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 51 | `🎉` | `<div class="confirm-icon">🎉</div>` | UI text / component icon | SVG icon or clean text |
| 86 | `📍` | `<a id="displayMapLink" href="#" target="_blank" rel="noopener" st` | Map/Location link | SVG #map-pin icon |
| 97 | `📲` | `📲 <b>Send a copy of this order to our WhatsApp:</b>` | UI text / component icon | SVG icon or clean text |
| 101 | `💬` | `💬 Send on WhatsApp / व्हॉट्सॲपवर पाठवा` | WhatsApp CTA / link | SVG #whatsapp icon + clean text |
| 104 | `✅` | `✅ <b>Note:</b> Your order is already saved in our system! Sending` | UI text / component icon | SVG icon or clean text |

### `client/register.html` (8 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `⚡` | `<span>⚡ 30-min grocery delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 28 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 42 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 52 | `📝` | `<span class="auth-icon">📝</span>` | UI text / component icon | SVG icon or clean text |
| 117 | `👁 ️` | `👁️` | Password visibility toggle | SVG #eye / #eye-off icon or text |
| 140 | `👁 ️` | `👁️` | Password visibility toggle | SVG #eye / #eye-off icon or text |
| 179 | `🙈 👁 ️` | `togglePassBtn.textContent = isPass ? '🙈' : '👁️';` | Password visibility toggle | SVG #eye / #eye-off icon or text |
| 189 | `🙈 👁 ️` | `toggleConfirmBtn.textContent = isPass ? '🙈' : '👁️';` | Password visibility toggle | SVG #eye / #eye-off icon or text |

### `server/seed/seedOwner.js` (7 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 28 | `❌` | `console.error('❌  OWNER_PHONE and OWNER_PASSWORD must be defined ` | Seed script | Icon name string |
| 34 | `❌` | `console.error('❌  OWNER_PHONE in server/.env is not a valid 10-di` | Seed script | Icon name string |
| 39 | `❌` | `console.error('❌  OWNER_PASSWORD must be between 8 and 72 charact` | Seed script | Icon name string |
| 45 | `✅` | `console.log('✅  Connected to MongoDB');` | Server seed log | Intentional exception (developer console log) |
| 57 | `👑` | `console.log(`👑  Existing user with phone ${phone} promoted/updat` | Server seed log | Intentional exception (developer console log) |
| 66 | `👑` | `console.log(`👑  Owner account created successfully for phone ${p` | Server seed log | Intentional exception (developer console log) |
| 71 | `❌` | `console.error('❌  Owner seed failed:', err.message);` | Seed script | Icon name string |

### `client/admin/inventory.html` (6 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `📥` | `📥 स्टॉक भरा (Stock In)` | UI text / component icon | SVG icon or clean text |
| 30 | `⚠ ️` | `⚠️ इशारे (Alerts)` | UI text / component icon | SVG icon or clean text |
| 33 | `📝` | `📝 नोंदवही (Log & Adjust)` | UI text / component icon | SVG icon or clean text |
| 42 | `🔍` | `<span class="search-icon-left">🔍</span>` | UI text / component icon | SVG icon or clean text |
| 53 | `📷` | `📷 बारकोड` | UI text / component icon | SVG icon or clean text |
| 77 | `✅` | `✅ सर्व साठा जतन करा (Save All Stock)` | UI text / component icon | SVG icon or clean text |

### `client/admin/orders.html` (6 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `📦` | `📦 थेट ऑर्डर्स (Live Queue)` | UI text / component icon | SVG icon or clean text |
| 30 | `📋` | `📋 पॅकिंग यादी (Packing List)` | UI text / component icon | SVG icon or clean text |
| 39 | `🔍` | `<span class="search-icon-left">🔍</span>` | UI text / component icon | SVG icon or clean text |
| 56 | `🔔` | `<span>🔔 नवीन / New</span>` | UI text / component icon | SVG icon or clean text |
| 68 | `🚚` | `<span>🚚 रवाना / Dispatched</span>` | UI text / component icon | SVG icon or clean text |
| 72 | `✅` | `<span>✅ पूर्ण / Delivered</span>` | UI text / component icon | SVG icon or clean text |

### `client/js/auth.js` (6 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 155 | `🎉` | `if (ui.showToast) ui.showToast('कार्टमध्ये जोडले / Added to cart ` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 167 | `🎉` | `if (ui.showToast) ui.showToast(`🎉 ${items.length} वस्तू कार्टमध्` | Toast alert message | Remove emoji; render SVG icon via toast system |
| 244 | `📦` | `ordersLink.textContent = '📦 Orders';` | UI text / component icon | SVG icon or clean text |
| 253 | `🔔` | `inboxLink.innerHTML = '🔔 <span class="hide-mobile">Inbox</span><` | Filter chip / Status badge | SVG icon / styled status badge |
| 265 | `🛠 ️` | `adminLink.textContent = '🛠️ Admin';` | UI text / component icon | SVG icon or clean text |
| 293 | `👤` | `iconSpan.textContent = '👤';` | UI text / component icon | SVG icon or clean text |

### `client/login.html` (6 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `⚡` | `<span>⚡ 30-min grocery delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 28 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 42 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 52 | `🔐` | `<span class="auth-icon">🔐</span>` | UI text / component icon | SVG icon or clean text |
| 106 | `👁 ️` | `👁️` | Password visibility toggle | SVG #eye / #eye-off icon or text |
| 154 | `🙈 👁 ️` | `togglePassBtn.textContent = isPass ? '🙈' : '👁️';` | Password visibility toggle | SVG #eye / #eye-off icon or text |

### `client/admin/catalog.html` (5 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `🏷 ️` | `🏷️ उत्पादने (Products)` | UI text / component icon | SVG icon or clean text |
| 30 | `🗂 ️` | `🗂️ वर्ग (Categories)` | UI text / component icon | SVG icon or clean text |
| 33 | `⚖ ️` | `⚖️ घाऊक दर बदल (Bulk Tools)` | UI text / component icon | SVG icon or clean text |
| 42 | `🔍` | `<span class="search-icon-left">🔍</span>` | UI text / component icon | SVG icon or clean text |
| 53 | `➕` | `➕ नवीन जोडा` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-categories.js` (5 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 35 | `🛒` | `const emoji = escapeHtml(cat.emoji \|\| '🛒');` | UI text / component icon | SVG icon or clean text |
| 51 | `✏ ️` | `✏️ Edit` | UI text / component icon | SVG icon or clean text |
| 76 | `🛒` | `document.getElementById('catEmoji').value = '🛒';` | UI text / component icon | SVG icon or clean text |
| 88 | `🛒` | `document.getElementById('catEmoji').value = cat.emoji \|\| '🛒';` | UI text / component icon | SVG icon or clean text |
| 111 | `🛒` | `emoji: document.getElementById('catEmoji').value.trim() \|\| '🛒'` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-products.js` (5 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 115 | `✏ ️` | `✏️ Edit` | UI text / component icon | SVG icon or clean text |
| 120 | `🗑 ️` | `🗑️` | UI text / component icon | SVG icon or clean text |
| 324 | `✅` | `uploadStatus.textContent = '✅ Image uploaded to Cloudinary!';` | UI text / component icon | SVG icon or clean text |
| 327 | `❌` | `uploadStatus.textContent = `❌ Upload failed: ${res.message \|\| '` | UI text / component icon | SVG icon or clean text |
| 331 | `❌` | `uploadStatus.textContent = `❌ Upload failed: ${uploadErr.message}` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/components/empty-state.js` (4 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 9 | `📦` | `icon = '📦',` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 38 | `⚠ ️` | `icon = '⚠️',` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 58 | `🔄` | `retryBtn.innerHTML = '🔄 पुन्हा प्रयत्न करा / Retry';` | Empty state illustration | SVG icon (#box, #inbox, #search) |
| 75 | `📶` | `icon: '📶',` | Empty state illustration | SVG icon (#box, #inbox, #search) |

### `client/admin/js/core/i18n.js` (4 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 58 | `🔊` | `enable_sound: '🔊 आवाज सुरू करा / Enable Sound Alerts',` | i18n dictionary value | Remove emoji from translated string |
| 59 | `🔇` | `mute_sound: '🔇 आवाज बंद करा / Mute Sound',` | i18n dictionary value | Remove emoji from translated string |
| 60 | `🔊` | `unmute_sound: '🔊 आवाज चालू करा / Unmute Sound',` | i18n dictionary value | Remove emoji from translated string |
| 179 | `⚠ ️` | `offline_notice: '⚠️ इंटरनेट कनेक्शन बंद आहे — केवळ माहिती पाहू शक` | i18n dictionary value | Remove emoji from translated string |

### `client/admin/js/pages/ai-corrections.js` (4 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 36 | `💡` | `<span style="font-size:1.5rem;line-height:1;">💡</span>` | UI text / component icon | SVG icon or clean text |
| 123 | `🔥` | `🔥 ${frequency} वेळा / times` | UI text / component icon | SVG icon or clean text |
| 133 | `🔗` | `🔗 पर्यायी नाव जोडा / Map Alias` | UI text / component icon | SVG icon or clean text |
| 167 | `🔗` | `🔗 पर्यायी नाव जोडा (Map Product Alias)` | UI text / component icon | SVG icon or clean text |

### `client/orders.html` (4 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 27 | `⚡` | `<span>⚡ 30-min grocery delivery in Kopargaon &amp; Yesgaon</span>` | UI text / component icon | SVG icon or clean text |
| 28 | `📞` | `<a href="tel:+919860924504">📞 +91 98609 24504</a>` | Phone contact link | SVG #phone icon |
| 42 | `📍` | `<div class="loc-chip hide-mobile">📍 Yesgaon, Kopargaon</div>` | Filter chip / Status badge | SVG icon / styled status badge |
| 58 | `🔄` | `<span>🔄 ओढून रिफ्रेश करा • Pull to Refresh</span>` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-staff.js` (3 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 60 | `📞` | `<div style="font-size:0.8rem;color:#64748b;">📞 ${escapeHtml(s.ph` | UI text / component icon | SVG icon or clean text |
| 78 | `✕` | `✕ Remove` | UI text / component icon | SVG icon or clean text |
| 113 | `✓` | `submitBtn.textContent = '✓ कर्मचारी खाते तयार करा (Create Staff)'` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/packing.js` (3 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 112 | `📦` | `<h2 style="font-size: 1.2rem; font-weight: 800; color: #0f172a;">` | Heading / Title | Remove decorative emoji; clean concise heading |
| 116 | `🖨 ️` | `🖨️ Print Packing List` | UI text / component icon | SVG icon or clean text |
| 123 | `✓` | `<th style="padding: 0.6rem; text-align: left; width: 40px;">✓</th` | UI text / component icon | SVG icon or clean text |

### `client/offline.html` (3 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 96 | `📡` | `<div class="offline-icon">📡</div>` | UI text / component icon | SVG icon or clean text |
| 102 | `🔄` | `🔄 पुन्हा प्रयत्न करा • Retry` | UI text / component icon | SVG icon or clean text |
| 105 | `📞` | `📞 थेट दुकानात कॉल करा • Call Store` | UI text / component icon | SVG icon or clean text |

### `client/privacy.html` (3 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 66 | `🏪` | `🏪 महालक्ष्मी किराणा` | UI text / component icon | SVG icon or clean text |
| 77 | `🔒` | `<h1>🔒 गोपनीयता धोरण (Privacy Policy)</h1>` | Heading / Title | Remove decorative emoji; clean concise heading |
| 113 | `📞` | `<h3 style="margin:0 0 0.5rem;color:#166534;font-size:1rem;">📞 सं` | Heading / Title | Remove decorative emoji; clean concise heading |

### `client/admin/dashboard.html` (2 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 28 | `🔔` | `<span style="font-size:1.5rem;">🔔</span>` | UI text / component icon | SVG icon or clean text |
| 35 | `🔊` | `🔊 सुरू करा / Enable` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/admin-ai-misses.js` (2 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 69 | `🎉` | `tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;p` | UI text / component icon | SVG icon or clean text |
| 145 | `✓` | `saveBtn.textContent = '✓ पर्यायी नाव जोडा (Save Alias)';` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/components/filter-bar.js` (2 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 35 | `🔍` | `<span class="search-icon-left">🔍</span>` | UI text / component icon | SVG icon or clean text |
| 44 | `✕` | `<button type="button" class="search-clear-btn" id="filterSearchCl` | Button (Close/Cancel) | SVG #close icon |

### `client/admin/js/core/api.js` (2 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 159 | `✅` | `window.AdminToast.show('✅ ' + (window.t ? window.t('export_csv') ` | UI text / component icon | SVG icon or clean text |
| 163 | `❌` | `window.AdminToast.show('❌ ' + err.message, 'danger');` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/core/net.js` (2 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 20 | `⚠ ️` | `offlineBanner.textContent = '⚠️ ' + (window.t ? window.t('offline` | UI text / component icon | SVG icon or clean text |
| 38 | `🌐` | `window.AdminToast.show('🌐 इंटरनेट पुन्हा सुरू झाले / Internet co` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/dashboard.js` (2 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 57 | `🔔` | `bannerText.textContent = `🔔 ${res.count} नवीन ऑर्डर आली आहे! / $` | UI text / component icon | SVG icon or clean text |
| 107 | `📞` | `<a href="tel:+${normalizePhone(ord.customerPhone)}" class="phone-` | Phone contact link | SVG #phone icon |

### `client/admin/js/admin-customers.js` (1 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 43 | `📞` | `<a href="tel:+${rawPhone}" class="phone-link">📞 ${phone}</a>` | Phone contact link | SVG #phone icon |

### `client/admin/js/admin-reports.js` (1 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 193 | `📋` | `alert('📋 हिशोब कॉपी झाला! (Copied to clipboard)');` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/components/bottom-sheet.js` (1 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 62 | `✕` | `this.closeBtn.innerHTML = '✕';` | UI text / component icon | SVG icon or clean text |

### `client/admin/js/components/data-list.js` (1 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 18 | `📂` | `this.emptyIcon = options.emptyIcon \|\| '📂';` | UI text / component icon | SVG icon or clean text |

### `client/js/pwa.js` (1 occurrences)

| Line | Emoji | Current Text Snippet | Where / Context | Proposed Replacement |
| :---: | :---: | :--- | :--- | :--- |
| 24 | `🚀` | `ui.showToast('🚀 नवीन आवृत्ती उपलब्ध आहे • New version available ` | Toast alert message | Remove emoji; render SVG icon via toast system |

---

## 3. Heavy Text & Redundancy Audit

### 3.1 Long & Cluttered Headings (> 4–5 words or bilingual split)

| Location | Current Text | Issue | Proposed Clean Copy |
| :--- | :--- | :--- | :--- |
| `client/index.html` L132 | `🏪 येसगाव व कोपरगावचे विश्वासू किराणा दुकान • Trusted Local Kirana` | Heavy bilingual slogan with emoji | `येसगावचे विश्वासू किराणा दुकान` (mr) / `Trusted Local Kirana` (en) |
| `client/index.html` L133–135 | `Fresh groceries from your neighbourhood dukan` + Marathi h1 | Splitting h1 into 2 full sentences | Keep Marathi as primary h1, short English subhead |
| `client/index.html` L364 | `🔥 सर्वाधिक पसंतीची उत्पादने — Best Sellers` | Bilingual with fire emoji | `सर्वाधिक पसंतीची उत्पादने` (mr) / `Best Sellers` (en) |
| `client/index.html` L398 | `💬 ग्राहकांचे मनोगत — Customer Reviews` | Bilingual with chat emoji | `ग्राहकांचे मनोगत` (mr) / `Customer Reviews` (en) |
| `client/inbox.html` L228 | `🔔 संदेश आणि सूचना (Inbox)` | Doubled Marathi words + English parenthetical | `सूचना` (mr) / `Inbox` (en) |
| `client/orders.html` / `orders.js` L95 | `📝 माझे उधारी खाते (My Udhar Account)` | Bilingual heading with emoji | `उधारी खाते` (mr) / `Udhar Account` (en) |
| `admin/pages/dashboard.js` L219 | `🕒 आजचे डिलिव्हरी स्लॉट्स (Slot Load)` | Redundant bilingual heading | `Delivery Slots` |
| `admin/pages/dashboard.js` L257 | `🔥 आज सर्वाधिक खपणारी उत्पादने (Top Selling Today)` | Fire emoji + bilingual | `Top Selling Today` |
| `admin/pages/inventory.js` L407 | `⚠️ साठा इशारे व पुनर्खरेदी (Stock Alerts)` | Warning emoji + bilingual | `Stock Alerts` |
| `admin/pages/catalog.js` L885 | `⚖️ घाऊक दर बदल साधन (Bulk Price Adjustment)` | Cluttered heading | `Bulk Price Edit` |
| `admin/pages/reports.js` L280 | `⚠️ विक्री झालेल्या वस्तूंना खरेदी किंमत जोडलेली नाही!` | Lengthy warning sentence | `${n} items missing cost price` |

### 3.2 Overly Long Button Labels (> 2 words)

| File & Line | Current Button Label | Proposed Compact Label |
| :--- | :--- | :--- |
| `client/index.html` L138 | `सामान पहा / Browse Catalog` | `सामान पहा` (mr) or `Browse` (en) |
| `client/index.html` L139 | `व्हॉट्सॲपवर ऑर्डर करा / WhatsApp Order` | `WhatsApp Order` |
| `client/checkout.html` L144 | `📍 चालू लोकेशन जोडा (GPS) / Share Location` | `Share Location` (with SVG `#map-pin`) |
| `client/checkout.html` L205 | `📱 Open UPI App (GPay/PhonePe/Paytm) / थेट ॲपने भरा →` | `Pay via UPI` (with SVG `#upi`) |
| `client/admin/orders.js` L378 | `👁️ संपूर्ण ऑर्डर तपशील / View Order Details` | `View Details` |
| `client/admin/orders.js` L382 | `📞 ग्राहकाला कॉल करा / Call Customer (${phone})` | `Call Customer` |
| `client/admin/orders.js` L385 | `💬 WhatsApp वर संदेश पाठवा / WhatsApp Customer` | `WhatsApp` |
| `client/admin/orders.js` L389 | `🖨️ थर्मल पावती प्रिंट / Print Slip` | `Print Slip` |
| `client/admin/orders.js` L396 | `❌ ऑर्डर रद्द करा / Cancel Order (Restore Stock)` | `Cancel Order` |
| `client/admin/orders.js` L434 | `✅ पेमेंट जमा झाले / Mark Paid (Verified)` | `Mark Paid` |
| `client/admin/orders.js` L437 | `⏳ पेमेंट बाकी / Mark Unpaid (Pending)` | `Mark Unpaid` |
| `client/admin/staff.js` L113 | `✓ कर्मचारी खाते तयार करा (Create Staff)` | `Create Staff` |
| `client/admin/catalog.js` L590 | `✅ जतन करा (Save Product)` | `Save` |

### 3.3 Redundant Bilingual Copy Across Interfaces

- **Root Issue:** The app currently renders both Marathi and English for virtually every button, toast, badge, and helper label (e.g. `Loading orders… / ऑर्डर्स लोड होत आहेत…`). On 360px and 390px mobile viewports, this causes extreme visual clutter, line wraps, and vertical bloat.
- **Enforced Rule for Phase 3:** Render strictly **one** language based on active selection (`window._lang` or user preference). Default to Marathi (`mr`) on storefront with English toggle. Never double labels in buttons, toasts, chips, or badges.

### 3.4 Dense Helper Text & Mobile Paragraph Bloat

| Page / Component | Current Verbose Copy | Proposed Streamlined Copy |
| :--- | :--- | :--- |
| `client/index.html` AI Box (L185–186) | 2 full bilingual sentences explaining list pasting | Single concise helper: `तुमची किराणा यादी येथे लिहा किंवा पेस्ट करा.` |
| `client/checkout.html` UPI Verify (L200) | Long paragraph detailing screenshot verification | Single line: `पेमेंट झाल्यावर UTR क्रमांक प्रविष्ट करा.` |
| `client/checkout.html` COD note (L227) | Full paragraph about exact change requirement | Single line: `कृपया डिलिव्हरी वेळी सुट्टे पैसे तयार ठेवा.` |
| `client/checkout.html` Udhar note (L233) | Full paragraph about shop owner credit authorization | Single line: `फक्त अधिकृत नियमित ग्राहकांसाठी.` |
| `client/checkout.html` Security badge (L271) | Full sentence reassuring order security | Short badge: `सुरक्षित ऑर्डर (Secure Checkout)` |
| `client/orders.html` Udhar explanation (L166) | Multi-paragraph promotional explainer | Compact info card with single-line description |

---

## 4. Proposed SVG Icon Sprite Specification

A single unified inline SVG sprite file: **`client/images/icons.svg`** containing `<symbol>` elements.
**Design System Standards:**
- **Grid Size:** 24 × 24 (`viewBox="0 0 24 24"`)
- **Stroke:** `1.5px` (consistent hairline outline)
- **Color:** `currentColor` (dynamically follows text and theme color tokens)
- **Cap & Join:** `stroke-linecap="round"` and `stroke-linejoin="round"`
- **CSS Class:** `.icon` (`width: 1em; height: 1em; vertical-align: -0.125em; fill: none; stroke: currentColor;`)

### Required Symbols Inventory (50 Symbols)

| Group | Symbol IDs | Total |
| :--- | :--- | :---: |
| **Storefront Navigation** | `home`, `cart`, `search`, `mic`, `orders`, `account`, `bell`, `inbox`, `store` | 9 |
| **Actions & Controls** | `plus`, `minus`, `close`, `check`, `trash`, `edit`, `refresh`, `print`, `filter`, `camera` | 10 |
| **Communication & Geo** | `phone`, `whatsapp`, `map-pin`, `globe` | 4 |
| **Payments & Finance** | `upi`, `cash`, `credit`, `wallet` | 4 |
| **Status & Indicators** | `clock`, `truck`, `box`, `warning`, `info`, `lock`, `logout`, `audio`, `audio-off`, `eye`, `eye-off` | 11 |
| **Arrows & Chevrons** | `chevron-left`, `chevron-right`, `chevron-down` | 3 |
| **Admin Navigation** | `chart`, `list`, `users`, `settings` | 4 |
| **Category Glyphs** | `grains`, `dals`, `oils`, `dairy`, `spices`, `snacks`, `beverages`, `homecare`, `personalcare`, `stationery` | 10 |

---

## 5. Category-to-Icon Mapping Matrix

To ensure database compatibility without breaking historical data or schema constraints:
- Client JavaScript (`client/js/catalog.js` and admin modules) will use a map from category ID/name to SVG symbol.
- Seed scripts (`server/seed/seed.js` and `seedDemo.js`) will be updated to store clean icon identifier strings instead of raw Unicode emojis.

| Category (Marathi) | Category (English) | Existing DB Emoji | Proposed SVG Symbol Name |
| :--- | :--- | :---: | :--- |
| पीठ आणि धान्य | Atta & Grains | 🌾 | `grains` |
| डाळी आणि कडधान्ये | Dals & Pulses | 🫘 | `dals` |
| तेल आणि तूप | Oils & Ghee | 🫒 | `oils` |
| दुग्धजन्य आणि पेये | Dairy & Drinks | 🥛 | `dairy` |
| मसाले आणि खडे मसाले | Spices | 🌶️ | `spices` |
| फराळ आणि बिस्किटे | Snacks & Biscuits | 🍪 | `snacks` |
| शीतपेये आणि सरबत | Beverages | 🥤 | `beverages` |
| स्वच्छता आणि गृहपयोगी | Cleaning & Home Care | 🧽 | `homecare` |
| वैयक्तिक काळजी | Personal Care | 🧴 | `personalcare` |
| स्टेशनरी आणि इतर | Stationery & Misc | ✏️ | `stationery` |
| (इतर / Fallback) | General / Fallback | 🛒 | `box` |

---

## 6. Intentional Exceptions

The following occurrences are validated and intentionally excluded from modification:
1. **Developer Terminal Logs:** Server seed scripts (`server/seed/seed.js`, `seedDemo.js`, `seedOwner.js`) contain `console.log` statements with status marks. These are strictly backend CLI logs never sent to the browser or customer.
2. **Standard Typographic Glyphs:**
   - Star `★` (U+2605) used in customer review ratings (`catalog.js`, `admin-settings.js`).
   - Keyboard shortcut symbol `⌘K` (U+2318) in search input placeholders.
   - Simple directional arrows (e.g. `→`) in pagination or flow notes.

---

## 7. Phase 2 & Phase 3 Execution Plan

Upon user confirmation, implementation proceeds in sequential atomic milestones:

### Milestone 1: SVG Sprite Creation & Design Tokens
1. Craft `client/images/icons.svg` containing all 50 outline SVG `<symbol>`s.
2. Add `.icon` utility styling in `client/css/style.css` and `client/admin/css/admin.css`.
3. Update Service Worker (`client/sw.js`): add `/images/icons.svg` to static cache and bump `CACHE_VERSION`.

### Milestone 2: Customer Storefront Emoji Removal
1. Update HTML files (`index.html`, `checkout.html`, `inbox.html`, `account.html`, `login.html`, `register.html`, `order-confirmation.html`, `offline.html`, `privacy.html`).
2. Update Client JS modules (`ui.js`, `catalog.js`, `checkout.js`, `orders.js`, `auth.js`, `ai-order.js`).
3. Replace category chip emoji rendering with `CATEGORY_ICONS` SVG map lookup.

### Milestone 3: Admin Panel Emoji Removal
1. Update Admin HTML pages (`catalog.html`, `dashboard.html`, `inventory.html`, `orders.html`).
2. Update Admin Core Components (`shell.js`, `toast.js`, `empty-state.js`, `filter-bar.js`, `bottom-sheet.js`, `data-list.js`).
3. Update Admin Page modules (`pages/catalog.js`, `pages/dashboard.js`, `pages/inventory.js`, `pages/orders.js`, `pages/reports.js`, `pages/customers.js`, `pages/staff.js`, `pages/udhar.js`, `pages/settings.js`, `pages/inbox.js`, `pages/ai-corrections.js`).
4. Sanitize `admin/js/core/i18n.js` string values.

### Milestone 4: Copy Trimming & Typography Polish (Phase 3)
1. Enforce single-language display per user preference (Marathi primary, English toggle).
2. Trim button copy to 1–2 words; shorten verbose headings and toasts.
3. Verify touch targets remain ≥ 44px and typography scales cleanly on mobile viewports.

### Milestone 5: Verification & Safety Validation (Phase 4)
1. Run `npm run i18n:check` (must pass with 0 missing keys).
2. Run `npm run test:all` (ensure all tests pass; update text-matching assertions where needed).
3. Grep for remaining emojis in `client/` to verify zero unintended emojis.
4. Re-run visual inspection at 360, 390, 768, and 1280px.
5. Commit in atomic commits and push to `main`.

---
*Phase 1 Audit Complete. Awaiting approval to execute Phase 2.*