import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReaderModal from "@/components/ReaderModal";
import { LibraryContext, type LibraryContextValue } from "@/context/libraryContext";
import { ThemeContext } from "@/context/themeContext";
import {
  WorkspaceContext,
  type WorkspaceContextValue,
} from "@/context/workspaceContext";
import { MOCK_PAGES } from "@/data/mockPages";

const PAGE = MOCK_PAGES[0];

function ReaderTestContext() {
  const library: LibraryContextValue = {
    pages: [PAGE],
    status: "ready",
    error: null,
    dismissError: vi.fn(),
    reload: vi.fn(),
    setFavorite: vi.fn(),
    setTags: vi.fn(),
    moveToTrash: vi.fn(),
    restorePage: vi.fn(),
    deleteForever: vi.fn(),
  };
  const workspace: WorkspaceContextValue = {
    view: "mypages",
    setView: vi.fn(),
    viewTitle: "My pages",
    isTrashView: false,
    query: "",
    setQuery: vi.fn(),
    viewMode: "grid",
    setViewMode: vi.fn(),
    sortBy: "date",
    setSortBy: vi.fn(),
    visiblePages: [PAGE],
    readerPage: PAGE,
    readerFullScreen: false,
    openReader: vi.fn(),
    closeReader: vi.fn(),
    enterReaderFullScreen: vi.fn(),
    exitReaderFullScreen: vi.fn(),
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme: vi.fn() }}>
      <LibraryContext.Provider value={library}>
        <WorkspaceContext.Provider value={workspace}>
          <ReaderModal page={PAGE} />
        </WorkspaceContext.Provider>
      </LibraryContext.Provider>
    </ThemeContext.Provider>
  );
}

describe("ReaderModal", () => {
  it("automatically displays the restructured version when a page opens", async () => {
    render(<ReaderTestContext />);

    await waitFor(
      () => {
        expect(screen.getByText("Why accessibility comes first")).toBeTruthy();
        expect(screen.getByText("What it depends on")).toBeTruthy();
      },
      { timeout: 1_500 },
    );
  });
});
