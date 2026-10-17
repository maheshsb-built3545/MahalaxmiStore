'use strict';
const express = require('express');
const router  = express.Router();
const { getProducts, getProduct, getBestSellers, getOffers } = require('../controllers/productController');

router.get('/',            getProducts);
router.get('/bestsellers', getBestSellers); // R2 (CAT-07)
router.get('/offers',      getOffers);      // R2 (CAT-06)
router.get('/:id',         getProduct);

module.exports = router;
