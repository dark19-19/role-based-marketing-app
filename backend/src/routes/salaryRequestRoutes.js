const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');
const salaryController = require('../controllers/salaryRequestController');

// 1. Generic list route
router.get(
    '/salary-requests',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER', 'MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR']),
    salaryController.list
);

// 2. Creation route
router.post(
    '/salary-requests',
    authMiddleware,
    requireRole(['SUPERVISOR', 'GENERAL_SUPERVISOR', 'MARKETER']),
    salaryController.create
);

// 3. Status update and specialized actions
router.patch(
    '/salary-requests/:id/approve',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER']),
    salaryController.approve
);

router.patch(
    '/salary-requests/:id/reject',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER']),
    salaryController.reject
);

router.patch(
    '/salary-requests/:id/remove-transaction',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER']),
    salaryController.removeTransaction
);

// 4. Parameterized route (last)
router.get(
    '/salary-requests/:id',
    authMiddleware,
    requireRole(['ADMIN', 'SUPERVISOR', 'GENERAL_SUPERVISOR', 'MARKETER', 'BRANCH_MANAGER']),
    salaryController.getDetails
);

module.exports = router;