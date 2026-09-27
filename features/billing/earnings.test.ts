import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialDemoState } from "@/lib/demo-store";
import type { Conversation, LedgerEntry } from "@/lib/types";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { earningsByConversation, earningsTotals } from "./earnings";

afterEach(() => resetDemoHarness());

describe("earningsByConversation", () => {
  it("reconciles Maria's seeded gross, platform share, and net per conversation", () => {
    const rows = earningsByConversation(createInitialDemoState(), "maria");
    expect(rows.map(({ conversationId, grossCents, platformCents, netCents }) => ({ conversationId, grossCents, platformCents, netCents }))).toEqual([
      { conversationId: "c-knee-swelling", grossCents: 12, platformCents: 7, netCents: 5 },
      { conversationId: "c-shin-splints", grossCents: 4, platformCents: 2, netCents: 2 },
      { conversationId: "c-shoulder-plan", grossCents: 8, platformCents: 5, netCents: 3 },
    ]);
    expect(rows.every((row) => row.grossCents === row.platformCents + row.netCents)).toBe(true);
  });

  it("returns no conversation earnings for Sam", () => {
    expect(earningsByConversation(createInitialDemoState(), "sam")).toEqual([]);
  });

  it("keeps conversations with the same title separate", () => {
    const base = createInitialDemoState();
    const source: Conversation = { id: "c-knee-swelling", agentId: "maria-chen-physical-therapy", hirerId: "sam", title: "Knee swelling after ACL repair", shareTranscript: false, createdAt: "2026-01-01T00:00:00.000Z" };
    const duplicate: Conversation = { ...source, id: "c-knee-copy" };
    const extra: LedgerEntry[] = [
      { id: "l-copy-debit", identityId: "sam", kind: "debit", amountCents: -3, balanceAfter: 0, purpose: "chat_message", refType: "conversation", refId: duplicate.id, note: "same title", createdAt: "2026-01-02T00:00:00.000Z" },
      { id: "l-copy-earnings", identityId: "maria", kind: "earnings", amountCents: 1, balanceAfter: 0, purpose: null, refType: "conversation", refId: duplicate.id, note: "same title", createdAt: "2026-01-02T00:00:00.000Z" },
    ];
    const s = { ...base, conversations: [...base.conversations, duplicate], ledger: extra };
    const rows = earningsByConversation(s, "maria");
    expect(rows.filter((row) => row.title === source.title).map((row) => row.conversationId).sort()).toEqual(["c-knee-copy", "c-knee-swelling"]);
  });

  it("sorts equal latest earnings timestamps by conversation id", () => {
    const base = createInitialDemoState();
    const createdAt = "2030-09-27T00:00:00.000Z";
    const extra: LedgerEntry[] = ["c-knee-swelling", "c-shoulder-plan"].map((refId, index) => ({
      id: `l-latest-${index}`, identityId: "maria", kind: "earnings", amountCents: 1, balanceAfter: null,
      purpose: null, refType: "conversation", refId, note: "latest", createdAt,
    }));
    const rows = earningsByConversation({ ...base, ledger: extra }, "maria");
    expect(rows.slice(0, 2).map((row) => [row.conversationId, row.lastEarnedAt])).toEqual([
      ["c-knee-swelling", createdAt],
      ["c-shoulder-plan", createdAt],
    ]);
  });
});

describe("earningsTotals", () => {
  it("sums gross, platform, and net values", () => {
    expect(earningsTotals([
      { grossCents: 12, platformCents: 7, netCents: 5 },
      { grossCents: 8, platformCents: 5, netCents: 3 },
    ] as Parameters<typeof earningsTotals>[0])).toEqual({ grossCents: 20, platformCents: 12, netCents: 8 });
  });
});

describe("store integration", () => {
  it("includes a new grounded chat in Maria's earnings", async () => {
    const { store } = await loadDemoStore();
    store.switchIdentity("sam");
    const conversationId = store.startConversation("maria-chen-physical-therapy", "New ACL question");
    const result = await store.sendChatMessage(conversationId, "Is swelling after my ACL repair normal?");
    expect(result.ok).toBe(true);
    expect(result.ok && result.grounded).toBe(true);
    store.switchIdentity("maria");
    const rows = earningsByConversation(store.readDemo(), "maria");
    const row = rows.find((item) => item.conversationId === conversationId);
    expect(row).toBeDefined();
    expect(row?.grossCents).toBe(row!.platformCents + row!.netCents);
  });
});

// These tests validate the preserved local-demo rules; server bridge behavior has its own suite.
vi.mock("@/lib/demo-store", () => import("@/lib/testing/legacy-demo-store"));
