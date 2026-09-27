import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialDemoState } from "@/lib/demo-store";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { MODERATION_NOTE_MAX, applyResolveFlag, applyUnpublish, flagQueue, planResolveFlag, planUnpublish } from "./moderation";

afterEach(() => {
  resetDemoHarness();
});

describe("flagQueue", () => {
  it("returns f-seed-1 for agent/open, f-seed-2 for conversation/open, and f-seed-3 for agent/resolved", () => {
    const s = createInitialDemoState();
    expect(flagQueue(s, { targetType: "agent", status: "open" }).map((r) => r.flag.id)).toEqual(["f-seed-1"]);
    expect(flagQueue(s, { targetType: "conversation", status: "open" }).map((r) => r.flag.id)).toEqual(["f-seed-2"]);
    expect(flagQueue(s, { targetType: "agent", status: "resolved" }).map((r) => r.flag.id)).toEqual(["f-seed-3"]);
  });

  it('the query "shin" finds f-seed-2', () => {
    const s = createInitialDemoState();
    const rows = flagQueue(s, { targetType: "conversation", status: "open", query: "shin" });
    expect(rows.map((r) => r.flag.id)).toEqual(["f-seed-2"]);
  });

  it("no FlagQueueRow carries message content (assert the row keys)", () => {
    const s = createInitialDemoState();
    const [row] = flagQueue(s, { targetType: "conversation", status: "open" });
    expect(Object.keys(row).sort()).toEqual(["agentName", "agentSlug", "agentStatus", "conversationTitle", "flag", "reporterName"].sort());
  });
});

describe("planResolveFlag / applyResolveFlag", () => {
  const NOW = "2026-02-01T00:00:00.000Z";

  it("resolves an open flag with a note and timestamp", () => {
    const s = createInitialDemoState();
    const plan = planResolveFlag(s, "f-seed-1", "Reviewed", NOW);
    expect(plan).toEqual({ ok: true, flagId: "f-seed-1", edit: { status: "resolved", resolvedAt: NOW, resolutionNote: "Reviewed" } });
    if (!plan.ok) throw new Error("expected plan to succeed");
    const next = applyResolveFlag(s, plan);
    expect(next.flagEdits?.["f-seed-1"]?.status).toBe("resolved");
  });

  it("gives already_resolved for an already-resolved flag", () => {
    const s = createInitialDemoState();
    expect(planResolveFlag(s, "f-seed-3", null, NOW)).toEqual({ ok: false, error: "already_resolved" });
  });

  it("gives unknown_flag for an unknown id", () => {
    const s = createInitialDemoState();
    expect(planResolveFlag(s, "f-does-not-exist", null, NOW)).toEqual({ ok: false, error: "unknown_flag" });
  });
});

describe("planUnpublish", () => {
  const AGENT = "luis-ortega-strength-coaching";
  const NOW = "2026-02-01T00:00:00.000Z";

  it("rejects a whitespace note (note_required)", () => {
    const s = createInitialDemoState();
    expect(planUnpublish(s, AGENT, "   ", NOW)).toEqual({ ok: false, error: "note_required" });
  });

  it("rejects a 501-character note and accepts exactly 500", () => {
    const s = createInitialDemoState();
    const tooLong = "a".repeat(MODERATION_NOTE_MAX + 1);
    const exact = "a".repeat(MODERATION_NOTE_MAX);
    expect(planUnpublish(s, AGENT, tooLong, NOW)).toEqual({ ok: false, error: "note_too_long" });
    expect(planUnpublish(s, AGENT, exact, NOW).ok).toBe(true);
  });

  it("gives unknown_agent for a missing agent", () => {
    const s = createInitialDemoState();
    expect(planUnpublish(s, "does-not-exist", "a note", NOW)).toEqual({ ok: false, error: "unknown_agent" });
  });

  it("lists every open flag on the agent in flagIds", () => {
    const s = createInitialDemoState();
    const plan = planUnpublish(s, AGENT, "Reviewed and confirmed.", NOW, "ma-test-1");
    expect(plan).toEqual({
      ok: true,
      action: { id: "ma-test-1", kind: "unpublish", agentId: AGENT, note: "Reviewed and confirmed.", flagIds: ["f-seed-1"], createdAt: NOW },
    });
  });
});

describe("applyUnpublish", () => {
  it("unpublishes the agent and resolves its open flags (agent and conversation) with the note", () => {
    const s = createInitialDemoState();
    const NOW = "2026-02-01T00:00:00.000Z";
    const plan = planUnpublish(s, "maria-chen-physical-therapy", "Reviewed.", NOW, "ma-test-2");
    if (!plan.ok) throw new Error("expected plan to succeed");
    const next = applyUnpublish(s, plan);
    expect(next.agentEdits["maria-chen-physical-therapy"]?.status).toBe("unpublished");
    // f-seed-2 is a conversation flag whose agentId is maria-chen-physical-therapy.
    expect(next.flagEdits?.["f-seed-2"]?.status).toBe("resolved");
    expect(next.flagEdits?.["f-seed-2"]?.resolutionNote).toBe("Agent unpublished: Reviewed.");
  });
});

describe("store-level: unpublishAgentWithNote and resolveFlag", () => {
  it("unpublishing luis-ortega-strength-coaching sets it unpublished, drops it from the published list, and resolves f-seed-1", async () => {
    const { store } = await loadDemoStore();
    const { unpublishAgentWithNote } = await import("./moderation");
    const result = unpublishAgentWithNote("luis-ortega-strength-coaching", "Reviewed and confirmed.");
    expect(result.ok).toBe(true);
    const s = store.readDemo();
    expect(store.agentById(s, "luis-ortega-strength-coaching")?.status).toBe("unpublished");
    expect(store.allAgents(s).filter((a) => a.status === "published").some((a) => a.id === "luis-ortega-strength-coaching")).toBe(false);
    expect(store.allFlags(s).find((f) => f.id === "f-seed-1")?.status).toBe("resolved");
    expect(store.moderationActionsFor(s, "luis-ortega-strength-coaching")[0]?.note).toBe("Reviewed and confirmed.");
  });

  it("a second unpublish gives not_published", async () => {
    const { store } = await loadDemoStore();
    void store;
    const { unpublishAgentWithNote } = await import("./moderation");
    unpublishAgentWithNote("luis-ortega-strength-coaching", "First note.");
    const second = unpublishAgentWithNote("luis-ortega-strength-coaching", "Second note.");
    expect(second).toEqual({ ok: false, error: "not_published" });
  });

  it("unpublishing maria-chen-physical-therapy also resolves the conversation flag f-seed-2", async () => {
    const { store } = await loadDemoStore();
    const { unpublishAgentWithNote } = await import("./moderation");
    unpublishAgentWithNote("maria-chen-physical-therapy", "Reviewed.");
    const s = store.readDemo();
    expect(store.allFlags(s).find((f) => f.id === "f-seed-2")?.status).toBe("resolved");
  });

  it("resolveFlag on f-seed-3 gives already_resolved", async () => {
    await loadDemoStore();
    const { resolveFlag } = await import("./moderation");
    expect(resolveFlag("f-seed-3")).toEqual({ ok: false, error: "already_resolved" });
  });

  it("unpublishAgentWithNote persists, so a reload via loadDemoStore(saved JSON) still shows the agent unpublished", async () => {
    const { storage } = await loadDemoStore();
    const { unpublishAgentWithNote } = await import("./moderation");
    unpublishAgentWithNote("luis-ortega-strength-coaching", "Reviewed and confirmed.");
    const raw = storage.getItem("bx-demo-v1");
    expect(raw).toBeTruthy();
    const reloaded = await loadDemoStore(JSON.parse(raw!));
    expect(reloaded.store.agentById(reloaded.store.readDemo(), "luis-ortega-strength-coaching")?.status).toBe("unpublished");
  });
});

// These tests validate the preserved local-demo rules; server bridge behavior has its own suite.
vi.mock("@/lib/demo-store", () => import("@/lib/testing/legacy-demo-store"));
