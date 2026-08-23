import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AccessibleDashboard from "@/AccessibleDashboard";
import AppErrorBoundary from "@/components/AppErrorBoundary";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AccessibleDashboard />
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
