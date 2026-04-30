import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./sidebar.css";

import {
  LuChrome,
  LuLogOut,
  LuMap,
  LuMenu,
  LuSettings,
  LuTriangle,
  LuUsers,
} from "react-icons/lu";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        {isOpen && <h2 className="logo">BantayBayan</h2>}
        <button className="toggle-btn" onClick={toggleSidebar}>
          <LuMenu size={24} />
        </button>
      </div>

      <nav className="sidebar-nav flex flex-col">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LuChrome size={20} />
          {isOpen && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/Incidents"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LuTriangle size={20} />
          {isOpen && <span>Incidents</span>}
        </NavLink>

        <NavLink
          to="/live-map"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LuMap size={20} />
          {isOpen && <span>Live Map</span>}
        </NavLink>

        <NavLink
          to="/personnel"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LuUsers size={20} />
          {isOpen && <span>Personnel</span>}
        </NavLink>

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
          <div className="avatar">A</div>
          {isOpen && (
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-role">Command Center</span>
            </div>
          )}
        </div>
        {isOpen && (
          <button className="logout-btn" title="Log Out">
            <LuLogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
