import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiPreferences, TransformResult } from "@/types";
import { useAiTransform } from "@/hooks/useAiTransform";

const { transformContent, savePageTransformation } = vi.hoisted(() => ({
  transformContent: vi.fn(),
  savePageTransformation: vi.fn(),
}));

vi.mock("@/api/ai", () => ({ transformContent }));
vi.mock("@/api/pages", () => ({ savePageTransformation }));

const OPTIONS: AiPreferences = {
  simplificationLevel: "moderate",
  preserveTechnicalTerms: true,
};
const SOURCE = {
  format: "semantic_html" as const,
  html: "<article><p>Source</p></article>",
  text: "Source",
  language: "en",
};
const RESULT: TransformResult = {
  document: {
    format: "semantic_html",
    html: "<article><p>Restructured</p></article>",
    text: "Restructured",
    language: "en",
  },
  metadata: {
    operation: "restructure",
    provider: "google",
    model: "gemini-3.6-flash",
    promptVersion: "restructure-v1",
    parameters: {
      simplificationLevel: "moderate",
      preserveTechnicalTerms: true,
    },
    performedAt: "2026-08-24T07:30:00Z",
  },
};

describe("useAiTransform", () => {
  beforeEach(() => {
    transformContent.mockReset().mockResolvedValue(RESULT);
    savePageTransformation.mockReset().mockResolvedValue(undefined);
  });

  it("persists a successful transformation before reporting it ready", async () => {
    let finishSave: () => void = () => undefined;
    savePageTransformation.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
    );
    const { result } = renderHook(() => useAiTransform("saved-page-id"));

    act(() => {
      result.current.run("restructure", SOURCE, OPTIONS);
    });

    await waitFor(() =>
      expect(savePageTransformation).toHaveBeenCalledWith(
        "saved-page-id",
        RESULT.document,
        RESULT.metadata,
        expect.any(AbortSignal),
      ),
    );
    expect(result.current.resultFor("restructure", OPTIONS)).toEqual({
      status: "loading",
    });

    await act(async () => finishSave());
    await waitFor(() => {
      expect(result.current.resultFor("restructure", OPTIONS)).toEqual({
        status: "ready",
        result: RESULT,
      });
    });
  });

  it("aborts an in-flight transformation when the reader unmounts", () => {
    transformContent.mockReturnValue(new Promise(() => undefined));
    const { result, unmount } = renderHook(() => useAiTransform("saved-page-id"));

    act(() => {
      result.current.run("restructure", SOURCE, OPTIONS);
    });
    const signal = transformContent.mock.calls[0][3] as AbortSignal;

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("aborts a superseded transformation before starting another", () => {
    transformContent.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useAiTransform("saved-page-id"));

    act(() => {
      result.current.run("restructure", SOURCE, OPTIONS);
      result.current.run("simplify", SOURCE, OPTIONS);
    });

    const firstSignal = transformContent.mock.calls[0][3] as AbortSignal;
    const secondSignal = transformContent.mock.calls[1][3] as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
  });

  it("aborts current work when returning to a cached transformation", async () => {
    const { result } = renderHook(() => useAiTransform("saved-page-id"));

    act(() => result.current.run("restructure", SOURCE, OPTIONS));
    await waitFor(() =>
      expect(result.current.resultFor("restructure", OPTIONS)?.status).toBe("ready"),
    );

    transformContent.mockReturnValue(new Promise(() => undefined));
    act(() => result.current.run("simplify", SOURCE, OPTIONS));
    const simplifySignal = transformContent.mock.calls[1][3] as AbortSignal;

    act(() => result.current.run("restructure", SOURCE, OPTIONS));

    expect(simplifySignal.aborted).toBe(true);
    expect(transformContent).toHaveBeenCalledTimes(2);
  });
});
