const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');
const config = require('../config');
const { createCacheAsideMiddleware } = require('../patterns/cacheAsideMiddleware');
const router = express.Router();

const productController = require('../controllers/productController');

router.post('/products',
    authMiddleware,
    roleMiddleware(["ADMIN"]),
     productController.createProduct);

router.get('/products',
    authMiddleware,
    roleMiddleware(["ADMIN", "MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR", "BRANCH_MANAGER", "CUSTOMER"]),
     createCacheAsideMiddleware({
       namespace: 'products:list',
       ttlSeconds: config.productsListCacheTtlSeconds,
     }),
     productController.listProducts);

router.get('/products/:id',
    authMiddleware,
    roleMiddleware(["ADMIN", "MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR", "BRANCH_MANAGER", "CUSTOMER"]),
    productController.getProduct);

router.put('/products/:id',
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    productController.updateProduct);

router.delete('/products/:id',authMiddleware,roleMiddleware(["ADMIN"]), productController.deleteProduct);

module.exports = router;
