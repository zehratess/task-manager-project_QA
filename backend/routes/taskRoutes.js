const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { 
  updateTaskChecklist, 
  updateTaskStatus, 
  deleteTask, 
  updateTask, 
  createTask, 
  getTaskById, 
  getTasks, 
  getDashboardData, 
  getUserDashboardData 
} = require("../controllers/taskController");

const router = express.Router();

//task management routes
// ✅ Özel route'lar ÖNCE gelir
router.get("/dashboard-data", protect, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/", protect, getTasks);

// ✅ Dinamik route EN SONA
router.get("/:id", protect, getTaskById);

router.post("/", protect, createTask);
router.put("/:id", protect, updateTask);
router.delete("/:id", protect, deleteTask);
router.put("/:id/status", protect, updateTaskStatus);
router.put("/:id/todo", protect, updateTaskChecklist);

module.exports = router;