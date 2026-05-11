const express = require("express");
const router = express.Router();
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionsByType,
  getTransactionsByCategory,
  getTransactionSummary,
  getTransactionsByDateRange,
  deleteAllTransactions,
} = require("../controllers/transactionController");

// CRUD
router.post("/", createTransaction);
router.get("/", getAllTransactions);
router.delete("/", deleteAllTransactions);

// ✅ Specific routes FIRST
router.get("/type/:type", getTransactionsByType);
router.get("/category/:category", getTransactionsByCategory);
router.get("/stats/summary", getTransactionSummary);
router.get("/stats/date-range", getTransactionsByDateRange);

// ❗ Dynamic route LAST
router.get("/:id", getTransactionById);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
