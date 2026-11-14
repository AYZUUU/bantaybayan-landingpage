import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";

const Incidents = lazy(() => import("./(pages)/Incidents"));
const Personnel = lazy(() => import("./(pages)/Personnel"));
const Dashboard = lazy(() => import("./(pages)/dashboard"));
const Settings = lazy(() => import("./(pages)/Settings"));
const Superadmin = lazy(() => import("./(pages)/Superadmin"));
const AdminLogin = lazy(() => import("./components/Login"));

type ThemePreference = "light" | "dark" | "system";

export default function App() {
  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const getPreference = (): ThemePreference => {
      const savedTheme = localStorage.getItem("theme");
      return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
    };

    const applyTheme = (preference: ThemePreference) => {
      document.documentElement.dataset.theme =
        preference === "system"
          ? systemTheme.matches ? "dark" : "light"
          : preference;
    };

    const handleSystemThemeChange = () => {
      if (getPreference() === "system") applyTheme("system");
    };
    const handleThemePreferenceChange = (event: Event) => {
      const preference = (event as CustomEvent<ThemePreference>).detail;
      applyTheme(preference);
    };

    applyTheme(getPreference());
    systemTheme.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("bantaybayan-theme-change", handleThemePreferenceChange);

    return () => {
      systemTheme.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("bantaybayan-theme-change", handleThemePreferenceChange);
    };
  }, []);

  return (
    <>
      <Toaster
        position="top-center"
        gutter={12}
        containerStyle={{
          top: 20,
          left: 16,
          right: 16,
          maxHeight: "min(40vh, 220px)",
          overflow: "hidden",
        }}
        toastOptions={{
          duration: 5000,
          style: {
            width: "100%",
            maxWidth: 480,
            minHeight: 58,
            padding: "14px 18px",
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.22)",
            background: "#eff6ff",
            color: "#1e3a8a",
            border: "1px solid #93c5fd",
          },
          success: {
            style: {
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #6ee7b7",
            },
          },
          error: {
            style: {
              background: "#fff1f2",
              color: "#9f1239",
              border: "1px solid #fda4af",
            },
          },
        }}
      />
      <Suspense
        fallback={
          <div
            role="status"
            className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600"
          >
            Loading dashboard…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route element={<AdminLayout />}>
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/personnel" element={<Personnel />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/superadmin" element={<Superadmin />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
