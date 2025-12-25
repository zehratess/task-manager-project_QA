const Task = require("../models/Task");

//@desc get all tasks (admin: all, user: assigned)
//@route GET /api/tasks
//@access private
const getTasks = async (req, res) => {
  try {
    const { status, category } = req.query;

    const filter = {
      $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
    };

    // ✅ Category filter
    if (category && category !== "All") {
      filter.category = category;
    }

    // ✅ Status filter
    if (status && status !== "Upcoming") {
      filter.status = status;
    }

    // ✅ Upcoming filter - 3 gün içinde
    if (status === "Upcoming") {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      filter.status = { $ne: "Completed" };
      filter.dueDate = {
        $gte: new Date(),
        $lte: threeDaysLater,
      };
    }

    if (status === "Overdue") {
      filter.dueDate = { $lt: new Date() }; // Bugünden küçük tarihler
      filter.status = { $ne: "Completed" }; // Tamamlanmamış olanlar
    }

    const tasksFromDb = await Task.find(filter).populate(
      "assignedTo",
      "name email profileImageUrl"
    );

    const tasks = tasksFromDb.map((task) => {
      const completedCount = (task.todoChecklist || []).filter(
        (item) => item.completed
      ).length;
      return { ...task._doc, completedTodoCount: completedCount };
    });

    const userFilter = {
      $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
    };

    const allTasks = await Task.countDocuments(userFilter);
    const pendingTasks = await Task.countDocuments({
      ...userFilter,
      status: "Pending",
    });
    const inProgressTasks = await Task.countDocuments({
      ...userFilter,
      status: "In Progress",
    });
    const completedTasks = await Task.countDocuments({
      ...userFilter,
      status: "Completed",
    });

    // ✅ Upcoming count
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const upcomingTasks = await Task.countDocuments({
      ...userFilter,
      status: { $ne: "Completed" },
      dueDate: {
        $gte: new Date(),
        $lte: threeDaysLater,
      },
    });
    
    const overdueTasks = await Task.countDocuments({
      ...userFilter,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // ✅ Category counts
    const workTasks = await Task.countDocuments({
      ...userFilter,
      category: "Work",
    });
    const schoolTasks = await Task.countDocuments({
      ...userFilter,
      category: "School",
    });
    const personalTasks = await Task.countDocuments({
      ...userFilter,
      category: "Personal",
    });
    const otherTasks = await Task.countDocuments({
      ...userFilter,
      category: "Other",
    });

    res.json({
      tasks,
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        upcomingTasks,
        overdueTasks,
      },
      categorySummary: {
        work: workTasks,
        school: schoolTasks,
        personal: personalTasks,
        other: otherTasks,
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

    // ✅ Creator VEYA assigned görebilir
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (userId) => userId._id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this task" });
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
      category,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    // ✅ Attachments'ı düzgün formatlayalım
    const formattedAttachments = (attachments || []).map((file) => {
      // Eğer string geldiyse (sadece URL), objeye çevir
      if (typeof file === "string") {
        return {
          fileName: "External Link",
          storagePath: file,
          fileSize: 0,
          uploader: req.user._id,
        };
      }
      // Eğer obje geldiyse, uploader'ı ekle
      return {
        fileName: file.fileName || "File",
        storagePath: file.storagePath,
        fileSize: file.fileSize || 0,
        uploader: req.user._id,
      };
    });

    const assignedToFinal =
      req.user.role !== "admin" ? [req.user._id] : assignedTo;

    const task = await Task.create({
      title,
      description,
      priority,
      category: category || "Other", // ✅ Default category
      dueDate,
      assignedTo: assignedToFinal,
      createdBy: req.user._id,
      attachments: formattedAttachments,
      todoChecklist,
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    console.error("TASK CREATE ERROR:", error);
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

    // ✅ Task'ı oluşturan veya assigned olan güncelleyebilir
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this task" });
    }

    // ✅ Update işlemleri
    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.category = req.body.category || task.category; // ✅ Category update
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoChecklist = req.body.todoChecklist || task.todoChecklist;

    // ✅ Attachments'ı düzgün formatlayalım
    if (req.body.attachments) {
      task.attachments = (req.body.attachments || []).map((file) => {
        if (typeof file === "string") {
          return {
            fileName: "External Link",
            storagePath: file,
            fileSize: 0,
            uploader: req.user._id,
          };
        }
        return {
          fileName: file.fileName || "File",
          storagePath: file.storagePath,
          fileSize: file.fileSize || 0,
          uploader: file.uploader || req.user._id,
        };
      });
    }

    // ✅ SADECE ADMIN assignedTo değiştirebilir
    if (req.body.assignedTo) {
      if (req.user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admins can change task assignment" });
      }

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
    console.error("UPDATE TASK ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc delete a task
//@route DELETE /api/tasks/:id
//@access private
const fs = require("fs"); // Dosya sistemine erişmek için
const path = require("path");

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this task" });
    }

    // ✅ Fiziksel dosyaları sil
    if (task.attachments && task.attachments.length > 0) {
      task.attachments.forEach((attachment) => {
        // Sadece upload edilmiş dosyaları sil (external link'leri değil)
        if (
          attachment.storagePath &&
          attachment.storagePath.includes("/uploads/")
        ) {
          const fileName = attachment.storagePath.split("/").pop();
          const filePath = path.join(__dirname, "../uploads/files/", fileName);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`${fileName} başarıyla silindi.`);
          }
        }
      });
    }

    await task.deleteOne();
    res.json({ message: "Task and its attachments deleted successfully" });
  } catch (error) {
    console.error("DELETE TASK ERROR:", error);
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

    // ✅ Creator VEYA assigned status değiştirebilir
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res
        .status(403)
        .json({ message: "Not authorized to update task status" });
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

    // ✅ Creator VEYA assigned checklist güncelleyebilir
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res
        .status(403)
        .json({ message: "Not authorized to update checklist" });
    }

    task.todoChecklist = todoChecklist;

    const completedCount = task.todoChecklist.filter(
      (item) => item.completed
    ).length;
    const totalItems = task.todoChecklist.length;
    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

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
    // ✅ Admin için de hem created hem assigned
    const userFilter = {
      $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
    };

    const totalTasks = await Task.countDocuments(userFilter);
    const pendingTasks = await Task.countDocuments({
      ...userFilter,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      ...userFilter,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      ...userFilter,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: userFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $match: userFilter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    // Yaklaşan görevler (3 gün içinde)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const upcomingTasks = await Task.countDocuments({
      ...userFilter,
      status: { $ne: "Completed" },
      dueDate: {
        $gte: new Date(),
        $lte: threeDaysLater,
      },
    });

    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // ✅ Category distribution
    const taskCategories = ["Work", "School", "Personal", "Other"];
    const taskCategoryLevelsRaw = await Task.aggregate([
      { $match: userFilter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const taskCategoryLevels = taskCategories.reduce((acc, category) => {
      acc[category] =
        taskCategoryLevelsRaw.find((item) => item._id === category)?.count || 0;
      return acc;
    }, {});

    const recentTasks = await Task.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority category dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
        upcomingTasks,
      },
      charts: { 
        taskDistribution, 
        taskPriorityLevels,
        taskCategoryLevels, // ✅ Yeni
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

    // ✅ Hem created hem assigned
    const userFilter = {
      $or: [{ createdBy: userId }, { assignedTo: userId }],
    };

    // Fetch statistics
    const totalTasks = await Task.countDocuments(userFilter);
    const pendingTasks = await Task.countDocuments({
      ...userFilter,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      ...userFilter,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      ...userFilter,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Task distribution by status
    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Yaklaşan görevler (3 gün içinde)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const upcomingTasks = await Task.countDocuments({
      ...userFilter,
      status: { $ne: "Completed" },
      dueDate: {
        $gte: new Date(),
        $lte: threeDaysLater,
      },
    });

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    // Task distribution by priority
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $match: userFilter },
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

    // ✅ Task distribution by category
    const taskCategories = ["Work", "School", "Personal", "Other"];
    const taskCategoryLevelsRaw = await Task.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskCategoryLevels = taskCategories.reduce((acc, category) => {
      acc[category] =
        taskCategoryLevelsRaw.find((item) => item._id === category)?.count || 0;
      return acc;
    }, {});

    // Fetch recent 10 tasks
    const recentTasks = await Task.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority category dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
        upcomingTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
        taskCategoryLevels, // ✅ Yeni
      },
      recentTasks,
    });
  } catch (error) {
    console.error("getUserDashboardData error:", error);
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






// const Task = require("../models/Task");



// //@desc get all tasks (admin: all, user: assigned)
// //@route GET /api/tasks
// //@access private
// const getTasks = async (req, res) => {
//   try {
//     const { status } = req.query;

//     const filter = {
//       $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
//     };

//     // ✅ Status filter
//     if (status && status !== "Upcoming") {
//       filter.status = status;
//     }

//     // ✅ Upcoming filter - 3 gün içinde
//     if (status === "Upcoming") {
//       const threeDaysLater = new Date();
//       threeDaysLater.setDate(threeDaysLater.getDate() + 3);

//       filter.status = { $ne: "Completed" };
//       filter.dueDate = {
//         $gte: new Date(),
//         $lte: threeDaysLater,
//       };
//     }

//     if (status === "Overdue") {
//       filter.dueDate = { $lt: new Date() }; // Bugünden küçük tarihler
//       filter.status = { $ne: "Completed" }; // Tamamlanmamış olanlar
//     }

//     const tasksFromDb = await Task.find(filter).populate(
//       "assignedTo",
//       "name email profileImageUrl"
//     );

//     const tasks = tasksFromDb.map((task) => {
//       const completedCount = (task.todoChecklist || []).filter(
//         (item) => item.completed
//       ).length;
//       return { ...task._doc, completedTodoCount: completedCount };
//     });

//     const userFilter = {
//       $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
//     };

//     const allTasks = await Task.countDocuments(userFilter);
//     const pendingTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "Pending",
//     });
//     const inProgressTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "In Progress",
//     });
//     const completedTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "Completed",
//     });

//     // ✅ Upcoming count
//     const threeDaysLater = new Date();
//     threeDaysLater.setDate(threeDaysLater.getDate() + 3);
//     const upcomingTasks = await Task.countDocuments({
//       ...userFilter,
//       status: { $ne: "Completed" },
//       dueDate: {
//         $gte: new Date(),
//         $lte: threeDaysLater,
//       },
//     });
    
//     const overdueTasks = await Task.countDocuments({
//       ...userFilter,
//       status: { $ne: "Completed" },
//       dueDate: { $lt: new Date() },
//     });

//     res.json({
//       tasks,
//       statusSummary: {
//         all: allTasks,
//         pendingTasks,
//         inProgressTasks,
//         completedTasks,
//         upcomingTasks, // ✅ Yeni
//         overdueTasks,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc get task by id
// //@route GET /api/tasks/:id
// //@access private
// const getTaskById = async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id).populate(
//       "assignedTo",
//       "name email profileImageUrl"
//     );

//     if (!task) return res.status(404).json({ message: "Task not found" });

//     // ✅ Creator VEYA assigned görebilir
//     const isCreator = task.createdBy.toString() === req.user._id.toString();
//     const isAssigned = task.assignedTo.some(
//       (userId) => userId._id.toString() === req.user._id.toString()
//     );

//     if (!isCreator && !isAssigned) {
//       return res
//         .status(403)
//         .json({ message: "Not authorized to view this task" });
//     }

//     res.json(task);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

// //@desc create a new task
// //@route POST /api/tasks
// //@access private
// // taskController.js -> createTask fonksiyonu içi
// const createTask = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       priority,
//       dueDate,
//       assignedTo,
//       attachments,
//       todoChecklist,
//     } = req.body;

//     // ✅ Attachments'ı düzgün formatlayalım
//     const formattedAttachments = (attachments || []).map((file) => {
//       // Eğer string geldiyse (sadece URL), objeye çevir
//       if (typeof file === "string") {
//         return {
//           fileName: "External Link",
//           storagePath: file,
//           fileSize: 0,
//           uploader: req.user._id,
//         };
//       }
//       // Eğer obje geldiyse, uploader'ı ekle
//       return {
//         fileName: file.fileName || "File",
//         storagePath: file.storagePath,
//         fileSize: file.fileSize || 0,
//         uploader: req.user._id,
//       };
//     });

//     const assignedToFinal =
//       req.user.role !== "admin" ? [req.user._id] : assignedTo;

//     const task = await Task.create({
//       title,
//       description,
//       priority,
//       dueDate,
//       assignedTo: assignedToFinal,
//       createdBy: req.user._id,
//       attachments: formattedAttachments,
//       todoChecklist,
//     });

//     res.status(201).json({ message: "Task created successfully", task });
//   } catch (error) {
//     console.error("TASK CREATE ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc update task details
// //@route PUT /api/tasks/:id
// //@access private
// const updateTask = async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);

//     if (!task) return res.status(404).json({ message: "Task not found" });

//     // ✅ Task'ı oluşturan veya assigned olan güncelleyebilir
//     const isCreator = task.createdBy.toString() === req.user._id.toString();
//     const isAssigned = task.assignedTo.some(
//       (userId) => userId.toString() === req.user._id.toString()
//     );

//     if (!isCreator && !isAssigned) {
//       return res
//         .status(403)
//         .json({ message: "Not authorized to update this task" });
//     }

//     // ✅ Update işlemleri
//     task.title = req.body.title || task.title;
//     task.description = req.body.description || task.description;
//     task.priority = req.body.priority || task.priority;
//     task.dueDate = req.body.dueDate || task.dueDate;
//     task.todoChecklist = req.body.todoChecklist || task.todoChecklist;

//     // ✅ Attachments'ı düzgün formatlayalım
//     if (req.body.attachments) {
//       task.attachments = (req.body.attachments || []).map((file) => {
//         if (typeof file === "string") {
//           return {
//             fileName: "External Link",
//             storagePath: file,
//             fileSize: 0,
//             uploader: req.user._id,
//           };
//         }
//         return {
//           fileName: file.fileName || "File",
//           storagePath: file.storagePath,
//           fileSize: file.fileSize || 0,
//           uploader: file.uploader || req.user._id,
//         };
//       });
//     }

//     // ✅ SADECE ADMIN assignedTo değiştirebilir
//     if (req.body.assignedTo) {
//       if (req.user.role !== "admin") {
//         return res
//           .status(403)
//           .json({ message: "Only admins can change task assignment" });
//       }

//       if (!Array.isArray(req.body.assignedTo)) {
//         return res
//           .status(400)
//           .json({ message: "assignedTo must be an array of user IDs" });
//       }
//       task.assignedTo = req.body.assignedTo;
//     }

//     const updatedTask = await task.save();
//     res.json({ message: "Task updated successfully", updatedTask });
//   } catch (error) {
//     console.error("UPDATE TASK ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc delete a task
// //@route DELETE /api/tasks/:id
// //@access private
// const fs = require("fs"); // Dosya sistemine erişmek için
// const path = require("path");

// const deleteTask = async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);

//     if (!task) return res.status(404).json({ message: "Task not found" });

//     if (task.createdBy.toString() !== req.user._id.toString()) {
//       return res
//         .status(403)
//         .json({ message: "Not authorized to delete this task" });
//     }

//     // ✅ Fiziksel dosyaları sil
//     if (task.attachments && task.attachments.length > 0) {
//       task.attachments.forEach((attachment) => {
//         // Sadece upload edilmiş dosyaları sil (external link'leri değil)
//         if (
//           attachment.storagePath &&
//           attachment.storagePath.includes("/uploads/")
//         ) {
//           const fileName = attachment.storagePath.split("/").pop();
//           const filePath = path.join(__dirname, "../uploads/files/", fileName);

//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//             console.log(`${fileName} başarıyla silindi.`);
//           }
//         }
//       });
//     }

//     await task.deleteOne();
//     res.json({ message: "Task and its attachments deleted successfully" });
//   } catch (error) {
//     console.error("DELETE TASK ERROR:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc update task status
// //@route PUT /api/tasks/:id/status
// //@access private
// const updateTaskStatus = async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);

//     if (!task) return res.status(404).json({ message: "Task not found" });

//     // ✅ Creator VEYA assigned status değiştirebilir
//     const isCreator = task.createdBy.toString() === req.user._id.toString();
//     const isAssigned = task.assignedTo.some(
//       (userId) => userId.toString() === req.user._id.toString()
//     );

//     if (!isCreator && !isAssigned) {
//       return res
//         .status(403)
//         .json({ message: "Not authorized to update task status" });
//     }

//     task.status = req.body.status || task.status;

//     if (task.status === "Completed") {
//       task.todoChecklist.forEach((item) => (item.completed = true));
//       task.progress = 100;
//     }

//     await task.save();
//     res.json({ message: "Task status updated", task });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc update task checklist
// //@route PUT /api/tasks/:id/todo
// //@access private
// const updateTaskChecklist = async (req, res) => {
//   try {
//     const { todoChecklist } = req.body;
//     const task = await Task.findById(req.params.id);

//     if (!task) return res.status(404).json({ message: "Task not found" });

//     // ✅ Creator VEYA assigned checklist güncelleyebilir
//     const isCreator = task.createdBy.toString() === req.user._id.toString();
//     const isAssigned = task.assignedTo.some(
//       (userId) => userId.toString() === req.user._id.toString()
//     );

//     if (!isCreator && !isAssigned) {
//       return res
//         .status(403)
//         .json({ message: "Not authorized to update checklist" });
//     }

//     task.todoChecklist = todoChecklist;

//     const completedCount = task.todoChecklist.filter(
//       (item) => item.completed
//     ).length;
//     const totalItems = task.todoChecklist.length;
//     task.progress =
//       totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

//     if (task.progress === 100) {
//       task.status = "Completed";
//     } else if (task.progress > 0) {
//       task.status = "In Progress";
//     } else {
//       task.status = "Pending";
//     }

//     await task.save();
//     const updatedTask = await Task.findById(req.params.id).populate(
//       "assignedTo",
//       "name email profileImageUrl"
//     );

//     res.json({ message: "Task checklist updated", task: updatedTask });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc get dashboard data (admin)
// //@route GET /api/tasks/dashboard-data
// //@access private
// //@desc get dashboard data (admin)
// //@route GET /api/tasks/dashboard-data
// //@access private
// const getDashboardData = async (req, res) => {
//   try {
//     // ✅ Admin için de hem created hem assigned
//     const userFilter = {
//       $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
//     };

//     const totalTasks = await Task.countDocuments(userFilter);
//     const pendingTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "Pending",
//     });
//     const completedTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "Completed",
//     });
//     const overdueTasks = await Task.countDocuments({
//       ...userFilter,
//       status: { $ne: "Completed" },
//       dueDate: { $lt: new Date() },
//     });

//     const taskStatuses = ["Pending", "In Progress", "Completed"];
//     const taskDistributionRaw = await Task.aggregate([
//       { $match: userFilter },
//       { $group: { _id: "$status", count: { $sum: 1 } } },
//     ]);

//     const taskDistribution = taskStatuses.reduce((acc, status) => {
//       const formattedKey = status.replace(/\s+/g, "");
//       acc[formattedKey] =
//         taskDistributionRaw.find((item) => item._id === status)?.count || 0;
//       return acc;
//     }, {});
//     taskDistribution["All"] = totalTasks;

//     const taskPriorities = ["Low", "Medium", "High"];
//     const taskPriorityLevelsRaw = await Task.aggregate([
//       { $match: userFilter },
//       { $group: { _id: "$priority", count: { $sum: 1 } } },
//     ]);

//     // Yaklaşan görevler (3 gün içinde)
//     const threeDaysLater = new Date();
//     threeDaysLater.setDate(threeDaysLater.getDate() + 3);

//     const upcomingTasks = await Task.countDocuments({
//       ...userFilter,
//       status: { $ne: "Completed" },
//       dueDate: {
//         $gte: new Date(), // Bugünden sonra
//         $lte: threeDaysLater, // 3 gün içinde
//       },
//     });

//     const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
//       acc[priority] =
//         taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
//       return acc;
//     }, {});

//     const recentTasks = await Task.find(userFilter)
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .select("title status priority dueDate createdAt");

//     res.status(200).json({
//       statistics: {
//         totalTasks,
//         pendingTasks,
//         completedTasks,
//         overdueTasks,
//         upcomingTasks,
//       },
//       charts: { taskDistribution, taskPriorityLevels },
//       recentTasks,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// //@desc get user dashboard data
// //@route GET /api/tasks/user-dashboard-data
// //@access private
// //@desc get user dashboard data
// //@route GET /api/tasks/user-dashboard-data
// //@access private
// const getUserDashboardData = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // ✅ Hem created hem assigned
//     const userFilter = {
//       $or: [{ createdBy: userId }, { assignedTo: userId }],
//     };

//     // Fetch statistics
//     const totalTasks = await Task.countDocuments(userFilter);
//     const pendingTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "Pending",
//     });
//     const completedTasks = await Task.countDocuments({
//       ...userFilter,
//       status: "Completed",
//     });
//     const overdueTasks = await Task.countDocuments({
//       ...userFilter,
//       status: { $ne: "Completed" },
//       dueDate: { $lt: new Date() },
//     });

//     // Task distribution by status
//     const taskStatuses = ["Pending", "In Progress", "Completed"];
//     const taskDistributionRaw = await Task.aggregate([
//       { $match: userFilter }, // ✅ userFilter kullan
//       {
//         $group: {
//           _id: "$status",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     // Yaklaşan görevler (3 gün içinde)
//     const threeDaysLater = new Date();
//     threeDaysLater.setDate(threeDaysLater.getDate() + 3);

//     const upcomingTasks = await Task.countDocuments({
//       ...userFilter,
//       status: { $ne: "Completed" },
//       dueDate: {
//         $gte: new Date(), // Bugünden sonra
//         $lte: threeDaysLater, // 3 gün içinde
//       },
//     });

//     const taskDistribution = taskStatuses.reduce((acc, status) => {
//       const formattedKey = status.replace(/\s+/g, "");
//       acc[formattedKey] =
//         taskDistributionRaw.find((item) => item._id === status)?.count || 0;
//       return acc;
//     }, {});
//     taskDistribution["All"] = totalTasks; // ✅ All ekle

//     // Task distribution by priority
//     const taskPriorities = ["Low", "Medium", "High"];
//     const taskPriorityLevelsRaw = await Task.aggregate([
//       { $match: userFilter }, // ✅ userFilter kullan
//       {
//         $group: {
//           _id: "$priority",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
//       acc[priority] =
//         taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
//       return acc;
//     }, {});

//     // Fetch recent 10 tasks
//     const recentTasks = await Task.find(userFilter) // ✅ userFilter kullan
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .select("title status priority dueDate createdAt");

//     res.status(200).json({
//       statistics: {
//         totalTasks,
//         pendingTasks,
//         completedTasks,
//         overdueTasks,
//         upcomingTasks,
//       },
//       charts: {
//         taskDistribution,
//         taskPriorityLevels,
//       },
//       recentTasks,
//     });
//   } catch (error) {
//     console.error("getUserDashboardData error:", error); // ✅ Debug
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// module.exports = {
//   getTasks,
//   getTaskById,
//   createTask,
//   updateTask,
//   deleteTask,
//   updateTaskStatus,
//   updateTaskChecklist,
//   getDashboardData,
//   getUserDashboardData,
// };
