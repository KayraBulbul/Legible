import { useCallback, useRef, useState } from "react";
import type { AiPreferences, SemanticDocument, TransformOperation, TransformResult } from "@/types";
import { ApiError } from "@/api/client";
import { transformContent } from "@/api/ai";

export type AiTransformState =
  | { status: "loading" }
  | { status: "ready"; result: TransformResult }
  | { status: "error"; message: string };

function cacheKey(operation: TransformOperation, options: AiPreferences): string {
  return `${operation}:${options.simplificationLevel}:${options.preserveTechnicalTerms}`;
}

function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "ai_rate_limited")
      return "Too many AI requests right now — try again in a minute.";
    if (cause.code === "ai_busy" || cause.code === "ai_timeout")
      return "The AI tool is busy — try again shortly.";
    return cause.isUnauthorized
      ? "Your session has expired. Reconnect the extension to continue."
      : cause.message;
  }
  return "Couldn't run this AI tool.";
}

/**
 * Runs and caches `POST /api/v1/transformations` results (docs/api.md) for
 * one open saved page. Keyed by operation *and* options, so switching the
 * simplification level naturally produces a fresh call while re-selecting a
 * tool with unchanged options reuses the cached result instead of re-hitting
 * Gemini's 15-requests-per-minute quota (backend/ai/README.md).
 *
 * Mounted alongside the reader — which remounts per `key={page.id}` — so a
 * new page always starts with an empty cache instead of carrying a previous
 * page's results over.
 */
export function useAiTransform() {
  const [cache, setCache] = useState<Record<string, AiTransformState>>({});
  // Tracks in-flight/completed keys synchronously so a duplicate `run` call
  // (e.g. an effect re-firing before the state update above lands) never
  // fires a second network request for the same key.
  const requested = useRef<Set<string>>(new Set());
  const requestId = useRef<Record<string, number>>({});

  const run = useCallback(
    (operation: TransformOperation, document: SemanticDocument, options: AiPreferences) => {
      const key = cacheKey(operation, options);
      if (requested.current.has(key)) return;
      requested.current.add(key);

      const thisRequest = (requestId.current[key] ?? 0) + 1;
      requestId.current[key] = thisRequest;
      setCache((current) => ({ ...current, [key]: { status: "loading" } }));

      transformContent(operation, document, options)
        .then((result) => {
          if (requestId.current[key] !== thisRequest) return;
          setCache((current) => ({ ...current, [key]: { status: "ready", result } }));
        })
        .catch((cause: unknown) => {
          if (requestId.current[key] !== thisRequest) return;
          // Errors are retriable: drop the guard so a later `run` (e.g. the
          // user re-opening the tool) can try again instead of staying stuck.
          requested.current.delete(key);
          setCache((current) => ({
            ...current,
            [key]: { status: "error", message: describeError(cause) },
          }));
        });
    },
    [],
  );

  const resultFor = useCallback(
    (operation: TransformOperation, options: AiPreferences): AiTransformState | undefined =>
      cache[cacheKey(operation, options)],
    [cache],
  );

  return { run, resultFor };
}
