'use strict';

/**
 * server/scripts/pinger.js
 *
 * Keepalive pinger for free-tier cloud deployments (e.g. Render / Railway).
 * R6 (NFR / SYS-03)
 *
 * Operational rules:
 * - Runs every 10 minutes.
 * - Active strictly during shop hours: 07:00 AM to 10:00 PM IST (Asia/Kolkata).
 * - Outside shop hours (10:00 PM - 07:00 AM IST), lets the free tier sleep to conserve quota.
 * - Pings GET /api/health and logs response time.
 */

const http = require('http');
const https = require('https');

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const TARGET_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}/api/health`;

function getIstHour() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());

  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
}

function isShopHours() {
  const hour = getIstHour();
  // Active between 07:00 (7 AM) and 21:59 (10 PM) IST
  return hour >= 7 && hour < 22;
}

function ping() {
  if (!isShopHours()) {
    const hour = getIstHour();
    console.log(`[PINGER] Current IST hour: ${hour}. Outside shop hours (07:00 - 22:00 IST). Standing by.`);
    return;
  }

  const start = Date.now();
  const client = TARGET_URL.startsWith('https') ? https : http;

  console.log(`[PINGER] Sending keepalive ping to ${TARGET_URL}...`);
  const req = client.get(TARGET_URL, (res) => {
    const elapsed = Date.now() - start;
    console.log(`[PINGER] Ping response: ${res.statusCode} (${elapsed}ms)`);
    res.resume(); // consume response data to free up memory
  });

  req.on('error', (err) => {
    console.warn(`[PINGER] Ping failed: ${err.message}`);
  });

  req.setTimeout(8000, () => {
    req.destroy();
    console.warn('[PINGER] Ping timed out after 8s');
  });
}

// Initial ping
ping();

// Recurring interval
setInterval(ping, PING_INTERVAL_MS);

console.log(`[PINGER] Keepalive service started for Mahalaxmi Kirana (target: ${TARGET_URL}).`);
