const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authenticate, authController.resetPassword);
router.post("/logout", authController.logout);

router.get("/profile", authenticate, authController.getUserProfile);

module.exports = router;
