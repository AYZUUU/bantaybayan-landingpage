import { useEffect, useState } from "react";
import toast from "react-hot-toast"; // <-- 1. Import toast
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

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const response = await fetch("http://localhost/api/getReports.php");
      const jsonData = await response.json();

      if (jsonData.status === "success") {
        setReports(jsonData.data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };


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
 
        setReports((prevReports) =>
          prevReports.map((report) =>
            report.id === reportId ? { ...report, status: newStatus } : report
          )
        );
      } else {
        toast.error("Failed to update status.", { id: toastId });
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Network error. Could not connect to server.", { id: toastId });
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Loading Reports...</div>;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>BantayBayan Command Center</h1>
        <div className="stats">
          <span>Active Reports: {reports.length}</span>
        </div>
      </header>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Severity</th>
              <th>Reporter</th>
              <th>Evidence</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="report-row">
                <td className="type-cell">{report.accident_type}</td>
                <td>
                  <span
                    className={`badge ${report.accident_level.toLowerCase()}`}
                  >
                    {report.accident_level}
                  </span>
                </td>
                <td>{report.reporter_name}</td>
                <td>
                  {report.image_path ? (
                    <img
                      src={`http://localhost/api/${report.image_path}`}
                      alt="Proof"
                      className="thumb"
                    />
                  ) : (
                    "No Photo"
                  )}
                </td>
                <td>
                  <a
                    href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    View Map
                  </a>
                </td>
                <td>
          
                  <select
                    className="status-select"
                    value={report.status} 
                    onChange={(e) => handleStatusChange(report.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}