import { Type, Contrast, Sparkles } from "lucide-react";
import type { SavedPage } from "@/types";
import Badge from "@/components/Badge";

interface ModeBadgesProps {
  page: SavedPage;
}

export default function ModeBadges({ page }: ModeBadgesProps) {
  return (
    <>
      {page.fontMode !== "none" && (
        <Badge tone="accent">
          <Type size={11} /> {page.fontMode === "lexend" ? "Lexend" : "OpenDyslexic"}
        </Badge>
      )}
      {page.contrastMode !== "none" && (
        <Badge tone="info">
          <Contrast size={11} /> {page.contrastMode === "dark" ? "Dark" : "Warm"}
        </Badge>
      )}
      {page.aiLabels > 0 && (
        <Badge tone="warning">
          <Sparkles size={11} /> {page.aiLabels} AI label{page.aiLabels === 1 ? "" : "s"}
        </Badge>
      )}
    </>
  );
}
