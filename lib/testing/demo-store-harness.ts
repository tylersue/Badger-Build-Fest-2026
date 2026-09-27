/**
 * In-memory localStorage harness for demo-store tests (Phase 4 D-02/D-03).
 * `vi.resetModules()` plus a dynamic import gives every test a fresh module
 * instance with its own in-module `state` singleton, backed by a throwaway
 * Storage-compatible object instead of a real browser.
 *
 * Dynamically import any features/ module AFTER `loadDemoStore` so it binds
 * to the same fresh store instance the test set up. This file is not named
 * `*.test.ts`, so vitest never collects it as a test suite, and nothing in
 * app/ or components/ may import it (it is a test-only seam).
 */
import { vi } from "vitest";

function createMemoryStorage(initial?: Record<string, string>): Storage {
  const data = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
}

export async function loadDemoStore(saved?: unknown): Promise<{ store: typeof import("@/lib/testing/legacy-demo-store"); storage: Storage }> {
  vi.resetModules();
  const storage = createMemoryStorage(saved !== undefined ? { "bx-demo-v1": JSON.stringify(saved) } : undefined);
  vi.stubGlobal("window", { localStorage: storage });
  vi.doMock("@/lib/demo-store", () => import("@/lib/testing/legacy-demo-store"));
  const store = await import("@/lib/testing/legacy-demo-store");
  return { store, storage };
}

export function resetDemoHarness() {
  vi.doUnmock("@/lib/demo-store");
  vi.unstubAllGlobals();
}
