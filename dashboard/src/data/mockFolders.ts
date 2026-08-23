import type { PageFolder } from "@/types";

// TODO(backend): GET /folders
export const MOCK_FOLDERS: PageFolder[] = [
  { id: "f1", name: "Reading list", color: "bg-swatch-1" },
  { id: "f2", name: "WCAG research", color: "bg-swatch-2" },
  { id: "f3", name: "Client handoff", color: "bg-swatch-3" },
];

// Decorative, theme-invariant swatch tokens (see src/index.css) — cycled to
// give folders/cards a distinct colour without hardcoding one-off hues.
export const FOLDER_COLORS = [
  "bg-swatch-1",
  "bg-swatch-2",
  "bg-swatch-3",
  "bg-swatch-4",
  "bg-swatch-5",
  "bg-swatch-6",
];
