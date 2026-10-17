'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken, requireOwnerOrStaff } = require('../middleware/auth');
const testimonialController = require('../controllers/testimonialController');

// Public route: fetch visible reviews
router.get('/', testimonialController.getTestimonials);

// Admin routes: manage reviews
router.get('/admin', verifyToken, requireOwnerOrStaff, testimonialController.getAdminTestimonials);
router.post('/', verifyToken, requireOwnerOrStaff, testimonialController.createTestimonial);
router.put('/:id', verifyToken, requireOwnerOrStaff, testimonialController.updateTestimonial);
router.delete('/:id', verifyToken, requireOwnerOrStaff, testimonialController.deleteTestimonial);

module.exports = router;
