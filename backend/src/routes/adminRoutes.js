const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");

router.post(
  "/admin/register",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  adminController.registerAdmin,
);

router.post(
  "/admin/create-user",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  adminController.createUser,
);

router.get(
  "/admin/users/search",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  adminController.searchUsers,
);

router.get(
  "/admin/users/list",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  adminController.listUsers,
);

router.get(
  "/admin/employees/list",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  adminController.listEmployees,
);

router.patch(
  "/admin/users/:userId/password",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  adminController.resetUserPassword,
);

module.exports = router;
