const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.post('/admin/login', adminController.login);
router.post('/admin/logout', authMiddleware, requireAdmin, adminController.logout);









router.get('/admin/users/search', authMiddleware, requireAdmin, adminController.searchUsers);
router.get('/admin/users/list', authMiddleware, requireAdmin, adminController.listUsers);


module.exports = router;
