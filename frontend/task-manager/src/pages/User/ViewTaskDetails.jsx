import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import moment from "moment";
import { LuSquareArrowOutUpRight } from "react-icons/lu";
import { toast } from "react-hot-toast";

const ViewTaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const getStatusTagColor = (status) => {
    switch (status) {
      case "In Progress":
        return "text-cyan-500 bg-cyan-50 border border-cyan-500/10";
      case "Completed":
        return "text-lime-500 bg-lime-50 border border-lime-500/20";
      default:
        return "text-violet-500 bg-violet-50 border border-violet-500/10";
    }
  };

  // get task info by ID
  const getTaskDetailsByID = React.useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_BY_ID(id)
      );

      if (response.data) {
        setTask(response.data);
        console.log("Task data:", response.data); // Debug için
        console.log("Task createdBy:", response.data.createdBy); // Debug için
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
      toast.error("Failed to fetch task details. Please try again.");
    }
  }, [id]);

  // Get current user info
  const getCurrentUser = React.useCallback(async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
      if (response.data) {
        setCurrentUser(response.data);
        console.log("Current user:", response.data); // Debug için
        console.log("Current user ID:", response.data._id); // Debug için
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  }, []);

  // handle todo check
  const updateTodoChecklist = async (index) => {
    const todoChecklist = [...(task?.todoChecklist || [])];
    const taskId = id;

    if (todoChecklist && todoChecklist[index]) {
      todoChecklist[index].completed = !todoChecklist[index].completed;
    }

    try {
      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(taskId),
        { todoChecklist }
      );

      if (response.status === 200) {
        setTask(response.data?.task || task);
      } else {
        // Revert the toggle if the API call fails
        todoChecklist[index].completed = !todoChecklist[index].completed;
      }
    } catch (error) {
      console.error("Error updating todo checklist:", error);
      toast.error("Failed to update checklist. Please try again.");
      // Revert the toggle on error
      todoChecklist[index].completed = !todoChecklist[index].completed;
      setTask({ ...task, todoChecklist });
    }
  };

  // Handle attachment link click
  const handleLinkClick = (link) => {
    // ✅ Eğer obje ise storagePath'i al
    const url = typeof link === "object" ? link.storagePath : link;

    // External link mi yoksa upload edilmiş dosya mı?
    if (url.startsWith("http")) {
      // External link
      window.open(url, "_blank");
    } else {
      // Uploaded file - Backend URL'i ekle
      window.open(`http://localhost:8000${url}`, "_blank");
    }
  };

  // Navigate to update task page
  const handleUpdateTask = () => {
    navigate(`/user/create-task`, { state: { taskId: id } });
  };

  useEffect(() => {
    getCurrentUser();
    if (id) {
      getTaskDetailsByID();
    }
  }, [id, getTaskDetailsByID, getCurrentUser]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="mt-5">
        {task && (
          <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
            <div className="form-card col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm md:text-xl font-medium">
                  {task?.title}
                </h2>

                <div
                  className={`text-[11px] md:text-[11px] font-medium ${getStatusTagColor(
                    task?.status
                  )} px-4 py-0.5 rounded`}
                >
                  {task?.status}
                </div>
              </div>

              <div className="mt-4">
                <InfoBox label="Description" value={task?.description} />
              </div>

              <div className="grid grid-cols-12 gap-4 mt-4">
                <div className="col-span-6 md:col-span-4">
                  <InfoBox label="Priority" value={task?.priority} />
                </div>

                <div className="col-span-6 md:col-span-4">
                  <InfoBox
                    label="Due Date"
                    value={
                      task?.dueDate
                        ? moment(task?.dueDate).format("Do MMM YYYY")
                        : "N/A"
                    }
                  />
                </div>
                <div className="col-span-6 md:col-span-4">
                  <label className="text-xs font-medium text-slate-500">
                    Assigned To
                  </label>

                  <AvatarGroup
                    avatars={
                      task?.assignedTo?.map((item) => item?.profileImageUrl) ||
                      []
                    }
                    maxVisible={5}
                  />
                </div>
              </div>

              <div className="mt-2">
                <label className="text-xs font-medium text-slate-500">
                  Todo Checklist
                </label>
                {task?.todoChecklist?.map((item, index) => (
                  <TodoCheckList
                    key={`todo_${index}`}
                    text={item.text}
                    isChecked={item?.completed}
                    onChange={() => updateTodoChecklist(index)}
                  />
                ))}
              </div>

              {task?.attachments?.length > 0 && (
                <div className="mt-2">
                  <label className="text-xs font-medium text-slate-500">
                    Attachments
                  </label>
                  {task?.attachments?.map((attachment, index) => (
                    <Attachment
                      key={`link_${index}`}
                      link={attachment} // ✅ Tüm objeyi gönder
                      index={index}
                      onClick={() => handleLinkClick(attachment)} // ✅ Tüm objeyi gönder
                    />
                  ))}
                </div>
              )}

              {/* Update Task Button - Only show if user is the creator */}
              {currentUser && task?.createdBy === currentUser._id && (
                <div className="mt-6">
                  <button
                    onClick={handleUpdateTask}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    Update Task
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ViewTaskDetails;

const InfoBox = ({ label, value }) => {
  return (
    <>
      <label className="text-xs font-medium text-slate-500">{label}</label>

      <p className="text-[12px] md:text-[13px] font-medium text-gray-700 mt-0.5">
        {value}
      </p>
    </>
  );
};

const TodoCheckList = ({ text, isChecked, onChange }) => {
  return (
    <div className="flex items-center gap-3 p-3">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        className="w-4 h-4 text-primary border-gray-300 rounded-sm outline-none cursor-pointer"
      />
      <p className="text-[13px] text-gray-800">{text}</p>
    </div>
  );
};

const Attachment = ({ link, index, onClick }) => {
  // ✅ Eğer link obje ise, storagePath'i al
  const attachmentUrl = typeof link === "object" ? link.storagePath : link;
  const attachmentName = typeof link === "object" ? link.fileName : link;

  return (
    <div
      className="flex justify-between bg-gray-50 border border-gray-100 px-3 py-2 rounded-md mb-3 mt-2 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => onClick(attachmentUrl)} // ✅ URL'i gönder
    >
      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs text-gray-400 font-semibold mr-2">
          {index < 9 ? `0${index + 1}` : index + 1}
        </span>
        <p className="text-xs text-black">{attachmentName}</p>{" "}
        {/* ✅ İsmi göster */}
      </div>

      <LuSquareArrowOutUpRight className="text-lg text-gray-400" />
    </div>
  );
};
