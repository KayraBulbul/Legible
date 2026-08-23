import { useState, type ChangeEvent } from "react";
import {
  X,
  Sparkles,
  Wand2,
  Target,
  FileDown,
  Maximize2,
  Star,
  Minimize2,
  Trash2,
} from "lucide-react";
import cn from "@/utils/cn";
import bionicSpans from "@/utils/bionicSpans";
import {
  SAMPLE_ARTICLE,
  SAMPLE_SIMPLIFIED,
  SAMPLE_SUMMARY,
} from "@/data/sampleContent";
import type { ToolPanel, ContrastMode, FontMode } from "@/types";
import { useDashboardContext } from "@/context/useDashboardContext";

// Mirrors extension/popup/popup.html controls 1:1 so the same settings
// object can drive both surfaces later.
export default function ReaderModal() {
  const {
    readerPage: page,
    closeReader,
    readerFullScreen: fullScreen,
    enterReaderFullScreen,
    exitReaderFullScreen,
    toggleFavorite,
    moveToTrash,
  } = useDashboardContext();

  const [fontMode, setFontMode] = useState<FontMode>(page?.fontMode ?? "none");
  const [contrastMode, setContrastMode] = useState<ContrastMode>(
    page?.contrastMode ?? "none",
  );
  const [fontScale, setFontScale] = useState(100);
  const [bionic, setBionic] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolPanel>(null);

  if (!page) return null;

  const fontFamily =
    fontMode === "lexend"
      ? "'Lexend', sans-serif"
      : fontMode === "opendyslexic"
        ? "'Comic Sans MS', Verdana, sans-serif"
        : "'Inter', sans-serif";

  // These are literal preset swatches previewing how the saved page will
  // render for the reader (dark/warm/none), independent of the dashboard's
  // own light/dark UI theme — intentionally not tied to theme tokens.
  const contrastClasses =
    contrastMode === "dark"
      ? "bg-black text-yellow-300"
      : contrastMode === "warm"
        ? "bg-amber-50 text-indigo-950"
        : "bg-white text-stone-800";

  const bodyText =
    activeTool === "simplify" ? SAMPLE_SIMPLIFIED : SAMPLE_ARTICLE;
  const focusMode = activeTool === "focus";
  const expanded = fullScreen || focusMode;

  const unfocus = () => setActiveTool(null);

  return (
    <div
      className={cn(
        "z-50 flex bg-overlay",
        focusMode
          ? "fixed inset-0"
          : fullScreen
            ? "absolute inset-0"
            : "fixed inset-0 items-center justify-center p-4",
      )}
    >
      <div
        className={cn(
          "flex overflow-hidden bg-surface",
          expanded
            ? "h-full w-full"
            : "h-[85vh] w-full max-w-4xl rounded-2xl shadow-2xl",
        )}
      >
        {/* Controls rail — hidden in focus mode */}
        {activeTool !== "focus" && (
          <div className="flex w-56 shrink-0 flex-col gap-4 border-r border-border bg-surface-hover p-4 overflow-y-auto selection-none">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Reading controls
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Dyslexia-friendly font
              <select
                value={fontMode}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setFontMode(e.target.value as FontMode)
                }
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
              >
                <option value="none">Off</option>
                <option value="lexend">Lexend</option>
                <option value="opendyslexic">OpenDyslexic</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Contrast theme
              <select
                value={contrastMode}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setContrastMode(e.target.value as ContrastMode)
                }
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
              >
                <option value="none">Off</option>
                <option value="dark">Dark (black / yellow)</option>
                <option value="warm">Warm (cream / navy)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Font size — {fontScale}%
              <input
                type="range"
                min={80}
                max={200}
                step={10}
                value={fontScale}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFontScale(Number(e.target.value))
                }
                className="accent-accent"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={bionic}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setBionic(e.target.checked)
                }
                className="h-3.5 w-3.5 accent-accent"
              />
              Bionic reading
            </label>
            <div className="flex flex-col gap-2">
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Reader tools
              </div>
              <button
                onClick={() =>
                  setActiveTool(activeTool === "summary" ? null : "summary")
                }
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium",
                  activeTool === "summary"
                    ? "border-warning-muted bg-warning text-text-inverse"
                    : "border-border text-text-secondary hover:border-warning-muted hover:bg-warning-subtle",
                )}
              >
                <Sparkles size={13} /> Summarize
              </button>
              <button
                onClick={() =>
                  setActiveTool(activeTool === "simplify" ? null : "simplify")
                }
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium",
                  activeTool === "simplify"
                    ? "border-warning-muted bg-warning text-text-inverse"
                    : "border-border text-text-secondary hover:border-warning-muted hover:bg-warning-subtle",
                )}
              >
                <Wand2 size={13} /> Simplify language
              </button>
              <button
                onClick={() => {
                  setActiveTool("focus");
                  if (!fullScreen) enterReaderFullScreen(page.id);
                }}
                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-xs font-medium text-text-secondary hover:border-warning-muted hover:bg-warning-subtle"
              >
                <Target size={13} /> Focus mode
              </button>
            </div>
            {/* TODO(backend): POST /pages/:id/export → PDF */}
            <button className="mt-1 flex items-center gap-2 rounded-lg bg-accent px-2.5 py-3 text-left text-sm font-medium text-text-inverse hover:bg-accent-hover">
              <FileDown size={16} /> Export as PDF
            </button>
            <button
              onClick={() => {
                moveToTrash(page.id);
                closeReader();
              }}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-xs font-medium text-danger hover:bg-surface-hover"
            >
              <Trash2 size={13} /> Move to trash
            </button>
          </div>
        )}

        {/* Article preview */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            {focusMode ? (
              <>
                <div className="truncate text-sm font-semibold text-text-primary">
                  {page.title}
                </div>
                <button
                  onClick={unfocus}
                  aria-label="Exit focus mode"
                  className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover"
                >
                  <Minimize2 size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text-primary">
                    {page.title}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {page.domain}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      toggleFavorite(page.id);
                    }}
                    aria-label={
                      page.favorited
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    aria-pressed={page.favorited}
                    className={
                      "rounded-full p-1.5 text-text-secondary hover:bg-surface-hover"
                    }
                  >
                    <Star
                      size={18}
                      className={cn(
                        page.favorited &&
                          "fill-text-secondary stroke-text-secondary",
                      )}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool((prev: ToolPanel) =>
                        prev === "focus" ? null : "focus",
                      );
                      if (!fullScreen) enterReaderFullScreen(page.id);
                    }}
                    aria-label="Toggle focus mode"
                    className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover"
                  >
                    <Target size={18} />
                  </button>
                  <button
                    onClick={() =>
                      fullScreen
                        ? exitReaderFullScreen()
                        : enterReaderFullScreen(page.id)
                    }
                    aria-label={
                      fullScreen ? "Exit full screen" : "Enter full screen"
                    }
                    className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover"
                  >
                    {fullScreen ? (
                      <Minimize2 size={16} />
                    ) : (
                      <Maximize2 size={16} />
                    )}
                  </button>
                  <button
                    onClick={closeReader}
                    aria-label="Close reader"
                    className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover"
                  >
                    <X size={18} />
                  </button>
                </div>
              </>
            )}
          </div>

          {activeTool === "summary" && (
            <div className="m-5 mb-0 rounded-xl border border-warning-muted bg-warning-subtle p-3 text-xs text-warning">
              <span className="font-semibold">AI summary (example)</span> —{" "}
              {SAMPLE_SUMMARY}
              {/* TODO(AI): replace with real model output from the AI teammate's service */}
            </div>
          )}

          <div
            className={cn(
              "m-5 flex-1 rounded-xl p-6 transition-colors",
              contrastClasses,
            )}
            style={{ fontFamily, fontSize: `${fontScale}%`, lineHeight: 1.8 }}
          >
            <h2 className="mb-3 text-lg font-bold">{page.title}</h2>
            <p>{bionic ? bionicSpans(bodyText) : bodyText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
