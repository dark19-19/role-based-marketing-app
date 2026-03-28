const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth");
const requireRoles = require("../middleware/roleMiddleware");

const customerController = require("../controllers/customerController");
const requireRole = require("../middleware/roleMiddleware");

router.post(
  "/customers",
  authMiddleware,
  requireRoles(["MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR"]),
  customerController.create,
);

router.get(
  "/customers",
  authMiddleware,
  requireRole(["ADMIN ", "MARKETER", "SUPERVISOR", "GENERAL_SUPERVISOR"]),
  customerController.list,
);

module.exports = router;
