import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Star,
  Target,
  X,
} from "lucide-react";
import type {
  AiPreferences,
  FontMode,
  SavedPage,
  SemanticDocument,
  ToolPanel,
  TransformOperation,
} from "@/types";
import cn from "@/utils/cn";
import bionicSpans from "@/utils/bionicSpans";
import sanitizeHtml from "@/utils/sanitizeHtml";
import declutterHtml from "@/utils/declutterHtml";
import { useDialog } from "@/hooks/useDialog";
import { useDismiss } from "@/hooks/useDismiss";
import { usePageContent } from "@/hooks/usePageContent";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import { useAiTransform } from "@/hooks/useAiTransform";
import { useLibrary } from "@/context/libraryContext";
import { useWorkspace } from "@/context/workspaceContext";
import ReaderControls from "@/components/ReaderControls";

/** Maps a reader tool panel to the transformation operation it runs (docs/api.md). */
const TOOL_OPERATIONS: Record<Exclude<ToolPanel, null>, TransformOperation> = {
  summary: "summarize",
  simplify: "simplify",
  restructure: "restructure",
  focus: "focus",
};

const DEFAULT_AI_PREFERENCES: AiPreferences = {
  simplificationLevel: "moderate",
  preserveTechnicalTerms: true,
};
const EMPTY_CONTENT_MESSAGE = "No readable content was captured for this page.";

const FONT_STACKS: Record<FontMode, string> = {
  none: "'Inter', sans-serif",
  lexend: "'Lexend', sans-serif",
  opendyslexic: "'OpenDyslexic', 'Comic Sans MS', Verdana, sans-serif",
};

export default function ReaderModal({ page }: { page: SavedPage }) {
  const { setFavorite, setTags, moveToTrash } = useLibrary();
  const {
    closeReader,
    readerFullScreen: fullScreen,
    enterReaderFullScreen,
    exitReaderFullScreen,
  } = useWorkspace();

  const { status: contentStatus, content } = usePageContent(page.id);
  const { settings, update } = useReaderSettings(
    page,
    content?.accessibilitySettings ?? null,
  );
  const [activeTool, setActiveTool] = useState<ToolPanel>("restructure");
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

  const [aiPreferenceOverride, setAiPreferenceOverride] =
    useState<AiPreferences | null>(null);
  const aiPreferences =
    aiPreferenceOverride ??
    content?.accessibilitySettings.aiPreferences ??
    DEFAULT_AI_PREFERENCES;
  const updateAiPreferences = useCallback(
    <K extends keyof AiPreferences>(key: K, value: AiPreferences[K]) => {
      setAiPreferenceOverride((current) => ({
        ...(current ?? aiPreferences),
        [key]: value,
      }));
    },
    [aiPreferences],
  );

  const { run: runTransform, resultFor } = useAiTransform(page.id);
  const operation = activeTool ? TOOL_OPERATIONS[activeTool] : null;
  const transformState = operation
    ? resultFor(operation, aiPreferences)
    : undefined;
  const sourceHasContent = Boolean(
    content &&
      (content.sourceDocument.html.trim() || content.sourceDocument.text.trim()),
  );
  const contentIsBlank = contentStatus === "ready" && !sourceHasContent;

  // Runs (or re-runs, on an options change) the transformation behind
  // whichever tool is open — POST /api/v1/transformations (docs/api.md).
  useEffect(() => {
    if (!operation || !content || !sourceHasContent) return;
    runTransform(operation, content.sourceDocument, aiPreferences);
  }, [operation, content, sourceHasContent, aiPreferences, runTransform]);

  // "Summarize" is a supplementary callout (rendered below) rather than a
  // content swap, so the article itself only swaps for the other three tools.
  const liveDocument: SemanticDocument | null =
    operation && operation !== "summarize" && transformState?.status === "ready"
      ? transformState.result.document
      : null;

  const activeDocument =
    liveDocument ??
    (operation === "simplify" && content?.transformedDocument
      ? content.transformedDocument
      : operation === null || operation === "summarize"
        ? (content?.sourceDocument ?? null)
        : null);
  const expanded = fullScreen || focusMode;

  const renderedHtml = useMemo(() => {
    if (!activeDocument) return "";
    const html = settings.declutter
      ? declutterHtml(activeDocument.html)
      : activeDocument.html;
    return sanitizeHtml(html);
  }, [activeDocument, settings.declutter]);

  const renderedText = useMemo(() => {
    if (!renderedHtml) return "";
    const doc = new DOMParser().parseFromString(renderedHtml, "text/html");
    return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }, [renderedHtml]);

  const readingWidth =
    settings.readingWidth === null
      ? undefined
      : Math.min(120, Math.max(30, settings.readingWidth));

  return (
    <div
      className={cn(
        "z-50 flex bg-overlay",
        expanded
          ? "fixed inset-0"
          : "fixed inset-0 items-center justify-center p-4",
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
          expanded
            ? "h-full w-full"
            : "h-[85vh] w-full max-w-4xl rounded-2xl shadow-2xl",
        )}
      >
        {!focusMode && (
          <ReaderControls
            pageId={page.id}
            settings={settings}
            onChange={update}
            activeTool={activeTool}
            onToggleTool={toggleTool}
            aiPreferences={aiPreferences}
            onAiPreferencesChange={updateAiPreferences}
            tags={page.tags}
            onTagsChange={(tags) => setTags(page.id, tags)}
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
                <a
                  href={page.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary hover:underline"
                >
                  {page.domain}
                  <ExternalLink size={11} />
                </a>
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
                    label={
                      fullScreen ? "Exit full screen" : "Enter full screen"
                    }
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
            <div className="m-5 mb-0 rounded-xl border border-warning-muted bg-warning-subtle p-3 text-xs text-warning">
              <span className="font-semibold">AI summary</span> —{" "}
              {contentIsBlank && EMPTY_CONTENT_MESSAGE}
              {!contentIsBlank &&
                (!transformState || transformState.status === "loading") &&
                "Generating…"}
              {!contentIsBlank &&
                transformState?.status === "error" &&
                transformState.message}
              {!contentIsBlank &&
                transformState?.status === "ready" &&
                transformState.result.document.text}
            </div>
          )}

          <article
            data-theme={settings.contrastMode}
            className={cn(
              "m-5 flex-1 rounded-xl bg-surface p-6 text-text-primary transition-colors",
              settings.reducedMotion && "reader-reduced-motion",
            )}
            style={{
              fontFamily: FONT_STACKS[settings.dyslexiaFont],
              fontSize: `${settings.fontScale}%`,
              letterSpacing: `${settings.letterSpacing}em`,
              wordSpacing: `${settings.wordSpacing}em`,
              lineHeight: settings.lineHeight,
              maxWidth: readingWidth ? `${readingWidth}ch` : undefined,
              width: readingWidth ? "calc(100% - 2.5rem)" : undefined,
              marginInline: readingWidth ? "auto" : undefined,
            }}
          >
            {contentStatus === "ready" &&
              operation &&
              operation !== "summarize" &&
              !activeDocument &&
              (contentIsBlank ? (
                <p className="text-danger">{EMPTY_CONTENT_MESSAGE}</p>
              ) : transformState?.status === "error" ? (
                <p className="text-danger">{transformState.message}</p>
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-text-secondary">
                  <Loader2
                    size={22}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-sm">
                    Generating the {activeTool} version…
                  </p>
                </div>
              ))}
            {activeDocument &&
              (settings.bionicReading ? (
                <p>{bionicSpans(renderedText)}</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              ))}
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
