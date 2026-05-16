const mongoose = require("mongoose");

const DB_MESSAGES = {
  CONNECTED: "MongoDB connected",
  ERROR: "Error connecting to MongoDB",
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log(DB_MESSAGES.CONNECTED);
  } catch (err) {
    console.error(DB_MESSAGES.ERROR, err);
    process.exit(1);
  }
};

module.exports = connectDB;