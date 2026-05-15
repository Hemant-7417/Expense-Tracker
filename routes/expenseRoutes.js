const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getTotalExpense,
} = require("../controllers/expenseController");

// Apply Firebase auth middleware to ALL expense routes
router.use(protect);

router.post("/", createExpense);
router.get("/", getAllExpenses);
router.get("/total", getTotalExpense);
router.get("/category/:category", getExpensesByCategory);
router.get("/:id", getExpenseById);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
