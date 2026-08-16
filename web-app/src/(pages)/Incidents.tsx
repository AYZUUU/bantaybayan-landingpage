import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import "./dashboard.css";

interface Report {
  id: number;
  emergency_type: string;
  accident_level: string;
  reporter_name: string;
  contact_number?: string | null;  
  email?: string | null;         
  user_id_photo?: string | null;   
  image_path: string | null;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  assigned_responder_id?: number | null;
}

interface Responder {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
}

export default function Incidents() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Fetch Reports and Responders on Component Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Reports
        const reportsRes = await fetch("http://localhost/api/getReports.php");
        const reportsJson = await reportsRes.json();
        
        if (reportsJson.status === "success" || Array.isArray(reportsJson)) {
          setReports(Array.isArray(reportsJson) ? reportsJson : reportsJson.data);
        }

        // 2. Fetch Responders
        const respondersRes = await fetch("http://localhost/api/getResponders.php");
        const respondersJson = await respondersRes.json();
        
        if (respondersJson.status === "success") {
          setResponders(respondersJson.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        toast.error("Could not connect to server to load reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusChange = async (
    reportId: number,
    newStatus: string,
    responderId?: string,
  ) => {
    const toastId = toast.loading("Updating incident...");

    try {
      const response = await fetch("http://localhost/api/updateStatus.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          status: newStatus,
          responder_id: responderId,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(
          responderId
            ? "Responder assigned and dispatched!"
            : "Status successfully updated!",
          { id: toastId },
        );

        setReports((prevReports) =>
          prevReports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  status: newStatus,
                  assigned_responder_id: responderId
                    ? parseInt(responderId)
                    : report.assigned_responder_id,
                }
              : report,
          ),
        );
      } else {
        toast.error("Failed to update status.", { id: toastId });
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Network error. Could not connect to server.", {
        id: toastId,
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontSize: "1.1rem", color: "#555" }}>
        Loading incident reports...
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>BantayBayan Command Center</h1>
        <div className="stats">
          <span>Active Reports: {reports.length}</span>
        </div>
      </header>

      <div
        className="cards-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "20px",
          padding: "20px",
        }}
      >
        {reports.length === 0 ? (
          <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#777", padding: "40px" }}>
            No incident reports found in the database.
          </p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="report-card"
              onClick={() => setSelectedReport(report)}
              style={{
                backgroundColor: report.status?.toLowerCase() === "resolved" ? "#d1fae5" : "white",
                borderColor: report.status?.toLowerCase() === "resolved" ? "#10b981" : "#eaeaea",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                border: "1px solid #eaeaea",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-3px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#222" }}>
                  {report.emergency_type}
                </h3>
                <span
                  className={`badge ${report.accident_level?.toLowerCase()}`}
                  style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                >
                  {report.accident_level}
                </span>
              </div>

              <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
                <strong>Reported by:</strong> {report.reporter_name}
              </p>

              <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
                <strong>Date:</strong> {formatDate(report.created_at)}
              </p>

              {/* ACTION AREA */}
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "15px",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#444" }}>
                    Action Status:
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: report.image_path ? "#4D8BE2" : "#999",
                      fontWeight: "600",
                    }}
                  >
                    {report.image_path ? "Photo Attached" : "Map Location"}
                  </span>
                </div>
            
                <div 
                  style={{ display: "flex", gap: "8px", width: "100%" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleStatusChange(report.id, "pending")}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: "6px",
                      border: "none",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      backgroundColor: report.status.toLowerCase() === "pending" ? "#f59e0b" : "#fef3c7",
                      color: report.status.toLowerCase() === "pending" ? "white" : "#b45309",
                    }}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleStatusChange(report.id, "dispatched")}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: "6px",
                      border: "none",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      backgroundColor: report.status.toLowerCase() === "dispatched" ? "#3b82f6" : "#dbeafe",
                      color: report.status.toLowerCase() === "dispatched" ? "white" : "#1e3a8a",
                    }}
                  >
                    Dispatch
                  </button>
                  <button
                    onClick={() => handleStatusChange(report.id, "resolved")}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: "6px",
                      border: "none",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      backgroundColor: report.status.toLowerCase() === "resolved" ? "#10b981" : "#d1fae5",
                      color: report.status.toLowerCase() === "resolved" ? "white" : "#065f46",
                    }}
                  >
                    Resolve
                  </button>
                </div>

                {report.status.toLowerCase() === "dispatched" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginTop: "4px",
                      padding: "10px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label style={{ fontSize: "0.8rem", color: "#334155", fontWeight: "bold" }}>
                      Assign Responder Unit:
                    </label>
                    <select
                      value={report.assigned_responder_id ? String(report.assigned_responder_id) : ""}
                      onChange={(e) => {
                        handleStatusChange(report.id, "dispatched", e.target.value);
                      }}
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        backgroundColor: "white",
                        outline: "none"
                      }}
                    >
                      <option value="" disabled>-- Select Unit --</option>
                      {responders.map((responder) => (
                        <option key={responder.id} value={responder.id}>
                          {responder.first_name} {responder.last_name} ({responder.contact_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Unified Preview Modal */}
      {selectedReport && (
        <div
          className="map-modal-overlay"
          onClick={() => setSelectedReport(null)}
          style={{
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <div
            className="map-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              padding: "25px",
              borderRadius: "12px",
              maxWidth: "1000px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1fr 1fr", 
              gap: "25px",
            }}
          >
            <button
              className="close-modal-btn"
              onClick={() => setSelectedReport(null)}
              style={{
                position: "absolute",
                right: "15px",
                top: "10px",
                fontSize: "1.8rem",
                color: "#333",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              &times;
            </button>

            <h3 style={{ gridColumn: "1 / -1", marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
              {selectedReport.emergency_type} -{" "}
              <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "normal" }}>
                {formatDate(selectedReport.created_at)}
              </span>
            </h3>

            {/* COLUMN 1: Reporter Identity & Incident Photo */}
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ backgroundColor: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "1rem" }}>
                  Reporter Verification
                </h4>
                <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#333" }}>
                  <strong>Name:</strong> {selectedReport.reporter_name}
                </p>
                <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#333" }}>
                  <strong>Contact:</strong> {selectedReport.contact_number || "N/A"}
                </p>
                
                {selectedReport.user_id_photo ? (
                  <div style={{ marginTop: "10px" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#2563eb" }}>Verified ID Document:</strong>
                    <img
                      src={selectedReport.user_id_photo}
                      alt="User ID"
                      style={{
                        width: "100%",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        marginTop: "5px",
                        border: "1px solid #cbd5e1"
                      }}
                    />
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "#ef4444", fontStyle: "italic", marginTop: "10px" }}>
                    ⚠️ No ID on file for this user.
                  </p>
                )}
              </div>

              {selectedReport.image_path && (
                <div>
                  <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Visual Evidence</h4>
                  <img
                    src={`http://localhost/api/${selectedReport.image_path}`}
                    alt="Enlarged Evidence"
                    style={{
                      width: "100%",
                      height: "220px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #eaeaea"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Map Location */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Exact Location</h4>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "350px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #eaeaea"
                }}
              >
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={{
                      lat: parseFloat(selectedReport.latitude.toString()),
                      lng: parseFloat(selectedReport.longitude.toString()),
                    }}
                    defaultZoom={16}
                    mapId="BANTAYBAYAN_MODAL_MAP"
                  >
                    <AdvancedMarker
                      position={{
                        lat: parseFloat(selectedReport.latitude.toString()),
                        lng: parseFloat(selectedReport.longitude.toString()),
                      }}
                    />
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