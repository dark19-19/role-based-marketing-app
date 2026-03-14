const express = require('express');
const router = express.Router();

const governorateController = require('../controllers/governorateController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');

router.post(
    '/governorates',
    authMiddleware,
    requireRole(['مدير']),
    governorateController.create
);

router.put(
    '/governorates/:id',
    authMiddleware,
    requireRole(['مدير']),
    governorateController.update
);

router.delete(
    '/governorates/:id',
    authMiddleware,
    requireRole(['مدير']),
    governorateController.delete
);

router.get(
    '/governorates',
    authMiddleware,
    requireRole(['مدير']),
    governorateController.list
);

module.exports = router;