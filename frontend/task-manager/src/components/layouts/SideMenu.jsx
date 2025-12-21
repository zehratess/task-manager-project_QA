import React, { useContext, useEffect, useState } from "react";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../../assets/images/default-avatar.jpeg";


const SideMenu = ({ activeMenu }) => {
  const { user, clearUser } = useContext(UserContext);
  const [sideMenuData, setSideMenuData] = useState([]);

  const navigate = useNavigate();

  const handleClick = (route) => {
    if (route === "logout") {
      handleLogout();
      return;
    }
    navigate(route);
  };
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    clearUser();
    navigate("/login");
  };

  useEffect(() => {
    if (user) {
      setSideMenuData(
        user?.role === "admin" ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA
      );
    }
    return () => {};
  }, [user]);

  return (
    <div className="w-64 h-[calc(100vh-61px)] bg-white/70 backdrop-blur-md border-r border-slate-200/40 sticky top-[61px] z-20 shadow-lg shadow-slate-200/50">
      <div className="flex flex-col items-center justify-center mb-7 pt-5">
        <div className="relative">
          <img
            src={defaultAvatar}
            alt="Profile Image"
            className="w-20 h-20 bg-slate-400 rounded-full ring-4 ring-white/50 shadow-lg"
          />
        </div>
        {user?.role === "admin" && (
          <div className="text-[10px] font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-0.5 rounded-full mt-2 shadow-md shadow-indigo-500/30">
            Admin
          </div>
        )}

        <h5 className="text-gray-950 font-medium leading-6 mt-3">
          {user?.name || ""}
        </h5>

        <p className="text-[12px] text-gray-500">{user?.email || ""}</p>
      </div>

      {sideMenuData.map((item, index) => (
        <button
          key={`menu_${index}`}
          className={`w-full flex items-center gap-4 text-[15px] font-medium transition-all duration-200 ${
            activeMenu === item.label
              ? "text-indigo-600 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-r-4 border-indigo-500 shadow-sm"
              : "text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50"
          } py-3 px-6 mb-2 cursor-pointer rounded-l-xl`}
          onClick={() => handleClick(item.path)}
        >
          {item.icon && <item.icon className="text-xl" />}
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default SideMenu;