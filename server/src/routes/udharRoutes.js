'use strict';

const express = require('express');
const router = express.Router();
const {
  getMyAccount,
  requestCreditAccount,
  getAdminAccounts,
  updateAccountStatus,
  recordPayment,
  recordDebit,
  getCustomerLedger,
  getWhatsAppReminder,
} = require('../controllers/udharController');
const { verifyToken, requireOwnerOrStaff } = require('../middleware/auth');

// Customer routes
router.get('/my-account', verifyToken, getMyAccount);
router.post('/request', verifyToken, requestCreditAccount);

// Owner / staff power tool routes
router.get('/admin/accounts', verifyToken, requireOwnerOrStaff, getAdminAccounts);
router.post('/admin/accounts/:id/status', verifyToken, requireOwnerOrStaff, updateAccountStatus);
router.post('/admin/accounts/:id/payment', verifyToken, requireOwnerOrStaff, recordPayment);
router.post('/admin/accounts/:id/debit', verifyToken, requireOwnerOrStaff, recordDebit);
router.get('/admin/accounts/:id/ledger', verifyToken, requireOwnerOrStaff, getCustomerLedger);
router.get('/admin/reminder/:id', verifyToken, requireOwnerOrStaff, getWhatsAppReminder);

module.exports = router;
