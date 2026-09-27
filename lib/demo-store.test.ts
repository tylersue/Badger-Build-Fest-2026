import { afterEach, describe, expect, it } from "vitest";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { FLAGS, MESSAGES, REVIEWS } from "@/lib/data/seed";

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

describe("demo-store Phase 4 collections: flags, feedback, payouts, moderation (Task 2)", () => {
  const legacyPayload = {
    v: 1,
    identityId: "sam",
    ledger: [],
    profileEdits: {},
    agentEdits: {},
    newAgents: [],
    conversations: [],
    conversationEdits: {},
    messages: [],
    interviewTurns: [],
    answeredTurns: {},
    knowledgeTouchedAt: {},
  };

  it("legacy payload: flags/payouts/moderation default, messagesFor keeps seeded feedback unchanged", async () => {
    const { store } = await loadDemoStore(legacyPayload);
    const s = store.readDemo();
    expect(store.allFlags(s).map((f) => f.id)).toEqual(FLAGS.map((f) => f.id));
    expect(store.allPayouts(s)).toEqual([]);
    expect(store.allModerationActions(s)).toEqual([]);

    const seededAssistant = MESSAGES.find((m) => m.conversationId === "c-knee-swelling" && m.role === "assistant")!;
    const msgs = store.messagesFor(s, "c-knee-swelling");
    expect(msgs.find((m) => m.id === seededAssistant.id)?.feedback).toBe(seededAssistant.feedback);
  });

  it("messageFeedback overlay applies to messagesFor and messageById, and is a no-op for an unknown id", async () => {
    const { store } = await loadDemoStore();
    const seededAssistant = MESSAGES.find((m) => m.conversationId === "c-knee-swelling" && m.role === "assistant")!;

    const clearedState = store.commitDemo((s) => ({ ...s, messageFeedback: { ...s.messageFeedback, [seededAssistant.id]: null } }));
    expect(store.messageById(clearedState, seededAssistant.id)?.feedback).toBeNull();
    expect(store.messagesFor(clearedState, "c-knee-swelling").find((m) => m.id === seededAssistant.id)?.feedback).toBeNull();

    const upvotedState = store.commitDemo((s) => ({ ...s, messageFeedback: { ...s.messageFeedback, [seededAssistant.id]: "up" } }));
    expect(store.messageById(upvotedState, seededAssistant.id)?.feedback).toBe("up");

    const noopState = store.commitDemo((s) => ({ ...s, messageFeedback: { ...s.messageFeedback, "m-does-not-exist": "down" } }));
    expect(store.messageById(noopState, seededAssistant.id)?.feedback).toBe("up");
    expect(store.messageById(noopState, "m-does-not-exist")).toBeUndefined();
  });

  it("flagEdits overlay merges into allFlags", async () => {
    const { store } = await loadDemoStore();
    const edited = store.commitDemo((s) => ({
      ...s,
      flagEdits: { ...s.flagEdits, "f-seed-1": { status: "resolved", resolvedAt: "2026-02-01T00:00:00.000Z", resolutionNote: "Reviewed and resolved." } },
    }));
    const flag = store.allFlags(edited).find((f) => f.id === "f-seed-1");
    expect(flag?.status).toBe("resolved");
    expect(flag?.resolvedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(flag?.resolutionNote).toBe("Reviewed and resolved.");
  });

  it("payoutsFor and moderationActionsFor return newest first", async () => {
    const { store } = await loadDemoStore();
    const withPayouts = store.commitDemo((s) => ({
      ...s,
      payouts: [
        { id: "p-1", identityId: "maria", credits: 100, amountUsdCents: 100, status: "requested", ledgerEntryId: "l-1", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "p-2", identityId: "maria", credits: 200, amountUsdCents: 200, status: "requested", ledgerEntryId: "l-2", createdAt: "2026-01-03T00:00:00.000Z" },
      ],
      moderationActions: [
        { id: "ma-1", kind: "unpublish", agentId: "luis-ortega-strength-coaching", note: "old", flagIds: ["f-seed-1"], createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "ma-2", kind: "unpublish", agentId: "luis-ortega-strength-coaching", note: "new", flagIds: ["f-seed-1"], createdAt: "2026-01-05T00:00:00.000Z" },
      ],
    }));
    expect(store.payoutsFor(withPayouts, "maria").map((p) => p.id)).toEqual(["p-2", "p-1"]);
    expect(store.moderationActionsFor(withPayouts, "luis-ortega-strength-coaching").map((m) => m.id)).toEqual(["ma-2", "ma-1"]);
  });

  it("resetDemo leaves every Phase 4 collection empty", async () => {
    const { store } = await loadDemoStore();
    store.commitDemo((s) => ({
      ...s,
      reviews: [{ id: "r-x", agentId: "maria-chen-physical-therapy", reviewerId: "riley", stars: 5, comment: null, createdAt: "2026-01-01T00:00:00.000Z" }],
      flags: [{ id: "f-x", targetType: "agent", agentId: "maria-chen-physical-therapy", conversationId: null, reason: "Something else: test", status: "open", createdAt: "2026-01-01T00:00:00.000Z" }],
      flagEdits: { "f-seed-1": { status: "resolved" } },
      messageFeedback: { "m-1": "up" },
      payouts: [{ id: "p-x", identityId: "maria", credits: 10, amountUsdCents: 10, status: "requested", ledgerEntryId: "l-x", createdAt: "2026-01-01T00:00:00.000Z" }],
      moderationActions: [{ id: "ma-x", kind: "unpublish", agentId: "maria-chen-physical-therapy", note: "n", flagIds: [], createdAt: "2026-01-01T00:00:00.000Z" }],
    }));
    store.resetDemo();
    const s = store.readDemo();
    expect(s.reviews).toEqual([]);
    expect(s.flags).toEqual([]);
    expect(s.flagEdits).toEqual({});
    expect(s.messageFeedback).toEqual({});
    expect(s.payouts).toEqual([]);
    expect(s.moderationActions).toEqual([]);
  });
});
