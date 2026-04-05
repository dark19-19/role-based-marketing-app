const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRoles = require('../middleware/roleMiddleware');

const commissionController = require('../controllers/commissionController');


router.post('/commissions', auth, requireRoles(['ADMIN']),commissionController.create);
router.put('/commissions/:id', auth, requireRoles(['ADMIN']),commissionController.update);
router.delete('/commissions/:id',auth, requireRoles(['ADMIN']) ,commissionController.delete);

router.get('/commissions',auth, requireRoles(['ADMIN']) ,commissionController.list);
router.get('/commissions/:id', auth, requireRoles(['ADMIN']),commissionController.getById);
// router.get('/product/:productId',auth, requireRoles(['ADMIN']) ,commissionController.getByProductId);

module.exports = router;