const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Please provide an amount"],
      min: [0, "Amount cannot be negative"],
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Please specify transaction type (income/expense)"],
    },
    account: {
      type: String,
      enum: ["cash", "upi", "bank", "card"],
      default: "cash",
      required: [true, "Please provide an account type"],
    },
    category: {
      type: String,
      enum: [
        "food",
        "travel",
        "gaming",
        "bills",
        "shopping",
        "others",
      ],
      default: "others",
      required: [true, "Please provide a category"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
