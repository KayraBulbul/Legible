import cn from "../utils/cn";

type BadgeTone = "neutral" | "accent" | "warning" | "info";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-surface-hover text-text-secondary",
    accent: "bg-accent-subtle text-accent",
    warning: "bg-warning-subtle text-warning",
    info: "bg-info-subtle text-info",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
