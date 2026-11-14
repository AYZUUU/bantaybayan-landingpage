import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent } from "react";
import {
  LuPencil,
  LuSearch,
  LuTrash2,
  LuTriangleAlert,
  LuUserPlus,
} from "react-icons/lu";
import toast from "react-hot-toast";
import {
  getManagedUsers,
  manageUser,
  type ManagedUser,
} from "../utils/users";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;

  registeredAt: string;
}

function isPrivilegedRole(role: string) {
  const normalizedRole = role.toLowerCase().replace(/[^a-z]/g, "");
  return normalizedRole === "admin" || normalizedRole === "superadmin";
}

function displayRole(role: string) {
  const normalized = role.toLowerCase();
  return normalized === "responder" ? "Responder" : "Citizen";
}

function mapPersonnelUsers(data: ManagedUser[]): User[] {
  return data
    .filter((user) => user.role === "citizen" || user.role === "responder")
    .map((user) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: displayRole(user.role),
      registeredAt: user.created_at,
    }));
}

export default function Personnel() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newStation, setNewStation] = useState("Metro Vigan Central");

  const fetchUsers = useCallback(async () => {
    const data = await getManagedUsers();
    setUsers(mapPersonnelUsers(data));
  }, []);

  const resetNewUserForm = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewPassword("");
    setNewContactNumber("");
    setNewStation("Metro Vigan Central");
  };

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreatingUser(true);

    try {
      await manageUser({
          action: "create",
          first_name: newFirstName,
          last_name: newLastName,
          email: newEmail,
          password: newPassword,
          contact_number: newContactNumber,
          station: newStation,
          role: "responder",
      });

      setIsAddUserOpen(false);
      resetNewUserForm();

      await fetchUsers();
      toast.success("Responder account created successfully.");
    } catch (error) {
      console.error("Failed to create responder:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the responder account.",
      );
    } finally {
      setIsCreatingUser(false);
    }
  };


  const handleDelete = async () => {
    if (!confirmingDelete || deletingUserId) return;
    const user = confirmingDelete;
    setDeletingUserId(user.id);
    try {
      await manageUser({ action: "delete", id: user.id });
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setConfirmingDelete(null);
      toast.success(`${user.first_name} ${user.last_name} has been permanently deleted.`);
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not delete the user.",
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  // --- OPEN EDIT MODAL ---
  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  // --- SAVE UPDATED USER ---
  const handleUpdateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      if (editingUser.email.trim().toLowerCase() !==
        users.find((user) => user.id === editingUser.id)?.email.trim().toLowerCase()) {
        throw new Error("Email changes must be completed through account verification.");
      }
      const role =
        editingUser.role.toLowerCase() === "rescuer"
          ? "responder"
          : editingUser.role.toLowerCase();
      await manageUser({
          action: "update",
          id: editingUser.id,
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role,
      });
      const updatedUser = { ...editingUser, role: displayRole(role) };
      setUsers((current) =>
        current.map((user) => (user.id === editingUser.id ? updatedUser : user)),
      );
      setEditingUser(null);
      toast.success("User updated successfully!");
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update the user.",
      );
    }
  };

  // --- FETCH USERS ON LOAD ---
  useEffect(() => {
    let active = true;
    void getManagedUsers()
      .then((data) => {
        if (active) setUsers(mapPersonnelUsers(data));
      })
      .catch((error: unknown) => {
        console.error("Failed to fetch users:", error);
        toast.error(
          error instanceof Error ? error.message : "Could not load users.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  // --- SEARCH AND FILTER LOGIC ---
  const filteredUsers = users.filter((user) => {
    if (isPrivilegedRole(user.role)) return false;

    const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
    const fullName = `${user.first_name} ${user.last_name}`.toLocaleLowerCase();
    const matchesSearch =
      fullName.includes(normalizedSearchTerm) ||
      user.email.toLocaleLowerCase().includes(normalizedSearchTerm);
    const matchesRole = roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
      {/* HEADER */}
      <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">People & access</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage system access and citizen accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddUserOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <LuUserPlus size={20} />
          Add New User
        </button>
      </div>

      {isAddUserOpen && (
        createPortal(
        <div
          className="web-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => !isCreatingUser && setIsAddUserOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-responder-title"
            className="web-modal-panel w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 id="add-responder-title" className="text-xl font-bold text-slate-900">
                Add Responder
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a new emergency responder account.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="responder-first-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    First Name
                  </label>
                  <input
                    id="responder-first-name"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div>
                  <label htmlFor="responder-last-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Last Name
                  </label>
                  <input
                    id="responder-last-name"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="responder-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="responder-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label htmlFor="responder-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Temporary Password
                </label>
                <input
                  id="responder-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="responder-contact" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Contact Number
                  </label>
                  <input
                    id="responder-contact"
                    type="tel"
                    required
                    value={newContactNumber}
                    onChange={(e) => setNewContactNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div>
                  <label htmlFor="responder-station" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Assigned Station
                  </label>
                  <input
                    id="responder-station"
                    required
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isCreatingUser}
                  onClick={() => {
                    setIsAddUserOpen(false);
                    resetNewUserForm();
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingUser ? "Creating..." : "Create Responder"}
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)
      )}

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:flex-row md:items-center">
        <div className="relative w-full md:w-96">
          <LuSearch
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
            Filter Role:
          </span>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 md:w-48"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Responder">Responder</option>
            <option value="Citizen">Citizen</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold border-b border-slate-200">
                  User Details
                </th>
                <th className="p-4 font-semibold border-b border-slate-200">
                  Role
                </th>
                <th className="p-4 font-semibold border-b border-slate-200 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 transition-colors hover:bg-indigo-50/40"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          title="Edit User"
                          onClick={() => handleEditClick(user)}
                        >
                          <LuPencil size={18} />
                        </button>
                        <button
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          title="Delete User"
                          onClick={() => setConfirmingDelete(user)}
                        >
                          <LuTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- FLOATING EDIT MODAL --- */}
      {editingUser && (
        createPortal(
        <div className="web-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-sm sm:p-4">
          <div className="web-modal-panel w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-800">
                Edit User Profile
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={editingUser.first_name + " " + editingUser.last_name}
                  onChange={(e) =>{
                    const parts = e.target.value.split(" ");
                    setEditingUser({
                      ...editingUser,
                      first_name: parts[0] || "",
                      last_name: parts.slice(1).join(" ") || "",
                    })
                  }
                }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="Responder">Responder</option>
                  <option value="Citizen">Citizen</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)
      )}
      {confirmingDelete && (
        createPortal(
        <div
          className="web-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!deletingUserId) setConfirmingDelete(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="web-modal-panel w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <LuTriangleAlert size={22} aria-hidden="true" />
            </div>
            <h2 id="delete-user-title" className="text-lg font-bold text-slate-900">
              Delete this account?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This permanently deletes the account for{" "}
              <strong className="font-semibold text-slate-800">
                {confirmingDelete.first_name} {confirmingDelete.last_name}
              </strong>
              . This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletingUserId !== null}
                onClick={() => setConfirmingDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUserId !== null}
                onClick={() => void handleDelete()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                <LuTrash2 size={16} aria-hidden="true" />
                {deletingUserId ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </section>
        </div>
        , document.body)
      )}
    </div>
      </div>
  );
}
