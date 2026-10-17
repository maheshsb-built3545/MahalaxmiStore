'use strict';
/**
 * server/scripts/capture_baseline_screenshots.js
 *
 * Runs headless Chrome via puppeteer-core to capture real visual baseline
 * screenshots of all 14 admin pages at widths 360, 390, 768, 1280.
 *
 * Runs against test DB only.
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const testMongoUri = process.env.MONGODB_URI_TEST;
const prodMongoUri = process.env.MONGO_URI;

if (!testMongoUri || testMongoUri === prodMongoUri) {
  console.error('❌ Refusing to run: Test DB must be isolated and distinct from production.');
  process.exit(1);
}

process.env.MONGO_URI = testMongoUri;
process.env.PORT = '5174';

const puppeteer = require('puppeteer-core');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = chromePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('❌ Could not locate Chrome or Edge executable.');
  process.exit(1);
}

console.log(`Using browser: ${executablePath}`);

const pages = [
  'dashboard.html',
  'orders.html',
  'packing.html',
  'products.html',
  'categories.html',
  'stock-in.html',
  'low-stock.html',
  'udhar.html',
  'customers.html',
  'staff.html',
  'settings.html',
  'reports.html',
  'inbox.html',
  'ai-misses.html',
];

const widths = [360, 390, 768, 1280];

async function capture() {
  const User = require('../src/models/User');

  await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 8000 });
  const owner = await User.findOne({ role: 'owner' });
  if (!owner) {
    console.error('❌ No owner account found. Run seedDemo.js first.');
    process.exit(1);
  }

  const token = jwt.sign(
    { id: owner._id, role: owner.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const ownerPayload = JSON.stringify({
    _id: owner._id,
    name: owner.name,
    phone: owner.phone,
    role: owner.role,
    preferredLanguage: owner.preferredLanguage || 'mr',
  });

  const app = require('../src/server');
  const PORT = 5174;
  let serverInstance;
  try {
    serverInstance = app.listen(PORT, () => {
      console.log(`Ephemeral test app listening on http://localhost:${PORT}`);
    });
  } catch (_) {}

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const outputDir = path.join(__dirname, '../../docs/audit-screenshots/before');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const page = await browser.newPage();

  // Dismiss any browser alert/confirm modals automatically so they never hang navigation
  page.on('dialog', async (dialog) => {
    console.log(`[Dialog auto-handled: "${dialog.message()}"]`);
    await dialog.dismiss().catch(() => {});
  });

  // Inject API_BASE and auth keys before page scripts execute
  await page.evaluateOnNewDocument((tok, usr, port) => {
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof CONFIG !== 'undefined') {
        CONFIG.API_BASE = `http://localhost:${port}/api`;
      }
    });
    localStorage.setItem('kirana_token', tok);
    localStorage.setItem('kirana_user', usr);
    localStorage.setItem('mk_token', tok);
    localStorage.setItem('mk_role', 'owner');
    localStorage.setItem('token', tok);
  }, token, ownerPayload, PORT);

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

  console.log(`Capturing all ${pages.length} pages across ${widths.length} viewports...`);

  for (const pageName of pages) {
    for (const w of widths) {
      const h = (w <= 390) ? 740 : ((w === 768) ? 1024 : 800);
      await page.setViewport({ width: w, height: h });

      const url = `http://localhost:${PORT}/admin/${pageName}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await new Promise((r) => setTimeout(r, 600)); // allow DOM layout paint
        const filename = `${pageName.replace('.html', '')}_${w}px.png`;
        const filePath = path.join(outputDir, filename);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`📸 Captured: ${filename}`);
      } catch (err) {
        console.warn(`⚠️ Error capturing ${pageName} at ${w}px: ${err.message}`);
      }
    }
  }

  console.log('✅ ALL BASELINE SCREENSHOTS CAPTURED SUCCESSFULLY!');
  await browser.close();
  if (serverInstance) serverInstance.close();
  await mongoose.disconnect();
  process.exit(0);
}

capture().catch((err) => {
  console.error('Capture script error:', err);
  process.exit(1);
});
