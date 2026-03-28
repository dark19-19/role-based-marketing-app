const express = require("express");
const router = express.Router();

const governorateController = require("../controllers/governorateController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/roleMiddleware");

router.post(
  "/governorates",
  authMiddleware,
  requireRole(["ADMIN"]),
  governorateController.create,
);

router.put(
  "/governorates/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  governorateController.update,
);

router.delete(
  "/governorates/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  governorateController.delete,
);

router.get(
  "/governorates",
  authMiddleware,
  requireRole([
    "ADMIN",
    "GENERAL_SUPERVISOR",
    "SUPERVISOR",
    "MARKETER",
    "BRANCH_MANAGER",
  ]),
  governorateController.list,
);

module.exports = router;
