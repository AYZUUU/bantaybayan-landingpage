
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flexGrow: 1, overflowY: 'auto' }}>
       
        <Outlet />
      </main>
    </div>
  );
}