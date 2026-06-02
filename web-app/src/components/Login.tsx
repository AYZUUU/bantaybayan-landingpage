import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuShieldAlert } from "react-icons/lu";
import "./index.css"


interface LoginResponse {
  status: "success" | "error";
  message?: string;
  role?: string;
  user_id?: number | string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://192.168.100.108/api/logsignup.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const rawText = await response.text();
      const result: LoginResponse = JSON.parse(rawText);

      if (result.status === "success") {
        const safeRole = result.role?.toLowerCase()?.trim() || "";


        if (safeRole !== "superadmin" && safeRole !== "admin") {
          setError(`Access denied. The database says your role is: "${safeRole}"`);
          setLoading(false);
          return;
        }

        localStorage.setItem("token", String(result.user_id)); 
        localStorage.setItem("userRole", safeRole);
        
        if (result.user) {
          localStorage.setItem("userName", `${result.user.first_name} ${result.user.last_name}`);
        }


        if (safeRole === "superadmin") {
          navigate("/superadmin");
        } else if (safeRole === "admin") {
          navigate("/dashboard");
        }

      } else {
        setError(result.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        

        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <LuShieldAlert size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">BantayBayan</h2>
          <p className="text-gray-500 mt-2">Welcome Admin</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-200">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition flex justify-center items-center ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Verifying..." : "Log in"}
          </button>
        </form>
        
      </div>
    </div>
  );
}