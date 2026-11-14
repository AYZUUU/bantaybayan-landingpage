import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "./pages/LandingPage";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Landing page root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>,
);
