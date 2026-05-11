const express = require("express");
const router = express.Router();
const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getTotalExpense,
} = require("../controllers/expenseController");

// CRUD Routes
router.post("/", createExpense); // POST /api/expenses - Create new expense
router.get("/", getAllExpenses); // GET /api/expenses - Get all expenses
router.get("/:id", getExpenseById); // GET /api/expenses/:id - Get single expense
router.put("/:id", updateExpense); // PUT /api/expenses/:id - Update expense
router.delete("/:id", deleteExpense); // DELETE /api/expenses/:id - Delete expense

// Additional Routes
router.get("/category/:category", getExpensesByCategory); // GET /api/expenses/category/:category - Get by category
router.get("/stats/total", getTotalExpense); // GET /api/expenses/stats/total - Get total expenses

module.exports = router;
