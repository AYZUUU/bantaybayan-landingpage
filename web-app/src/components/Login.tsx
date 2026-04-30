import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./index.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: any) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    toast.success("Login successful!");

    setTimeout(() => {
      navigate("/Incidents");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-white p-14 rounded-lg shadow-lg text-black w-full max-w-md">
        <h1 className="header text-3xl font-bold mb-6 text-center typing-effect">
          Welcome KaBayan!
        </h1>
        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="border p-2 rounded w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 rounded w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-700 w-full mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
