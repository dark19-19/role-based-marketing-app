const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');
const couponController = require('../controllers/couponController');

router.get(
  '/coupons/check',
  auth,
  requireRole(['CUSTOMER']),
  couponController.checkAvailability,
);

router.post(
  '/coupons',
  auth,
  requireRole(['ADMIN']),
  couponController.create,
);

router.get(
  '/coupons',
  auth,
  requireRole(['ADMIN']),
  couponController.list,
);

router.get(
  '/coupons/:id',
  auth,
  requireRole(['ADMIN']),
  couponController.getById,
);

router.put(
  '/coupons/:id',
  auth,
  requireRole(['ADMIN']),
  couponController.update,
);

module.exports = router;

