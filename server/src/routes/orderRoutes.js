'use strict';

const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  reorderOrder,
  respondSubstitution,
} = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiter');
const { validateCreateOrder } = require('../middleware/validate');

router.use(verifyToken);

router.post('/', orderLimiter, validateCreateOrder, createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.get('/:id/reorder', reorderOrder);
// R5: Customer responds to owner-proposed item substitution (ORD-06)
router.post('/:id/substitutions/:subId/respond', respondSubstitution);

module.exports = router;
