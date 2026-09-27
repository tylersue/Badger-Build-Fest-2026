import { afterEach, describe, expect, it } from "vitest";
import { createInitialDemoState } from "@/lib/demo-store";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { FLAG_DETAIL_MAX, applyFlag, buildFlag } from "./flags";
import { flagQueue } from "./moderation";

afterEach(() => {
  resetDemoHarness();
});

const AGENT = "maria-chen-physical-therapy";
const CONVERSATION = "c-knee-swelling";
const NOW = "2026-02-01T00:00:00.000Z";

describe("buildFlag rejections", () => {
  it("gives reason_required when no reason is chosen", () => {
    const s = createInitialDemoState();
    const result = buildFlag(s, { target: { type: "agent", agentId: AGENT }, reasonId: "", detail: "", reporterId: "sam" }, NOW);
    expect(result).toEqual({ ok: false, error: "reason_required" });
  });

  it("gives detail_required for 'other' with blank details", () => {
    const s = createInitialDemoState();
    const result = buildFlag(s, { target: { type: "agent", agentId: AGENT }, reasonId: "other", detail: "   ", reporterId: "sam" }, NOW);
    expect(result).toEqual({ ok: false, error: "detail_required" });
  });

  it("gives detail_too_long for 501 characters", () => {
    const s = createInitialDemoState();
    const detail = "a".repeat(FLAG_DETAIL_MAX + 1);
    const result = buildFlag(s, { target: { type: "agent", agentId: AGENT }, reasonId: "spam", detail, reporterId: "sam" }, NOW);
    expect(result).toEqual({ ok: false, error: "detail_too_long" });
  });

  it("gives unknown_target for an unknown agent", () => {
    const s = createInitialDemoState();
    const result = buildFlag(s, { target: { type: "agent", agentId: "does-not-exist" }, reasonId: "spam", detail: "", reporterId: "sam" }, NOW);
    expect(result).toEqual({ ok: false, error: "unknown_target" });
  });

  it("gives unknown_target for an unknown conversation", () => {
    const s = createInitialDemoState();
    const result = buildFlag(
      s,
      { target: { type: "conversation", agentId: AGENT, conversationId: "c-does-not-exist" }, reasonId: "spam", detail: "", reporterId: "sam" },
      NOW,
    );
    expect(result).toEqual({ ok: false, error: "unknown_target" });
  });

  it("gives unknown_target when the conversation's agentId differs from target.agentId", () => {
    const s = createInitialDemoState();
    const result = buildFlag(
      s,
      { target: { type: "conversation", agentId: "luis-ortega-strength-coaching", conversationId: CONVERSATION }, reasonId: "spam", detail: "", reporterId: "sam" },
      NOW,
    );
    expect(result).toEqual({ ok: false, error: "unknown_target" });
  });

  it("gives already_flagged for a second open flag by the same reporter on the same target", () => {
    const s = createInitialDemoState();
    const first = buildFlag(s, { target: { type: "agent", agentId: AGENT }, reasonId: "spam", detail: "", reporterId: "sam" }, NOW, "f-test-1");
    if (!first.ok) throw new Error("expected first flag to succeed");
    const s2 = applyFlag(s, first.flag);
    const second = buildFlag(s2, { target: { type: "agent", agentId: AGENT }, reasonId: "unsafe", detail: "", reporterId: "sam" }, NOW);
    expect(second).toEqual({ ok: false, error: "already_flagged" });
  });
});

describe("buildFlag acceptances", () => {
  it("reason only: reason equals the label", () => {
    const s = createInitialDemoState();
    const result = buildFlag(s, { target: { type: "agent", agentId: AGENT }, reasonId: "spam", detail: "", reporterId: "sam" }, NOW, "f-test-2");
    expect(result).toEqual({
      ok: true,
      flag: { id: "f-test-2", targetType: "agent", agentId: AGENT, conversationId: null, reason: "Spam or advertising", status: "open", createdAt: NOW, reporterId: "sam" },
    });
  });

  it("reason plus details: reason equals 'Label: details' trimmed", () => {
    const s = createInitialDemoState();
    const result = buildFlag(
      s,
      { target: { type: "conversation", agentId: AGENT, conversationId: CONVERSATION }, reasonId: "other", detail: "  skipped my question  ", reporterId: "sam" },
      NOW,
      "f-test-3",
    );
    expect(result).toEqual({
      ok: true,
      flag: { id: "f-test-3", targetType: "conversation", agentId: AGENT, conversationId: CONVERSATION, reason: "Something else: skipped my question", status: "open", createdAt: NOW, reporterId: "sam" },
    });
  });

  it("allows a new flag after the reporter's earlier flag on that target was resolved", () => {
    const s = createInitialDemoState();
    const first = buildFlag(s, { target: { type: "agent", agentId: AGENT }, reasonId: "spam", detail: "", reporterId: "sam" }, NOW, "f-test-4");
    if (!first.ok) throw new Error("expected first flag to succeed");
    const s2 = { ...applyFlag(s, first.flag), flagEdits: { "f-test-4": { status: "resolved" as const } } };
    const second = buildFlag(s2, { target: { type: "agent", agentId: AGENT }, reasonId: "unsafe", detail: "", reporterId: "sam" }, NOW, "f-test-5");
    expect(second.ok).toBe(true);
  });
});

describe("store-level: createFlag", () => {
  it("as Sam on c-knee-swelling, appears in flagQueue(conversation/open) with reporterName Sam Okafor", async () => {
    const { store } = await loadDemoStore();
    store.switchIdentity("sam");
    const { createFlag } = await import("./flags");
    const result = createFlag({ type: "conversation", agentId: AGENT, conversationId: CONVERSATION }, "unsafe", "");
    expect(result.ok).toBe(true);
    const s = store.readDemo();
    const rows = flagQueue(s, { targetType: "conversation", status: "open" });
    expect(rows.some((r) => r.flag.conversationId === CONVERSATION && r.reporterName === "Sam Okafor")).toBe(true);
  });
});
