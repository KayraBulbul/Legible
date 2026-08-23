import type { SavedPage } from "@/types";
import { MOCK_PAGES } from "@/data/mockPages";

// TODO(backend): swap for `fetch("/api/pages?user=me")` once the endpoint
// exists. Callers already treat this as async, so the swap is local to
// this file — nothing downstream needs to change.
export async function fetchPages(): Promise<SavedPage[]> {
  return MOCK_PAGES;
}
