import React, { useEffect, useState ,useContext } from "react";
import { useUserAuth } from "../../hooks/useUserAuth";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import { addThousandsSeparator } from "../../utils/helper";
import InfoCard from "../../components/Cards/InfoCard";
import { LuArrowRight } from "react-icons/lu";
import TaskListTable from "../../components/TaskListTable";
import CustomPieChart from "../../components/Charts/CustomPieCharts";
import CustomBarChart from "../../components/Charts/CustomBarChart";
import { IoMdCard } from "react-icons/io";
import { toast } from "react-hot-toast";
import { UserContext } from "../../context/userContext";

const COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];
const CATEGORY_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#6B7280"];

const Dashboard = () => {
  useUserAuth();

  const { user } = useContext(UserContext);

  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);

  // Prepare Chart Data
  const prepareChartData = (data) => {
    const taskDistribution = data?.taskDistribution || null;
    const taskPriorityLevels = data?.taskPriorityLevels || null;
    const taskCategoryLevels = data?.taskCategoryLevels || null;

    const taskDistributionData = [
      { status: "Pending", count: taskDistribution?.Pending || 0 },
      { status: "In Progress", count: taskDistribution?.InProgress || 0 },
      { status: "Completed", count: taskDistribution?.Completed || 0 },
    ];

    setPieChartData(taskDistributionData);

    const PriorityLevelData = [
      { priority: "Low", count: taskPriorityLevels?.Low || 0 },
      { priority: "Medium", count: taskPriorityLevels?.Medium || 0 },
      { priority: "High", count: taskPriorityLevels?.High || 0 },
    ];

    setBarChartData(PriorityLevelData);

    // ✅ Category data - "category" key'i kullanıyoruz
    const CategoryLevelData = [
      { category: "Work", count: taskCategoryLevels?.Work || 0 },
      { category: "School", count: taskCategoryLevels?.School || 0 },
      { category: "Personal", count: taskCategoryLevels?.Personal || 0 },
      { category: "Other", count: taskCategoryLevels?.Other || 0 },
    ];

    setCategoryChartData(CategoryLevelData);
  };

  const getDashboardData = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_DASHBOARD_DATA
      );
      if (response.data) {
        setDashboardData(response.data);
        prepareChartData(response.data?.charts || null);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to fetch dashboard data. Please try again.");
    }
  };

  const onSeeMore = () => {
    navigate("/admin/tasks");
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="card my-5">
        <div>
          <div className="col-span-3">
            <h2 className="text-xl md:text-2xl">Hello, {user?.name}. What's going on?</h2>
            <p className="text-xs md:text-[13px] text-gray-400 mt-1.5">
              {moment().format("dddd Do MMM YYYY")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 mt-5">
          <InfoCard
            icon={<IoMdCard />}
            label="Total Tasks"
            value={addThousandsSeparator(
              dashboardData?.charts?.taskDistribution?.All || 0
            )}
            color="bg-primary"
          />
          <InfoCard
            icon={<IoMdCard />}
            label="Pending Tasks"
            value={addThousandsSeparator(
              dashboardData?.charts?.taskDistribution?.Pending || 0
            )}
            color="bg-violet-500"
          />
          <InfoCard
            icon={<IoMdCard />}
            label="In Progress Tasks"
            value={addThousandsSeparator(
              dashboardData?.charts?.taskDistribution?.InProgress || 0
            )}
            color="bg-cyan-500"
          />
          <InfoCard
            icon={<IoMdCard />}
            label="Completed Tasks"
            value={addThousandsSeparator(
              dashboardData?.charts?.taskDistribution?.Completed || 0
            )}
            color="bg-lime-500"
          />
          <InfoCard
            icon={<IoMdCard />}
            label="Upcoming (3 days)"
            value={addThousandsSeparator(
              dashboardData?.statistics?.upcomingTasks || 0
            )}
            color="bg-orange-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4 md:my-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <h5 className="font-medium">Task Distribution</h5>
          </div>
          <CustomPieChart data={pieChartData} colors={COLORS} nameKey="status" />
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h5 className="font-medium">Task Priority Levels</h5>
          </div>
          <CustomBarChart data={barChartData} />
        </div>

        {/* ✅ Category grafiği - nameKey="category" eklendi */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h5 className="font-medium">Task Categories</h5>
          </div>
          <CustomPieChart 
            data={categoryChartData} 
            colors={CATEGORY_COLORS} 
            nameKey="category" // ✅ ÖNEMLİ: nameKey="category"
          />
        </div>
      </div>

      <div className="card my-4 md:my-6">
        <div className="flex items-center justify-between">
          <h5 className="text-lg">Recent Tasks</h5>
          <button className="card-btn" onClick={onSeeMore}>
            See All <LuArrowRight className="text-base" />
          </button>
        </div>
        <TaskListTable tableData={dashboardData?.recentTasks || []} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

// import React, { useEffect, useState ,useContext } from "react";
// import { useUserAuth } from "../../hooks/useUserAuth";
// import DashboardLayout from "../../components/layouts/DashboardLayout";
// import { useNavigate } from "react-router-dom";
// import axiosInstance from "../../utils/axiosInstance";
// import { API_PATHS } from "../../utils/apiPaths";
// import moment from "moment";
// import { addThousandsSeparator } from "../../utils/helper";
// import InfoCard from "../../components/Cards/InfoCard";
// import { LuArrowRight } from "react-icons/lu";
// import TaskListTable from "../../components/TaskListTable";
// import CustomPieChart from "../../components/Charts/CustomPieCharts";
// import CustomBarChart from "../../components/Charts/CustomBarChart";
// import { IoMdCard } from "react-icons/io";
// import { toast } from "react-hot-toast";
// import { UserContext } from "../../context/userContext";

// const COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

// const Dashboard = () => {
//   useUserAuth();

//   const { user } = useContext(UserContext);

//   const navigate = useNavigate();

//   const [dashboardData, setDashboardData] = useState(null);
//   const [pieChartData, setPieChartData] = useState([]);
//   const [barChartData, setBarChartData] = useState([]);

//   // Prepare Chart Data
//   const prepareChartData = (data) => {
//     const taskDistribution = data?.taskDistribution || null;
//     const taskPriorityLevels = data?.taskPriorityLevels || null;

//     const taskDistributionData = [
//       { status: "Pending", count: taskDistribution?.Pending || 0 },
//       { status: "In Progress", count: taskDistribution?.InProgress || 0 },
//       { status: "Completed", count: taskDistribution?.Completed || 0 },
//     ];

//     setPieChartData(taskDistributionData);

//     const PriorityLevelData = [
//       { priority: "Low", count: taskPriorityLevels?.Low || 0 },
//       { priority: "Medium", count: taskPriorityLevels?.Medium || 0 },
//       { priority: "High", count: taskPriorityLevels?.High || 0 },
//     ];

//     setBarChartData(PriorityLevelData);
//   };

//   const getDashboardData = async () => {
//     try {
//       const response = await axiosInstance.get(
//         API_PATHS.TASKS.GET_DASHBOARD_DATA
//       );
//       if (response.data) {
//         setDashboardData(response.data);
//         prepareChartData(response.data?.charts || null);
//       }
//     } catch (error) {
//       console.error("Error fetching dashboard data:", error);
//       toast.error("Failed to fetch dashboard data. Please try again.");
//     }
//   };

//   const onSeeMore = () => {
//     navigate("/admin/tasks");
//   };

//   useEffect(() => {
//     getDashboardData();
//   }, []);

//   return (
//     <DashboardLayout activeMenu="Dashboard">
//       <div className="card my-5">
//         <div>
//           <div className="col-span-3">
//             <h2 className="text-xl md:text-2xl">Hello, {user?.name}. What's going on?</h2>
//             <p className="text-xs md:text-[13px] text-gray-400 mt-1.5">
//               {moment().format("dddd Do MMM YYYY")}
//             </p>
//           </div>
//         </div>

//         <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 mt-5">
//           <InfoCard
//             icon={<IoMdCard />}
//             label="Total Tasks"
//             value={addThousandsSeparator(
//               dashboardData?.charts?.taskDistribution?.All || 0
//             )}
//             color="bg-primary"
//           />
//           <InfoCard
//             icon={<IoMdCard />}
//             label="Pending Tasks"
//             value={addThousandsSeparator(
//               dashboardData?.charts?.taskDistribution?.Pending || 0
//             )}
//             color="bg-violet-500"
//           />
//           <InfoCard
//             icon={<IoMdCard />}
//             label="In Progress Tasks"
//             value={addThousandsSeparator(
//               dashboardData?.charts?.taskDistribution?.InProgress || 0
//             )}
//             color="bg-cyan-500"
//           />
//           <InfoCard
//             icon={<IoMdCard />}
//             label="Completed Tasks"
//             value={addThousandsSeparator(
//               dashboardData?.charts?.taskDistribution?.Completed || 0
//             )}
//             color="bg-lime-500"
//           />
//           <InfoCard
//     icon={<IoMdCard />}
//     label="Upcoming (3 days)"
//     value={addThousandsSeparator(
//       dashboardData?.statistics?.upcomingTasks || 0
//     )}
//     color="bg-orange-500"
//   />

//         </div>
//       </div>

// <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4 md:my-6">
//   <div className="card">
//     <div className="flex items-center justify-between">
//       <h5 className="font-medium">Task Distribution</h5>
//     </div>
//     <CustomPieChart data={pieChartData} colors={COLORS} />
//   </div>

//   <div className="card">
//     <div className="flex items-center justify-between">
//       <h5 className="font-medium">Task Priority Levels</h5>
//     </div>
//     <CustomBarChart data={barChartData} />
//   </div>
// </div>

// {/* Recent Tasks - Ayrı, tam genişlik */}
// <div className="card my-4 md:my-6">
//   <div className="flex items-center justify-between">
//     <h5 className="text-lg">Recent Tasks</h5>
//     <button className="card-btn" onClick={onSeeMore}>
//       See All <LuArrowRight className="text-base" />
//     </button>
//   </div>
//   <TaskListTable tableData={dashboardData?.recentTasks || []} />
// </div>
//     </DashboardLayout>
//   );
// };

// export default Dashboard;

