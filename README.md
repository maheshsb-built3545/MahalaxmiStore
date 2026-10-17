# Mahalaxmi Kirana Store — महालक्ष्मी किराणा दुकान

> Top-tier mobile-first web app & PWA for **Mahalaxmi Kirana Store**, Post Yesgaon, Taluka Kopargaon, Dist. Ahmednagar, Maharashtra 423602.
> Optimized for low-to-mid-range Android smartphones over rural 3G/4G connections.

---

## 🌟 Highlights

- **Blinkit / Zepto Tier Mobile Feel:** Designed for 360px phones first, featuring a frosted-glass bottom navigation bar, live cart count badges, sticky category chips with horizontal scroll-snap, in-card quantity steppers (`- 1 +`), and a gesture-driven pull-down cart bottom sheet.
- **Installable PWA:** Full `manifest.webmanifest`, versioned Service Worker caching static assets and read-only catalog reads, custom non-intrusive install prompt, and branded offline fallback.
- **Strict Data Integrity:**
  - Prices recalculated strictly from MongoDB on the server; client price tampering is impossible.
  - Concurrency-safe atomic stock deduction via `findOneAndUpdate({ _id, stockQuantity: { $gte: qty } })`.
  - All slot cutoffs (11 AM morning, 4 PM afternoon, 9 PM evening) enforced in Indian Standard Time (`Asia/Kolkata`).
  - Bilingual interface (Marathi `मराठी` + English) across all screens and notifications.
  - Cart key `kirana_cart` in `localStorage` is preserved on 401s; only auth tokens are cleared.
- **Lightweight Vanilla Stack:** Zero React/Vue/Tailwind build overhead. Lightning-fast load times on low-end processors.

---

## 📂 Project Structure

```
MahalaxmiStore/
├── README.md                 # Setup, run, deploy, and testing guide
├── Dockerfile                # Production container image
├── docker-compose.yml        # Multi-container orchestration
├── .gitignore                # Strict secret and temporary file exclusions
├── .gitattributes            # Line ending normalization (LF)
├── .editorconfig             # Consistent editor indentation
├── docs/
│   ├── ARCHITECTURE.md       # High-level architecture and system design
│   ├── PROJECT_HANDOVER.md   # Complete AI/human engineer handover documentation
│   ├── AUDIT.md              # Technical audit and validation records
│   ├── MASTER_PRD_v2.0.pdf   # Complete Product Requirements Document
│   └── assets/               # Product mockups, flow diagrams, and screenshots
├── client/                   # Customer storefront + Owner management interface
│   ├── index.html            # Main grocery catalog storefront
│   ├── checkout.html         # 3-step checkout with UPI deep-link & QR fallback
│   ├── orders.html           # Customer order tracking with pull-to-refresh
│   ├── inbox.html            # Customer notification center
│   ├── login.html            # Phone/password login (with auto-numeric keypad)
│   ├── register.html         # Customer registration
│   ├── privacy.html          # Bilingual privacy & data policy
│   ├── sw.js                 # Service Worker (offline shell & catalog cache)
│   ├── manifest.webmanifest  # PWA manifest (standalone, theme-color, shortcuts)
│   ├── offline.html          # Branded offline fallback screen
│   ├── css/                  # Curated responsive design tokens & mobile styles
│   ├── js/                   # Client state management, catalog, and PWA registration
│   ├── images/               # Vectors, PWA app icons (192, 512)
│   └── admin/                # Owner management dashboard & packing lists
└── server/                   # Node.js Express API
    ├── src/
    │   ├── server.js         # Express app, compression, security headers, static serving
    │   ├── config/           # MongoDB Atlas client connection
    │   ├── controllers/      # Business logic handlers
    │   ├── models/           # Mongoose schemas (Product, Order, User, etc.)
    │   ├── routes/           # REST endpoint definitions
    │   ├── middleware/       # Rate limiting, auth, and sanitization
    │   ├── services/         # AI grocery parser & external services
    │   └── utils/            # Helper formatting & phonetics
    ├── scripts/              # Automated database backup & health pingers
    ├── seed/                 # Catalog seeding & owner initialization
    ├── tests/                # Automated verification suites
    ├── .env.example          # All configuration keys (placeholders only)
    └── package.json          # Server dependencies & test scripts
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18.0.0
- MongoDB Atlas or local MongoDB instance

### 2. Environment Setup
```bash
cd server
cp .env.example .env
# Edit server/.env and fill in your MONGO_URI, MONGODB_URI_TEST, and JWT_SECRET
```

### 3. Installation
```bash
cd server
npm install
```

### 4. Seed Database (Development)
```bash
# Seed initial categories and products
npm run seed

# Seed store owner credentials
npm run seed:owner
```

### 5. Running the Application
```bash
# Run server (serves API and client storefront together)
npm start
```
- **Storefront (Customer):** `http://localhost:5000`
- **Owner Dashboard (Admin):** `http://localhost:5000/admin/dashboard.html`
- **API Health Check:** `http://localhost:5000/api/health`

---

## 🧪 Testing

All test suites run in isolation against `MONGODB_URI_TEST` without touching production data:

```bash
cd server

# Run core automated tests (Playbook, Audit, R5/R6, and Stage 2 verification)
npm test

# Run all test suites including Stage 3 admin checks
npm run test:all
```

---

## 🔒 Security Best Practices

- Strict `Content-Security-Policy`, `Helmet` HTTP headers, and CORS origin enforcement.
- IP-based rate limiting on sensitive authentication and ordering endpoints.
- Parameter sanitization against NoSQL injection via `express-mongo-sanitize`.
- Zero credentials or tokens committed to source control.
