import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Position } from "geojson";
import { useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuCalendar,
  LuCircleCheck,
  LuMail,
  LuMapPin,
  LuPhone,
  LuTriangleAlert,
  LuTruck,
  LuUserRound,
  LuX,
} from "react-icons/lu";
import type { Report } from "../components/AdminLayout";
import IncidentMap from "../components/IncidentMap";
import ReporterIdPhoto from "../components/ReporterIdPhoto";
import StatusOverviewCards from "../components/StatusOverviewCards";
import { ILOCOS_SUR_BOUNDARIES } from "../utils/municipalityBoundaries";
import type { MunicipalityOption } from "../utils/municipalities";
import { getActiveResponders, updateAdminReport } from "../utils/reports";

interface Responder {
  id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
}

type ReportStatus = "pending" | "dispatched" | "resolved";
const INCIDENT_STATUS_TOAST_ID = "incident-status-update";

// Older reports may still be stored as "En Route"; treat them as dispatched.
function getDisplayStatus(status?: string | null): ReportStatus {
  const normalizedStatus = status?.trim().toLowerCase() || "";
  if (normalizedStatus.includes("resolved")) return "resolved";
  if (
    normalizedStatus.includes("dispatched") ||
    normalizedStatus.includes("en route")
  ) {
    return "dispatched";
  }
  return "pending";
}

function getCoordinates(report: Report) {
  if (report.latitude === null || report.longitude === null) return null;
  const lat = Number(report.latitude);
  const lng = Number(report.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function normalizeProvince(province?: string | null) {
  return province
    ?.trim()
    .toLowerCase()
    .replace(/^province of\s+/, "")
    .replace(/\s+province$/, "");
}

function normalizeMunicipality(municipality?: string | null) {
  return municipality
    ?.trim()
    .toLowerCase()
    .replace(/^(municipality|city) of\s+/, "")
    .replace(/\s+(city|municipality)$/, "")
    .replace(/\s+/g, " ");
}

function isPointInRing(
  longitude: number,
  latitude: number,
  ring: Position[],
) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crossesLatitude =
      (currentLatitude > latitude) !== (previousLatitude > latitude);
    if (
      crossesLatitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointInPolygon(
  longitude: number,
  latitude: number,
  rings: Position[][],
) {
  const [outerRing, ...holes] = rings;
  return Boolean(
    outerRing &&
      isPointInRing(longitude, latitude, outerRing) &&
      !holes.some((hole) => isPointInRing(longitude, latitude, hole)),
  );
}

function isPointInMunicipality(
  longitude: number,
  latitude: number,
  feature: (typeof ILOCOS_SUR_BOUNDARIES.features)[number],
) {
  const { geometry } = feature;
  if (geometry.type === "Polygon") {
    return isPointInPolygon(longitude, latitude, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      isPointInPolygon(longitude, latitude, polygon),
    );
  }
  return false;
}

export default function Dashboard() {
  const { reports, setReports, municipalities } = useOutletContext<{
    reports: Report[];
    setReports: Dispatch<SetStateAction<Report[]>>;
    municipalities: MunicipalityOption[];
  }>();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderLoadError, setResponderLoadError] = useState<string | null>(
    null,
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("all");

  const ilocosSurReports = useMemo(
    () => reports.filter((report) => {
      const province = normalizeProvince(report.province);
      if (province) return province === "ilocos sur";

      const position = getCoordinates(report);
      return Boolean(
        position &&
          ILOCOS_SUR_BOUNDARIES.features.some((feature) =>
            isPointInMunicipality(position.lng, position.lat, feature),
          ),
      );
    }),
    [reports],
  );
  const selectedMunicipalityReports = useMemo(
    () =>
      ilocosSurReports.filter(
        (report) =>
          selectedMunicipality !== "all" &&
          (normalizeMunicipality(report.municipality) ===
            normalizeMunicipality(selectedMunicipality) ||
            (!report.municipality &&
              (() => {
                const position = getCoordinates(report);
                const boundary = ILOCOS_SUR_BOUNDARIES.features.find(
                  (feature) =>
                    normalizeMunicipality(feature.properties.municipality) ===
                    normalizeMunicipality(selectedMunicipality),
                );
                return Boolean(
                  position &&
                    boundary &&
                    isPointInMunicipality(position.lng, position.lat, boundary),
                );
              })())),
      ),
    [ilocosSurReports, selectedMunicipality],
  );
  const mapReports = useMemo(
    () =>
      selectedMunicipality === "all"
        ? ilocosSurReports
        : selectedMunicipalityReports,
    [ilocosSurReports, selectedMunicipality, selectedMunicipalityReports],
  );
  const selectedCityCoordinates = useMemo(
    () =>
      selectedMunicipalityReports.reduce(
        (center, report) => {
          const position = getCoordinates(report);
          if (!position) return center;
          return {
            latitude: center.latitude + position.lat,
            longitude: center.longitude + position.lng,
            count: center.count + 1,
          };
        },
        { latitude: 0, longitude: 0, count: 0 },
      ),
    [selectedMunicipalityReports],
  );
  const selectedCityCenter: [number, number] | null =
    selectedCityCoordinates.count > 0
      ? [
          selectedCityCoordinates.latitude / selectedCityCoordinates.count,
          selectedCityCoordinates.longitude / selectedCityCoordinates.count,
        ]
      : null;
  const mapMarkers = useMemo(
    () =>
      mapReports.flatMap((report) => {
        if (getDisplayStatus(report.status) === "resolved") return [];

        const position = getCoordinates(report);
        return position
          ? [
              {
                id: report.id,
                latitude: position.lat,
                longitude: position.lng,
                title: report.accident_type,
                status: report.status,
                municipality: report.municipality,
                createdAt: report.created_at,
              },
            ]
          : [];
      }),
    [mapReports],
  );

  const fetchResponders = async () => {
    setIsLoadingResponders(true);
    setResponderLoadError(null);
    try {
      setResponders(await getActiveResponders());
    } catch (error) {
      console.error("Failed to fetch responders:", error);
      setResponderLoadError(
        error instanceof Error ? error.message : "Could not load responders.",
      );
    } finally {
      setIsLoadingResponders(false);
    }
  };

  const dispatchReport = async (
    report: Report,
    status: ReportStatus,
    responderId?: string,
  ): Promise<boolean> => {
    setIsUpdatingStatus(true);
    toast.loading("Updating incident status...", {
      id: INCIDENT_STATUS_TOAST_ID,
    });

    try {
      await updateAdminReport(report.id, status, responderId);

      const updatedReport = {
        ...report,
        status,
        assigned_responder_id: responderId
          ? responderId
          : report.assigned_responder_id,
      };
      setReports((currentReports) =>
        currentReports.map((item) =>
          item.id === report.id ? updatedReport : item,
        ),
      );
      setSelectedReport(updatedReport);
      toast.success("Incident status updated.", {
        id: INCIDENT_STATUS_TOAST_ID,
      });
      return true;
    } catch (error) {
      console.error("Failed to update incident status:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update incident.",
        { id: INCIDENT_STATUS_TOAST_ID },
      );
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openDispatchModal = (report: Report) => {
    setSelectedResponderId(
      report.assigned_responder_id
        ? String(report.assigned_responder_id)
        : "",
    );
    setResponderLoadError(null);
    setIsDispatchModalOpen(true);
    void fetchResponders();
  };

  const confirmDispatch = async () => {
    if (!activeReport || !selectedResponderId) return;
    const wasDispatched = await dispatchReport(
      activeReport,
      "dispatched",
      selectedResponderId,
    );
    if (wasDispatched) setIsDispatchModalOpen(false);
  };

  useEffect(() => {
    if (!selectedReport) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDispatchModalOpen) {
          setIsDispatchModalOpen(false);
        } else {
          setSelectedReport(null);
        }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedReport, isDispatchModalOpen]);

  const activeReport = selectedReport
    ? reports.find((report) => report.id === selectedReport.id) || selectedReport
    : null;
  const activeStatus = activeReport ? getDisplayStatus(activeReport.status) : null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return Number.isNaN(date.getTime())
      ? dateString
      : date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
  };

  return (
    <div className="dashboard-page min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center">
      <div className="dashboard-heading mb-5 flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50/80 px-5 py-5 shadow-sm sm:px-7">
        <h1 className="dashboard-title text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard
        </h1>
        <span className="dashboard-live-pill inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
      <StatusOverviewCards reports={reports} />
      
      <div className="dashboard-map-card w-full rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Incident map</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div
              aria-label="Map marker status legend"
              className="dashboard-map-legend flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="dashboard-map-legend-dot dashboard-map-legend-dot--pending" />
                Blinking red: pending
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="dashboard-map-legend-vehicle"
                  aria-hidden="true"
                  viewBox="0 0 24 16"
                >
                  <path d="M2 3h12l3 4h3a2 2 0 0 1 2 2v4h-2a3 3 0 0 1-6 0H9a3 3 0 0 1-6 0H1V5a2 2 0 0 1 1-2Zm1 2v4h12l-2-3H3Zm1 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm12 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
                </svg>
                Dispatched
              </span>
            </div>
            <label
              htmlFor="incident-city-filter"
              className="text-sm font-medium text-slate-600"
            >
              Area
            </label>
            <select
              id="incident-city-filter"
              value={selectedMunicipality}
              onChange={(event) => setSelectedMunicipality(event.target.value)}
              className="dashboard-area-select min-h-10 min-w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Ilocos Sur</option>
              {municipalities.map((municipality) => (
                <option key={municipality.name} value={municipality.name}>
                  {municipality.name}
                </option>
              ))}
            </select>
            <span className="dashboard-map-count rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {mapMarkers.length} {mapMarkers.length === 1 ? "report" : "reports"}
            </span>
          </div>
        </div>
        <div className="dashboard-map-frame h-[min(70vh,680px)] min-h-[360px] w-full overflow-hidden rounded-xl border border-slate-200 sm:min-h-[420px]">
          <IncidentMap
            center={
              selectedCityCenter ?? [17.2874, 120.5783]
            }
            zoom={selectedCityCenter ? 12 : 9}
            markers={mapMarkers}
            autoFitMarkers
            boundaries={ILOCOS_SUR_BOUNDARIES}
            selectedMunicipality={selectedMunicipality}
            onMarkerClick={(id) => {
              const report = mapReports.find((item) => item.id === id);
              if (report) setSelectedReport(report);
            }}
          />
        </div>
        <p className="mt-2 px-1 text-xs text-slate-500">
          Municipal boundaries: NAMRIA, PSA, and OCHA Philippines via
          geoBoundaries (CC BY 3.0 IGO).
        </p>
      </div>
      </div>
      {activeReport &&
        createPortal(
          <div
            className="web-modal-backdrop incident-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4"
            onClick={() => setSelectedReport(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-report-title"
              className="web-modal-panel incident-modal-panel w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-7">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Incident verification
                  </p>
                  <h2
                    id="dashboard-report-title"
                    className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {activeReport.accident_type}
                  </h2>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                    <LuCalendar size={15} />
                    {formatDate(activeReport.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                      activeStatus === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : activeStatus === "dispatched"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {activeStatus === "dispatched" ? "en route" : activeStatus}
                  </span>
                  <button
                    type="button"
                    aria-label="Close incident details"
                    onClick={() => setSelectedReport(null)}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <LuX size={20} />
                  </button>
                </div>
              </header>

              <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <LuUserRound size={17} className="text-indigo-600" />
                      Reporter details
                    </h3>
                    <p className="font-semibold text-slate-900">
                      {activeReport.reporter_name || "Unknown reporter"}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <LuPhone size={15} />
                      {activeReport.contact_number || "No contact number"}
                    </p>
                    {activeReport.email && (
                      <p className="mt-2 flex items-center gap-2 break-all text-sm text-slate-600">
                        <LuMail size={15} className="shrink-0" />
                        {activeReport.email}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <LuMapPin size={17} className="text-rose-600" />
                      Pinned location
                    </h3>
                    <p className="text-sm text-slate-600">
                      {activeReport.latitude === null ||
                      activeReport.longitude === null
                        ? "Not provided (text message). Call the sender to confirm."
                        : `${Number(activeReport.latitude).toFixed(6)}, ${Number(activeReport.longitude).toFixed(6)}`}
                    </p>
                    {activeReport.description && (
                      <p className="mt-2 break-words rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                        &ldquo;{activeReport.description}&rdquo;
                      </p>
                    )}
                  </div>

                  <ReporterIdPhoto userId={activeReport.user_id} />
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Incident evidence
                  </h3>
                  {activeReport.image_path ? (
                    <img
                      src={activeReport.image_path || undefined}
                      alt="Incident scene"
                      className="max-h-72 w-full rounded-2xl border border-slate-200 bg-slate-50 object-cover"
                    />
                  ) : (
                    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No incident photo was attached to this report.
                    </div>
                  )}
                </div>
              </div>

              <footer className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-7">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Dispatch workflow
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Update the incident status or assign an available responder.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["dispatched", "Dispatch", LuTruck],
                      ["resolved", "Resolve", LuCircleCheck],
                    ] as const
                  ).map(([status, label, Icon]) => (
                    <button
                      key={status}
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        status === "dispatched"
                          ? openDispatchModal(activeReport)
                          : void dispatchReport(activeReport, status)
                      }
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        activeStatus === status
                          ? status === "dispatched"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

              </footer>
            </section>
          </div>,
          document.body,
        )}
      {isDispatchModalOpen && activeReport &&
        createPortal(
          <div
            className="web-modal-backdrop incident-evidence-preview-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-dispatch-responder-title"
            onClick={() => {
              if (!isUpdatingStatus) setIsDispatchModalOpen(false);
            }}
          >
            <section
              className="web-modal-panel incident-modal-panel w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Dispatch incident
                  </p>
                  <h2
                    id="dashboard-dispatch-responder-title"
                    className="mt-1 text-xl font-bold text-slate-900"
                  >
                    Select a responder
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assign a responder to {activeReport.accident_type}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  aria-label="Close dispatch modal"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="cursor-pointer rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LuX size={20} />
                </button>
              </header>

              {isLoadingResponders ? (
                <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Loading responders…
                </p>
              ) : responderLoadError ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm text-rose-700">{responderLoadError}</p>
                  <button
                    type="button"
                    onClick={() => void fetchResponders()}
                    className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                  >
                    Retry
                  </button>
                </div>
              ) : responders.length > 0 ? (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {responders.map((responder) => {
                    const responderId = String(responder.id);
                    const isSelected = selectedResponderId === responderId;
                    return (
                      <button
                        key={responder.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedResponderId(responderId)}
                        className={`w-full cursor-pointer rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block font-semibold text-slate-900">
                          {responder.first_name} {responder.last_name}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {responder.contact_number || "No contact number"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <LuTriangleAlert size={16} />
                  No responders are available to assign.
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedResponderId || isUpdatingStatus}
                  onClick={() => void confirmDispatch()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LuTruck size={16} />
                  Dispatch
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}