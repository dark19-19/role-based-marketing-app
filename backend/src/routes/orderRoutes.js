const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRoles = require('../middleware/roleMiddleware');

const orderController = require('../controllers/orderController');
const orderCommentController = require('../controllers/orderCommentController');

router.post(
    '/orders',
    auth,
    requireRoles(['MARKETER','SUPERVISOR','GENERAL_SUPERVISOR','CUSTOMER']),
    orderController.create
);

router.put('/orders/:id/approve', auth, requireRoles(['BRANCH_MANAGER']), orderController.approve);
router.put('/orders/:id/reject', auth, requireRoles(['BRANCH_MANAGER']), orderController.reject);

// Cancel order - accessible by all roles with authorization checks in service layer
router.put('/orders/:id/cancel', auth, orderController.cancel);

router.get('/orders', auth, orderController.list);
router.get('/orders/:id', auth, orderController.getById);

// Order comments routes
// Add comment - accessible by employees, branch managers, marketers
router.post(
  '/orders/:orderId/comments',
  auth,
  requireRoles(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR', 'BRANCH_MANAGER']),
  orderCommentController.addComment
);

// Get comments - accessible by admin, branch manager of the branch, marketer who made the order
router.get(
  '/orders/:orderId/comments',
  auth,
  orderCommentController.getComments
);

module.exports = router;