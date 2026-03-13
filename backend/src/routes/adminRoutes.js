const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');


router.post('/admin/register',authMiddleware, roleMiddleware(['مدير']), adminController.registerAdmin);

router.post('/admin/create-user', authMiddleware, roleMiddleware(['مدير']), adminController.createUser);

router.get('/admin/users/search', authMiddleware,roleMiddleware(['مدير']), adminController.searchUsers);

router.get('/admin/users/list', authMiddleware,roleMiddleware(['مدير']), adminController.listUsers);


module.exports = router;
