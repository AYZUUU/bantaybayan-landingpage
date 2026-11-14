import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "./pages/LandingPage";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Landing page root element was not found.");
}

const adminUrl = import.meta.env.VITE_ADMIN_URL?.trim();

createRoot(rootElement).render(
  <StrictMode>
    <LandingPage adminUrl={adminUrl || undefined} />
  </StrictMode>,
);
