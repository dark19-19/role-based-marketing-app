const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/auth/login", authController.login);

router.post("/auth/register", authController.registerCustomer);

// router.get("/auth/forgot-password/question", authController.forgotPasswordQuestion);
// router.post("/auth/forgot-password/answer", authController.forgotPasswordAnswer);
// router.post("/auth/forgot-password/reset", authController.resetPassword);

router.get("/auth/me", authMiddleware, authController.me);

router.post("/auth/logout", authMiddleware, authController.logout);

router.patch("/auth/profile", authMiddleware, authController.updateProfile);
router.patch("/auth/password", authMiddleware, authController.changePassword);
router.post("/auth/refresh", authMiddleware, authController.refresh);

module.exports = router;
