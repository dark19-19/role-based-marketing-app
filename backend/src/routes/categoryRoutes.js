const express = require('express');
const router = express.Router();
const roleMiddleware = require('../middleware/roleMiddleware'); 
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.post(
  '/categories',
 authMiddleware,
 roleMiddleware(["ADMIN"]),
  categoryController.createCategory
);

router.get(
  '/categories',
 authMiddleware,
roleMiddleware(["ADMIN"]),
  categoryController.listCategories
);

router.put(
  '/categories/:id',
authMiddleware,
roleMiddleware(["ADMIN"]),
  categoryController.updateCategory
);

router.delete(
  '/categories/:id',
 authMiddleware,
 roleMiddleware(["ADMIN"]),
  categoryController.deleteCategory
);

module.exports = router;