const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');
const deliveryPointController = require('../controllers/deliveryPointController');

const ALL_ROLES = [
  'ADMIN',
  'BRANCH_MANAGER',
  'GENERAL_SUPERVISOR',
  'SUPERVISOR',
  'MARKETER',
  'CUSTOMER',
];

router.get(
  '/branches/:branchId/delivery-points',
  authMiddleware,
  requireRole(ALL_ROLES),
  deliveryPointController.listForBranchPublic,
);

router.get(
  '/delivery-points/:id',
  authMiddleware,
  requireRole(ALL_ROLES),
  deliveryPointController.getPublicDetails,
);

router.get(
  '/delivery-points',
  authMiddleware,
  requireRole(['ADMIN', 'BRANCH_MANAGER']),
  deliveryPointController.listManagement,
);

router.post(
  '/delivery-points',
  authMiddleware,
  requireRole(['ADMIN', 'BRANCH_MANAGER']),
  deliveryPointController.create,
);

router.put(
  '/delivery-points/:id',
  authMiddleware,
  requireRole(['ADMIN', 'BRANCH_MANAGER']),
  deliveryPointController.update,
);

router.delete(
  '/delivery-points/:id',
  authMiddleware,
  requireRole(['ADMIN', 'BRANCH_MANAGER']),
  deliveryPointController.remove,
);

module.exports = router;

