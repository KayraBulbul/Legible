import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  };
}

vi.stubGlobal("localStorage", memoryStorage());
vi.stubEnv("VITE_API_BASE_URL", "");
vi.stubEnv("VITE_USE_MOCK_API", "false");

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubEnv("VITE_API_BASE_URL", "");
  vi.stubEnv("VITE_USE_MOCK_API", "false");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.reject(new Error("Tests must stub network requests explicitly.")),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
