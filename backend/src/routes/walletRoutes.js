const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');
const walletController = require('../controllers/walletController');

router.get(
    '/summary',
    authMiddleware,
    requireRole(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR', 'BRANCH_MANAGER', 'ADMIN']),
    walletController.getSummary
);

router.get(
    '/transactions',
    authMiddleware,
    requireRole(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR', 'BRANCH_MANAGER', 'ADMIN']),
    walletController.getTransactions
);

module.exports = router;
