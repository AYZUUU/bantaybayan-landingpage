import {
  AdvancedMarker,
  APIProvider,
  Map,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

interface Report {
  id: number;
  accident_type: string;
  latitude: number | string;
  longitude: number | string;
  status: string;
  created_at: string;
  image_path?: string | null;
  reporter_name: string;
}

export default function Dashboard() {
  const viganCenter = { lat: 17.5747, lng: 120.3868 };
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
      <div className="w-full max-w-4xl bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        <h2 className="text-2xl font-bold mb-2 text-slate-800">
          Command Center Map
        </h2>

        <div className="w-full h-125 rounded-lg overflow-hidden border-2 border-slate-300">
          <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={viganCenter}
              defaultZoom={10}
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
                  <div className="px-2 pb-2 min-w-[200px] text-slate-800">
                    <h3 className="font-bold text-lg text-red-600 mb-1 border-b pb-1 -mt-2">
                      {selectedReport.accident_type}
                    </h3>
                    {selectedReport.image_path && (
                      <img
                        src={`http://localhost/api/${selectedReport.image_path}`}
                        alt="Incident Evidence"
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    )}

                    <p className="text-sm mb-1">
                      <span className="font-semibold">Reporter:</span>{" "}
                      {selectedReport.reporter_name}
                    </p>
                    <p className="text-sm mb-1">
                      <span className="font-semibold">Status:</span>{" "}
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
                    <p className="text-xs text-slate-500 mt-2">
                      Reported: {selectedReport.created_at}
                    </p>
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
