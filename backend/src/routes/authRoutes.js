const express = require('express');
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/users/me', authMiddleware, authController.me);
router.post('/auth/logout', authMiddleware, authController.logout);


module.exports = router;