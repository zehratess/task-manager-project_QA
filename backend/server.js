require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const mongoose = require('mongoose');

const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const taskRoutes = require("./routes/taskRoutes")
const reportRoutes = require("./routes/reportRoutes")
const fileRoutes = require("./routes/fileRoutes");

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/files", fileRoutes);

// ✅ DÜZELTME: Eğer test ortamında değilsek DB'ye bağlan ve server'ı başlat
if (process.env.NODE_ENV !== 'test') {
    // Sadece ana server çalışırken bu bağlantıyı kur
    connectDB();

    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// ✅ ÖNEMLİ: Manuel mongoose.connect kısmını sildik çünkü çakışma yaratıyordu

module.exports = app; // Testlerin (supertest) kullanabilmesi için şart