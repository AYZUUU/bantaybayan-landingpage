import { LuCheck, LuTriangle, LuTruck } from "react-icons/lu";

interface StatusOverviewProps {
  reports: { status: string }[];
}

export default function StatusOverviewCards({ reports }: StatusOverviewProps) {
  const getDisplayStatus = (status: string) => {
    const normalizedStatus = status.trim().toLowerCase();
    if (normalizedStatus.includes("resolved")) return "resolved";
    if (
      normalizedStatus.includes("dispatched") ||
      normalizedStatus.includes("en route")
    ) return "dispatched";
    return "pending";
  };
  const pendingCount = reports.filter(
    (report) => getDisplayStatus(report.status) === "pending",
  ).length;
  const resolvedCount = reports.filter(
    (report) => getDisplayStatus(report.status) === "resolved",
  ).length;
  const dispatchedCount = reports.filter(
    (report) => getDisplayStatus(report.status) === "dispatched",
  ).length;

  return (
    <div className="mb-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="dashboard-stat-card dashboard-stat-pending flex min-h-28 items-center gap-4 rounded-2xl border border-amber-200/80 border-l-4 border-l-amber-400 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="dashboard-stat-icon rounded-xl bg-amber-50 p-3 text-amber-600">
          <LuTriangle size={23} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">Pending</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{pendingCount}</p>
        </div>
      </div>

      <div className="dashboard-stat-card dashboard-stat-dispatched flex min-h-28 items-center gap-4 rounded-2xl border border-blue-200/80 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="dashboard-stat-icon rounded-xl bg-blue-50 p-3 text-blue-600">
          <LuTruck size={23} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">Dispatched</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{dispatchedCount}</p>
        </div>
      </div>

      <div className="dashboard-stat-card dashboard-stat-resolved flex min-h-28 items-center gap-4 rounded-2xl border border-emerald-200/80 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="dashboard-stat-icon rounded-xl bg-emerald-50 p-3 text-emerald-600">
          <LuCheck size={23} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">Resolved</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{resolvedCount}</p>
        </div>
      </div>
    </div>
  );
}
