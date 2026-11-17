import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuShieldAlert,
  LuClock,
  LuTruck,
  LuCircleCheck,
  LuUserCheck,
  LuPhone,
  LuCalendar,
  LuMapPin,
  LuX,
  LuTriangleAlert,
  LuFileText,
  LuListFilter,
} from "react-icons/lu";
import IncidentMap from "../components/IncidentMap";
import AdminResponderLocation from "../components/AdminResponderLocation";
import ReporterIdPhoto from "../components/ReporterIdPhoto";
import { getActiveResponders, getAdminReports, updateAdminReport } from "../utils/reports";

interface Report {
  id: number;
  user_id: string | null;
  emergency_type: string;
  accident_level: string;
  reporter_name: string;
  contact_number?: string | null;
  description?: string | null;
  email?: string | null;
  image_path: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  assigned_responder_id?: string | null;
  backup_requested_at?: string | null;
  backup_note?: string | null;
}

interface Responder {
  id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
}

type FilterStatus = "all" | "pending" | "dispatched" | "resolved";
const INCIDENT_STATUS_TOAST_ID = "incident-status-update";

// Older reports may still be stored as "En Route"; treat them as dispatched.
function getDisplayStatus(status?: string | null): Exclude<FilterStatus, "all"> {
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

function getFilterStatus(status?: string | null): Exclude<FilterStatus, "all"> {
  return getDisplayStatus(status);
}

export default function Incidents() {
  const { reports, setReports } = useOutletContext<{
    reports: Report[];
    setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  }>();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationReportId = searchParams.get("report");
  const [isEvidencePreviewOpen, setIsEvidencePreviewOpen] = useState(false);
  const [dispatchReport, setDispatchReport] = useState<Report | null>(null);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [responders, setResponders] = useState<Responder[]>([]);
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderLoadError, setResponderLoadError] = useState<string | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const filterLoadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notificationReportId) return;
    let active = true;
    const clearTarget = () => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("report");
        return next;
      }, { replace: true });
    };
    const openReport = async () => {
      try {
        if (!/^[1-9]\d*$/.test(notificationReportId) || !Number.isSafeInteger(Number(notificationReportId))) {
          throw new Error("Invalid report notification.");
        }
        const report = (await getAdminReports()).find((item) => item.id === Number(notificationReportId));
        if (!active) return;
        if (!report) throw new Error("This report is no longer available.");
        setSelectedReport({
          ...report,
          emergency_type: report.emergency_type || "Incident",
          accident_level: report.accident_level || "",
          reporter_name: report.reporter_name || "Anonymous",
        });
      } catch (error) {
        if (!active) return;
        console.error("Could not open the report notification:", error);
        toast.error(error instanceof Error ? error.message : "Could not open this report.");
      }
      if (active) clearTarget();
    };
    void openReport();
    return () => { active = false; };
  }, [notificationReportId, setSearchParams]);

  useEffect(() => {
    return () => {
      if (filterLoadingTimer.current) clearTimeout(filterLoadingTimer.current);
    };
  }, []);

  const handleFilterChange = (filter: FilterStatus) => {
    if (filter === activeFilter) return;

    setActiveFilter(filter);
    setIsFilterLoading(true);
    if (filterLoadingTimer.current) clearTimeout(filterLoadingTimer.current);
    filterLoadingTimer.current = setTimeout(() => {
      setIsFilterLoading(false);
      filterLoadingTimer.current = null;
    }, 280);
  };

  useEffect(() => {
    if (!selectedReport) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedReport]);

  useEffect(() => {
    if (!isEvidencePreviewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsEvidencePreviewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEvidencePreviewOpen]);

  useEffect(() => {
    if (!dispatchReport) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDispatchReport(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatchReport]);

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

  const fetchResponders = useCallback(async () => {
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
  }, []);

  const handleStatusChange = async (
    reportId: number,
    newStatus: string,
    responderId?: string
  ): Promise<boolean> => {
    toast.loading("Updating incident status...", {
      id: INCIDENT_STATUS_TOAST_ID,
    });

    try {
      await updateAdminReport(reportId, newStatus, responderId);
      toast.success(
        responderId
          ? "Responder unit assigned & dispatched!"
          : "Status updated successfully!",
        { id: INCIDENT_STATUS_TOAST_ID },
      );

      const updateReport = (report: Report): Report =>
        report.id === reportId
          ? {
              ...report,
              status: newStatus,
              assigned_responder_id:
                responderId ?? report.assigned_responder_id,
            }
          : report;
      setReports((prevReports) => prevReports.map(updateReport));
      setSelectedReport((currentReport) =>
        currentReport?.id === reportId
          ? updateReport(currentReport)
          : currentReport,
      );
      return true;
    } catch (error) {
      console.error("Update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update incident.",
        {
        id: INCIDENT_STATUS_TOAST_ID,
        },
      );
      return false;
    }
  };

  const openDispatchModal = (report: Report) => {
    setSelectedResponderId(
      report.assigned_responder_id
        ? String(report.assigned_responder_id)
        : ""
    );
    setResponderLoadError(null);
    setDispatchReport(report);
    void fetchResponders();
  };

  const confirmDispatch = async () => {
    if (!dispatchReport || !selectedResponderId) return;
    const wasDispatched = await handleStatusChange(
      dispatchReport.id,
      "dispatched",
      selectedResponderId
    );
    if (wasDispatched) setDispatchReport(null);
  };

  const getSeverityBadgeClass = (level?: string) => {
    const l = level?.toLowerCase() || "";
    if (l === "critical") return "bg-rose-100 text-rose-700 border-rose-200";
    if (l === "high") return "bg-orange-100 text-orange-700 border-orange-200";
    if (l === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const filteredReports = useMemo(() => {
    return reports
      .filter(
        (report) =>
          activeFilter === "all" || getFilterStatus(report.status) === activeFilter
      )
      .sort(
        (a, b) =>
          Number(getDisplayStatus(a.status) === "resolved") -
            Number(getDisplayStatus(b.status) === "resolved") ||
          Number(!!b.backup_requested_at) - Number(!!a.backup_requested_at)
      );
  }, [reports, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: reports.length,
      pending: reports.filter((report) => getDisplayStatus(report.status) === "pending").length,
      dispatched: reports.filter((report) => getFilterStatus(report.status) === "dispatched").length,
      resolved: reports.filter((report) => getDisplayStatus(report.status) === "resolved").length,
    };
  }, [reports]);

  const statusFilters = [
    {
      id: "all",
      label: "All reports",
      icon: LuFileText,
      activeClass: "border-slate-800 bg-slate-800 text-white shadow-md shadow-slate-900/10",
      countClass: "bg-white/15 text-white",
    },
    {
      id: "pending",
      label: "Pending",
      icon: LuClock,
      activeClass: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20",
      countClass: "bg-white/20 text-white",
    },
    {
      id: "dispatched",
      label: "En Route",
      icon: LuTruck,
      activeClass: "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20",
      countClass: "bg-white/20 text-white",
    },
    {
      id: "resolved",
      label: "Resolved",
      icon: LuCircleCheck,
      activeClass: "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
      countClass: "bg-white/20 text-white",
    },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-slate-50/70 px-4 py-8 font-sans text-slate-800 sm:px-6 lg:px-8">
      {/* Responsive Header */}
      <div className="mx-auto mb-6 flex max-w-7xl flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Live Command Stream
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            BantayBayan Command Center
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Real-time incident queue & dispatch management
          </p>
        </div>

        <div className="w-full sm:w-auto bg-slate-100/80 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <LuShieldAlert className="text-blue-600 shrink-0" size={22} />
            <span className="text-xs sm:text-sm font-bold text-slate-700">Active Queue:</span>
          </div>
          <span className="text-blue-600 font-black text-base">{reports.length}</span>
        </div>
      </div>

      {/* Responsive Filter Bar */}
      <div className="mx-auto mb-6 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <LuListFilter size={17} className="text-blue-600" />
              Filter by status
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing {filteredReports.length} of {reports.length} reports
            </p>
          </div>
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statusFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleFilterChange(filter.id)}
                className={`flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4 ${
                  isActive
                    ? filter.activeClass
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon size={17} className="shrink-0" />
                  <span className="truncate text-xs font-semibold sm:text-sm">
                    {filter.label}
                  </span>
                </span>
                <span
                  className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive
                      ? filter.countClass
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {counts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Responsive Columns (1col -> 2col -> 3col) */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isFilterLoading ? (
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={`incident-filter-skeleton-${index}`}
              role="status"
              aria-label="Loading filtered incidents"
              className="motion-safe:animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="h-6 w-2/3 rounded-lg bg-slate-200" />
                <div className="h-6 w-20 rounded-lg bg-slate-100" />
              </div>
              <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                <div className="h-3 w-4/5 rounded bg-slate-200" />
                <div className="h-3 w-3/5 rounded bg-slate-200" />
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="mb-3 h-3 w-1/3 rounded bg-slate-200" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded-xl bg-slate-100" />
                  <div className="h-10 rounded-xl bg-slate-100" />
                  <div className="h-10 rounded-xl bg-slate-100" />
                </div>
              </div>
            </div>
          ))
        ) : filteredReports.length === 0 ? (
          <div className="col-span-full bg-white p-8 sm:p-16 rounded-2xl sm:rounded-3xl border border-slate-200/80 text-center shadow-xs">
            <LuFileText size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-bold text-base sm:text-lg">
              {reports.length === 0
                ? "No active incident reports found in database."
                : `No "${activeFilter}" incident reports found.`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Select another status filter above or wait for incoming reports.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const currentStatus = getDisplayStatus(report.status);
            const isResolved = currentStatus === "resolved";

            return (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`group flex cursor-pointer flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${
                  isResolved
                    ? "bg-emerald-50/40 border-emerald-300/80 shadow-emerald-500/5"
                    : "bg-white border-slate-200 hover:-translate-y-1 hover:border-blue-300"
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {report.emergency_type}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase border shrink-0 tracking-wider ${getSeverityBadgeClass(
                        report.accident_level
                      )}`}
                    >
                      {report.accident_level || "Standard"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {report.backup_requested_at && (
                      <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 font-bold text-amber-800">
                        <LuTriangleAlert size={15} className="mt-0.5 shrink-0" />
                        <span>
                          Backup requested
                          {report.backup_note ? `: ${report.backup_note}` : ""}
                        </span>
                      </p>
                    )}
                    <p className="flex items-center gap-2 truncate">
                      <LuUserCheck size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-800">Reporter:</strong> {report.reporter_name}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 truncate">
                      <LuCalendar size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-800">Logged:</strong> {formatDate(report.created_at)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                      Dispatch Action
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1.5 text-[11px] ${
                        report.image_path ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {report.image_path ? " Photo" : " Map"}
                    </span>
                  </div>

                  <div
                    className="grid grid-cols-3 gap-1.5 sm:gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      role="status"
                      aria-label={`Current status: ${currentStatus}`}
                      className={`py-2.5 px-1 sm:px-2 rounded-xl sm:rounded-2xl font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 ${
                        currentStatus === "pending"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                          : currentStatus === "dispatched"
                            ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      }`}
                    >
                      {currentStatus === "pending" ? (
                        <LuClock size={13} />
                      ) : currentStatus === "dispatched" ? (
                        <LuTruck size={13} />
                      ) : (
                        <LuCircleCheck size={13} />
                      )}
                      <span className="capitalize">
                        {currentStatus === "dispatched" ? "en route" : currentStatus}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => openDispatchModal(report)}
                      className={`py-2.5 px-1 sm:px-2 rounded-xl sm:rounded-2xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        currentStatus === "dispatched"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200/60"
                      }`}
                    >
                      <LuTruck size={13} />
                      <span className="hidden xs:inline">Dispatch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(report.id, "resolved")}
                      className={`py-2.5 px-1 sm:px-2 rounded-xl sm:rounded-2xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        currentStatus === "resolved"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/60"
                      }`}
                    >
                      <LuCircleCheck size={13} />
                      <span className="hidden xs:inline">Resolve</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Responsive Modal Overlay */}
      {selectedReport && (
        createPortal(
          <div
            className="web-modal-backdrop incident-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4"
            onClick={() => setSelectedReport(null)}
          >
            <div
              className="web-modal-panel incident-modal-panel relative w-full max-w-4xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:space-y-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Incident Verification & Detail
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                  {selectedReport.emergency_type}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <LuCalendar size={13} /> Logged on {formatDate(selectedReport.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LuX size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <LuUserCheck size={16} className="text-blue-600" />
                    Reporter Verification
                  </h4>
                  <div className="space-y-1 text-xs text-slate-700">
                    <p><strong>Name:</strong> {selectedReport.reporter_name}</p>
                    <p className="flex items-center gap-1">
                      <LuPhone size={13} className="text-slate-400" />
                      <strong>Contact:</strong> {selectedReport.contact_number || "N/A"}
                    </p>
                  </div>

                  <ReporterIdPhoto userId={selectedReport.user_id} />
                </div>

                {selectedReport.image_path && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Visual Evidence
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEvidencePreviewOpen(true)}
                      aria-label="Preview incident evidence"
                      className="group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:rounded-2xl"
                    >
                      <img
                        src={selectedReport.image_path || undefined}
                        alt="Incident Evidence"
                        className="h-40 w-full object-cover transition-transform group-hover:scale-[1.02] sm:h-48"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-950/60 px-3 py-2 text-center text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        Click to preview
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <LuMapPin size={15} className="text-rose-600" />
                  Exact Pinned Location
                </h4>
                <div className="w-full h-64 lg:h-full min-h-[240px] sm:min-h-[280px] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200">
                  {selectedReport.latitude === null ||
                  selectedReport.longitude === null ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-amber-50 p-4 text-center">
                      <LuTriangleAlert size={22} className="text-amber-600" />
                      <p className="text-sm font-bold text-amber-900">
                        Location not provided
                      </p>
                      <p className="text-xs text-amber-800">
                        This came in by text message. Call the sender
                        {selectedReport.contact_number
                          ? ` at ${selectedReport.contact_number}`
                          : ""}{" "}
                        to confirm where help is needed.
                      </p>
                      {selectedReport.description && (
                        <p className="mt-1 w-full break-words rounded-lg bg-white p-2 text-left text-xs text-slate-700">
                          &ldquo;{selectedReport.description}&rdquo;
                        </p>
                      )}
                    </div>
                  ) : (
                  <IncidentMap
                    center={[
                      Number(selectedReport.latitude),
                      Number(selectedReport.longitude),
                    ]}
                    zoom={16}
                    markers={[
                      {
                        id: selectedReport.id,
                        latitude: Number(selectedReport.latitude),
                        longitude: Number(selectedReport.longitude),
                      },
                    ]}
                  />
                  )}
                </div>
              </div>

              {selectedReport.assigned_responder_id &&
                getDisplayStatus(selectedReport.status) === "dispatched" && (
                  <AdminResponderLocation
                    reportId={selectedReport.id}
                  />
                )}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span
                  role="status"
                  aria-label={`Current status: ${getDisplayStatus(selectedReport.status)}`}
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                    getDisplayStatus(selectedReport.status) === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : getDisplayStatus(selectedReport.status) === "dispatched"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {getDisplayStatus(selectedReport.status) === "dispatched"
                    ? "en route"
                    : getDisplayStatus(selectedReport.status)}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() =>
                      openDispatchModal(selectedReport)
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      getFilterStatus(selectedReport.status) === "dispatched"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <LuTruck size={16} />
                    Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusChange(selectedReport.id, "resolved")
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      getDisplayStatus(selectedReport.status) === "resolved"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <LuCircleCheck size={16} />
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ))}
      {isEvidencePreviewOpen && selectedReport?.image_path &&
        createPortal(
          <div
            className="web-modal-backdrop incident-evidence-preview-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Incident evidence preview"
            onClick={() => setIsEvidencePreviewOpen(false)}
          >
            <button
              type="button"
              aria-label="Close image preview"
              onClick={() => setIsEvidencePreviewOpen(false)}
              className="absolute right-4 top-4 z-[210] inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-slate-900 text-white shadow-xl transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <LuX size={28} />
            </button>
            <img
              src={selectedReport.image_path || undefined}
              alt="Incident evidence preview"
              onClick={(event) => event.stopPropagation()}
              className="incident-evidence-preview-image max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )}
      {dispatchReport &&
        createPortal(
          <div
            className="web-modal-backdrop incident-evidence-preview-backdrop fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatch-responder-title"
            onClick={() => setDispatchReport(null)}
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
                    id="dispatch-responder-title"
                    className="mt-1 text-xl font-bold text-slate-900"
                  >
                    Select a responder
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a responder unit for {dispatchReport.emergency_type}.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close dispatch modal"
                  onClick={() => setDispatchReport(null)}
                  className="cursor-pointer rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <LuX size={20} />
                </button>
              </header>

              {isLoadingResponders ? (
                <p
                  role="status"
                  className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"
                >
                  Loading available responders…
                </p>
              ) : responderLoadError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-4"
                >
                  <p className="text-sm text-rose-700">
                    {responderLoadError}
                  </p>
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
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No responders are available to assign.
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchReport(null)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedResponderId}
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