const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "userId is required for data isolation"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Please provide an expense title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    amount: {
      type: Number,
      required: [true, "Please provide an amount"],
      min: [0, "Amount cannot be negative"],
      set: (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100,
    },
    category: {
      type: String,
      default: "others",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Expense", expenseSchema);
