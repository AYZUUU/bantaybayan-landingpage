import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import "./dashboard.css";

interface Report {
  id: number;
  emergency_type: string;
  accident_level: string;
  reporter_name: string;
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
  const { reports, setReports } = useOutletContext<{
    reports: Report[];
    setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  }>();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responders, setResponders] = useState<Responder[]>([]);

  // Format ISO timestamp into standard Date & Time string
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

  useEffect(() => {
    const fetchResponders = async () => {
      try {
        const response = await fetch("http://localhost/api/getResponders.php");
        const json = await response.json();
        if (json.status === "success") {
          setResponders(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch responders");
      }
    };
    fetchResponders();
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
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
          padding: "20px",
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

            {/* Display Report Date */}
            <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
              <strong>Date:</strong> {formatDate(report.created_at)}
            </p>

            <div
              style={{
                marginTop: "auto",
                paddingTop: "15px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <select
                  className="status-select"
                  value={report.status.toLowerCase()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleStatusChange(report.id, e.target.value);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="resolved">Resolved</option>
                </select>

                <span
                  style={{
                    fontSize: "0.9rem",
                    color: report.image_path ? "#4D8BE2" : "#999",
                    fontWeight: "500",
                  }}
                >
                  {report.image_path ? "📸 Photo" : "📍 Map"}
                </span>
              </div>

              {report.status.toLowerCase() === "dispatched" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    marginTop: "5px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      color: "#555",
                      fontWeight: "bold",
                    }}
                  >
                    Assign Responder:
                  </label>
                  <select
                    value={
                      report.assigned_responder_id
                        ? String(report.assigned_responder_id)
                        : ""
                    }
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(
                        report.id,
                        "dispatched",
                        e.target.value,
                      );
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled>
                      Select a responder...
                    </option>
                    {responders.map((responder) => (
                      <option key={responder.id} value={responder.id}>
                        {responder.first_name} {responder.last_name} (
                        {responder.contact_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
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
              maxWidth: "900px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              display: "grid",
              gridTemplateColumns: selectedReport.image_path
                ? "1fr 1fr"
                : "1fr",
              gap: "20px",
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

            {/* Modal Title + Date Header */}
            <h3
              style={{
                gridColumn: "1 / -1",
                marginTop: 0,
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
              }}
            >
              {selectedReport.emergency_type} -{" "}
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "#666",
                  fontWeight: "normal",
                }}
              >
                {formatDate(selectedReport.created_at)}
              </span>
            </h3>

            {/* Render Image Column */}
            {selectedReport.image_path && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h4 style={{ marginBottom: "10px", color: "#555" }}>
                  Visual Evidence
                </h4>
                <img
                  src={`http://localhost/api/${selectedReport.image_path}`}
                  alt="Enlarged Evidence"
                  style={{
                    width: "100%",
                    height: "350px",
                    borderRadius: "8px",
                    objectFit: "contain",
                    backgroundColor: "#f3f4f6",
                  }}
                />
              </div>
            )}

            {/* Render Map Column */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h4 style={{ marginBottom: "10px", color: "#555" }}>
                Exact Location
              </h4>
              <div
                style={{
                  width: "100%",
                  height: "350px",
                  borderRadius: "8px",
                  overflow: "hidden",
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
