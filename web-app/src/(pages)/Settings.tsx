import React, { useState, useEffect } from "react";
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

  // 1. Load user profile and preferences on component mount
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    
    // Load local preferences
    const savedSound = localStorage.getItem("soundAlerts");
    if (savedSound !== null) setSoundAlerts(savedSound === "true");

    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");

    if (!userId) return;

    // Fetch user details to pre-populate inputs
    fetch(`http://localhost/api/getUserProfile.php?id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.user) {
          setFirstName(data.user.first_name || "");
          setLastName(data.user.last_name || "");
          setContactNumber(data.user.contact_number || "");
        }
      })
      .catch((err) => console.error("Failed to load profile details:", err));
  }, []);

  // 2. Handle Profile Update
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

  // 3. Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    const toastId = toast.loading("Updating password...");

    try {
      const response = await fetch("http://localhost/api/updatePassword.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        toast.success("Password updated successfully!", { id: toastId });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(`Error: ${result.message}`, { id: toastId });
      }
    } catch (error) {
      console.error("Password update failed:", error);
      toast.error("Network error. Could not connect to server.", { id: toastId });
    }
  };

  // 4. Handle Sound Alerts Toggle
  const handleSoundToggle = () => {
    const nextState = !soundAlerts;
    setSoundAlerts(nextState);
    localStorage.setItem("soundAlerts", String(nextState));
    toast.success(nextState ? "Sound alerts enabled" : "Sound alerts disabled");
  };

  const handleDarkModeToggle = () => {
    const nextState = !darkMode;
    setDarkMode(nextState);
    localStorage.setItem("darkMode", String(nextState));
    toast.success(nextState ? "Dark mode setting updated" : "Light mode setting updated");
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
            
            {/* Profile Management Form */}
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
                    <input placeholder="John"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input placeholder="Doe"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    placeholder="123-456-7890"
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition cursor-pointer"
                >
                  Save Changes
                </button>
              </form>
            </div>

            {/* Security Form */}
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
                    required
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
                      required
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
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 transition cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>

          {/* Preferences Box with Toggle Switches
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <LuBell className="text-indigo-600" /> Preferences
              </h2>
              
              Sound Alerts Toggle Switch 
              <div className="flex items-center justify-between mb-5">
                <span className="text-slate-700 text-sm">
                  Sound Alerts (New Incidents)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={handleSoundToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              
              <div className="flex items-center justify-between">
                <span className="text-slate-700 text-sm flex items-center gap-2">
                  <LuMoon /> Dark Mode
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={handleDarkModeToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
            </div>
            
          </div>
          */}
        </div>
      </div>
    </div>
  );
}