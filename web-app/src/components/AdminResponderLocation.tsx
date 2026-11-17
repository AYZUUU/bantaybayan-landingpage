import { useEffect, useState } from "react";
import { LuMapPin } from "react-icons/lu";
import IncidentMap from "./IncidentMap";
import {
  getAdminResponderLiveLocation,
  type ResponderLiveLocation as ResponderLiveLocationData,
} from "../utils/reports";

interface AdminResponderLocationProps {
  reportId: number;
}

export default function AdminResponderLocation({
  reportId,
}: AdminResponderLocationProps) {
  const [result, setResult] = useState<{
    reportId: number;
    location: ResponderLiveLocationData | null;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const location = await getAdminResponderLiveLocation(reportId);
        if (active) setResult({ reportId, location, error: false });
      } catch (error) {
        console.error("Could not load rescuer location:", error);
        if (active) setResult({ reportId, location: null, error: true });
      } finally {
        inFlight = false;
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [reportId]);

  useEffect(() => {
    if (result?.reportId !== reportId || !result.location) return;
    const remaining =
      Date.parse(result.location.updatedAt) + 120_000 - Date.now();
    const timeout = window.setTimeout(() => {
      setResult((current) =>
        current?.reportId === reportId &&
        current.location?.updatedAt === result.location?.updatedAt
          ? { reportId, location: null, error: false }
          : current,
      );
    }, Math.max(0, remaining));
    return () => window.clearTimeout(timeout);
  }, [reportId, result]);

  const location = result?.reportId === reportId ? result.location : null;
  const hasError = result?.reportId === reportId && result.error;

  return (
    <section className="space-y-2 border-t border-slate-100 pt-4">
      <h4 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-700">
        <LuMapPin size={15} className="text-blue-600" />
        En Route Rescuer Live Location
      </h4>
      {location ? (
        <>
          <div className="h-64 min-h-[240px] w-full overflow-hidden rounded-xl border border-slate-200 sm:rounded-2xl">
            <IncidentMap
              center={[location.latitude, location.longitude]}
              zoom={16}
              markers={[
                {
                  id: `responder-${reportId}`,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  title: "Dispatched rescuer",
                  status: "dispatched",
                },
              ]}
            />
          </div>
          <p className="text-xs text-slate-500" role="status">
            Updated {new Date(location.updatedAt).toLocaleTimeString()} ·
            refreshes every 10 seconds
          </p>
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600" role="status">
          {hasError
            ? "Could not load the rescuer's location. Retrying automatically."
            : "Waiting for the assigned rescuer to respond and share their location."}
        </p>
      )}
    </section>
  );
}
