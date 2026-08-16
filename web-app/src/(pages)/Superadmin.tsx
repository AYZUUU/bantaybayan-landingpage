import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { LuTriangle, LuShieldCheck, LuUsers, LuTruck } from "react-icons/lu";

interface UserAccount {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  contact: string;
  contact_number: string;
  role: string;
  status: string;
  station?: string;
  user_id_photo: string | null;
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

export default function Superadmin() {
  const [admins, setAdmins] = useState<UserAccount[]>([]);
  const [citizens, setCitizens] = useState<UserAccount[]>([]);
  const [responders, setResponders] = useState<UserAccount[]>([]);
  const [citizenCount, setCitizenCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedUserIdPhoto, setSelectedUserIdPhoto] = useState<string | null>(
    null,
  );
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Add User / Responder Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
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

  const { reports } = useOutletContext<{ reports: Report[] }>();

  const totalReports = reports.length;
  const unresolvedReports = reports.filter(
    (report) => report.status === "pending",
  ).length;
  const resolvedReports = reports.filter(
    (report) => report.status && report.status.toLowerCase() === "resolved",
  ).length;

  const fetchDashboardData = async () => {
    try {
      const [adminRes, citizenRes, responderRes] = await Promise.all([
        fetch("http://localhost/api/getAdmins.php"),
        fetch("http://localhost/api/getCitizens.php"),
        fetch("http://localhost/api/getResponders.php"),
      ]);

      const adminJson = await adminRes.json();
      const citizenJson = await citizenRes.json();
      ``;
      const responderJson = await responderRes.json();

      if (adminJson.status === "success") {
        const mappedAdmins = adminJson.data.map((user: any) => ({
          id: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          contact: user.email || user.contact_number || "N/A",
          contact_number: user.contact_number || user.email || "",
          role: user.role
            ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
            : "Admin",
          status: user.status || "Active",
          user_id_photo: null,
        }));
        setAdmins(mappedAdmins);
      }

      if (citizenJson.status === "success") {
        setCitizenCount(
          citizenJson.count || (citizenJson.data ? citizenJson.data.length : 0),
        );

        if (citizenJson.data && Array.isArray(citizenJson.data)) {
          const mappedCitizens = citizenJson.data.map((user: any) => ({
            id: user.id,
            name:
              `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
              "Unknown",
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            contact: user.email || user.contact_number || "N/A",
            contact_number: user.contact_number || user.email || "",
            role: "Citizen",
            status: user.status || "Active",
            user_id_photo: user.user_id_photo || null,
          }));
          setCitizens(mappedCitizens);
        }
      }

      if (
        responderJson.status === "success" &&
        Array.isArray(responderJson.data)
      ) {
        const mappedResponders = responderJson.data.map((user: any) => ({
          id: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          contact: user.email || user.contact_number || "N/A",
          contact_number: user.contact_number || user.email || "",
          role: "Responder",
          status: user.status || "Active",
          station: user.station || "Metro Vigan Central",
          user_id_photo: null,
        }));
        setResponders(mappedResponders);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- HANDLE CREATE NEW ADMIN / RESPONDER ---
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const endpoint =
      newRoleType === "responder"
        ? "http://localhost/api/create_responder.php"
        : "http://localhost/api/createAdmin.php";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: newFirstName,
          last_name: newLastName,
          email: newEmail,
          password: newPassword,
          contact_number: newContactNumber,
          station: newStation,
          role: newRoleType,
        }),
      });

      const result = await res.json();

      if (result.status === "success") {
        alert(
          `${newRoleType === "responder" ? "Responder" : "Admin"} account successfully created!`,
        );
        setIsAddUserOpen(false);
        setNewFirstName("");
        setNewLastName("");
        setNewEmail("");
        setNewPassword("");
        setNewContactNumber("");
        fetchDashboardData();
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      console.error("Failed to create user", err);
      alert("Network or server error occurred.");
    }
  };

  // --- OPEN EDIT MODAL ---
  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditContact(user.contact_number);
    setEditRole(user.role);
    setEditStatus(user.status || "Active");
  };

  // --- SAVE EDIT CHANGES ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch("http://localhost/api/updateUserProfile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          first_name: editFirstName,
          last_name: editLastName,
          contact_number: editContact,
          role: editingUser.role !== "Citizen" ? editRole : null,
          status: editStatus,
        }),
      });
      const result = await res.json();

      if (result.status === "success") {
        fetchDashboardData(); // Refresh all tables smoothly
        setEditingUser(null);
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      console.error("Failed to save updates", err);
    }
  };

  // --- QUICK TOGGLE SUSPEND FOR RESPONDERS / CITIZENS ---
  const handleToggleSuspendUser = async (
    id: number,
    currentStatus: string,
    endpoint: string,
  ) => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    if (
      !window.confirm(`Are you sure you want to change status to ${newStatus}?`)
    )
      return;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const result = await res.json();
      if (result.status === "success") {
        fetchDashboardData();
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="superadmin-container p-8 w-full bg-gray-50 min-h-screen relative">
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Superadmin Overview
          </h1>
          <p className="text-gray-500">
            System health and global administration
          </p>
        </div>
        <button
          onClick={() => setIsAddUserOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
        >
          + Add New User
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<LuUsers size={28} className="text-blue-600" />}
          title="Total Citizens"
          value={citizenCount}
          trend="Registered on app"
        />
        <StatCard
          icon={<LuShieldCheck size={28} className="text-green-600" />}
          title="Active Admins"
          value={admins.length}
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

      <div className="w-full flex flex-col gap-8">
        {/* Admin Management Table */}
        <div className="bg-white w-full rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Admin Management
          </h2>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-gray-500 py-4">Loading administrators...</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
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
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {admin.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{admin.role}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            admin.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(admin)}
                          className="text-blue-600 hover:underline mr-3 text-sm font-medium cursor-pointer"
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

        {/* --- RESPONDER MONITORING TABLE --- */}
        <div className="bg-white w-full rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
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
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {resp.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {resp.contact}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {resp.station || "Metro Vigan Central"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            resp.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {resp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(resp)}
                          className="text-blue-600 hover:underline mr-3 text-sm font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleToggleSuspendUser(
                              resp.id,
                              resp.status,
                              "http://localhost/api/updateCitizenStatus.php",
                            )
                          }
                          className={`text-sm font-medium hover:underline cursor-pointer ${
                            resp.status === "Active"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {resp.status === "Active" ? "Suspend" : "Activate"}
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
        <div className="bg-white w-full rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
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
                      className="border-b border-gray-100 hover:bg-gray-50"
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
                            citizen.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {citizen.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right flex items-center justify-end gap-3">
                        {citizen.user_id_photo ? (
                          <button
                            onClick={() =>
                              setSelectedUserIdPhoto(
                                `http://localhost/api/${citizen.user_id_photo}`,
                              )
                            }
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            🔍 View ID
                          </button>
                        ) : (
                          <span className="text-red-500 text-xs italic">
                            No ID Uploaded
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenEdit(citizen)}
                          className="text-blue-600 hover:underline text-sm font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleToggleSuspendUser(
                              citizen.id,
                              citizen.status,
                              "http://localhost/api/updateCitizenStatus.php",
                            )
                          }
                          className={`text-sm font-medium hover:underline cursor-pointer ${
                            citizen.status === "Active"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {citizen.status === "Active" ? "Suspend" : "Activate"}
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

      {/* --- ADD NEW ADMIN / RESPONDER MODAL --- */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full relative shadow-lg">
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

              <div className="grid grid-cols-2 gap-2">
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
      )}

      {/* UNIVERSAL EDIT MODAL WITH STATUS */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full relative shadow-lg">
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
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-blue-600 bg-white"
                >
                  <option value="Active">Active</option>
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
      )}

      {/* ID Document Preview Modal */}
      {selectedUserIdPhoto && (
        <div
          onClick={() => setSelectedUserIdPhoto(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-xl max-w-lg w-full relative text-center shadow-2xl"
          >
            <button
              onClick={() => setSelectedUserIdPhoto(null)}
              className="absolute right-4 top-2 text-2xl text-gray-500 hover:text-black cursor-pointer"
            >
              &times;
            </button>
            <h3 className="mb-4 text-gray-800 font-bold text-lg">
              Resident Verification Identification
            </h3>
            <img
              src={selectedUserIdPhoto}
              alt="Resident Scanned ID"
              className="w-full max-h-100 object-contain rounded-lg border border-gray-200 bg-gray-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, trend }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p
          className={`text-xs mt-1 ${trend.includes("unresolved") && parseInt(trend) > 0 ? "text-red-500 font-bold" : "text-gray-400"}`}
        >
          {trend}
        </p>
      </div>
    </div>
  );
};
