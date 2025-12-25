import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";

import Dashboard from "./pages/Admin/Dashboard";
import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import ManageTasks from "./pages/Admin/ManageTasks";
import CreateTask from "./pages/Admin/CreateTask";
import ManageUsers from "./pages/Admin/ManageUsers";

import UserDashboard from "./pages/User/UserDashboard";
import MyTasks from "./pages/User/MyTasks";
import ViewTaskDetails from "./pages/User/ViewTaskDetails";

import PrivateRoute from "./routes/PrivateRoute";
import UserProvider, { UserContext } from "./context/userContext";
import { Toaster } from "react-hot-toast";
import { useContext } from "react";
import bgImage from "./assets/images/bg.png";

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Auth Routes - Kendi arkaplanları var */}
          <Route path="/login" element={<Login />} />
          <Route path="/signUp" element={<SignUp />} />

          {/* Dashboard Routes - Arkaplan wrapper'ı */}
          <Route element={<DashboardWrapper />}>
            {/*Admin Routes*/}
            <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/tasks" element={<ManageTasks />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/create-task" element={<CreateTask />} />{" "}
            </Route>

            {/*User Routes*/}
            <Route element={<PrivateRoute allowedRoles={["user"]} />}>
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/tasks" element={<MyTasks />} />
              <Route
                path="/user/task-details/:id"
                element={<ViewTaskDetails />}
              />
              <Route path="/user/create-task" element={<CreateTask />} />{" "}
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={["admin", "user"]} />}>
            <Route path="/create-task" element={<CreateTask />} />
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Root />} />
        </Routes>
      </Router>

      <Toaster
        toastOptions={{
          className: "",
          style: {
            fontSize: "13px",
          },
        }}
      />
    </UserProvider>
  );
};

export default App;

// Dashboard Wrapper - Arkaplan sadece dashboard sayfalarında
const DashboardWrapper = () => {
  return (
    <div
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
      }}
    >
      <Outlet />
    </div>
  );
};

const Root = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) return <Outlet />;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return user.role === "admin" ? (
    <Navigate to="/admin/dashboard" />
  ) : (
    <Navigate to="/user/dashboard" />
  );
};
