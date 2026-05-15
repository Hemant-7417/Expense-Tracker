const Transaction = require("../models/Transaction");
const { roundMoney } = require("../utils/money");

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { amount, type, account, category, description, date, recurringId } = req.body;

    if (!amount || !type || !account || !category) {
      return res.status(400).json({
        success: false,
        message: "Amount, type, account, and category are required",
      });
    }

    const transaction = await Transaction.create({
      userId: req.uid,
      amount: roundMoney(amount),
      type,
      account,
      category,
      description,
      date: date || new Date(),
      recurringId: recurringId || undefined,
    });

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all transactions (scoped to current user)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.uid }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get transaction by ID (scoped to current user)
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.uid });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update transaction (scoped to current user)
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, account, category, description, date } = req.body;

    let transaction = await Transaction.findOne({ _id: id, userId: req.uid });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (amount) transaction.amount = roundMoney(amount);
    if (type) transaction.type = type;
    if (account) transaction.account = account;
    if (category) transaction.category = category;
    if (description) transaction.description = description;
    if (date) transaction.date = date;

    await transaction.save();

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete transaction (scoped to current user)
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.uid });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get transactions by type (scoped to current user)
exports.getTransactionsByType = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: req.params.type, userId: req.uid }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get transactions by category (scoped to current user)
exports.getTransactionsByCategory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ category: req.params.category, userId: req.uid }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get transaction summary (scoped to current user)
exports.getTransactionSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $match: { userId: req.uid } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const accountSummary = await Transaction.aggregate([
      { $match: { userId: req.uid } },
      {
        $group: {
          _id: { account: "$account", type: "$type" },
          total: { $sum: "$amount" }
        }
      }
    ]);

    const round = roundMoney;

    const result = { income: 0, expense: 0, balance: 0, accounts: { cash: 0, upi: 0, bank: 0, card: 0 } };
    summary.forEach(item => {
      if (item._id === "income") result.income = round(item.total);
      if (item._id === "expense") result.expense = round(item.total);
    });
    result.balance = round(result.income - result.expense);

    accountSummary.forEach(item => {
      const acc = item._id.account || 'cash';
      const type = item._id.type;
      if (result.accounts[acc] === undefined) result.accounts[acc] = 0;
      if (type === "income") result.accounts[acc] = round(result.accounts[acc] + item.total);
      if (type === "expense") result.accounts[acc] = round(result.accounts[acc] - item.total);
    });


    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get transactions by date range (scoped to current user)
exports.getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const transactions = await Transaction.find({
      userId: req.uid,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete all transactions (scoped to current user only)
exports.deleteAllTransactions = async (req, res) => {
  try {
    await Transaction.deleteMany({ userId: req.uid });
    res.status(200).json({
      success: true,
      message: "All transactions deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
