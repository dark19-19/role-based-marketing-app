const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');

// Employee routes
router.post(
    '/employees',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR']),
    employeeController.create
);

router.get(
    '/employees',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR']),
    employeeController.list
);

router.get(
    '/employees/hierarchy',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR']),
    employeeController.getHierarchy
);

router.get(
    '/employees/:id',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR']),
    employeeController.getDetails
);

router.put(
    '/employees/:id',
    authMiddleware,
    requireRole(['ADMIN', 'BRANCH_MANAGER']),
    employeeController.update
);

// Salary request routes
// router.post(
//     '/salary-requests',
//     authMiddleware,
//     requireRole(['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR', 'MARKETER']),
//     employeeController.createSalaryRequest
// );
//
// router.get(
//     '/salary-requests/:employeeId',
//     authMiddleware,
//     requireRole(['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR', 'MARKETER']),
//     employeeController.getSalaryRequests
// );
//
// router.put(
//     '/salary-requests/:id/status',
//     authMiddleware,
//     requireRole(['ADMIN', 'BRANCH_MANAGER']),
//     employeeController.updateSalaryRequestStatus
// );

module.exports = router;