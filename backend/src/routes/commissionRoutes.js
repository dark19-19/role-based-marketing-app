const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRoles = require('../middleware/roleMiddleware');

const commissionController = require('../controllers/commissionController');

router.use(auth, requireRoles(['ADMIN']));

router.post('/commissions', commissionController.create);
router.put('/commissions/:id', commissionController.update);
router.delete('/commissions/:id', commissionController.delete);

router.get('/commissions', commissionController.list);
router.get('/commissions/:id', commissionController.getById);
// router.get('/product/:productId', commissionController.getByProductId);

module.exports = router;