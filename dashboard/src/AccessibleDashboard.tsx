import { Navigate, Route, Routes } from "react-router-dom";
import {
  FOLDER_PATH_PREFIX,
  HOME_PATH,
  READER_PATH_PREFIX,
  VIEW_PATHS,
} from "@/navigation/views";
import { ThemeProvider } from "@/context/ThemeProvider";
import { LibraryProvider } from "@/context/LibraryProvider";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { useWorkspace } from "@/context/workspaceContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DashboardContent from "@/components/DashboardContent";
import NewFolderModal from "@/components/NewFolderModal";
import ReaderModal from "@/components/ReaderModal";

/* ============================================================================
 * ACCESSIBLE SCREEN READER — DASHBOARD
 * ----------------------------------------------------------------------------
 * Composition root. Three providers, each owning one concern:
 *   ThemeProvider     light/dark preference
 *   LibraryProvider   saved pages and folders + the mutations on them
 *   WorkspaceProvider what is being looked at — view, filters, reader, dialogs
 *
 * They nest in dependency order (workspace filters the library's pages), and
 * nothing below reaches past its own concern. Data comes from src/api, which
 * is mock-backed until VITE_API_BASE_URL is set — see dashboard/README.md.
 * ==========================================================================*/

function DashboardShell() {
  const { newFolderOpen, readerPage } = useWorkspace();

  return (
    <div className="flex h-full min-h-[720px] w-full overflow-hidden bg-bg font-sans text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-inverse"
      >
        Skip to saved pages
      </a>

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <DashboardContent />
      </div>

      {/* Keyed by page: opening a different page remounts the reader so its
          controls re-seed from that page's saved settings. */}
      {readerPage && <ReaderModal key={readerPage.id} page={readerPage} />}
      {newFolderOpen && <NewFolderModal />}
    </div>
  );
}

export default function AccessibleDashboard() {
  return (
    <ThemeProvider>
      <LibraryProvider>
        <WorkspaceProvider>
          <Routes>
            {/* Every view renders the same shell; the URL decides what it shows
                (see src/navigation/views.ts), so routes stay declarative. */}
            {Object.values(VIEW_PATHS).map((path) => (
              <Route key={path} path={path} element={<DashboardShell />} />
            ))}
            <Route
              path={`${READER_PATH_PREFIX}:pageId`}
              element={<DashboardShell />}
            />
            <Route
              path={`${FOLDER_PATH_PREFIX}:folderId`}
              element={<DashboardShell />}
            />
            <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
          </Routes>
        </WorkspaceProvider>
      </LibraryProvider>
    </ThemeProvider>
  );
}
