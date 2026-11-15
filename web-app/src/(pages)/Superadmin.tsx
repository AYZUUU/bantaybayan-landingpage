import React, { useCallback, useEffect, useState } from "react";
import {
  LuCheck,
  LuClock3,
  LuPlus,
  LuShieldCheck,
  LuTriangle,
  LuTruck,
  LuUsers,
} from "react-icons/lu";
import { createPortal } from "react-dom";
import { useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getManagedUsers,
  manageUser,
  type ManagedUser,
} from "../utils/users";
import {
  getSystemHealthChecks,
  type HealthCheck,
} from "../utils/systemHealth";

interface UserAccount {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  contact: string;
  contact_number: string;
  role: string;
  status: string;
  station?: string;
  photo_url: string | null;
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  trend: string;
}

interface Report {
  id: number;
  status: string;
}

function getAccountStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-red-100 text-red-700";
  }
}

function mapUser(user: ManagedUser): UserAccount {
  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`.trim() || "Unknown",
    first_name: user.first_name,
    last_name: user.last_name,
    contact: user.email || user.contact_number || "N/A",
    contact_number: user.contact_number,
    role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    status: user.status.charAt(0).toUpperCase() + user.status.slice(1),
    station: user.station ?? undefined,
    photo_url: user.photo_url,
  };
}

function StatCard({ icon, title, value, trend }: StatCardProps) {
  return (
    <div className="superadmin-stat-card flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{trend}</p>
      </div>
      <div className="superadmin-stat-icon rounded-xl bg-slate-50 p-3">{icon}</div>
    </div>
  );
}

export default function Superadmin() {
  const [admins, setAdmins] = useState<UserAccount[]>([]);
  const [citizens, setCitizens] = useState<UserAccount[]>([]);
  const [responders, setResponders] = useState<UserAccount[]>([]);
  const [citizenCount, setCitizenCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isHealthLoading, setIsHealthLoading] = useState(true);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationAccountId = searchParams.get("account");
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Add User / Responder Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [newRoleType, setNewRoleType] = useState("admin"); // 'admin' or 'responder'
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newStation, setNewStation] = useState("Metro Vigan Central");

  // Edit Form Fields State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editStation, setEditStation] = useState("");

  const { reports } = useOutletContext<{ reports: Report[] }>();

  const totalReports = reports ? reports.length : 0;
  const pendingAccounts = [...citizens, ...responders].filter(
    (user) => user.status.toLowerCase() === "pending",
  );
  const unresolvedReports = reports
    ? reports.filter(
        (report) => !report.status.toLowerCase().includes("resolved"),
      ).length
    : 0;
  const resolvedReports = reports ? reports.filter(
    (report) => report.status && report.status.toLowerCase() === "resolved"
  ).length : 0;

  const populateDashboardData = useCallback((users: ManagedUser[]) => {
    setAdmins(
      users
        .filter((user) => user.role === "admin" || user.role === "superadmin")
        .map(mapUser),
    );
    const citizens = users.filter((user) => user.role === "citizen");
    setCitizenCount(citizens.length);
    setCitizens(citizens.map(mapUser));
    setResponders(
      users.filter((user) => user.role === "responder").map(mapUser),
    );
  }, []);

  useEffect(() => {
    if (!notificationAccountId) return;
    let active = true;
    const openAccount = async () => {
      try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationAccountId)) {
          throw new Error("Invalid account notification.");
        }
        const users = await getManagedUsers();
        if (!active) return;
        const user = users.find((item) => item.id === notificationAccountId);
        if (!user || !["citizen", "responder"].includes(user.role)) {
          throw new Error("This account is no longer available.");
        }
        populateDashboardData(users);
        setSelectedUser(mapUser(user));
      } catch (error) {
        if (!active) return;
        console.error("Could not open the account notification:", error);
        toast.error(error instanceof Error ? error.message : "Could not open this account.");
      }
      if (active) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete("account");
          return next;
        }, { replace: true });
      }
    };
    void openAccount();
    return () => { active = false; };
  }, [notificationAccountId, populateDashboardData, setSearchParams]);

  const fetchDashboardData = async () => {
    try {
      populateDashboardData(await getManagedUsers());
      return true;
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error(
        "Changes were saved, but account data could not be refreshed. Reload the page to see the latest changes.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadUsers = () => {
      void getManagedUsers()
        .then((users) => {
          if (active) populateDashboardData(users);
        })
        .catch((error: unknown) => {
          console.error("Failed to fetch dashboard data:", error);
          if (active) toast.error("Could not load user accounts.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    const handlePushMessage = (event: MessageEvent) => {
      if (event.data?.type === "account_approval_requested") loadUsers();
    };
    loadUsers();
    navigator.serviceWorker?.addEventListener("message", handlePushMessage);
    return () => {
      active = false;
      navigator.serviceWorker?.removeEventListener("message", handlePushMessage);
    };
  }, [populateDashboardData]);

  const refreshSystemHealth = useCallback(async () => {
    setIsHealthLoading(true);
    try {
      setHealthChecks(await getSystemHealthChecks());
    } catch (error) {
      console.error("Could not check Supabase service health:", error);
      setHealthChecks([
        {
          name: "System health checks",
          status: "unavailable",
          details:
            error instanceof Error ? error.message : "Health checks failed.",
        },
      ]);
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void getSystemHealthChecks()
      .then((checks) => {
        if (active) setHealthChecks(checks);
      })
      .catch((error: unknown) => {
        console.error("Could not check Supabase service health:", error);
        if (active) {
          setHealthChecks([
            {
              name: "System health checks",
              status: "unavailable",
              details:
                error instanceof Error ? error.message : "Health checks failed.",
            },
          ]);
        }
      })
      .finally(() => {
        if (active) setIsHealthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // --- HANDLE CREATE NEW ADMIN / RESPONDER ---
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await manageUser({
          action: "create",
          first_name: newFirstName,
          last_name: newLastName,
          email: newEmail,
          password: newPassword,
          contact_number: newContactNumber,
          station: newStation,
          role: newRoleType,
      });
      toast.success(`${newRoleType === "responder" ? "Responder" : "Admin"} account successfully created!`);
      setIsAddUserOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPassword("");
      setNewContactNumber("");
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to create user", err);
      toast.error(err instanceof Error ? err.message : "Could not create account.");
    }
  };

  // --- OPEN EDIT MODAL ---
  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditContact(user.contact_number);
    setEditRole(user.role);
    setEditStation(user.station || "");
    const normalizedStatus = user.status
      ? user.status.charAt(0).toUpperCase() + user.status.slice(1).toLowerCase()
      : "Active";

    setEditStatus(normalizedStatus);
  };

  // --- SAVE EDIT CHANGES ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await manageUser({
          action: "update",
          id: editingUser.id,
          first_name: editFirstName,
          last_name: editLastName,
          contact_number: editContact,
          role: editRole.toLowerCase(),
          status: editStatus.toLowerCase(),
          ...(editingUser.role.toLowerCase() === "responder"
            ? { station: editStation.trim() }
            : {}),
      });
      const refreshed = await fetchDashboardData();
      setEditingUser(null);
      if (refreshed) toast.success("User updated successfully.");
    } catch (err) {
      console.error("Failed to save updates", err);
      toast.error(err instanceof Error ? err.message : "Could not save updates.");
    }
  };

  const handleApproveAccount = async (user: UserAccount) => {
    if (approvingUserId) return;
    setApprovingUserId(user.id);
    try {
      await manageUser({
        action: "update",
        id: user.id,
        status: "active",
      });
      setCitizens((current) =>
        current.map((citizen) =>
          citizen.id === user.id ? { ...citizen, status: "Active" } : citizen,
        ),
      );
      setResponders((current) =>
        current.map((responder) =>
          responder.id === user.id ? { ...responder, status: "Active" } : responder,
        ),
      );
      setSelectedUser(null);
      toast.success(`${user.name}’s account has been approved.`);
    } catch (error) {
      console.error("Could not approve account:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not approve this account.",
      );
    } finally {
      setApprovingUserId(null);
    }
  };

  return (
    <div className="superadmin-container relative min-h-screen w-full bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="superadmin-header mb-7 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">System administration</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Superadmin Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            System health and global administration
          </p>
        </div>
        <button
          onClick={() => setIsAddUserOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <LuPlus size={20} /> Add New User
        </button>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<LuUsers size={28} className="text-blue-600" />}
          title="Total Citizens"
          value={citizenCount}
          trend="Registered on app"
        />
        <StatCard
          icon={<LuShieldCheck size={28} className="text-green-600" />}
          title="Active Admins"
          value={admins.filter(a => a.status?.toLowerCase() === 'active').length}
          trend="Currently registered"
        />
        <StatCard
          icon={<LuTruck size={28} className="text-orange-600" />}
          title="Responders"
          value={responders.length}
          trend="Emergency units"
        />
        <StatCard
          icon={<LuTriangle size={28} className="text-red-600" />}
          title="Total Reports"
          value={totalReports}
          trend={`${unresolvedReports} unresolved`}
        />
        <StatCard
          icon={<LuShieldCheck size={28} className="text-emerald-600" />}
          title="Resolved Reports"
          value={resolvedReports}
          trend={`${Math.round((resolvedReports / (totalReports || 1)) * 100)}% resolution rate`}
        />
      </div>

      <section
        aria-labelledby="pending-accounts-heading"
        className="superadmin-panel mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-60/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
              <LuClock3 size={20} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="pending-accounts-heading"
                className="text-lg font-bold text-slate-900"
              >
                Account review queue
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Review submitted ID documents before approving new accounts.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            {pendingAccounts.length} pending
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-5 text-sm text-slate-500" role="status">
            Loading account applications…
          </p>
        ) : pendingAccounts.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-6 text-sm text-slate-600">
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <LuCheck size={18} aria-hidden="true" />
            </span>
            All account applications have been reviewed.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingAccounts.map((citizen) => (
              <li
                key={citizen.id}
                className="superadmin-table-row flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {citizen.photo_url ? (
                    <img
                      src={citizen.photo_url}
                      alt=""
                      className="h-12 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                    />
                  ) : (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700">
                      No ID
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {citizen.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {citizen.contact}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(citizen)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Review application
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="system-health-heading"
        className="superadmin-panel mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="system-health-heading"
              className="text-lg font-bold text-slate-900"
            >
              Supabase System Health
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live database, storage, and Edge Function reachability checks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshSystemHealth()}
            disabled={isHealthLoading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {isHealthLoading ? "Checking…" : "Check again"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {healthChecks.map((check) => (
            <div
              key={check.name}
              className="superadmin-health-card rounded-xl border border-slate-200 p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-800">{check.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    check.status === "operational"
                      ? "bg-emerald-100 text-emerald-700"
                      : check.status === "unavailable"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isHealthLoading && healthChecks.length === 0
                    ? "Checking"
                    : check.status}
                </span>
              </div>
              <p className="mt-2 break-words text-sm text-slate-500">
                {check.details}
              </p>
            </div>
          ))}
          {isHealthLoading && healthChecks.length === 0 && (
            <p className="text-sm text-slate-500" role="status">
              Checking Supabase services…
            </p>
          )}
        </div>
      </section>

      <div className="flex w-full flex-col gap-6">
        {/* Admin Management Table */}
        <div className="superadmin-panel w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Admin Management
          </h2>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-gray-500 py-4">Loading administrators...</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr
                      key={admin.id}
                      className="superadmin-table-row border-b border-slate-100 transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {admin.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{admin.role}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getAccountStatusClass(admin.status)}`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(admin)}
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Emergency Responders Monitoring Table */}
        <div className="superadmin-panel w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Emergency Responders Monitoring
          </h2>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-gray-500 py-4">Loading responders...</p>
            ) : responders.length === 0 ? (
              <p className="text-gray-400 py-4 italic">
                No responder accounts provisioned yet.
              </p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 px-4">Responder Name</th>
                    <th className="py-3 px-4">Contact / Email</th>
                    <th className="py-3 px-4">Assigned Station</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {responders.map((resp) => (
                    <tr
                      key={resp.id}
                      className="superadmin-table-row border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {resp.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {resp.contact}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {resp.station || "Not assigned"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getAccountStatusClass(resp.status)}`}
                        >
                          {resp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(resp)}
                          className="text-blue-600 hover:underline text-sm font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Citizen Accounts Table */}
        <div className="superadmin-panel w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Citizen Accounts & Verification IDs
            </h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-gray-500 py-4">Loading citizens...</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">
                      Verification ID & Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {citizens.map((citizen) => (
                    <tr
                      key={citizen.id}
                      className="superadmin-table-row border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {citizen.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {citizen.contact}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            citizen.status?.toLowerCase() === "active"
                              ? "bg-green-100 text-green-700"
                              : citizen.status?.toLowerCase() === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {citizen.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right flex items-center justify-end gap-3">
                        {citizen.photo_url ? (
                          <button
                            onClick={() => setSelectedUser(citizen)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            View Account Info
                          </button>
                        ) : (
                          <span className="text-red-500 font-bold">
                            No ID Uploaded
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenEdit(citizen)}
                          className="text-blue-600 hover:underline text-sm font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ADD NEW ADMIN / RESPONDER MODAL --- */}
      {isAddUserOpen && (
        createPortal(
        <div className="web-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
          <div className="web-modal-panel superadmin-modal-panel relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <button
              onClick={() => setIsAddUserOpen(false)}
              className="absolute right-4 top-3 text-2xl text-gray-500 hover:text-black cursor-pointer"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Provision Privileged Account
            </h3>
            <form
              onSubmit={handleCreateNewUser}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Select Account Type
                </label>
                <select
                  value={newRoleType}
                  onChange={(e) => setNewRoleType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600 bg-white"
                >
                  <option value="admin">Administrator / Barangay Staff</option>
                  <option value="responder">Emergency Responder</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                  required
                />
              </div>

              {newRoleType === "responder" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Assigned Station / Unit
                  </label>
                  <input
                    type="text"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)
      )}

      {/* --- UNIVERSAL EDIT MODAL WITH APPROVE/SUSPEND STATUS CONTROLS --- */}
      {editingUser && (
        createPortal(
        <div className="web-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
          <div className="web-modal-panel superadmin-modal-panel relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute right-4 top-3 text-2xl text-gray-500 hover:text-black cursor-pointer"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Edit {editingUser.role} Profile
            </h3>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Contact Number / Email
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                />
              </div>
              {editingUser.role.toLowerCase() === "responder" && (
                <div>
                  <label
                    htmlFor="edit-responder-station"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Assigned Station
                  </label>
                  <input
                    id="edit-responder-station"
                    type="text"
                    value={editStation}
                    onChange={(e) => setEditStation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600"
                    maxLength={120}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Account Status / Approval Workflow
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600 bg-white"
                >
                  <option value="Active">Active (Approved)</option>
                  <option value="Pending">Pending (Unapproved)</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)
      )}

      {/* --- FULL USER INFORMATION & ID VERIFICATION MODAL --- */}
      {selectedUser && (
        createPortal(
        <div
          onClick={() => setSelectedUser(null)}
          className="web-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-xs sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="web-modal-panel superadmin-modal-panel relative w-full max-w-xl rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute right-5 top-5 text-xl text-slate-400 hover:text-slate-700 cursor-pointer w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-colors"
            >
              &times;
            </button>

            <div className="mb-6">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
                {selectedUser.role} Profile Details
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                {selectedUser.name}
              </h3>
              <p className="text-xs text-slate-500">Complete record and submitted verification credentials</p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contact / Email</span>
                <span className="text-sm font-bold text-slate-800">{selectedUser.contact || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Account Status
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  selectedUser.status?.toLowerCase() === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : selectedUser.status?.toLowerCase() === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                }`}>
                  {/* Dynamic Status Icons */}
                  {selectedUser.status?.toLowerCase() === "active" && <LuShieldCheck size={14} />}
                  {selectedUser.status?.toLowerCase() === "pending" && <LuTriangle size={14} />}
                  {selectedUser.status?.toLowerCase() === "suspended" && <LuTriangle size={14} className="rotate-180" />}

                  {/* Capitalized Text */}
                  {selectedUser.status
                    ? selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1).toLowerCase()
                    : "Unknown"}
                </span>
              </div>
              {selectedUser.role.toLowerCase() === "responder" && (
                <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assigned Station</span>
                  <span className="text-sm font-bold text-slate-800">{selectedUser.station || "Not assigned"}</span>
                </div>
              )}
            </div>

            <div className="mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Verification Identification Document
              </label>
              {selectedUser.photo_url ? (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedUser.photo_url}
                    alt="Resident Scanned ID"
                    className="w-full max-h-80 object-contain rounded-xl shadow-xs bg-white"
                  />
                </div>
              ) : (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-center text-xs font-semibold italic border border-rose-100">
                  <LuTriangle /> No identification document was uploaded for this account.
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              {selectedUser.status.toLowerCase() === "pending" && (
                <button
                  type="button"
                  disabled={approvingUserId !== null}
                  onClick={() => void handleApproveAccount(selectedUser)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                >
                  <LuCheck size={17} aria-hidden="true" />
                  {approvingUserId === selectedUser.id
                    ? "Approving…"
                    : "Approve account"}
                </button>
              )}
            </div>
          </div>
        </div>
        , document.body)
      )}
    </div>
  );
}