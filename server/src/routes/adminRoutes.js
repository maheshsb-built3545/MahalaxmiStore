'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, requireOwnerOrStaff } = require('../middleware/auth');
const { handleImageUpload } = require('../middleware/uploadMiddleware');
const admin = require('../controllers/adminController');
const { validateProductBody, validateSettings, validateOrderStatus } = require('../middleware/validate');

// ─── AUTHENTICATION ENFORCEMENT ───────────────────────────────────────────────
// Base check: user must be authenticated with valid JWT and be either owner or staff
router.use(verifyToken, requireOwnerOrStaff);

// Helper for owner-only actions
const requireOwnerOnly = requireRole('owner');

// ─── Dashboard & Polling ──────────────────────────────────────────────────────
router.get('/dashboard/stats', admin.getStats);
router.get('/dashboard/check-new', admin.checkNewOrders);

// ─── Orders Management ────────────────────────────────────────────────────────
router.get('/orders', admin.getOrders);
router.get('/orders/:id', admin.getOrderById);
router.patch('/orders/:id/status', validateOrderStatus, admin.updateOrderStatus);
router.patch('/orders/:id/cancel', admin.cancelOrder);
router.patch('/orders/:id/payment', admin.updatePaymentStatus);
router.post('/orders/packing-list', admin.getPackingList);

// ─── Products Catalog ─────────────────────────────────────────────────────────
router.get('/products', admin.getProducts);
router.post('/products', validateProductBody, admin.createProduct);
router.put('/products/:id', validateProductBody, admin.updateProduct);
router.patch('/products/:id/toggle-stock', admin.toggleStock);
router.delete('/products/:id', admin.deleteProduct);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', admin.getCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', admin.updateCategory);
router.patch('/categories/:id/toggle-active', admin.toggleCategoryActive);

// ─── Store Settings (Owner Only) ──────────────────────────────────────────────
router.get('/settings', admin.getSettings);
router.put('/settings', requireOwnerOnly, validateSettings, admin.updateSettings);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', admin.getCustomers);
router.get('/customers/:id/orders', admin.getCustomerOrders);
router.patch('/customers/:id/block', admin.toggleBlockCustomer);

// ─── Staff Management (Owner Only — ADM-01) ───────────────────────────────────
router.get('/staff', requireOwnerOnly, admin.getStaff);
router.post('/staff', requireOwnerOnly, admin.createStaff);
router.delete('/staff/:id', requireOwnerOnly, admin.deleteStaff);
router.patch('/staff/:id/toggle-block', requireOwnerOnly, admin.toggleStaffBlock);

// ─── Audit Log (ADM-02) ───────────────────────────────────────────────────────
router.get('/audit-logs', admin.getAuditLogs);

// ─── Reports & Analytics (ADM-03, WA-04) ──────────────────────────────────────
router.get('/reports', admin.getReports);
router.get('/reports/daily-settlement', admin.getDailySettlement);

// ─── CSV Exports (ADM-04) ─────────────────────────────────────────────────────
router.get('/export/orders.csv', admin.exportOrdersCsv);
router.get('/export/stock-log.csv', admin.exportStockLogsCsv);
router.get('/export/udhar-ledger.csv', admin.exportUdharLedgerCsv);

// ─── AI Alias Management (AI-08) ──────────────────────────────────────────────
router.post('/ai/add-alias', admin.addAliasFromAiMiss);
router.post('/ai/ignore-miss', admin.ignoreAiMiss);

// ─── Image Upload (Cloudinary) ────────────────────────────────────────────────
router.post('/upload', handleImageUpload('image'), admin.uploadImage);

// ─── Substitutions & System Maintenance (R5 & R6) ────────────────────────────
router.post('/orders/:id/substitutions/propose', admin.proposeSubstitution);
router.get('/backup/export', requireOwnerOnly, admin.exportBackup);
router.post('/notifications/cleanup-old', requireOwnerOnly, admin.cleanupOldNotifications);

module.exports = router;
