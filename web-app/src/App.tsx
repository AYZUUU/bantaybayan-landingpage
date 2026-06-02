import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";

import Incidents from "./(pages)/Incidents";
import Personnel from "./(pages)/Personnel";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./components/Login";

import Dashboard from "./(pages)/dashboard";
import Settings from "./(pages)/Settings";
import Superadmin from "./(pages)/Superadmin";

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<AdminLogin />} />

        <Route element={<AdminLayout />}>
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/personnel" element={<Personnel />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings/>} />
          <Route path="/superadmin" element={<Superadmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
