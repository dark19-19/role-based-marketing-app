const express = require('express');
const router = express.Router();

const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post(
  '/roles',
  authMiddleware,
  roleMiddleware(["مدير"]),
  roleController.createRole
);

router.get(
  '/roles',
  authMiddleware,
    roleMiddleware(["مدير"]),
  roleController.getRoles
);

router.get(
  '/roles/:id',
  authMiddleware,
    roleMiddleware(["مدير"]),
  roleController.getRole
);

router.put(
  '/roles/:id',
  authMiddleware,
    roleMiddleware(["مدير"]),
  roleController.updateRole
);

router.delete(
  '/roles/:id',
  authMiddleware,
    roleMiddleware(["مدير"]),
  roleController.deleteRole
);

module.exports = router;