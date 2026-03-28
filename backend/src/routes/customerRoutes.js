const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth");

const customerController = require("../controllers/customerController");
const requireRole = require("../middleware/roleMiddleware");

router.post(
  "/customers",
  authMiddleware,
  requireRole(["MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR"]),
  customerController.create,
);

router.get(
  "/customers",
  authMiddleware,
  requireRole(["ADMIN", "MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR"]),
  customerController.list,
);

router.get(
    '/customers/:id',
    authMiddleware,
    requireRole(['ADMIN', 'GENERAL_SUPERVISOR', 'SUPERVISOR', 'MARKETER', 'BRANCH_MANAGER']),
    customerController.getById
);

module.exports = router;
