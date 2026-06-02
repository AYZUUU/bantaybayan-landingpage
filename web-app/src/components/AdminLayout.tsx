import { useEffect, useState, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";

export interface Report {
  id: number;
  accident_type: string;
  latitude: number | string;
  longitude: number | string;
  status: string;
  created_at: string;
  image_path?: string | null;
  reporter_name: string;
}

export default function AdminLayout() {
  const isAuthenticated = !!localStorage.getItem("token");
  

  const userRole = localStorage.getItem("userRole")?.toLowerCase(); 
  

  const location = useLocation(); 

  const [reports, setReports] = useState<Report[]>([]);
  const lastReportIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchReports = async () => {
      try {
        const response = await fetch("http://localhost/api/getReports.php");
        const jsonData = await response.json();

        if (jsonData.status === "success" && jsonData.data.length > 0) {
          const fetchedReports = jsonData.data;
          const latestReport = fetchedReports[0]; 
          const latestId = Number(latestReport.id);
          
          if (lastReportIdRef.current !== null && latestId > lastReportIdRef.current) {
            toast.error(
              `NEW EMERGENCY: ${latestReport.accident_type} reported by ${latestReport.reporter_name}!`, 
              {
                duration: 8000,
                style: { minWidth: '350px', fontWeight: 'bold', fontSize: '16px' },
              }
            );
          }

          setReports(fetchedReports);
          lastReportIdRef.current = latestId;
        }
      } catch (err) {
        console.error("Global Fetch Error:", err);
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }


  if (userRole === "superadmin") {
    const adminOnlyPaths = ["/dashboard", "/incidents", "/personnel"];
    if (adminOnlyPaths.includes(location.pathname.toLowerCase())) {
      return <Navigate to="/superadmin" replace />;
    }
  }


  if (userRole === "admin") {
    if (location.pathname.toLowerCase() === "/superadmin") {
      return <Navigate to="/dashboard" replace />;
    }
  }
  


  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#f9fafb' }}>
        <Outlet context={{ reports }} />
      </main>
    </div>
  );
}