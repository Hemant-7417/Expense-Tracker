const Transaction = require("../models/Transaction");

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { amount, type, account, category, description, date } = req.body;

    if (!amount || !type || !account || !category) {
      return res.status(400).json({
        success: false,
        message: "Amount, type, account, and category are required",
      });
    }

    const transaction = await Transaction.create({
      amount,
      type,
      account,
      category,
      description,
      date: date || new Date(),
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

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });

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

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

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

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, account, category, description, date } = req.body;

    let transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (amount) transaction.amount = amount;
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

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);

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

// Get transactions by type
exports.getTransactionsByType = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: req.params.type }).sort({ date: -1 });

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

// Get transactions by category
exports.getTransactionsByCategory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ category: req.params.category }).sort({ date: -1 });

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

// Get transaction summary
exports.getTransactionSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const accountSummary = await Transaction.aggregate([
      {
        $group: {
          _id: { account: "$account", type: "$type" },
          total: { $sum: "$amount" }
        }
      }
    ]);

    const result = { income: 0, expense: 0, balance: 0, accounts: { cash: 0, upi: 0, bank: 0, card: 0 } };
    summary.forEach(item => {
      if (item._id === "income") result.income = item.total;
      if (item._id === "expense") result.expense = item.total;
    });
    result.balance = result.income - result.expense;

    accountSummary.forEach(item => {
      const acc = item._id.account || 'cash';
      const type = item._id.type;
      if (result.accounts[acc] === undefined) result.accounts[acc] = 0;
      if (type === "income") result.accounts[acc] += item.total;
      if (type === "expense") result.accounts[acc] -= item.total;
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

// Get transactions by date range
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

// Delete all transactions
exports.deleteAllTransactions = async (req, res) => {
  try {
    await Transaction.deleteMany({});
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
