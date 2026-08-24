import {
  AlertTriangle,
  FileDown,
  Loader2,
  Sparkles,
  Target,
  Trash2,
  Wand2,
} from "lucide-react";
import type {
  AiPreferences,
  ContrastMode,
  FontMode,
  ReaderSettings,
  SimplificationLevel,
  ToolPanel,
} from "@/types";
import cn from "@/utils/cn";
import TagEditor from "@/components/TagEditor";
import { useExportPdf } from "@/hooks/useExportPdf";

interface ReaderControlsProps {
  pageId: string;
  settings: ReaderSettings;
  onChange: <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => void;
  activeTool: ToolPanel;
  onToggleTool: (tool: Exclude<ToolPanel, null>) => void;
  aiPreferences: AiPreferences;
  onAiPreferencesChange: <K extends keyof AiPreferences>(
    key: K,
    value: AiPreferences[K],
  ) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  onTrash: () => void;
}

const SIMPLIFICATION_OPTIONS: { value: SimplificationLevel; label: string }[] =
  [
    { value: "light", label: "Light" },
    { value: "moderate", label: "Moderate" },
    { value: "strong", label: "Strong" },
  ];

const FONT_OPTIONS: { value: FontMode; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "lexend", label: "Lexend" },
  { value: "opendyslexic", label: "OpenDyslexic" },
];

const CONTRAST_OPTIONS: { value: ContrastMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "invert", label: "Invert" },
  { value: "high-contrast", label: "High contrast" },
];

const TOOL_BUTTON_BASE =
  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium";

/**
 * The reading-controls rail. Mirrors extension/popup/popup.html one-for-one so
 * the same settings object can drive both surfaces.
 */
export default function ReaderControls({
  pageId,
  settings,
  onChange,
  activeTool,
  onToggleTool,
  aiPreferences,
  onAiPreferencesChange,
  tags,
  onTagsChange,
  onTrash,
}: ReaderControlsProps) {
  const { exportingId, error, exportPdf, dismissError } = useExportPdf();
  const exporting = exportingId === pageId;

  return (
    <div className="flex w-56 shrink-0 select-none flex-col gap-4 overflow-y-auto border-r border-border bg-surface-hover p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Reading controls
      </h3>

      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Dyslexia-friendly font
        <select
          value={settings.dyslexiaFont}
          onChange={(event) =>
            onChange("dyslexiaFont", event.target.value as FontMode)
          }
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-primary"
        >
          {FONT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Contrast theme
        <select
          value={settings.contrastMode}
          onChange={(event) =>
            onChange("contrastMode", event.target.value as ContrastMode)
          }
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-primary"
        >
          {CONTRAST_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Font size — {settings.fontScale}%
        <input
          type="range"
          min={80}
          max={200}
          step={10}
          value={settings.fontScale}
          onChange={(event) =>
            onChange("fontScale", Number(event.target.value))
          }
          className="accent-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Letter spacing — {settings.letterSpacing.toFixed(2)}em
        <input
          type="range"
          min={0}
          max={0.3}
          step={0.05}
          value={settings.letterSpacing}
          onChange={(event) =>
            onChange("letterSpacing", Number(event.target.value))
          }
          className="accent-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Line height — {settings.lineHeight.toFixed(1)}
        <input
          type="range"
          min={1.2}
          max={2.4}
          step={0.1}
          value={settings.lineHeight}
          onChange={(event) =>
            onChange("lineHeight", Number(event.target.value))
          }
          className="accent-accent"
        />
      </label>

      <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        <input
          type="checkbox"
          checked={settings.bionicReading}
          onChange={(event) => onChange("bionicReading", event.target.checked)}
          className="h-3.5 w-3.5 accent-accent"
        />
        Bionic reading
      </label>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Tags
        </h3>
        <TagEditor tags={tags} onChange={onTagsChange} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Reader tools
        </h3>
        <label className="mt-1 flex flex-col gap-1 text-xs font-medium text-text-secondary">
          AI strength
          <select
            value={aiPreferences.simplificationLevel}
            onChange={(event) =>
              onAiPreferencesChange(
                "simplificationLevel",
                event.target.value as SimplificationLevel,
              )
            }
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-primary"
          >
            {SIMPLIFICATION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center mt-1 gap-2 text-xs font-medium text-text-secondary">
          <input
            type="checkbox"
            checked={aiPreferences.preserveTechnicalTerms}
            onChange={(event) =>
              onAiPreferencesChange(
                "preserveTechnicalTerms",
                event.target.checked,
              )
            }
            className="h-3.5 w-3.5 accent-warning"
          />
          Preserve technical terms
        </label>

        <ToolButton
          icon={Sparkles}
          label="Summarize"
          active={activeTool === "summary"}
          onClick={() => onToggleTool("summary")}
        />
        <ToolButton
          icon={Wand2}
          label="Simplify language"
          active={activeTool === "simplify"}
          onClick={() => onToggleTool("simplify")}
        />
        <ToolButton
          icon={Target}
          label="Focus mode"
          active={activeTool === "focus"}
          onClick={() => onToggleTool("focus")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => exportPdf(pageId)}
          disabled={exporting}
          className={cn(
            "mt-1 flex items-center gap-2 rounded-lg bg-accent px-2.5 py-3 text-left text-sm font-medium text-text-inverse",
            exporting && "cursor-wait opacity-70",
          )}
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <FileDown size={16} aria-hidden="true" />
          )}
          {exporting ? "Exporting…" : "Export as PDF"}
        </button>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-1.5 rounded-lg bg-danger-muted/20 px-2.5 py-2 text-xs text-danger"
          >
            <AlertTriangle
              size={13}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span className="flex-1">{error}</span>
            <button
              onClick={dismissError}
              aria-label="Dismiss export error"
              className="shrink-0 text-danger/70 hover:text-danger"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onTrash}
        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-xs font-medium text-danger hover:bg-surface-hover"
      >
        <Trash2 size={13} aria-hidden="true" /> Move to trash
      </button>
    </div>
  );
}

interface ToolButtonProps {
  icon: typeof Sparkles;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ icon: Icon, label, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        TOOL_BUTTON_BASE,
        active
          ? "border-warning-muted bg-warning text-text-inverse"
          : "border-border text-text-secondary hover:border-warning-muted hover:bg-warning-subtle",
      )}
    >
      <Icon size={13} aria-hidden="true" /> {label}
    </button>
  );
}
