import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENTS, CONVERSATIONS, IDENTITIES, MESSAGES, PROFILES } from "./data/seed";

let local: Map<string, string>;
const json = (data: unknown, status = 200) => Response.json(data, { status });
const snapshot = (identityId = "maria", balanceUnits = "50000000000") => ({
  identityId, identities: IDENTITIES, profiles: PROFILES.filter(p => p.identityId === identityId),
  agents: AGENTS, sources: [], interviewTurns: [], conversations: [], messages: [], ledger: [],
  wallet: { balanceUnits, heldUnits: "0", balanceCents: Number(BigInt(balanceUnits)) / 10_000_000 },
  backend: { configured: true, profileVersion: 1, agentOrigins: {}, sourceStates: {}, answerStates: {},
    personaStates: {}, indexJobs: {} },
});
beforeEach(() => {
  local = new Map();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => { local.set(key, value); },
    removeItem: (key: string) => { local.delete(key); },
  } });
  vi.resetModules();
});
afterEach(() => vi.unstubAllGlobals());

describe("server snapshot bridge", () => {
  it("recovers per-agent drafts after reload without persisting money", async () => {
    const store = await import("./demo-store");
    store.saveDraft("interview", "agent-a", "First answer");
    store.saveDraft("interview", "agent-b", "Second answer");
    expect(store.getDraft("interview", "agent-a")?.value).toBe("First answer");
    expect(store.getDraft("interview", "agent-b")?.value).toBe("Second answer");
    expect(local.get("bx-demo-bridge-v2")).not.toContain("wallet");
    vi.resetModules();
    const reloaded = await import("./demo-store");
    expect(reloaded.getDraft("interview", "agent-a")?.value).toBe("First answer");
    expect(reloaded.getDraft("interview", "agent-b")?.value).toBe("Second answer");
  });

  it("ignores legacy client ledger and fails closed before a live snapshot", async () => {
    local.set("bx-demo-v1", JSON.stringify({ ledger: [{ identityId: "maria", amountCents: 9999999 }] }));
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const store = await import("./demo-store");
    expect(store.balanceOf(store.readDemoState(), "maria")).toBe(0);
    await expect(store.sendSandboxMessage("agent-1", "Hello")).rejects.toMatchObject({ detail: { code: "configuration" } });
    expect(fetcher).not.toHaveBeenCalled();
    expect(local.has("bx-demo-v1")).toBe(true);
  });

  it("keeps failed interview input and dirty persona through a refreshed snapshot", async () => {
    const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/demo/snapshot") return json({ ok: true, data: snapshot() });
      if (url.endsWith("/interview") && options?.method === "POST") return json({ ok: false,
        error: { code: "provider", message: "Provider unavailable", retryable: true } }, 502);
      if (url.endsWith("/interview")) return json({ ok: true, data: { state: "active", version: 3,
        pendingQuestion: { id: "question-1", text: "What happened?" }, answers: [] } });
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    const store = await import("./demo-store");
    await store.refreshDemo();
    const persona = store.saveDraft("persona", "agent-a", "My unsaved persona");
    await expect(store.answerInterview("agent-a", "My unsaved answer")).rejects.toThrow("Provider unavailable");
    await store.refreshDemo();
    expect(store.getDraft("interview", "agent-a")?.value).toBe("My unsaved answer");
    expect(store.getDraft("persona", "agent-a")).toEqual(persona);
    expect(store.balanceOf(store.readDemoState(), "maria")).toBe(5000);
  });

  it("does not apply a late previous-identity snapshot", async () => {
    let resolveMaria!: (value: Response) => void;
    const maria = new Promise<Response>(resolve => { resolveMaria = resolve; });
    const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/demo/identity") return json({ ok: true, data: { identityId: JSON.parse(options?.body as string).identityId } });
      if (url === "/api/demo/snapshot") return fetcher.mock.calls.filter(call => call[0] === "/api/demo/snapshot").length === 1
        ? maria : json({ ok: true, data: snapshot("sam", "10000000") });
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    const store = await import("./demo-store");
    const first = store.refreshDemo();
    store.switchIdentity("sam");
    await vi.waitFor(() => expect(store.readDemoState().status).toBe("ready"));
    resolveMaria(json({ ok: true, data: snapshot("maria") }));
    await first;
    expect(store.readDemoState().identityId).toBe("sam");
    expect(store.balanceOf(store.readDemoState(), "sam")).toBe(1);
  });

  it("reuses a grant key after an unknown transport outcome", async () => {
    let grants = 0;
    const keys: string[] = [];
    const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/demo/snapshot") return json({ ok: true, data: snapshot() });
      if (url === "/api/wallet/grants") {
        keys.push(JSON.parse(options?.body as string).requestKey);
        if (++grants === 1) throw new Error("connection lost");
        return json({ ok: true, data: { grantUnits: "10000000", balanceUnits: "50010000000", replayed: true } });
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    const store = await import("./demo-store");
    await store.refreshDemo();
    await expect(store.addCredits("pack")).rejects.toThrow("Could not reach the server");
    expect(store.getDraft("grant", "maria")?.value).toBe("pack");
    await store.addCredits("pack");
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(store.getDraft("grant", "maria")).toBeNull();
  });

  it("imports profile text explicitly without sending legacy ledger rows", async () => {
    local.set("bx-demo-v1", JSON.stringify({ profileEdits: { maria: { displayName: "Local Maria" } },
      ledger: [{ identityId: "maria", amountCents: 9999999 }] }));
    let submitted: unknown;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/demo/snapshot") return json({ ok: true, data: snapshot() });
      if (url === "/api/demo/import") {
        submitted = JSON.parse(options?.body as string);
        return json({ ok: true, data: { results: [{ key: "profile:maria", ok: true, imported: true }] } });
      }
      throw new Error(`Unexpected ${url}`);
    }));
    const store = await import("./demo-store");
    await store.refreshDemo();
    expect(await store.importLegacyDrafts()).toEqual({ imported: 1, remaining: 0 });
    expect(submitted).toEqual({ records: [{ key: "profile:maria", kind: "profile", patch: { displayName: "Local Maria" } }] });
    expect(local.has("bx-demo-v1")).toBe(false);
  });
});


describe("Phase 4 controls on the server bridge", () => {
  it("writes sharing to the server and refreshes the permission-filtered transcript", async () => {
    local.set("bx-demo-bridge-v2", JSON.stringify({ v: 2, identityId: "sam", drafts: {} }));
    const conversation = { ...CONVERSATIONS[0], shareTranscript: false };
    const writes: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith("/controls") && options?.method === "PATCH") {
        const input = JSON.parse(options.body as string);
        writes.push(input);
        conversation.shareTranscript = input.shareTranscript;
        return json({ ok: true, data: { shareTranscript: input.shareTranscript } });
      }
      if (url === "/api/demo/snapshot") return json({ ok: true, data: {
        ...snapshot("sam"), conversations: [conversation],
        messages: MESSAGES.filter(message => message.conversationId === conversation.id),
      } });
      throw new Error(`Unexpected ${url}`);
    }));
    const store = await import("./demo-store");
    await store.refreshDemo();
    const { setShareTranscript } = await import("@/features/trust/conversation");
    expect((await setShareTranscript(conversation.id, true)).ok).toBe(true);
    expect(writes).toEqual([{ action: "share", shareTranscript: true }]);
    expect(store.allConversations(store.readDemo())[0].shareTranscript).toBe(true);
    expect((await setShareTranscript(conversation.id, false)).ok).toBe(true);
    expect(conversation.shareTranscript).toBe(false);
    expect(store.allConversations(store.readDemo())[0].shareTranscript).toBe(false);
  });

  it("persists answer feedback on the server without storing private messages locally", async () => {
    local.set("bx-demo-bridge-v2", JSON.stringify({ v: 2, identityId: "sam", drafts: {} }));
    const conversation = CONVERSATIONS[0];
    const answer = { ...MESSAGES.find(message => message.conversationId === conversation.id && message.role === "assistant")!, feedback: null as "up" | "down" | null };
    const writes: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith("/controls") && options?.method === "PATCH") {
        const input = JSON.parse(options.body as string); writes.push(input); answer.feedback = input.feedback;
        return json({ ok: true, data: { feedback: input.feedback } });
      }
      if (url === "/api/demo/snapshot") return json({ ok: true, data: {
        ...snapshot("sam"), conversations: [conversation], messages: [answer],
      } });
      throw new Error(`Unexpected ${url}`);
    }));
    const store = await import("./demo-store");
    await store.refreshDemo();
    const { toggleAnswerFeedback } = await import("@/features/trust/conversation");
    expect((await toggleAnswerFeedback(answer.id, "up")).ok).toBe(true);
    expect(writes).toEqual([{ action: "feedback", messageId: answer.id, feedback: "up" }]);
    expect(store.messageById(store.readDemo(), answer.id)?.feedback).toBe("up");
    expect((await toggleAnswerFeedback(answer.id, "up")).ok).toBe(true);
    expect(answer.feedback).toBeNull();
    expect(local.get("bx-demo-bridge-v2")).not.toContain(answer.content);
  });
});


describe("Phase 4 local metadata beside the authoritative snapshot", () => {
  it("persists a gated review and its rating while leaving chats on the server", async () => {
    local.set("bx-demo-bridge-v2", JSON.stringify({ v: 2, identityId: "sam", drafts: {} }));
    const conversation = CONVERSATIONS[0];
    const user = MESSAGES.find(message => message.conversationId === conversation.id && message.role === "user")!;
    const messages = Array.from({ length: 5 }, (_, i) => ({ ...user, id: `user:${i}` }));
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, data: {
      ...snapshot("sam"), conversations: [conversation], messages,
    } })));
    const store = await import("./demo-store");
    await store.refreshDemo();
    const { submitReview } = await import("@/features/trust/reviews");
    expect(submitReview(conversation.agentId, { stars: 5, comment: "Helpful" }).ok).toBe(true);
    expect(submitReview(conversation.agentId, { stars: 5, comment: "Duplicate" })).toMatchObject({ ok: false, error: "reviewed" });
    const ratingCount = store.agentById(store.readDemo(), conversation.agentId)!.ratingCount;
    expect(local.get("bx-demo-bridge-v2")).not.toContain(user.content);
    vi.resetModules();
    const reloaded = await import("./demo-store");
    await reloaded.refreshDemo();
    expect(reloaded.reviewsFor(reloaded.readDemo(), conversation.agentId).filter(review => review.reviewerId === "sam")).toHaveLength(1);
    expect(reloaded.agentById(reloaded.readDemo(), conversation.agentId)?.ratingCount).toBe(ratingCount);
  });

  it("records mock payouts without altering the server wallet or admitting local grants", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, data: {
      ...snapshot(), ledger: [{ id: "live-earnings", identityId: "maria", kind: "earnings", amountCents: 15,
        balanceAfter: 5000, refType: "conversation", refId: "private-chat", purpose: "chat_message", note: "Earned", createdAt: "2026-01-01" }],
    } })));
    const store = await import("./demo-store");
    await store.refreshDemo();
    const { requestCashout, cashoutSummary } = await import("@/features/billing/cashout");
    expect(requestCashout(10).ok).toBe(true);
    expect(cashoutSummary(store.readDemo(), "maria").availableCents).toBe(5);
    expect(store.balanceOf(store.readDemo(), "maria")).toBe(5000);
    expect(store.walletStatus(store.readDemo()).balanceUnits).toBe("50000000000");
    const raw = JSON.parse(local.get("bx-demo-bridge-v2")!);
    raw.phase4.ledger.push({ id: "fake-pack", identityId: "maria", kind: "pack", amountCents: 999999 });
    local.set("bx-demo-bridge-v2", JSON.stringify(raw));
    vi.resetModules();
    const reloaded = await import("./demo-store");
    await reloaded.refreshDemo();
    expect(reloaded.allLedger(reloaded.readDemo()).some(row => row.id === "fake-pack")).toBe(false);
    expect(reloaded.payoutsFor(reloaded.readDemo(), "maria")).toHaveLength(1);
    expect(reloaded.balanceOf(reloaded.readDemo(), "maria")).toBe(5000);
  });

  it("keeps private earnings anonymous while retaining their agent attribution", async () => {
    const agent = AGENTS[0];
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, data: {
      ...snapshot(), earningAgents: { "private-chat": agent.id },
      ledger: [{ id: "earning", identityId: "maria", kind: "earnings", amountCents: 3,
        balanceAfter: 5000, refType: "conversation", refId: "private-chat", purpose: "chat_message", note: "Earned", createdAt: "2026-01-01" }],
    } })));
    const store = await import("./demo-store");
    await store.refreshDemo();
    const { earningsByConversation } = await import("@/features/billing/earnings");
    const row = earningsByConversation(store.readDemo(), "maria")[0];
    expect(row).toMatchObject({ title: "Conversation", agentName: agent.persona.name, netCents: 3 });
    expect(store.messagesFor(store.readDemo(), "private-chat")).toEqual([]);
  });
});
