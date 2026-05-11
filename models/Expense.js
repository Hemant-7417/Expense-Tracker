const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
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
