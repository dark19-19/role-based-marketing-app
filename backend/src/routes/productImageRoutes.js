const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');
const controller = require('../controllers/productImageController');

router.post(
  '/products/:id/images',
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  controller.addImage
);

router.get(
  '/products/:id/images',
  authMiddleware,
  roleMiddleware(["ADMIN", "MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR", "BRANCH_MANAGER", "CUSTOMER"]),
  controller.listImages
);

router.delete(
  '/product-images/:id',
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  controller.deleteImage
);

router.put(
  '/product-images/reorder',
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  controller.bulkUpdateOrder
);

router.put(
  '/product-images/:id/order',
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  controller.updateOrder
);

module.exports = router;