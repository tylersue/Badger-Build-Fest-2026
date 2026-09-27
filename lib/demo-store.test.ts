import { afterEach, describe, expect, it } from "vitest";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { REVIEWS } from "@/lib/data/seed";

afterEach(() => {
  resetDemoHarness();
});

describe("demo-store backward compatibility (D-03)", () => {
  it("loads a pre-Phase-4 saved payload without losing its data (T-04-03)", async () => {
    const legacy = {
      v: 1,
      identityId: "sam",
      ledger: [{ id: "l-legacy-1", identityId: "sam", kind: "pack", amountCents: 1000, balanceAfter: 6000, purpose: null, refType: null, refId: null, note: "Mock credit pack", createdAt: "2026-01-01T00:00:00.000Z" }],
      profileEdits: {},
      agentEdits: {},
      newAgents: [],
      conversations: [{ id: "c-legacy-1", agentId: "maria-chen-physical-therapy", hirerId: "sam", title: "Legacy conversation", shareTranscript: false, createdAt: "2026-01-01T00:00:00.000Z" }],
      conversationEdits: {},
      messages: [],
      interviewTurns: [],
      answeredTurns: {},
      knowledgeTouchedAt: {},
    };
    const { store } = await loadDemoStore(legacy);
    const s = store.readDemo();
    expect(store.currentIdentity(s).id).toBe("sam");
    expect(s.ledger.some((r) => r.id === "l-legacy-1")).toBe(true);
    expect(store.allConversations(s).some((c) => c.id === "c-legacy-1")).toBe(true);
    expect(store.allReviews(s).length).toBe(REVIEWS.length);
  });

  it("a review written through commitDemo is persisted and reappears after a reload", async () => {
    const { store, storage } = await loadDemoStore();
    const newReview = { id: "r-test-1", agentId: "maria-chen-physical-therapy", reviewerId: "riley", stars: 5 as const, comment: "Great agent.", createdAt: "2026-01-02T00:00:00.000Z" };
    store.commitDemo((s) => ({ ...s, reviews: [...(s.reviews ?? []), newReview] }));

    const raw = storage.getItem("bx-demo-v1");
    expect(raw).toBeTruthy();
    expect(raw).toContain("r-test-1");

    const reloaded = await loadDemoStore(JSON.parse(raw!));
    expect(reloaded.store.allReviews(reloaded.store.readDemo()).some((r) => r.id === "r-test-1")).toBe(true);
  });

  it("exposes STORAGE_KEY and a v:1 DemoState", async () => {
    const { store } = await loadDemoStore();
    expect(store.STORAGE_KEY).toBe("bx-demo-v1");
    expect(store.readDemo().v).toBe(1);
  });

  it("repairs a malformed Phase 4 collection to its default without losing the rest of the state (T-04-01)", async () => {
    const malformed = { v: 1, identityId: "sam", reviews: "oops" };
    const { store } = await loadDemoStore(malformed);
    const s = store.readDemo();
    // Compare ids rather than deep-equal: `ago()` in seed.ts stamps createdAt from
    // Date.now() at module load, so a module instance reloaded by vi.resetModules()
    // computes its own (slightly different) timestamps than this file's static import.
    expect(store.allReviews(s).map((r) => r.id)).toEqual(REVIEWS.map((r) => r.id));
    expect(s.identityId).toBe("sam");
  });
});
