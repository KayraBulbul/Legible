import { useState, type ChangeEvent } from "react";
import { X, Sparkles, Wand2, Target, FileDown } from "lucide-react";
import cn from "@/utils/cn";
import bionicSpans from "@/utils/bionicSpans";
import { SAMPLE_ARTICLE, SAMPLE_SIMPLIFIED, SAMPLE_SUMMARY } from "@/data/sampleContent";
import type { AiPanel, ContrastMode, FontMode } from "@/types";
import { useDashboardContext } from "@/context/useDashboardContext";

// Mirrors extension/popup/popup.html controls 1:1 so the same settings
// object can drive both surfaces later.
export default function ReaderModal() {
  const { readerPage: page, closeReader } = useDashboardContext();

  const [fontMode, setFontMode] = useState<FontMode>(page?.fontMode ?? "none");
  const [contrastMode, setContrastMode] = useState<ContrastMode>(page?.contrastMode ?? "none");
  const [fontScale, setFontScale] = useState(100);
  const [bionic, setBionic] = useState(false);
  const [aiPanel, setAiPanel] = useState<AiPanel>(null);

  if (!page) return null;

  const fontFamily =
    fontMode === "lexend"
      ? "'Lexend', sans-serif"
      : fontMode === "opendyslexic"
        ? "'Comic Sans MS', Verdana, sans-serif"
        : "'Inter', sans-serif";

  const contrastClasses =
    contrastMode === "dark"
      ? "bg-black text-yellow-300"
      : contrastMode === "warm"
        ? "bg-amber-50 text-indigo-950"
        : "bg-white text-stone-800";

  const bodyText = aiPanel === "simplify" ? SAMPLE_SIMPLIFIED : SAMPLE_ARTICLE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          "flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl",
          aiPanel === "focus" && "max-w-2xl",
        )}
      >
        {/* Controls rail — hidden in focus mode */}
        {aiPanel !== "focus" && (
          <div className="flex w-56 shrink-0 flex-col gap-4 border-r border-stone-200 bg-stone-50 p-4 overflow-y-auto">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Reading controls
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Dyslexia-friendly font
              <select
                value={fontMode}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setFontMode(e.target.value as FontMode)
                }
                className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
              >
                <option value="none">Off</option>
                <option value="lexend">Lexend</option>
                <option value="opendyslexic">OpenDyslexic</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Contrast theme
              <select
                value={contrastMode}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setContrastMode(e.target.value as ContrastMode)
                }
                className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
              >
                <option value="none">Off</option>
                <option value="dark">Dark (black / yellow)</option>
                <option value="warm">Warm (cream / navy)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Font size — {fontScale}%
              <input
                type="range"
                min={80}
                max={160}
                step={10}
                value={fontScale}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFontScale(Number(e.target.value))
                }
                className="accent-violet-600"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-stone-600">
              <input
                type="checkbox"
                checked={bionic}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBionic(e.target.checked)}
                className="h-3.5 w-3.5 accent-violet-600"
              />
              Bionic reading
            </label>

            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
              AI actions
            </div>
            <button
              onClick={() => setAiPanel(aiPanel === "summary" ? null : "summary")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium",
                aiPanel === "summary"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-stone-200 text-stone-600 hover:border-amber-200",
              )}
            >
              <Sparkles size={13} /> Summarize
            </button>
            <button
              onClick={() => setAiPanel(aiPanel === "simplify" ? null : "simplify")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium",
                aiPanel === "simplify"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-stone-200 text-stone-600 hover:border-amber-200",
              )}
            >
              <Wand2 size={13} /> Simplify language
            </button>
            <button
              onClick={() => setAiPanel((prev) => (prev === "focus" ? null : "focus"))}
              className="flex items-center gap-2 rounded-lg border border-stone-200 px-2.5 py-1.5 text-left text-xs font-medium text-stone-600 hover:border-amber-200"
            >
              <Target size={13} /> Focus mode
            </button>
            {/* TODO(backend): POST /pages/:id/export → PDF */}
            <button className="mt-1 flex items-center gap-2 rounded-lg bg-stone-900 px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-stone-800">
              <FileDown size={13} /> Export as PDF
            </button>
          </div>
        )}

        {/* Article preview */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-stone-800">{page.title}</div>
              <div className="text-xs text-stone-400">{page.domain}</div>
            </div>
            <button
              onClick={closeReader}
              className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
            >
              <X size={18} />
            </button>
          </div>

          {aiPanel === "summary" && (
            <div className="m-5 mb-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="font-semibold">AI summary (example)</span> — {SAMPLE_SUMMARY}
              {/* TODO(AI): replace with real model output from the AI teammate's service */}
            </div>
          )}

          <div
            className={cn("m-5 flex-1 rounded-xl p-6 transition-colors", contrastClasses)}
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
