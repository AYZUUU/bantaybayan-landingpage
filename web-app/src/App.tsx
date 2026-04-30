import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";

import Incidents from "./(pages)/Incidents";
import Personnel from "./(pages)/Personnel";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./components/Login";

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<AdminLogin />} />

        <Route element={<AdminLayout />}>
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/personnel" element={<Personnel />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
