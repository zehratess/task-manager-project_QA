const Task = require("../models/Task");
//@desc get all tasks (everyone sees: assigned to them OR created by them)
//@route GET /api/tasks
//@access private
const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    
    // ✅ Base filter
    let baseFilter = {
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    };

    // ✅ Status filter varsa ekle
    if (status) {
      baseFilter.status = status;
    }

    const tasks = await Task.find(baseFilter)
      .populate("assignedTo", "name email profileImageUrl")
      .sort({ createdAt: -1 }); // ✅ En yeniler önce

    // Add completed todoChecklist count to each task
    const tasksWithCounts = tasks.map((task) => {
      const completedCount = task.todoChecklist.filter(
        (item) => item.completed
      ).length;
      return { ...task._doc, completedTodoCount: completedCount };
    });

    // Status summary counts
    const userFilter = {
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    };

    const allTasks = await Task.countDocuments(userFilter);
    const pendingTasks = await Task.countDocuments({ ...userFilter, status: "Pending" });
    const inProgressTasks = await Task.countDocuments({ ...userFilter, status: "In Progress" });
    const completedTasks = await Task.countDocuments({ ...userFilter, status: "Completed" });

    res.json({
      tasks: tasksWithCounts,
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
    });
  } catch (error) {
    console.error("getTasks error:", error); // ✅ Error log
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc get task by id
//@route GET /api/tasks/:id
//@access private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Admin tümünü görebilir, user sadece kendi oluşturduğu veya kendine atananı
    if (req.user.role !== "admin") {
      const isCreator = task.createdBy.toString() === req.user._id.toString();
      const isAssigned = task.assignedTo.some(
        (userId) => userId._id.toString() === req.user._id.toString()
      );

      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

//@desc create a new task (admin only)
//@route POST /api/tasks
//@access private (admin)
//@desc create a new task
//@route POST /api/tasks
//@access private
//@desc create a new task
//@route POST /api/tasks
//@access private
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    // User rolü için kısıtlama
    if (req.user.role !== "admin") {
      // ✅ DÜZELTME: String karşılaştırması yerine sadece array ve length kontrolü
      if (!Array.isArray(assignedTo) || assignedTo.length !== 1) {
        return res.status(403).json({ 
          message: "You can only create tasks assigned to yourself" 
        });
      }
      
      // ✅ assignedTo'yu kullanıcının kendi ID'si ile değiştir
      const task = await Task.create({
        title,
        description,
        priority,
        dueDate,
        assignedTo: [req.user._id], // Backend'de zorla user'ın kendi ID'si
        createdBy: req.user._id,
        attachments,
        todoChecklist,
      });

      return res.status(201).json({ message: "Task created successfully", task });
    }

    // Admin için normal flow
    if (!Array.isArray(assignedTo)) {
      return res.status(400).json({ 
        message: "assignedTo must be an array of user IDs" 
      });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user._id,
      attachments,
      todoChecklist,
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc update task details
//@route PUT /api/tasks/:id
//@access private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Admin tümünü güncelleyebilir, user sadece kendi oluşturduğunu veya kendine atananı
    if (req.user.role !== "admin") {
      const isCreator = task.createdBy.toString() === req.user._id.toString();
      const isAssigned = task.assignedTo.some(
        (userId) => userId.toString() === req.user._id.toString()
      );

      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }

      // User sadece kendine atayabilir
      if (req.body.assignedTo) {
        if (!Array.isArray(req.body.assignedTo) || 
            req.body.assignedTo.length !== 1 || 
            req.body.assignedTo[0] !== req.user._id.toString()) {
          return res.status(403).json({ 
            message: "You can only assign tasks to yourself" 
          });
        }
      }
    }

    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
    task.attachments = req.body.attachments || task.attachments;

    if (req.body.assignedTo) {
      if (!Array.isArray(req.body.assignedTo)) {
        return res.status(400).json({ 
          message: "assignedTo must be an array of user IDs" 
        });
      }
      task.assignedTo = req.body.assignedTo;
    }

    const updatedTask = await task.save();
    res.json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc delete a task (admin only)
//@route DELETE /api/tasks/:id
//@access private (admin)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Admin tümünü silebilir, user sadece kendi oluşturduğunu
    if (req.user.role !== "admin" && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "You can only delete tasks you created" 
      });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc update task status
//@route PUT /api/tasks/:id/status
//@access private
const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = req.body.status || task.status;

    if (task.status === "Completed") {
      task.todoChecklist.forEach((item) => (item.completed = true));
      task.progress = 100;
    }

    await task.save();
    res.json({ message: "Task status updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc update task checklist
//@route PUT /api/tasks/:id/todo
//@access private
const updateTaskChecklist = async (req, res) => {
  try {
    const { todoChecklist } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.assignedTo.includes(req.user._id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update checklist" });
    }

    task.todoChecklist = todoChecklist; // Replace with updated checklist

    // Auto-update progress based on checklist completion
    const completedCount = task.todoChecklist.filter(
      (item) => item.completed
    ).length;
    const totalItems = task.todoChecklist.length;
    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    // Auto-mark task as completed if all items are checked
    if (task.progress === 100) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else {
      task.status = "Pending";
    }

    await task.save();
    const updatedTask = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );

    res.json({ message: "Task checklist updated", task: updatedTask });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc get dashboard data (admin)
//@route GET /api/tasks/dashboard-data
//@access private
const getDashboardData = async (req, res) => {
  try {
    // Fetch statistics
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Ensure all possible statuses are included
    const taskStatuses = ["Pending", "In Progress", "Completed"];

    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response keys
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks; // Add total count to taskDistribution

    // Ensure all priority levels are included
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc get user dashboard data
//@route GET /api/tasks/user-dashboard-data
//@access private
const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    const userTaskFilter = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ]
    };

    // Fetch statistics for user-specific tasks
    const totalTasks = await Task.countDocuments(userTaskFilter);
    const pendingTasks = await Task.countDocuments({
      ...userTaskFilter,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      ...userTaskFilter,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      ...userTaskFilter,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Task distribution by status
    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: userTaskFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});

    // Task distribution by priority
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $match: userTaskFilter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch recent 10 tasks for the logged-in user
    const recentTasks = await Task.find(userTaskFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ... tüm fonksiyonlardan sonra, dosyanın EN SONUNA:

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
};