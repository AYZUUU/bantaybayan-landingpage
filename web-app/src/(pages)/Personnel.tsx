import { useEffect, useState } from "react";
import { LuPencil, LuSearch, LuTrash2, LuUserPlus } from "react-icons/lu";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "Admin" | "Rescuer" | "Citizen" | "Super_Admin";

  registeredAt: string;
}

export default function Personnel() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [editingUser, setEditingUser] = useState<User | null>(null);


  const handleDelete = async (userId: string, userName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the user "${userName}"? This action cannot be undone.`,
    );

    if (confirmDelete) {
      try {
        const response = await fetch("http://localhost/api/deleteUsers.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId }),
        });

        const result = await response.json();

        if (result.status === "success") {
          setUsers(users.filter((user) => user.id !== userId));
          alert(`${userName} has been permanently deleted.`);
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        alert("Server error. Could not connect to database.");
      }
    }
  };

  // --- OPEN EDIT MODAL ---
  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  // --- SAVE UPDATED USER ---
  const handleUpdateUser = async (e: any) => {
    e.preventDefault();
    console.log("1. Save button actually clicked!");

    if (!editingUser) return;

    try {
      console.log("2. Sending data to PHP:", editingUser);
      const response = await fetch("http://localhost/api/updateUser.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });

      const result = await response.json();
      console.log("3. PHP Reply:", result);

      if (result.status === "success") {
        setUsers(users.map((u) => (u.id === editingUser.id ? editingUser : u)));
        setEditingUser(null);
        alert("User updated successfully!");
      } else {
        alert(`Database Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      alert("Could not connect to the PHP server.");
    }
  };

  // --- FETCH USERS ON LOAD ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost/api/getUsers.php");
        const json = await response.json();

        if (json.status === "success") {
          setUsers(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();
  }, []);

  // --- SEARCH AND FILTER LOGIC ---
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name} ${user.last_name}`;
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">
            Manage system access and citizen accounts.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          <LuUserPlus size={20} />
          Add New User
        </button>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full md:w-96">
          <LuSearch
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
            Filter Role:
          </span>
          <select
            className="w-full md:w-48 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Responder">Responder</option>
            <option value="Citizen">Citizen</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
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
                    className="hover:bg-slate-50 border-b border-slate-100 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-medium text-slate-900">
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
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit User"
                          onClick={() => handleEditClick(user)}
                        >
                          <LuPencil size={18} />
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Delete User"
                          onClick={() =>
                            handleDelete(
                              user.id,
                              user.first_name + " " + user.last_name,
                            )
                          }
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
        <div className="fixed inset-0 backdrop-blur-sm bg-slate-900/10 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
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
                      role: e.target.value as any,
                    })
                  }
                >
                  <option value="Admin">Admin</option>
                  <option value="Rescuer">Rescuer</option>
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
      )}
    </div>
  );
}
