'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// ─── R0: Process-level crash guards ──────────────────────────────────────────
// A MongoDB blip, an unhandled promise, or any unexpected throw must log and
// continue — NOT crash the server and make the store unreachable.
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] The server caught an unexpected error and will continue running.');
  console.error('  Error:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION] A promise was rejected without a catch handler.');
  console.error('  Reason:', reason instanceof Error ? reason.message : reason);
  if (process.env.NODE_ENV !== 'production' && reason instanceof Error) {
    console.error(reason.stack);
  }
});

// Rule 8: Refuse to start if JWT_SECRET is missing, shorter than 32 chars, or equals placeholder
const JWT_PLACEHOLDER = 'replace_with_a_secure_random_secret_at_least_32_characters_long';
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.trim().length < 32 ||
  process.env.JWT_SECRET.trim() === JWT_PLACEHOLDER
) {
  console.error('❌ FATAL: Server startup aborted.');
  console.error('   JWT_SECRET must be set in .env, must be at least 32 characters long,');
  console.error('   and cannot equal the default placeholder from .env.example.');
  process.exit(1);
}

// Startup warning if Cloudinary credentials are missing or placeholders
const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.includes('replace_with'));
const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCloudinary = cloudinaryVars.filter((v) => !process.env[v] || !process.env[v].trim() || process.env[v].includes('replace_with'));
if (!hasCloudinaryUrl && missingCloudinary.length > 0) {
  console.warn(`⚠️  WARNING: Cloudinary image uploads disabled (missing or placeholder: ${missingCloudinary.join(', ')}).`);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');

// Read version dynamically from package.json (MAINT-01)
const { version: PKG_VERSION } = require('../package.json');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const addressRoutes = require('./routes/addressRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const orderRoutes = require('./routes/orderRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes'); // R1
const notificationRoutes = require('./routes/notificationRoutes'); // R2
const testimonialRoutes = require('./routes/testimonialRoutes'); // R2
const aiRoutes = require('./routes/aiRoutes'); // R3
const udharRoutes = require('./routes/udharRoutes'); // R4
const { adminLimiter } = require('./middleware/rateLimiter');

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

// Rule 2: trust proxy for accurate rate-limiting behind reverse proxies
app.set('trust proxy', 1);

// PERF-01: Compression MUST come before all route mounts and static serving
// so that both API JSON responses and static files receive gzip/brotli compression.
app.use(compression());

// HTTPS-only redirect in production (Playbook Pass 4.3)
if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
}

// Security headers with strict Content-Security-Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:3000', 'http://localhost:5000'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS – allow configured frontend origin with all required HTTP methods
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// Rule 3: Express Mongo Sanitize prevents NoSQL parameter injection ($ and .)
app.use(mongoSanitize());

// General API rate limit: 300 requests per 15 minutes per IP (skips /api/admin so adminLimiter applies there)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 1500,
  skip: (req) => req.originalUrl.startsWith('/api/admin'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in a few minutes.' },
});
app.use('/api', apiLimiter);

// ─── Database ─────────────────────────────────────────────────────────────────
const dbPromise = connectDB();

const mongoose = require('mongoose');

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
);

app.get('/api/version', (_req, res) =>
  res.json({
    success: true,
    version: PKG_VERSION,
    commit: process.env.GIT_COMMIT || process.env.RENDER_GIT_COMMIT || 'development',
    branch: process.env.GIT_BRANCH || process.env.RENDER_GIT_BRANCH || 'unknown',
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
);

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/inventory', inventoryRoutes); // R1 — stock-in, low-stock list, stock log
app.use('/api/notifications', notificationRoutes); // R2 — inboxes & push
app.use('/api/testimonials', testimonialRoutes);   // R2 — customer reviews & sample badge
app.use('/api/ai', aiRoutes);                       // R3 — grocery list parsing & substitutes
app.use('/api/udhar', udharRoutes);                 // R4 — credit ledger & payments

// compression is now mounted at the top of the middleware stack (see above, PERF-01)

// ─── Client Static Files ────────────────────────────────────────────────────
const path = require('path');
const clientDir = path.join(__dirname, '../../client');

app.use('/admin/images', express.static(path.join(clientDir, 'images')));

app.use(express.static(clientDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.includes(path.sep + 'admin' + path.sep) || filePath.includes('/admin/')) {
      // Admin JS/CSS must revalidate immediately to prevent stale UI
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.match(/\.(css|js)$/)) {
      // Customer CSS and JS: must revalidate with server so UI updates show up immediately
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.match(/\.(svg|png|jpg|jpeg|webp|woff2?|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Customer storefront root
app.get('/', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// 404 – no route matched (Bilingual JSON response for API and unhandled requests)
app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: 'मार्ग सापडला नाही / Route not found.',
  })
);

// Central error handler (must be last)
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  (async () => {
    await dbPromise;
    app.listen(PORT, '0.0.0.0', () => {
      console.log('=======================================================');
      console.log(`🏪  Mahalaxmi Kirana Store — महालक्ष्मी किराणा दुकान`);
      console.log(`🌐  Website (Storefront): http://localhost:${PORT}`);
      console.log(`🛠️   Admin Dashboard:      http://localhost:${PORT}/admin/dashboard.html`);
      console.log(`🔐  Customer Login:       http://localhost:${PORT}/login.html`);
      console.log(`📦  API Health:           http://localhost:${PORT}/api/health`);
      console.log('=======================================================');
      console.log(`🚀  Server is active & listening for requests.`);
      console.log(`💡  Open http://localhost:${PORT} in your browser.`);
      console.log(`💡  Leave this window open. Press Ctrl+C to stop.`);
    });
  })();
}

app.dbPromise = dbPromise;
module.exports = app;
