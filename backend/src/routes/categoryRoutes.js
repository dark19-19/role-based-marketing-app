const express = require('express');
const router = express.Router();
const roleMiddleware = require('../middleware/roleMiddleware'); 
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.post(
  '/categories',
 authMiddleware,
 roleMiddleware(["مدير"]),
  categoryController.createCategory
);

router.get(
  '/categories',
 authMiddleware,
roleMiddleware(["مدير"]),
  categoryController.listCategories
);

router.put(
  '/categories/:id',
authMiddleware,
roleMiddleware(["مدير"]),
  categoryController.updateCategory
);

router.delete(
  '/categories/:id',
 authMiddleware,
 roleMiddleware(["مدير"]),
  categoryController.deleteCategory
);

module.exports = router;