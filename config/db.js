const mongoose = require("mongoose");

// MongoDB connection with optimized pool settings for traditional long-running server
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {});

    console.log(`MongoDB Connected ✅ to ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("Error connecting to MongoDB ❌", error.message);

    // Retry connection after 5 seconds
    console.log("Retrying connection in 5 seconds...");
    setTimeout(() => connectDB(), 5000);
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected from MongoDB");
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\nClosing MongoDB connection...");
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

module.exports = connectDB;
