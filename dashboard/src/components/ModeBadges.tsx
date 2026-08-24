import { Contrast, Sparkles, Type } from "lucide-react";
import type { ContrastMode, FontMode, SavedPage } from "@/types";
import Badge from "@/components/Badge";

const FONT_LABELS: Record<Exclude<FontMode, "none">, string> = {
  lexend: "Lexend",
  opendyslexic: "OpenDyslexic",
};

const CONTRAST_LABELS: Record<ContrastMode, string> = {
  light: "Light",
  dark: "Dark",
  invert: "Invert",
  "high-contrast": "High contrast",
};

/** The reading modes saved with a page, as compact badges. */
export default function ModeBadges({ page }: { page: SavedPage }) {
  return (
    <>
      {page.dyslexiaFont !== "none" && (
        <Badge tone="accent">
          <Type size={11} aria-hidden="true" /> {FONT_LABELS[page.dyslexiaFont]}
        </Badge>
      )}
      {page.contrastMode !== "light" && (
        <Badge tone="info">
          <Contrast size={11} aria-hidden="true" />{" "}
          {CONTRAST_LABELS[page.contrastMode]}
        </Badge>
      )}
      {page.aiLabels > 0 && (
        <Badge tone="warning">
          <Sparkles size={11} aria-hidden="true" /> {page.aiLabels} AI label
          {page.aiLabels === 1 ? "" : "s"}
        </Badge>
      )}
    </>
  );
}
