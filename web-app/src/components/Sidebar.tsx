import { useState } from "react";
import {
  LuChrome,
  LuLogOut,
  LuMenu,
  LuSettings,
  LuShieldAlert,
  LuTriangle,
  LuUsers,
} from "react-icons/lu";
import { NavLink, useNavigate } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const toggleSidebar = () => setIsOpen(!isOpen);

  // 1. Grab the user's role and name from localStorage!
  const userRole = localStorage.getItem("userRole");
  const userName = localStorage.getItem("userName") || "Admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    navigate("/");
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        {isOpen && <h2 className="logo">BantayBayan</h2>}
        <button className="toggle-btn" onClick={toggleSidebar}>
          <LuMenu size={24} />
        </button>
      </div>

      <nav className="sidebar-nav flex flex-col">
        {/* --- TABS FOR SUPERADMIN ONLY --- */}
        {userRole === "superadmin" && (
          <NavLink
            to="/superadmin"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <LuShieldAlert size={20} />
            {isOpen && <span>Global Overview</span>}
          </NavLink>
        )}

        {/* --- TABS FOR REGULAR ADMINS ONLY --- */}
        {userRole === "admin" && (
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <LuChrome size={20} />
              {isOpen && <span>Dashboard</span>}
            </NavLink>

            <NavLink
              to="/incidents"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <LuTriangle size={20} />
              {isOpen && <span>Incidents</span>}
            </NavLink>

            <NavLink
              to="/personnel"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <LuUsers size={20} />
              {isOpen && <span>Personnel</span>}
            </NavLink>
          </>
        )}

        {/* --- TABS FOR EVERYONE (Shared) --- */}
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LuSettings size={20} />
          {isOpen && <span>Settings</span>}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{userName.charAt(0)}</div>
          {isOpen && (
            <div className="user-info">
              <span className="user-name">{userName}</span>

              <span className="user-role capitalize">{userRole}</span>
            </div>
          )}
        </div>
        {isOpen && (
          <button className="logout-btn" title="Log Out" onClick={handleLogout}>
            <LuLogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
