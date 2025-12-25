import { useContext } from "react";
import { UserContext } from "../../context/userContext";
import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { PRIORITY_DATA } from "../../utils/data";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { LuTrash2 } from "react-icons/lu";
import SelectDropdown from "../../components/Inputs/SelectDropdown";
import SelectUsers from "../../components/Inputs/SelectUsers";
import TodoListInput from "../../components/Inputs/TodoListInput";
import AddAttachmentsInput from "../../components/Inputs/AddAttachmentsInput";
import Modal from "../../components/Modal";
import DeleteAlert from "../../components/DeleteAlert";

// ✅ CATEGORY_DATA - SelectDropdown ile uyumlu format
const CATEGORY_DATA = [
  { value: "Work", label: "Work" },
  { value: "School", label: "School" },
  { value: "Personal", label: "Personal" },
  { value: "Other", label: "Other" },
];

const CreateTask = () => {
  const location = useLocation();
  const { taskId } = location.state || {};
  const navigate = useNavigate();

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "Low",
    category: "Other", // ✅ YENİ ALAN
    dueDate: null,
    assignedTo: [],
    todoChecklist: [],
    attachments: [],
  });

  const [currentTask, setCurrentTask] = useState(null);

  const { user } = useContext(UserContext);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);

  const handleValueChange = (key, value) => {
    setError("");
    setTaskData((prevData) => ({ ...prevData, [key]: value }));
  };

  const clearData = () => {
    setTaskData({
      title: "",
      description: "",
      priority: "Low",
      category: "Other", // ✅ YENİ ALAN
      dueDate: null,
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
    });
  };

  const createTask = async () => {
    setLoading(true);

    try {
      const todoList = taskData.todoChecklist?.map((item) => ({
        text: item,
        completed: false,
      }));

      const assignedToData =
        user?.role === "admin" ? taskData.assignedTo : [user._id];

      const formattedAttachments = taskData.attachments.map((item) => ({
        fileName: item.fileName || "File",
        storagePath: item.storagePath,
        fileSize: item.fileSize || 0,
      }));

      const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        category: taskData.category, // ✅ YENİ ALAN
        assignedTo: assignedToData,
        dueDate: new Date(taskData.dueDate).toISOString(),
        todoChecklist: todoList,
        attachments: formattedAttachments,
      });

      toast.success("Task created successfully!");
      clearData();

      if (user?.role === "admin") {
        navigate("/admin/tasks");
      } else {
        navigate("/user/tasks");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error.response?.data?.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    setLoading(true);

    try {
      const todoList = taskData.todoChecklist?.map((item) => {
        const prevTodoChecklist = currentTask?.todoChecklist || [];
        const matchedTask = prevTodoChecklist.find(
          (task) => task.text === item
        );

        return {
          text: item,
          completed: matchedTask ? matchedTask.completed : false,
        };
      });

      const formattedAttachments = taskData.attachments.map((item) => ({
        fileName: item.fileName || "File",
        storagePath: item.storagePath,
        fileSize: item.fileSize || 0,
        uploader: item.uploader,
      }));

      const requestBody = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        category: taskData.category, // ✅ YENİ ALAN
        dueDate: new Date(taskData.dueDate).toISOString(),
        todoChecklist: todoList,
        attachments: formattedAttachments,
      };

      if (user?.role === "admin") {
        requestBody.assignedTo = taskData.assignedTo;
      }

      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TASK(taskId),
        requestBody
      );

      toast.success("Task updated successfully!");

      if (user?.role === "admin") {
        navigate("/admin/tasks");
      } else {
        navigate("/user/tasks");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(error.response?.data?.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const getTaskDetailsByID = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_BY_ID(taskId)
      );

      if (response.data) {
        const taskInfo = response.data;
        setCurrentTask(taskInfo);

        setTaskData((prevState) => ({
          title: taskInfo.title,
          description: taskInfo.description,
          priority: taskInfo.priority,
          category: taskInfo.category || "Other", // ✅ YENİ ALAN
          dueDate: taskInfo.dueDate
            ? moment(taskInfo.dueDate).format("YYYY-MM-DD")
            : null,
          assignedTo: taskInfo?.assignedTo.map((item) => item?._id) || [],
          todoChecklist:
            taskInfo?.todoChecklist.map((item) => item?.text) || [],
          attachments: taskInfo?.attachments || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching task:", error);
    }
  }, [taskId]);

  const handleSubmit = async () => {
    setError(null);

    if (!taskData.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!taskData.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!taskData.dueDate) {
      setError("Due date is required.");
      return;
    }
    if (user?.role === "admin" && taskData.assignedTo?.length === 0) {
      setError("Task not assigned to any member");
      return;
    }

    if (taskData.todoChecklist?.length === 0) {
      setError("Add at least one todo task");
      return;
    }

    if (taskId) {
      updateTask();
      return;
    }

    createTask();
  };

  const deleteTask = async () => {
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));
      setOpenDeleteAlert(false);
      toast.success("Task deleted successfully");
      navigate("/admin/tasks");
    } catch (error) {
      console.error(
        "Error deleting task:",
        error.response?.data?.message || error.message
      );
      toast.error("Failed to delete task");
    }
  };

  useEffect(() => {
    if (taskId) {
      getTaskDetailsByID();
    }
  }, [taskId, getTaskDetailsByID]);

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
          <div className="form-card col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-xl font-medium">
                {taskId ? "Update Task" : "Create Task"}
              </h2>

              {taskId &&
                currentTask &&
                (user?.role === "admin" ||
                  currentTask.createdBy === user?._id) && (
                  <button
                    className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-rose-500 rounded px-2 py-1 border border-rose-100 hover:border-rose-300 cursor-pointer"
                    onClick={() => setOpenDeleteAlert(true)}
                  >
                    <LuTrash2 className="text-base" /> Delete
                  </button>
                )}
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">
                Task Title
              </label>

              <input
                placeholder="Create App UI"
                className="form-input"
                value={taskData.title || ""}
                onChange={({ target }) =>
                  handleValueChange("title", target.value)
                }
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Description
              </label>

              <textarea
                placeholder="Describe task"
                className="form-input"
                rows={4}
                value={taskData.description}
                onChange={({ target }) =>
                  handleValueChange("description", target.value)
                }
              />
            </div>

            {/* ✅ 3 SÜTUNLU GRİD: Priority, Category, Due Date */}
            <div className="grid grid-cols-12 gap-4 mt-2">
              <div className="col-span-6 md:col-span-4">
                <label className="text-xs font-medium text-slate-600">
                  Priority
                </label>

                <SelectDropdown
                  options={PRIORITY_DATA}
                  value={taskData.priority}
                  onChange={(value) => handleValueChange("priority", value)}
                  placeholder="Select Priority"
                />
              </div>

              {/* ✅✅✅ YENİ: CATEGORY DROPDOWN ✅✅✅ */}
              <div className="col-span-6 md:col-span-4">
                <label className="text-xs font-medium text-slate-600">
                  Category
                </label>

                <SelectDropdown
                  options={CATEGORY_DATA}
                  value={taskData.category}
                  onChange={(value) => handleValueChange("category", value)}
                  placeholder="Select Category"
                />
              </div>

              <div className="col-span-6 md:col-span-4">
                <label className="text-xs font-medium text-slate-600">
                  Due Date
                </label>

                <input
                  placeholder="Select date"
                  className="form-input"
                  value={taskData.dueDate || ""}
                  onChange={({ target }) =>
                    handleValueChange("dueDate", target.value)
                  }
                  type="date"
                />
              </div>

              {user?.role === "admin" && (
                <div className="col-span-12">
                  <label className="text-xs font-medium text-slate-600">
                    Assign To
                  </label>

                  <SelectUsers
                    selectedUsers={taskData.assignedTo}
                    setSelectedUsers={(value) => {
                      handleValueChange("assignedTo", value);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                TODO Checklist
              </label>

              <TodoListInput
                todoList={taskData?.todoChecklist}
                setTodoList={(value) =>
                  handleValueChange("todoChecklist", value)
                }
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Add Attachments
              </label>

              <AddAttachmentsInput
                todoList={taskData?.attachments}
                setTodoList={(value) => handleValueChange("attachments", value)}
                user={user}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-500 mt-5">{error}</p>
            )}

            <div className="flex justify-end mt-7">
              <button
                className="add-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {taskId ? "UPDATE TASK" : "CREATE TASK"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        title="Delete Task"
      >
        <DeleteAlert
          content="Are you sure you want to delete this task?"
          onDelete={() => deleteTask()}
        />
      </Modal>
    </DashboardLayout>
  );
};

export default CreateTask;


// import { useContext } from "react"; // en üste ekle
// import { UserContext } from "../../context/userContext";
// import React, { useState, useEffect, useCallback } from "react";
// import DashboardLayout from "../../components/layouts/DashboardLayout";
// import { PRIORITY_DATA } from "../../utils/data";
// import axiosInstance from "../../utils/axiosInstance";
// import { API_PATHS } from "../../utils/apiPaths";
// import toast from "react-hot-toast";
// import { useLocation, useNavigate } from "react-router-dom";
// import moment from "moment";
// import { LuTrash2 } from "react-icons/lu";
// import SelectDropdown from "../../components/Inputs/SelectDropdown";
// import SelectUsers from "../../components/Inputs/SelectUsers";
// import TodoListInput from "../../components/Inputs/TodoListInput";
// import AddAttachmentsInput from "../../components/Inputs/AddAttachmentsInput";
// import Modal from "../../components/Modal";
// import DeleteAlert from "../../components/DeleteAlert";

// const CreateTask = () => {
//   const location = useLocation();
//   const { taskId } = location.state || {};
//   const navigate = useNavigate();

//   const [taskData, setTaskData] = useState({
//     title: "",
//     description: "",
//     priority: "Low",
//     dueDate: null,
//     assignedTo: [],
//     todoChecklist: [],
//     attachments: [],
//   });

//   const [currentTask, setCurrentTask] = useState(null);

//   const { user } = useContext(UserContext);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const [openDeleteAlert, setOpenDeleteAlert] = useState(false);

//   const handleValueChange = (key, value) => {
//     setError(""); // Kullanıcı düzeltme yaptığında error'u temizle (cl)
//     setTaskData((prevData) => ({ ...prevData, [key]: value }));
//   };

//   const clearData = () => {
//     // reset form
//     setTaskData({
//       title: "",
//       description: "",
//       priority: "Low",
//       dueDate: null,
//       assignedTo: [],
//       todoChecklist: [],
//       attachments: [],
//     });
//   };

//   // Create Task
//   // CreateTask fonksiyonu içinde
//   // Create Task
//   const createTask = async () => {
//     setLoading(true);

//     try {
//       const todoList = taskData.todoChecklist?.map((item) => ({
//         text: item,
//         completed: false,
//       }));

//       const assignedToData =
//         user?.role === "admin" ? taskData.assignedTo : [user._id];

//       // ✅ Attachments'ı düzgün formatlayalım
//       const formattedAttachments = taskData.attachments.map((item) => ({
//         fileName: item.fileName || "File",
//         storagePath: item.storagePath,
//         fileSize: item.fileSize || 0,
//       }));

//       const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, {
//         title: taskData.title,
//         description: taskData.description,
//         priority: taskData.priority,
//         assignedTo: assignedToData,
//         dueDate: new Date(taskData.dueDate).toISOString(),
//         todoChecklist: todoList,
//         attachments: formattedAttachments,
//       });

//       toast.success("Task created successfully!");
//       clearData();

//       // ✅ Task oluşturduktan sonra tasks sayfasına yönlendir
//       if (user?.role === "admin") {
//         navigate("/admin/tasks");
//       } else {
//         navigate("/user/tasks");
//       }
//     } catch (error) {
//       console.error("Error creating task:", error);
//       toast.error(error.response?.data?.message || "Failed to create task");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Update Task
//   // Update Task
//   // Update Task
//   // Update Task
//   const updateTask = async () => {
//     setLoading(true);

//     try {
//       const todoList = taskData.todoChecklist?.map((item) => {
//         const prevTodoChecklist = currentTask?.todoChecklist || [];
//         const matchedTask = prevTodoChecklist.find(
//           (task) => task.text === item
//         );

//         return {
//           text: item,
//           completed: matchedTask ? matchedTask.completed : false,
//         };
//       });

//       // ✅ Attachments'ı düzgün formatlayalım
//       const formattedAttachments = taskData.attachments.map((item) => ({
//         fileName: item.fileName || "File",
//         storagePath: item.storagePath,
//         fileSize: item.fileSize || 0,
//         uploader: item.uploader, // Varsa koru
//       }));

//       // ✅ Request body'yi hazırla
//       const requestBody = {
//         title: taskData.title,
//         description: taskData.description,
//         priority: taskData.priority,
//         dueDate: new Date(taskData.dueDate).toISOString(),
//         todoChecklist: todoList,
//         attachments: formattedAttachments,
//       };

//       // ✅ SADECE ADMIN assignedTo gönderebilir
//       if (user?.role === "admin") {
//         requestBody.assignedTo = taskData.assignedTo;
//       }

//       const response = await axiosInstance.put(
//         API_PATHS.TASKS.UPDATE_TASK(taskId),
//         requestBody
//       );

//       toast.success("Task updated successfully!");

//       if (user?.role === "admin") {
//         navigate("/admin/tasks");
//       } else {
//         // Eğer rolün 'member' ise App.jsx'teki yola gönder
//         navigate("/user/tasks");
//       }
//     } catch (error) {
//       console.error("Error updating task:", error);
//       toast.error(error.response?.data?.message || "Failed to update task");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getTaskDetailsByID = useCallback(async () => {
//     try {
//       const response = await axiosInstance.get(
//         API_PATHS.TASKS.GET_TASK_BY_ID(taskId)
//       );

//       if (response.data) {
//         const taskInfo = response.data;
//         setCurrentTask(taskInfo);

//         setTaskData((prevState) => ({
//           title: taskInfo.title,
//           description: taskInfo.description,
//           priority: taskInfo.priority,
//           dueDate: taskInfo.dueDate
//             ? moment(taskInfo.dueDate).format("YYYY-MM-DD")
//             : null,
//           assignedTo: taskInfo?.assignedTo.map((item) => item?._id) || [],
//           todoChecklist:
//             taskInfo?.todoChecklist.map((item) => item?.text) || [],
//           attachments: taskInfo?.attachments || [],
//         }));
//       }
//     } catch (error) {
//       console.error("Error fetching task:", error);
//     }
//   }, [taskId]);

//   const handleSubmit = async () => {
//     setError(null);

//     // Input validation
//     if (!taskData.title.trim()) {
//       setError("Title is required.");
//       return;
//     }

//     if (!taskData.description.trim()) {
//       setError("Description is required.");
//       return;
//     }

//     if (!taskData.dueDate) {
//       setError("Due date is required.");
//       return;
//     }
//     if (user?.role === "admin" && taskData.assignedTo?.length === 0) {
//       setError("Task not assigned to any member");
//       return;
//     }

//     if (taskData.todoChecklist?.length === 0) {
//       setError("Add at least one todo task");
//       return;
//     }

//     if (taskId) {
//       updateTask();
//       return;
//     }

//     createTask();
//   };

//   // Delete Task
//   const deleteTask = async () => {
//     try {
//       await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId)); // Tetiği burası çeker
//       setOpenDeleteAlert(false);
//       toast.success("Task deleted successfully");
//       navigate("/admin/tasks");
//     } catch (error) {
//       console.error(
//         "Error deleting task:",
//         error.response?.data?.message || error.message
//       );
//       toast.error("Failed to delete task");
//     }
//   };

//   useEffect(() => {
//     if (taskId) {
//       getTaskDetailsByID();
//     }
//   }, [taskId, getTaskDetailsByID]);

//   return (
//     <DashboardLayout activeMenu="Create Task">
//       <div className="mt-5">
//         <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
//           <div className="form-card col-span-3">
//             <div className="flex items-center justify-between">
//               <h2 className="text-xl md:text-xl font-medium">
//                 {taskId ? "Update Task" : "Create Task"}
//               </h2>

//               {taskId &&
//                 currentTask &&
//                 // Admin tümünü silebilir, user sadece kendi oluşturduğunu
//                 (user?.role === "admin" ||
//                   currentTask.createdBy === user?._id) && (
//                   <button
//                     className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-rose-500 rounded px-2 py-1 border border-rose-100 hover:border-rose-300 cursor-pointer"
//                     onClick={() => setOpenDeleteAlert(true)}
//                   >
//                     <LuTrash2 className="text-base" /> Delete
//                   </button>
//                 )}
//             </div>

//             <div className="mt-4">
//               <label className="text-xs font-medium text-slate-600">
//                 Task Title
//               </label>

//               <input
//                 placeholder="Create App UI"
//                 className="form-input"
//                 value={taskData.title || ""}
//                 onChange={({ target }) =>
//                   handleValueChange("title", target.value)
//                 }
//               />
//             </div>

//             <div className="mt-3">
//               <label className="text-xs font-medium text-slate-600">
//                 Description
//               </label>

//               <textarea
//                 placeholder="Describe task"
//                 className="form-input"
//                 rows={4}
//                 value={taskData.description}
//                 onChange={({ target }) =>
//                   handleValueChange("description", target.value)
//                 }
//               />
//             </div>

//             <div className="grid grid-cols-12 gap-4 mt-2">
//               <div className="col-span-6 md:col-span-4">
//                 <label className="text-xs font-medium text-slate-600">
//                   Priority
//                 </label>

//                 <SelectDropdown
//                   options={PRIORITY_DATA}
//                   value={taskData.priority}
//                   onChange={(value) => handleValueChange("priority", value)}
//                   placeholder="Select Priority"
//                 />
//               </div>

//               <div className="col-span-6 md:col-span-4">
//                 <label className="text-xs font-medium text-slate-600">
//                   Due Date
//                 </label>

//                 <input
//                   placeholder="Create App UI"
//                   className="form-input"
//                   value={taskData.dueDate || ""}
//                   onChange={({ target }) =>
//                     handleValueChange("dueDate", target.value)
//                   }
//                   type="date"
//                 />
//               </div>

//               {/* ✅ Sadece admin görebilir */}
//               {user?.role === "admin" && (
//                 <div className="col-span-12 md:col-span-3">
//                   <label className="text-xs font-medium text-slate-600">
//                     Assign To
//                   </label>

//                   <SelectUsers
//                     selectedUsers={taskData.assignedTo}
//                     setSelectedUsers={(value) => {
//                       handleValueChange("assignedTo", value);
//                     }}
//                   />
//                 </div>
//               )}
//             </div>

//             <div className="mt-3">
//               <label className="text-xs font-medium text-slate-600">
//                 TODO Checklist
//               </label>

//               <TodoListInput
//                 todoList={taskData?.todoChecklist}
//                 setTodoList={(value) =>
//                   handleValueChange("todoChecklist", value)
//                 }
//               />
//             </div>

//             <div className="mt-3">
//               <label className="text-xs font-medium text-slate-600">
//                 Add Attachments
//               </label>

//               <AddAttachmentsInput
//                 todoList={taskData?.attachments}
//                 setTodoList={(value) => handleValueChange("attachments", value)}
//                 user={user} // Bunu ekledik
//               />
//             </div>

//             {error && (
//               <p className="text-xs font-medium text-red-500 mt-5">{error}</p>
//             )}

//             <div className="flex justify-end mt-7">
//               <button
//                 className="add-btn"
//                 onClick={handleSubmit}
//                 disabled={loading}
//               >
//                 {taskId ? "UPDATE TASK" : "CREATE TASK"}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <Modal
//         isOpen={openDeleteAlert}
//         onClose={() => setOpenDeleteAlert(false)}
//         title="Delete Task"
//       >
//         <DeleteAlert
//           content="Are you sure you want to delete this task?"
//           onDelete={() => deleteTask()}
//         />
//       </Modal>
//     </DashboardLayout>
//   );
// };

// export default CreateTask;
