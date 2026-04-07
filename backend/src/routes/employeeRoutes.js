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

// Remove employee - convert to customer
router.patch(
    '/employees/:id/remove',
    authMiddleware,
    requireRole(['ADMIN']),
    employeeController.remove
);

// Apply employee - convert customer to employee
router.patch(
    '/employees/apply',
    authMiddleware,
    requireRole(['ADMIN']),
    employeeController.apply
);

// Promote employee
router.patch(
    '/employees/:id/promote',
    authMiddleware,
    requireRole(['ADMIN']),
    employeeController.promote
);

// Demote employee
router.patch(
    '/employees/:id/demote',
    authMiddleware,
    requireRole(['ADMIN']),
    employeeController.demote
);


module.exports = router;