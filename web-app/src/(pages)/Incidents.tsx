import { useState } from "react";
import { useOutletContext } from "react-router-dom"; // 1. Import context!
import toast from "react-hot-toast";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker 
} from '@vis.gl/react-google-maps';
import "./dashboard.css";

interface Report {
  id: number;
  accident_type: string;
  accident_level: string;
  reporter_name: string;
  image_path: string | null;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
}

export default function Incidents() {
  // 2. Grab the live reports from the AdminLayout!
  const { reports } = useOutletContext<{ reports: Report[] }>();
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const handleStatusChange = async (reportId: number, newStatus: string) => {
    const toastId = toast.loading("Updating status...");

    try {
      const response = await fetch("http://localhost/api/updateStatus.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: reportId, status: newStatus }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Status successfully updated!", { id: toastId });
        // We don't need to manually update state here! 
        // The AdminLayout will automatically pull the fresh status on its next 5-second tick.
      } else {
        toast.error("Failed to update status.", { id: toastId });
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Network error. Could not connect to server.", { id: toastId });
    }
  };

  // 3. Removed the loading state entirely because the Layout handles fetching before this page even renders!

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>BantayBayan Command Center</h1>
        <div className="stats">
          <span>Active Reports: {reports.length}</span>
        </div>
      </header>

      {/* Card-Based Grid Layout */}
      <div 
        className="cards-container" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '20px', 
          padding: '20px' 
        }}
      >
        {reports.map((report) => (
          <div 
            key={report.id} 
            className="report-card"
            onClick={() => setSelectedReport(report)}
            style={{ 
              backgroundColor: "white", 
              borderRadius: "12px", 
              padding: "20px", 
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)", 
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              border: "1px solid #eaeaea",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
            }}
          >
            {/* Top Row: Incident & Severity */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#222" }}>{report.accident_type}</h3>
              <span className={`badge ${report.accident_level?.toLowerCase()}`} style={{ fontSize: "0.8rem", padding: "4px 8px" }}>
                {report.accident_level}
              </span>
            </div>

            {/* Middle Row: Reporter Name */}
            <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
              <strong>Reported by:</strong> {report.reporter_name}
            </p>

            {/* Bottom Row: Controls & Evidence Indicator */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginTop: "auto", 
              paddingTop: "15px", 
              borderTop: "1px solid #f0f0f0" 
            }}>
              
              {/* Status Dropdown */}
              <select
                className="status-select"
                value={report.status} 
                onClick={(e) => e.stopPropagation()} 
                onChange={(e) => {
                  e.stopPropagation(); 
                  handleStatusChange(report.id, e.target.value);
                }}
                style={{ padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
              >
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="resolved">Resolved</option>
              </select>

              {/* Quick Indicator if Photo Exists */}
              <span style={{ fontSize: "0.9rem", color: report.image_path ? "#4D8BE2" : "#999", fontWeight: "500" }}>
                {report.image_path ? "📸 Photo Attached" : "📍 Map Only"}
              </span>

            </div>
          </div>
        ))}
      </div>

      {/* Unified Preview Modal */}
      {selectedReport && (
        <div 
          className="map-modal-overlay" 
          onClick={() => setSelectedReport(null)}
          style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="map-modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              backgroundColor: "white", 
              padding: "25px",
              borderRadius: "12px",
              maxWidth: "900px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              display: "grid",
              gridTemplateColumns: selectedReport.image_path ? "1fr 1fr" : "1fr",
              gap: "20px"
            }}
          >
            <button 
              className="close-modal-btn" 
              onClick={() => setSelectedReport(null)}
              style={{ position: "absolute", right: "15px", top: "10px", fontSize: "1.8rem", color: "#333", border: "none", background: "none", cursor: "pointer" }}
            >
              &times;
            </button>
            
            <h3 style={{ gridColumn: "1 / -1", marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
              {selectedReport.accident_type} - Incident Details
            </h3>

            {/* Render Image Column */}
            {selectedReport.image_path && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h4 style={{ marginBottom: "10px", color: "#555" }}>Visual Evidence</h4>
                <img 
                  src={`http://localhost/api/${selectedReport.image_path}`} 
                  alt="Enlarged Evidence" 
                  style={{ 
                    width: "100%", 
                    height: "350px", 
                    borderRadius: "8px", 
                    objectFit: "contain",
                    backgroundColor: "#f3f4f6"
                  }} 
                />
              </div>
            )}

            {/* Render Map Column */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>Exact Location</h4>
              <div style={{ width: '100%', height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={{
                      lat: parseFloat(selectedReport.latitude.toString()),
                      lng: parseFloat(selectedReport.longitude.toString())
                    }}
                    defaultZoom={16}
                    mapId="BANTAYBAYAN_MODAL_MAP"
                  >
                    <AdvancedMarker position={{
                      lat: parseFloat(selectedReport.latitude.toString()),
                      lng: parseFloat(selectedReport.longitude.toString())
                    }} />
                  </Map>
                </APIProvider>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}