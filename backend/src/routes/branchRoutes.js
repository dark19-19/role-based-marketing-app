const express = require("express");
const router = express.Router();

const branchController = require("../controllers/branchController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/roleMiddleware");

router.post(
  "/branches",
  authMiddleware,
  requireRole(["ADMIN"]),
  branchController.create,
);

router.put(
  "/branches/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  branchController.update,
);

router.delete(
  "/branches/:id",
  authMiddleware,
  requireRole(["ADMIN"]),
  branchController.delete,
);

router.get(
  "/branches",
  authMiddleware,
  requireRole([
    "ADMIN",
    "MARKETER",
    "SUPERVISOR",
    "BRANCH_MANAGER",
    "GENERAL_SUPERVISOR",
    "CUSTOMER",
  ]),
  branchController.list,
);

router.get(
  "/branches/:id",
  authMiddleware,
  requireRole([
    "ADMIN",
    "MARKETER",
    "SUPERVISOR",
    "BRANCH_MANAGER",
    "GENERAL_SUPERVISOR",
    "CUSTOMER",
  ]),
  branchController.getById,
);
router.patch(
  "/branches/:id/status",
  authMiddleware,
  requireRole(["ADMIN"]),
  branchController.updateStatus,
);
module.exports = router;
