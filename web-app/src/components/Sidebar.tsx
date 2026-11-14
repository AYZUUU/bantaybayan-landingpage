import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import toast from "react-hot-toast";
import { supabase } from "../utils/supabase";
import "./sidebar.css";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      if (window.matchMedia("(max-width: 767px)").matches) setIsOpen(true);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      onMobileClose();
      return;
    }
    setIsOpen(!isOpen);
  };


  const userRole = localStorage.getItem("userRole");
  const [userName, setUserName] = useState(
    () => localStorage.getItem("userName") || "Admin",
  );
  const [userAvatarUrl, setUserAvatarUrl] = useState(
    () => localStorage.getItem("userAvatarUrl"),
  );

  useEffect(() => {
    const syncProfile = () => {
      setUserName(localStorage.getItem("userName") || "Admin");
      setUserAvatarUrl(localStorage.getItem("userAvatarUrl"));
    };

    window.addEventListener("bantaybayan-profile-update", syncProfile);
    window.addEventListener("storage", syncProfile);
    return () => {
      window.removeEventListener("bantaybayan-profile-update", syncProfile);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  useEffect(() => {
    if (!isLogoutDialogOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLogoutDialogOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLogoutDialogOpen]);

  const handleLogout = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (user && subscription) {
        const { error } = await supabase
          .from("web_push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
        if (error) throw error;
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error("Could not remove the browser push subscription:", error);
    }

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Could not sign out of Supabase:", error);
      toast.error("Could not sign out. Please try again.");
      return;
    }
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatarUrl");
    setIsLogoutDialogOpen(false);
    onMobileClose();
    navigate("/", { replace: true });
    toast.success("You have been securely signed out.");
  };

  return (
    <>
    {mobileOpen && (
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close navigation menu"
        onClick={onMobileClose}
      />
    )}
    <aside
      id="primary-navigation"
      className={`sidebar ${isOpen ? "open" : "closed"} ${mobileOpen ? "mobile-open" : ""}`}
    >
      <div className="sidebar-header">
        {isOpen && <h2 className="logo">BantayBayan</h2>}
        <button className="toggle-btn" onClick={toggleSidebar}>
          <LuMenu size={24} />
        </button>
      </div>

      <nav className="sidebar-nav flex flex-col" onClick={onMobileClose}>
        {/* --- TABS FOR SUPERADMIN ONLY --- */}
        {userRole === "superadmin" && (
          <>
          <NavLink
            to="/superadmin"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <LuShieldAlert size={20} />
            {isOpen && <span>Global Overview</span>}
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
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <LuSettings size={20} />
            {isOpen && <span>Settings</span>}
          </NavLink>
            </>
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



            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <LuSettings size={20} />
              {isOpen && <span>Settings</span>}
            </NavLink>

          </>


        )}


      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          aria-label="Open profile"
          title="Profile"
          onClick={onMobileClose}
          className="user-profile-link"
        >
        <div className="user-profile">
          <div className="avatar">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" />
            ) : (
              userName.charAt(0)
            )}
          </div>
          {isOpen && (
            <div className="user-info">
              <span className="user-name">{userName}</span>

              <span className="user-role capitalize">{userRole}</span>
            </div>
          )}
        </div>
        </NavLink>
        <button
          type="button"
          className="logout-btn"
          aria-label="Log out"
          onClick={() => setIsLogoutDialogOpen(true)}
        >
          <LuLogOut size={18} />
          <span className="logout-label">Log out</span>
        </button>
      </div>
    </aside>
    {isLogoutDialogOpen &&
      createPortal(
        <div
          className="web-modal-backdrop logout-dialog-backdrop fixed inset-0 z-300 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setIsLogoutDialogOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="web-modal-panel logout-dialog-panel w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <LuLogOut size={22} />
            </div>
            <h2 id="logout-dialog-title" className="text-lg font-bold text-slate-900">
              Log out of BantayBayan?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You’ll need to sign in again to access the command center.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <LuLogOut size={16} />
                Log out
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
