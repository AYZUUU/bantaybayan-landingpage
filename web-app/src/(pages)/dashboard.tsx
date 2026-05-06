import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";

export default function Dashboard() {
  const viganCenter = { lat: 17.5747, lng: 120.3868 };

  return (
    <div className="p-6 bg-slate-50 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        <h2 className="text-2xl font-bold mb-2 text-slate-800">
          Reports Map
        </h2>

        <div className="w-full h-125 rounded-lg overflow-hidden border-2 border-slate-300">
          <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={viganCenter}
              defaultZoom={14}
              mapId="BANTAYBAYAN_MAP"
            >
              <AdvancedMarker position={viganCenter} />
            </Map>
          </APIProvider>
        </div>
      </div>
    </div>
  );
}
