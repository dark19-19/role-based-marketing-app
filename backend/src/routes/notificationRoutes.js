const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/notifications',auth,notificationController.list);

router.get('/notifications/count',auth,notificationController.count);

router.get('/notifications/unread-count',auth,notificationController.unreadCount);

router.get('/notifications/:id',auth,notificationController.getById);

router.patch('/notifications/:id/read',auth,notificationController.markAsRead);

router.delete('/notifications/:id',auth,notificationController.delete);

const helper = require('../helpers/notificationHelper');

router.post('/notifications', auth, helper.notify)

module.exports = router