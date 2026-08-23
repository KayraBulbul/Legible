import { useCallback, useId, useRef, useState } from "react";
import { Maximize2, Minimize2, Star, Target, X } from "lucide-react";
import type { ContrastMode, FontMode, SavedPage, ToolPanel } from "@/types";
import cn from "@/utils/cn";
import bionicSpans from "@/utils/bionicSpans";
import {
  SAMPLE_ARTICLE,
  SAMPLE_SIMPLIFIED,
  SAMPLE_SUMMARY,
} from "@/data/sampleContent";
import { useDialog } from "@/hooks/useDialog";
import { useDismiss } from "@/hooks/useDismiss";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";
import ReaderControls from "@/components/ReaderControls";

const FONT_STACKS: Record<FontMode, string> = {
  none: "'Inter', sans-serif",
  lexend: "'Lexend', sans-serif",
  opendyslexic: "'OpenDyslexic', 'Comic Sans MS', Verdana, sans-serif",
};

/**
 * Literal preset swatches previewing how the saved page will render for its
 * reader — deliberately not theme tokens, since they preview the reader's
 * chosen contrast rather than the dashboard's own light/dark UI.
 */
const CONTRAST_CLASSES: Record<ContrastMode, string> = {
  none: "bg-white text-stone-800",
  dark: "bg-black text-yellow-300",
  warm: "bg-amber-50 text-indigo-950",
};

/**
 * Reads one saved page with the accessibility controls applied live.
 *
 * Mounted with `key={page.id}` by the shell, so opening a different page
 * remounts it and its settings re-seed from that page instead of carrying the
 * previous page's over.
 */
export default function ReaderModal({ page }: { page: SavedPage }) {
  const { setFavorite, moveToTrash } = useLibrary();
  const {
    closeReader,
    readerFullScreen: fullScreen,
    enterReaderFullScreen,
    exitReaderFullScreen,
  } = useWorkspace();

  const { settings, update } = useReaderSettings(page);
  const [activeTool, setActiveTool] = useState<ToolPanel>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const focusMode = activeTool === "focus";

  // Escape backs out one layer at a time: focus mode first, then the reader.
  const handleDismiss = useCallback(() => {
    if (focusMode) setActiveTool(null);
    else closeReader();
  }, [focusMode, closeReader]);

  useDialog(panelRef);
  useDismiss(true, panelRef, handleDismiss);

  const toggleTool = useCallback(
    (tool: Exclude<ToolPanel, null>) => {
      setActiveTool((current) => (current === tool ? null : tool));
      // Focus mode is only meaningful edge to edge.
      if (tool === "focus") enterReaderFullScreen(page.id);
    },
    [enterReaderFullScreen, page.id],
  );

  const bodyText =
    activeTool === "simplify" ? SAMPLE_SIMPLIFIED : SAMPLE_ARTICLE;
  const expanded = fullScreen || focusMode;

  return (
    <div
      className={cn(
        "z-50 flex bg-overlay",
        expanded ? "fixed inset-0" : "fixed inset-0 items-center justify-center p-4",
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex overflow-hidden bg-surface outline-none",
          expanded ? "h-full w-full" : "h-[85vh] w-full max-w-4xl rounded-2xl shadow-2xl",
        )}
      >
        {!focusMode && (
          <ReaderControls
            settings={settings}
            onChange={update}
            activeTool={activeTool}
            onToggleTool={toggleTool}
            onTrash={() => {
              moveToTrash(page.id);
              closeReader();
            }}
          />
        )}

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-sm font-semibold text-text-primary"
              >
                {page.title}
              </h2>
              {!focusMode && (
                <p className="text-xs text-text-secondary">{page.domain}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {focusMode ? (
                <IconButton
                  icon={Minimize2}
                  label="Exit focus mode"
                  onClick={() => setActiveTool(null)}
                />
              ) : (
                <>
                  <IconButton
                    icon={Star}
                    label={
                      page.favorited
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    pressed={page.favorited}
                    iconClassName={cn(page.favorited && "fill-text-secondary")}
                    onClick={() => setFavorite(page.id, !page.favorited)}
                  />
                  <IconButton
                    icon={Target}
                    label="Enter focus mode"
                    onClick={() => toggleTool("focus")}
                  />
                  <IconButton
                    icon={fullScreen ? Minimize2 : Maximize2}
                    label={fullScreen ? "Exit full screen" : "Enter full screen"}
                    onClick={
                      fullScreen
                        ? exitReaderFullScreen
                        : () => enterReaderFullScreen(page.id)
                    }
                  />
                  <IconButton
                    icon={X}
                    label="Close reader"
                    onClick={closeReader}
                  />
                </>
              )}
            </div>
          </div>

          {activeTool === "summary" && (
            /* TODO(AI): replace with real output from POST /api/v1/transformations. */
            <div className="m-5 mb-0 rounded-xl border border-warning-muted bg-warning-subtle p-3 text-xs text-warning">
              <span className="font-semibold">AI summary (example)</span> —{" "}
              {SAMPLE_SUMMARY}
            </div>
          )}

          {/* TODO(backend): render the saved page's sanitised sourceDocument
              here — never raw HTML from the source site (docs/api.md). */}
          <article
            className={cn(
              "m-5 flex-1 rounded-xl p-6 transition-colors",
              CONTRAST_CLASSES[settings.contrastMode],
            )}
            style={{
              fontFamily: FONT_STACKS[settings.dyslexiaFont],
              fontSize: `${settings.fontScale}%`,
              lineHeight: 1.8,
            }}
          >
            <h3 className="mb-3 text-lg font-bold">{page.title}</h3>
            <p>{settings.bionicReading ? bionicSpans(bodyText) : bodyText}</p>
          </article>
        </div>
      </div>
    </div>
  );
}

interface IconButtonProps {
  icon: typeof Star;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  iconClassName?: string;
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  pressed,
  iconClassName,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
    >
      <Icon size={17} className={iconClassName} />
    </button>
  );
}
