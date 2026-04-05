// backend/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Task = require("./models/Task");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({});
  await Task.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const admin = await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: await bcrypt.hash("admin123", salt),
    role: "admin",
  });

  const user = await User.create({
    name: "Test Kullanıcı",
    email: "user@test.com",
    password: await bcrypt.hash("user1234", salt),
    role: "member",
  });

  await Task.create([
    { title: "İlk görev", priority: "High", dueDate: new Date("2026-05-01"), createdBy: admin._id, assignedTo: [user._id], status: "Pending", category: "Work" },
    { title: "İkinci görev", priority: "Low", dueDate: new Date("2026-05-15"), createdBy: admin._id, assignedTo: [admin._id], status: "In Progress", category: "Other" },
  ]);

  console.log("Seed tamamlandı.");
  process.exit(0);
};

seed();


