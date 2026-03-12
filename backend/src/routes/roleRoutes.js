const express = require('express');
const router = express.Router();

const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { requireAdminRole } = require('../middleware/roleMiddleware');

router.post(
  '/roles',
  authMiddleware,
  requireAdmin,
  requireAdminRole,
  roleController.createRole
);

router.get(
  '/roles',
  authMiddleware,
  requireAdmin,
  requireAdminRole,
  roleController.getRoles
);

router.get(
  '/roles/:id',
  authMiddleware,
  requireAdmin,
  requireAdminRole,
  roleController.getRole
);

router.put(
  '/roles/:id',
  authMiddleware,
  requireAdmin,
  requireAdminRole,
  roleController.updateRole
);

router.delete(
  '/roles/:id',
  authMiddleware,
  requireAdmin,
  requireAdminRole,
  roleController.deleteRole
);

module.exports = router;