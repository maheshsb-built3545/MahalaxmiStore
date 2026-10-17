'use strict';

/**
 * R1 — Inventory Routes
 * All routes require authentication + owner or staff role.
 */

const express  = require('express');
const router   = express.Router();
const { verifyToken, requireOwnerOrStaff } = require('../middleware/auth');
const inv = require('../controllers/inventoryController');

// All inventory management routes require owner or staff login
router.use(verifyToken, requireOwnerOrStaff);

// Low-stock list with dashboard badge count
router.get('/low-stock', inv.getLowStock);

// R5: Near-expiry list (products expiring within 30 days) (INV-08)
router.get('/near-expiry', inv.getNearExpiry);

// Stock log (history) for a specific product
router.get('/stock-log/:productId', inv.getStockLog);

// Fast stock-in (phone-friendly: search product, enter qty, save)
router.post('/stock-in', inv.stockIn);
router.post('/inward', inv.stockIn);

// Manual stock adjustment (requires note)
router.post('/adjust', inv.adjustStock);

// Toggle temporary unavailability flag for a product
router.patch('/unavailable/:id', inv.setUnavailable);

module.exports = router;
