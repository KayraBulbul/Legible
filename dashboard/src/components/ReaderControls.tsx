import { FileDown, Sparkles, Target, Trash2, Wand2 } from "lucide-react";
import type { ContrastMode, FontMode, ReaderSettings, ToolPanel } from "@/types";
import cn from "@/utils/cn";

interface ReaderControlsProps {
  settings: ReaderSettings;
  onChange: <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => void;
  activeTool: ToolPanel;
  onToggleTool: (tool: Exclude<ToolPanel, null>) => void;
  onTrash: () => void;
}

const FONT_OPTIONS: { value: FontMode; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "lexend", label: "Lexend" },
  { value: "opendyslexic", label: "OpenDyslexic" },
];

const CONTRAST_OPTIONS: { value: ContrastMode; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "dark", label: "Dark (black / yellow)" },
  { value: "warm", label: "Warm (cream / navy)" },
];

const TOOL_BUTTON_BASE =
  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium";

/**
 * The reading-controls rail. Mirrors extension/popup/popup.html one-for-one so
 * the same settings object can drive both surfaces.
 */
export default function ReaderControls({
  settings,
  onChange,
  activeTool,
  onToggleTool,
  onTrash,
}: ReaderControlsProps) {
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
          onChange={(event) => onChange("fontScale", Number(event.target.value))}
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
        <h3 className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Reader tools
        </h3>
        {/* TODO(AI): POST /api/v1/transformations with operation
            summarize | simplify | focus (docs/api.md). */}
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

      {/* TODO(backend): GET /api/v1/saved-pages/{id}/export.pdf. */}
      <button
        disabled
        title="Available once page export is connected"
        className="mt-1 flex cursor-not-allowed items-center gap-2 rounded-lg bg-accent px-2.5 py-3 text-left text-sm font-medium text-text-inverse opacity-60"
      >
        <FileDown size={16} aria-hidden="true" /> Export as PDF
      </button>

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
