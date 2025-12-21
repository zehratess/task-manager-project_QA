const Task = require("../models/Task");

//@desc get all tasks (admin: all, user: assigned)
//@route GET /api/tasks
//@access private
const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { createdBy: req.user._id };

    if (status) {
      filter.status = status;
    }
    
      const tasksFromDb = await Task.find(filter).populate(
        "assignedTo",
        "name email profileImageUrl"
      );
    

    // Add completed todoChecklist count to each task
    const tasks = await Promise.all(
      tasksFromDb.map(async (task) => {
        const completedCount = (task.todoChecklist || []).filter((item) => item.completed).length;
        return { ...task._doc, completedTodoCount: completedCount };
      })
    );

    // Status summary counts
    const allTasks = await Task.countDocuments({ createdBy: req.user._id });

    const pendingTasks = await Task.countDocuments({
      status: "Pending",
      createdBy: req.user._id,
    });

    const inProgressTasks = await Task.countDocuments({
      status: "In Progress",
      createdBy: req.user._id,
    });

    const completedTasks = await Task.countDocuments({
      status: "Completed",
      createdBy: req.user._id,
    });

    res.json({
      tasks,
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
    });
  } catch (error) {

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

    // Sadece task'ı oluşturan görebilir
    if (task.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to view this task" });
}

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

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

    const assignedToFinal = req.user.role !== "admin" ? [req.user._id] : assignedTo;

    if (!Array.isArray(assignedToFinal)) {
    return res.status(400).json({ message: "assignedTo must be an array of user IDs" });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo: assignedToFinal,
      createdBy: req.user._id,
      attachments,
      todoChecklist,
    });

    res.status(201).json({ message: "Task created succesfully", task });
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

    // Sadece task'ı oluşturan güncelleyebilir
    if (task.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // User ise assignedTo değiştiremez
    if (req.user.role !== "admin" && req.body.assignedTo) {
    return res.status(403).json({ message: "Users cannot change task assignment" });
    }

    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
    task.attachments = req.body.attachments || task.attachments;

    if (req.body.assignedTo) {
      if (!Array.isArray(req.body.assignedTo)) {
        return res
          .status(400)
          .json({ message: "assignedTo must be an array of user IDs" });
      }
      task.assignedTo = req.body.assignedTo;
    }

    const updatedTask = await task.save();
    res.json({ message: "Task updated successfully", updatedTask });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc delete a task 
//@route DELETE /api/tasks/:id
//@access private 
  const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Sadece task'ı oluşturan silebilir
    if (task.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to delete this task" });
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

    // Sadece task'ı oluşturan değiştirebilir
    if (task.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to update task status" });
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

    // Sadece task'ı oluşturan değiştirebilir
    if (task.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to update checklist" });
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
    const totalTasks = await Task.countDocuments({ createdBy: req.user._id });
    const pendingTasks = await Task.countDocuments({ createdBy: req.user._id, status: "Pending" });
    const completedTasks = await Task.countDocuments({ createdBy: req.user._id, status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      createdBy: req.user._id,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Ensure all possible statuses are included
    const taskStatuses = ["Pending", "In Progress", "Completed"];

    const taskDistributionRaw = await Task.aggregate([
      { $match: { createdBy: req.user._id } },
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
      { $match: { createdBy: req.user._id } },
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
    const recentTasks = await Task.find({ createdBy: req.user._id })
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
    const userId = req.user._id; // Only fetch data for the logged-in user

    // Fetch statistics for user-specific tasks
    const totalTasks = await Task.countDocuments({ createdBy: userId });
    const pendingTasks = await Task.countDocuments({
      createdBy: userId,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      createdBy: userId,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      createdBy: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Task distribution by status
    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: { createdBy: userId } },
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
      { $match: { createdBy: userId } },
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
    const recentTasks = await Task.find({ createdBy: userId })
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
