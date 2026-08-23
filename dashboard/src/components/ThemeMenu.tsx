import { useCallback, useRef, useState } from "react";
import { Check, Contrast, Eclipse, Moon, Sun } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { useTheme, type Theme } from "@/context/themeContext";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "invert", label: "Invert colors", icon: Eclipse },
  { value: "high-contrast", label: "High contrast", icon: Contrast },
];

/** Theme picker in the topbar, opened from a button showing the active theme. */
export default function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useDismiss(open, containerRef, close);

  const current = THEME_OPTIONS.find((option) => option.value === theme);
  const TriggerIcon = current?.icon ?? Sun;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current?.label ?? "Light"}. Change theme`}
        className="rounded-full border border-border p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      >
        <TriggerIcon size={15} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                close();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-text-secondary hover:bg-surface-hover"
            >
              <Icon size={13} aria-hidden="true" />
              {label}
              {theme === value && (
                <Check
                  size={13}
                  aria-hidden="true"
                  className="ml-auto text-accent"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
