import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  LuTriangle, 
  LuShieldCheck, 
  LuUsers 
} from "react-icons/lu";

// --- Interfaces ---
interface Admin {
  id: number;
  name: string;
  role: string;
  status: "Active" | "Offline" | "Suspended"; 
}

// 1. Added a Citizen interface 
// (Adjust these fields based on what your getCitizens.php actually returns)
interface Citizen {
  id: number;
  name: string;
  contact: string;
  status: string;
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
  const [admins, setAdmins] = useState<Admin[]>([]);
  
  // 2. Added state for the citizens array
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [citizenCount, setCitizenCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { reports } = useOutletContext<{ reports: Report[] }>();

  const totalReports = reports.length;
  const unresolvedReports = reports.filter((report) => report.status === "Pending").length;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [adminRes, citizenRes] = await Promise.all([
          fetch("http://localhost/api/getAdmins.php"),
          fetch("http://localhost/api/getCitizens.php")
        ]);

        const adminJson = await adminRes.json();
        const citizenJson = await citizenRes.json();

        if (adminJson.status === "success") {
          const mappedAdmins = adminJson.data.map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role.charAt(0).toUpperCase() + user.role.slice(1), 
            status: "Active" 
          }));
          setAdmins(mappedAdmins);
        }

        if (citizenJson.status === "success") {
          // Keep the count if your API provides it, or fallback to array length
          setCitizenCount(citizenJson.count || (citizenJson.data ? citizenJson.data.length : 0)); 
          
          // 3. Map the citizen data if your PHP file returns a "data" array
          if (citizenJson.data) {
            const mappedCitizens = citizenJson.data.map((user: any) => ({
              id: user.id,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
              contact: user.email || user.contact_number || 'N/A', // Adjust based on your DB columns
              status: user.status || "Active"
            }));
            setCitizens(mappedCitizens);
          }
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="superadmin-container p-8 w-full bg-gray-50 min-h-screen">
      
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Superadmin Overview</h1>
          <p className="text-gray-500">System health and global administration</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          + Add New Admin
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          icon={<LuTriangle size={28} className="text-red-600" />} 
          title="Total Reports" 
          value={totalReports} 
          trend={`${unresolvedReports} unresolved`} 
        />
      </div>

      <div className="w-full flex flex-col gap-8">
        
        {/* Admin Management Table */}
        <div className="bg-white w-full rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Admin Management</h2>
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
                    <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{admin.name}</td>
                      <td className="py-3 px-4 text-gray-600">{admin.role}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          admin.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-600 hover:underline mr-3">Edit</button>
                        <button className="text-red-600 hover:underline">Revoke</button>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">No admins found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. Added Citizen Management Table */}
        <div className="bg-white w-full rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Citizen Accounts</h2>
            <button className="text-sm text-blue-600 hover:underline font-medium">View All</button>
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
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {citizens.map((citizen) => (
                    <tr key={citizen.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{citizen.name}</td>
                      <td className="py-3 px-4 text-gray-600">{citizen.contact}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          citizen.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {citizen.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-600 hover:underline mr-3">View</button>
                        <button className="text-red-600 hover:underline">Suspend</button>
                      </td>
                    </tr>
                  ))}
                  {citizens.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">No citizens found. Make sure getCitizens.php returns a data array.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, trend }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className={`text-xs mt-1 ${trend.includes("unresolved") && parseInt(trend) > 0 ? "text-red-500 font-bold" : "text-gray-400"}`}>
          {trend}
        </p>
      </div>
    </div>
  );
};