import { LuCheck, LuTriangle,  } from "react-icons/lu";

interface StatusOverviewProps {
  reports: { status: string }[];
}

export default function StatusOverviewCards({ reports }: StatusOverviewProps) {
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const assignedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full max-w-4xl">
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 flex items-center border-l-4 border-l-yellow-500">
        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
          <LuTriangle size={28} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Pending Reports</p>
          <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 flex items-center border-l-4 border-l-emerald-500">
        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 mr-4">
          <LuCheck size={28} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">
            Resolved Incidents
          </p>
          <p className="text-2xl font-bold text-slate-800">{assignedCount}</p>
        </div>
      </div>
    </div>
  );
}
