import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ThemeContext,
  readStoredTheme,
  writeStoredTheme,
  type Theme,
  type ThemeContextValue,
} from "@/context/themeContext";

/**
 * Owns the light/dark preference for the whole app. index.html applies the
 * stored theme before first paint (avoiding a flash of the wrong theme); this
 * provider keeps it in sync from there.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () =>
      readStoredTheme() ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStoredTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
