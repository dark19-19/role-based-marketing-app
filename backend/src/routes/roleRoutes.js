const express = require('express');
const router = express.Router();

const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post(
  '/roles',
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  roleController.createRole
);

router.get(
  '/roles',
  authMiddleware,
    roleMiddleware(["ADMIN"]),
  roleController.getRoles
);

router.get(
  '/roles/:id',
  authMiddleware,
    roleMiddleware(["ADMIN"]),
  roleController.getRole
);

router.put(
  '/roles/:id',
  authMiddleware,
    roleMiddleware(["ADMIN"]),
  roleController.updateRole
);

router.delete(
  '/roles/:id',
  authMiddleware,
    roleMiddleware(["ADMIN"]),
  roleController.deleteRole
);

module.exports = router;