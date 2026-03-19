const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRoles = require('../middleware/roleMiddleware');

const orderController = require('../controllers/orderController');

router.post(
    '/orders',
    auth,
    requireRoles(['MARKETER','SUPERVISOR','GENERAL_SUPERVISOR','CUSTOMER']),
    orderController.create
);

router.put('/orders/:id/approve', auth, requireRoles(['BRANCH_MANAGER']), orderController.approve);
router.put('/orders/:id/reject', auth, requireRoles(['BRANCH_MANAGER']), orderController.reject)

router.get('/orders', auth, orderController.list);
router.get('/orders/:id', auth, orderController.getById);

module.exports = router;