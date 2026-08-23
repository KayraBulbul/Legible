import type { PageFolder } from "@/types";

// TODO(backend): GET /folders
export const MOCK_FOLDERS: PageFolder[] = [
  { id: "f1", name: "Reading list", color: "bg-violet-500" },
  { id: "f2", name: "WCAG research", color: "bg-sky-500" },
  { id: "f3", name: "Client handoff", color: "bg-amber-500" },
];

export const FOLDER_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
];
