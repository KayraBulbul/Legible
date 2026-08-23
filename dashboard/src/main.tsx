import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AccessibleDashboard from "./AccessibleDashboard.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AccessibleDashboard />
    </BrowserRouter>
  </StrictMode>,
);
