import React, { useState } from "react";
import toast from "react-hot-toast";
import { LuBell, LuLock, LuMoon, LuUser } from "react-icons/lu";

export default function Settings() {

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [soundAlerts, setSoundAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Saving profile...");

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User ID not found. Please log in again.", { id: toastId });
      return;
    }
    
    try {
      const response = await fetch("http://localhost/api/updateProfile.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        toast.success("Profile updated successfully!", { id: toastId });
      } else {
        toast.error(`Error: ${result.message}`, { id: toastId });
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error("Network error. Could not connect to server.", { id: toastId });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    toast.success("Password secured!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">System Settings</h1>
        <p className="text-slate-500 mb-8">
          Manage your account preferences and dashboard configurations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <LuUser className="text-indigo-600" /> Profile Management
              </h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Dela Cruz"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="09123456789"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                >
                  Save Changes
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <LuLock className="text-indigo-600" /> Security
              </h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 transition"
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <LuBell className="text-indigo-600" /> Preferences
              </h2>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-700">
                  Sound Alerts (New Incidents)
                </span>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={() => setSoundAlerts(!soundAlerts)}
                  className="w-5 h-5 accent-indigo-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 flex items-center gap-2">
                  <LuMoon /> Dark Mode
                </span>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                  className="w-5 h-5 accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
