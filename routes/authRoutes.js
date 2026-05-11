const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  getMe,
  forgotPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);

// Protected routes
router.get("/me", protect, getMe);

module.exports = router;
