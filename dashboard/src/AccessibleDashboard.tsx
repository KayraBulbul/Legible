import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardProvider } from "@/context/DashboardProvider";
import { useDashboardContext } from "@/context/useDashboardContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DashboardContent from "@/components/DashboardContent";
import NewFolderModal from "@/components/NewFolderModal";
import ReaderModal from "@/components/ReaderModal";

/* ============================================================================
 * ACCESSIBLE SCREEN READER — DASHBOARD GROUNDWORK
 * ----------------------------------------------------------------------------
 * Layout/design scaffolding. State lives in DashboardContext, data comes
 * from src/api (currently backed by mock data in src/data) — swap the
 * fetch* functions in src/api for real endpoints and nothing here changes.
 * ==========================================================================*/

function DashboardShell() {
  const { newFolderOpen, readerPage } = useDashboardContext();

  return (
    <div
      className="flex h-full min-h-[720px] w-full overflow-hidden bg-bg text-text-primary"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lexend:wght@500;600;700&display=swap');`}</style>

      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <DashboardContent />

        {readerPage && <ReaderModal />}
      </div>

      {newFolderOpen && <NewFolderModal />}
    </div>
  );
}

export default function AccessibleDashboard() {
  return (
    <DashboardProvider>
      <Routes>
        <Route path="/home" element={<DashboardShell />} />
        <Route path="/pages" element={<DashboardShell />} />
        <Route path="/pages/:pageId" element={<DashboardShell />} />
        <Route path="/recent" element={<DashboardShell />} />
        <Route path="/favorites" element={<DashboardShell />} />
        <Route path="/trash" element={<DashboardShell />} />
        <Route path="/folders/:folderId" element={<DashboardShell />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </DashboardProvider>
  );
}
