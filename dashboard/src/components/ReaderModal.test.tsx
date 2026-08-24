import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as aiApi from "@/api/ai";
import * as pagesApi from "@/api/pages";
import ReaderModal from "@/components/ReaderModal";
import { LibraryContext, type LibraryContextValue } from "@/context/libraryContext";
import { ThemeContext } from "@/context/themeContext";
import {
  WorkspaceContext,
  type WorkspaceContextValue,
} from "@/context/workspaceContext";
import { MOCK_PAGES } from "@/data/mockPages";
import type { SavedPageContent } from "@/types";

const PAGE = MOCK_PAGES[0];
const BLANK_CONTENT: SavedPageContent = {
  sourceDocument: {
    format: "semantic_html",
    html: " ",
    text: "\n",
    language: null,
  },
  transformedDocument: null,
  accessibilitySettings: {
    schemaVersion: 1,
    dyslexiaFont: "none",
    contrastMode: "light",
    declutter: false,
    bionicReading: false,
    fontScale: 100,
    lineHeight: 1.8,
    letterSpacing: 0,
    wordSpacing: 0,
    reducedMotion: false,
    readingWidth: null,
    ttsRate: 1,
    ttsPitch: 1,
    voiceURI: null,
    hudVisible: true,
    aiEnabled: true,
    aiPreferences: {
      simplificationLevel: "moderate",
      preserveTechnicalTerms: true,
    },
  },
};
const SAVED_TRANSFORMED_CONTENT: SavedPageContent = {
  ...BLANK_CONTENT,
  sourceDocument: {
    format: "semantic_html",
    html: "<article><p>Original content</p></article>",
    text: "Original content",
    language: "en",
  },
  transformedDocument: {
    format: "semantic_html",
    html: "<article><h1>Saved restructure</h1><p>Already transformed</p></article>",
    text: "Saved restructure\n\nAlready transformed",
    language: "en",
  },
};

afterEach(() => vi.restoreAllMocks());

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

  it("does not transform a saved page with no readable content", async () => {
    vi.spyOn(pagesApi, "getPageContent").mockResolvedValue(BLANK_CONTENT);
    const transform = vi.spyOn(aiApi, "transformContent");

    render(<ReaderTestContext />);

    expect(
      await screen.findByText("No readable content was captured for this page."),
    ).toBeTruthy();
    expect(transform).not.toHaveBeenCalled();
  });

  it("reuses a saved transformed document without restructuring it again", async () => {
    vi.spyOn(pagesApi, "getPageContent").mockResolvedValue(
      SAVED_TRANSFORMED_CONTENT,
    );
    const transform = vi.spyOn(aiApi, "transformContent");

    render(<ReaderTestContext />);

    expect(await screen.findByText("Saved restructure")).toBeTruthy();
    expect(screen.getByText("Already transformed")).toBeTruthy();
    expect(transform).not.toHaveBeenCalled();
  });
});
