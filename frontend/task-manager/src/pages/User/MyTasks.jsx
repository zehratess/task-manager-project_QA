import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuFileSpreadsheet } from "react-icons/lu";
import TaskStatusTabs from "../../components/TaskStatusTabs";
import TaskCard from "../../components/Cards/TaskCard";
import { toast } from "react-hot-toast";

const MyTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");

  const navigate = useNavigate();

  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          status: filterStatus === "All" ? "" : filterStatus,
        },
      });

      setAllTasks(response.data?.tasks?.length > 0 ? response.data.tasks : []);

      //Map statusSummary data with fixed labels and order
      const statusSummary = response.data?.statusSummary || {};

      const statusArray = [
        { label: "All", count: response.data?.all || 0 },
        { label: "Pending", count: statusSummary?.pendingTasks || 0 },
        { label: "In Progress", count: statusSummary?.inProgressTasks || 0 },
        { label: "Completed", count: statusSummary?.completedTasks || 0 },
      ];

      setTabs(statusArray);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks. Please try again.");
    }
  };

  const handleClick = (taskId) => {
    navigate(`/user/task-details/${taskId}`);
  };

  useEffect(() => {
    getAllTasks(); //filterStatus parametresi kaldırıldı
    //return () => {};
  }, [filterStatus]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="my-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-center">
          {" "}
          //justify-between önerior claude
          <h2 className="text-xl md:text-xl font-medium">My Tasks</h2>
          {tabs?.[0]?.count > 0 && (
            <TaskStatusTabs
              tabs={tabs}
              activeTab={filterStatus}
              setActiveTab={setFilterStatus}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {allTasks?.map(
            (
              item //parametrelerde index de vardı ama kullanılmıyordu
            ) => (
              <TaskCard
                key={item._id}
                title={item.title}
                description={item.description}
                status={item.status}
                priority={item.priority}
                dueDate={item.dueDate}
                assignedTo={item.assignedTo?.map(
                  (user) => user.profileImageUrl //normalde item deriz ama iç içe olduğu ve daha okunaklı olması için user yaptım
                )}
                progress={item.progress}
                createdAt={item.createdAt}
                completedTodoCount={item.completedTodoCount || 0}
                todoChecklist={item.todoChecklist || []}
                attachmentCount={item.attachments?.count || 0}
                onClick={() => handleClick(item._id)}
              />
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyTasks;
