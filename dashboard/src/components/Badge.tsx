import type { ReactNode } from "react";
import cn from "@/utils/cn";

type BadgeTone = "neutral" | "accent" | "warning" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-hover text-text-secondary",
  accent: "bg-accent-subtle text-accent",
  warning: "bg-warning-subtle text-warning",
  info: "bg-info-subtle text-info",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
