import cn from "../utils/cn";

type BadgeTone = "stone" | "violet" | "amber" | "sky";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

export default function Badge({ children, tone = "stone" }: BadgeProps) {
  const tones: Record<BadgeTone, string> = {
    stone: "bg-stone-100 text-stone-600",
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
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
