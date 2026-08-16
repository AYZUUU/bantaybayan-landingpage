import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
} from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import StatusOverviewCards from "../components/StatusOverviewCards";

interface Report {
  id: number;
  accident_type: string;
  latitude: number | string;
  longitude: number | string;
  status: string;
  created_at: string;
  image_path?: string | null;
  reporter_name: string;
  contact_number?: string | null; 
  email?: string | null;          
  user_id_photo?: string | null;  
}

export default function Dashboard() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch("http://localhost/api/getReports.php");
        const jsonData = await response.json();

        if (jsonData.status === "success") {
          setReports(jsonData.data);
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    fetchReports();

    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2 text-slate-800">
        BantayBayan Command Center
      </h2>
      <StatusOverviewCards reports={reports} />
      
      <div className="w-full max-w-5xl bg-white p-4 rounded-xl shadow-lg border border-slate-200">
       
        <div className="w-full h-150 rounded-lg overflow-hidden border-2 border-slate-300">
          <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <Map
              defaultZoom={14}
              defaultCenter={{ lat: 17.567936, lng: 120.390581 }}
              mapId="BANTAYBAYAN_MAP"
            >
              {reports.map((report) => (
                <AdvancedMarker
                  key={report.id}
                  position={{
                    lat: parseFloat(report.latitude as string),
                    lng: parseFloat(report.longitude as string),
                  }}
                  onClick={() => setSelectedReport(report)}
                />
              ))}

              {selectedReport && (
                <InfoWindow
                  position={{
                    lat: parseFloat(selectedReport.latitude as string),
                    lng: parseFloat(selectedReport.longitude as string),
                  }}
                  onCloseClick={() => setSelectedReport(null)}
                >
                  <div className="px-2 pb-2 w-72 text-slate-800 max-h-100 overflow-y-auto">
                    <h3 className="font-bold text-lg text-red-600 mb-1 border-b pb-1 -mt-2">
                      {selectedReport.accident_type}
                    </h3>

                    {/* Incident Evidence Photo */}
                    {selectedReport.image_path && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Incident Scene:</p>
                        <img
                          src={`http://localhost/api/${selectedReport.image_path}`}
                          alt="Incident Evidence"
                          className="w-full h-28 object-cover rounded-md"
                        />
                      </div>
                    )}

                    {/* Reporter Identity Tracking (Panel Compliance) */}
                    <div className="bg-slate-100 p-2 rounded-md mb-2">
                      <p className="text-xs font-bold text-slate-700">Reporter Details:</p>
                      <p className="text-sm">Name: <span className="font-semibold">{selectedReport.reporter_name}</span></p>
                      <p className="text-sm">Contact: <span className="font-semibold">{selectedReport.contact_number || "N/A"}</span></p>
                      
                      {/* Scanned ID Proof Preview */}
                      {selectedReport.user_id_photo ? (
                        <div className="mt-1">
                          <p className="text-[11px] text-blue-600 font-bold">Verified Scanned ID:</p>
                          <img
                            src={selectedReport.user_id_photo}
                            alt="User Scanned ID"
                            className="w-full h-20 object-cover rounded border border-slate-300 mt-1"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-1">No ID document linked.</p>
                      )}
                    </div>

                    <p className="text-sm mb-1 flex items-center justify-between">
                      <span className="font-semibold">Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          selectedReport.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : selectedReport.status === "Verified"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {selectedReport.status}
                      </span>
                    </p>
                    
                    <p className="text-xs text-slate-400 mt-1">
                      Reported: {selectedReport.created_at}
                    </p>

                    {/* RESPONSE WORKFLOW BUTTONS */}
                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2">
                      <p className="text-sm font-semibold">Dispatch Action:</p>
                    
                      <button 
                        onClick={async () => {
                          try {
                            await fetch("http://localhost/api/updateStatus.php", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ report_id: selectedReport.id, status: "Responder 1 Scouting" })
                            });
                            alert("Responder 1 dispatched to scout/confirm incident.");
                          } catch (error) {
                            console.error("Failed to update status", error);
                          }
                        }} 
                        className="bg-yellow-500 text-white py-1.5 px-2 rounded text-xs font-bold hover:bg-yellow-600 transition-colors shadow-sm"
                      >
                       Dispatch Responder 1 (Scout)
                      </button>

                      {/* Wired Up Responder 2 Button */}
                      <button 
                        onClick={async () => {
                          try {
                            await fetch("http://localhost/api/updateStatus.php", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ report_id: selectedReport.id, status: "Confirmed - Responder 2 Dispatched" })
                            });
                            alert("Incident confirmed! Responder 2 deployed.");
                          } catch (error) {
                            console.error("Failed to update status", error);
                          }
                        }} 
                        className="bg-red-600 text-white py-1.5 px-2 rounded text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Dispatch Responder 2
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>
      </div>
    </div>
  );
}