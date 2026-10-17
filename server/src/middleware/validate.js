'use strict';

/**
 * validate.js — express-validator rules for every POST/PUT route.
 * Playbook 1.1: Add express-validator on every POST/PUT body.
 */

const { body, validationResult } = require('express-validator');

/** Sends a 422 with the first validation error if any exist. */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array({ onlyFirstError: true })[0].msg,
      errors: errors.array({ onlyFirstError: true }),
    });
  }
  next();
};

// Auth
const validateRegister = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.').escape(),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number.'),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters.'),
  handleValidationErrors,
];

const validateLogin = [
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Invalid phone or password.'),
  body('password').isLength({ min: 1 }).withMessage('Invalid phone or password.'),
  handleValidationErrors,
];

// Orders
const validateCreateOrder = [
  body('addressId').trim().isMongoId().withMessage('Please select a valid delivery address.'),
  body('slot').trim().notEmpty().withMessage('Please choose a delivery slot.'),
  body('paymentMethod').trim().isIn(['upi_qr', 'cod', 'udhar']).withMessage('Payment method must be upi_qr, cod, or udhar.'),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Order must contain 1-50 items.'),
  body('items.*.productId').isMongoId().withMessage('Each item must have a valid product ID.'),
  body('items.*.qty').isFloat({ gt: 0, max: 50 }).withMessage('Each item quantity must be between 0.1 and 50.'),
  body('paymentRef').optional().trim().isLength({ max: 20 }).withMessage('Payment reference cannot exceed 20 characters.').escape(),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Order note cannot exceed 500 characters.').escape(),
  body('locationPin').optional().trim().isLength({ max: 300 }).withMessage('Location pin cannot exceed 300 characters.').escape(),
  handleValidationErrors,
];

// Admin Products
const validateProductBody = [
  body('nameEn').trim().isLength({ min: 1, max: 200 }).withMessage('English name is required (max 200 chars).').escape(),
  body('nameMr').trim().isLength({ min: 1, max: 200 }).withMessage('Marathi name is required (max 200 chars).').escape(),
  body('packSize').trim().isLength({ min: 1, max: 100 }).withMessage('Pack size is required (max 100 chars).').escape(),
  body('categoryId').trim().isMongoId().withMessage('Valid category ID is required.'),
  body('price').isFloat({ min: 0, max: 100000 }).withMessage('Price must be a non-negative number.'),
  body('mrp').isFloat({ min: 0, max: 100000 }).withMessage('MRP must be a non-negative number.'),
  body('stockQuantity').optional().isFloat({ min: 0, max: 999999 }).withMessage('Stock quantity must be non-negative.'),
  body('reorderLevel').optional().isFloat({ min: 0 }).withMessage('Reorder level must be non-negative.'),
  body('unitType').optional().isIn(['piece', 'kg', 'g', 'litre', 'ml', 'pack']).withMessage('Unit type must be one of: piece, kg, g, litre, ml, pack.'),
  body('offerPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('Offer percent must be 0-100.'),
  handleValidationErrors,
];

// Admin Settings
const validateSettings = [
  body('minOrder').optional().isFloat({ min: 0, max: 100000 }).withMessage('Minimum order must be 0-100000.'),
  body('deliveryCharge').optional().isFloat({ min: 0, max: 10000 }).withMessage('Delivery charge must be 0-10000.'),
  body('freeDeliveryAbove').optional().isFloat({ min: 0, max: 100000 }).withMessage('Free delivery threshold must be 0-100000.'),
  body('upiMobile').optional().trim().isLength({ max: 50 }).withMessage('UPI mobile/ID cannot exceed 50 characters.').escape(),
  body('storeWhatsapp').optional().trim().isLength({ max: 20 }).withMessage('Store WhatsApp cannot exceed 20 characters.').escape(),
  body('storeHours').optional().trim().isLength({ max: 100 }).withMessage('Store hours cannot exceed 100 characters.').escape(),
  body('servicePincodes').optional().isArray().withMessage('Service pincodes must be an array.'),
  body('servicePincodes.*').optional().matches(/^\d{6}$/).withMessage('Each pincode must be exactly 6 digits.'),
  body('slots').optional().isArray().withMessage('Slots must be an array.'),
  handleValidationErrors,
];

// Admin Order Status
const validateOrderStatus = [
  body('status').trim().isIn(['new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled']).withMessage('Invalid order status.'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters.').escape(),
  handleValidationErrors,
];

module.exports = { validateRegister, validateLogin, validateCreateOrder, validateProductBody, validateSettings, validateOrderStatus, handleValidationErrors };
