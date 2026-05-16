const fs   = require("fs");
const path = require("path");
const Task = require("../models/Task");

// ─── SABİTLER ─────────────────────────────────────────────────────────────────

const TASK_STATUS = {
  PENDING:     "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
  UPCOMING:    "Upcoming",
  OVERDUE:     "Overdue",
};

const CATEGORIES       = ["Work", "School", "Personal", "Other"];
const PRIORITIES       = ["Low", "Medium", "High"];
const TASK_STATUSES    = ["Pending", "In Progress", "Completed"];
const UPCOMING_DAYS    = 3;
const RECENT_TASKS_LIMIT = 10;

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────────────────

const getUpcomingDateRange = () => {
  const start = new Date();
  const end   = new Date();
  end.setDate(end.getDate() + UPCOMING_DAYS);
  return { $gte: start, $lte: end };
};

const buildUserFilter = (userId) => ({
  $or: [{ createdBy: userId }, { assignedTo: userId }],
});

const formatAttachment = (file, userId) => {
  if (typeof file === "string") {
    return { fileName: "External Link", storagePath: file, fileSize: 0, uploader: userId };
  }
  return {
    fileName:    file.fileName    || "File",
    storagePath: file.storagePath,
    fileSize:    file.fileSize    || 0,
    uploader:    file.uploader    || userId,
  };
};

const attachCompletedTodoCount = (task) => ({
  ...task._doc,
  completedTodoCount: (task.todoChecklist || []).filter((i) => i.completed).length,
});

// Promise.all ile paralel countDocuments — S4123 (gereksiz await) bulgusunu çözer
const countTasks = async (baseFilter, countDefs) => {
  const results = await Promise.all(
    countDefs.map(({ extraFilter = {} }) =>
      Task.countDocuments({ ...baseFilter, ...extraFilter })
    )
  );
  return countDefs.reduce((acc, { key }, i) => {
    acc[key] = results[i];
    return acc;
  }, {});
};

// Tekrarlı aggregate + reduce örüntüsü — S3776 (cognitive complexity) bulgusunu çözer
const aggregateDistribution = (filter, field) =>
  Task.aggregate([
    { $match: filter },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);

const buildCountMap = (keys, raw, keyTransform = (k) => k) =>
  keys.reduce((acc, key) => {
    acc[keyTransform(key)] = raw.find((item) => item._id === key)?.count || 0;
    return acc;
  }, {});

// getDashboardData ve getUserDashboardData ortak payload — DRY + S3776
const buildDashboardPayload = async (userFilter) => {
  const [counts, statusRaw, priorityRaw, categoryRaw, recentTasks] =
    await Promise.all([
      countTasks(userFilter, [
        { key: "totalTasks" },
        { key: "pendingTasks",   extraFilter: { status: TASK_STATUS.PENDING } },
        { key: "completedTasks", extraFilter: { status: TASK_STATUS.COMPLETED } },
        { key: "overdueTasks",   extraFilter: { status: { $ne: TASK_STATUS.COMPLETED }, dueDate: { $lt: new Date() } } },
        { key: "upcomingTasks",  extraFilter: { status: { $ne: TASK_STATUS.COMPLETED }, dueDate: getUpcomingDateRange() } },
      ]),
      aggregateDistribution(userFilter, "status"),
      aggregateDistribution(userFilter, "priority"),
      aggregateDistribution(userFilter, "category"),
      Task.find(userFilter)
        .sort({ createdAt: -1 })
        .limit(RECENT_TASKS_LIMIT)
        .select("title status priority category dueDate createdAt"),
    ]);

  const taskDistribution = buildCountMap(
    TASK_STATUSES, statusRaw, (s) => s.replace(/\s+/g, "")
  );
  taskDistribution["All"] = counts.totalTasks;

  return {
    statistics: counts,
    charts: {
      taskDistribution,
      taskPriorityLevels:  buildCountMap(PRIORITIES, priorityRaw),
      taskCategoryLevels:  buildCountMap(CATEGORIES, categoryRaw),
    },
    recentTasks,
  };
};

// ─── CONTROLLER FONKSİYONLARI ────────────────────────────────────────────────

//@desc get all tasks
//@route GET /api/tasks
//@access private
const getTasks = async (req, res) => {
  try {
    const { status, category } = req.query;
    const userFilter = buildUserFilter(req.user._id);
    const filter     = { ...userFilter };

    if (category && category !== "All") filter.category = category;

    switch (status) {
      case TASK_STATUS.UPCOMING:
        filter.status  = { $ne: TASK_STATUS.COMPLETED };
        filter.dueDate = getUpcomingDateRange();
        break;
      case TASK_STATUS.OVERDUE:
        filter.status  = { $ne: TASK_STATUS.COMPLETED };
        filter.dueDate = { $lt: new Date() };
        break;
      default:
        if (status && status !== "All") filter.status = status;
    }

    const tasksFromDb = await Task.find(filter).populate(
      "assignedTo", "name email profileImageUrl"
    );
    const tasks = tasksFromDb.map(attachCompletedTodoCount);

    // S4123: Sıralı await yerine Promise.all ile paralel sayım
    const counts = await countTasks(userFilter, [
      { key: "all" },
      { key: "pendingTasks",    extraFilter: { status: TASK_STATUS.PENDING } },
      { key: "inProgressTasks", extraFilter: { status: TASK_STATUS.IN_PROGRESS } },
      { key: "completedTasks",  extraFilter: { status: TASK_STATUS.COMPLETED } },
      { key: "upcomingTasks",   extraFilter: { status: { $ne: TASK_STATUS.COMPLETED }, dueDate: getUpcomingDateRange() } },
      { key: "overdueTasks",    extraFilter: { status: { $ne: TASK_STATUS.COMPLETED }, dueDate: { $lt: new Date() } } },
    ]);

    const categoryCounts = await countTasks(userFilter,
      CATEGORIES.map((cat) => ({ key: cat.toLowerCase(), extraFilter: { category: cat } }))
    );

    res.json({ tasks, statusSummary: counts, categorySummary: categoryCounts });
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
      "assignedTo", "name email profileImageUrl"
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    const isCreator  = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (u) => u._id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
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
    const { title, description, priority, category, dueDate, assignedTo, attachments, todoChecklist } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!dueDate) {
      return res.status(400).json({ message: "Due date is required" });
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Due date is invalid" });
    }
    if (parsedDueDate < new Date()) {
      return res.status(400).json({ message: "Due date cannot be in the past" });
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `Priority must be one of: ${PRIORITIES.join(", ")}` });
    }

    const formattedAttachments = (attachments || []).map((file) =>
      formatAttachment(file, req.user._id)
    );

    const assignedToFinal = req.user.role !== "admin" ? [req.user._id] : assignedTo;

    const task = await Task.create({
      title: title.trim(),
      description,
      priority,
      category: category || "Other",
      dueDate: parsedDueDate,
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

    const isCreator  = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    const updatableFields = ["title", "description", "priority", "category", "dueDate", "todoChecklist"];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    if (req.body.attachments) {
      task.attachments = req.body.attachments.map((file) =>
        formatAttachment(file, req.user._id)
      );
    }

    if (req.body.assignedTo !== undefined) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can change task assignment" });
      }
      if (!Array.isArray(req.body.assignedTo)) {
        return res.status(400).json({ message: "assignedTo must be an array of user IDs" });
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
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    (task.attachments || []).forEach((attachment) => {
      const isUploadedFile = attachment.storagePath?.includes("/uploads/");
      if (!isUploadedFile) return;
      const fileName = attachment.storagePath.split("/").pop();
      const filePath = path.join(__dirname, "../uploads/files/", fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`${fileName} başarıyla silindi.`);
      }
    });

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

    const isCreator  = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res.status(403).json({ message: "Not authorized to update task status" });
    }

    if (req.body.status) task.status = req.body.status;

    if (task.status === TASK_STATUS.COMPLETED) {
      task.todoChecklist.forEach((item) => { item.completed = true; });
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

    const isCreator  = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isAssigned) {
      return res.status(403).json({ message: "Not authorized to update checklist" });
    }

    task.todoChecklist = todoChecklist;

    const completedCount = task.todoChecklist.filter((item) => item.completed).length;
    const totalItems     = task.todoChecklist.length;
    task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    if (task.progress === 100)      task.status = TASK_STATUS.COMPLETED;
    else if (task.progress > 0)     task.status = TASK_STATUS.IN_PROGRESS;
    else                            task.status = TASK_STATUS.PENDING;

    await task.save();

    const updatedTask = await Task.findById(req.params.id).populate(
      "assignedTo", "name email profileImageUrl"
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
    const payload = await buildDashboardPayload(buildUserFilter(req.user._id));
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//@desc get user dashboard data
//@route GET /api/tasks/user-dashboard-data
//@access private
const getUserDashboardData = async (req, res) => {
  try {
    const payload = await buildDashboardPayload(buildUserFilter(req.user._id));
    res.status(200).json(payload);
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