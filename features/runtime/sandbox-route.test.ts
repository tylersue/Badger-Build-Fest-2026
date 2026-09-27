import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocked = vi.hoisted(() => ({ run: vi.fn(), owner: vi.fn(), grant: vi.fn(), conversation: vi.fn() }));
vi.mock("@/features/runtime/agent", () => ({
  AnswerFailure: class AnswerFailure extends Error { constructor(readonly detail: unknown) { super("failure"); } },
  runAnswer: (...args: unknown[]) => mocked.run(...args),
  createSqlAnswerStore: () => ({ replay: async () => [] }),
}));
vi.mock("@/features/billing/service", () => ({
  grantMockCredits: (...args: unknown[]) => mocked.grant(...args),
  getOperationForIdentity: async () => ({ ok: false, error: { code: "not_owner", message: "Unavailable", retryable: false } }),
}));
vi.mock("@/lib/server/db", () => ({
  DatabaseFailure: class DatabaseFailure extends Error {},
  requireServiceDb: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mocked.conversation() }) }) }) }),
}));
vi.mock("@/lib/server/request", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/server/request")>();
  return { ...actual, requireAgentOwner: (...args: unknown[]) => mocked.owner(...args) };
});
import { POST as sandboxPost } from "@/app/api/agents/[agentId]/sandbox/route";
import { POST as grantPost } from "@/app/api/wallet/grants/route";

const sandboxUrl = "https://local.example/api/agents/agent-a/sandbox";
const headers = { origin: "https://local.example", "Content-Type": "application/json", "Idempotency-Key": "key-1" };
const request = (body: unknown) => new Request(sandboxUrl, { method: "POST", headers, body: JSON.stringify(body) });
const context = { params: Promise.resolve({ agentId: "agent-a" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocked.owner.mockResolvedValue(undefined);
  mocked.conversation.mockResolvedValue({ data: { id: "sandbox:agent-a", agent_id: "agent-a", hirer_id: "maria", mode: "sandbox" }, error: null });
  mocked.run.mockImplementation(async function* () { yield { type: "done", operationId: "op-1", eventId: "evt-1", sequence: 0, messageId: "msg-1" }; });
  mocked.grant.mockResolvedValue({ ok: true, data: { balanceUnits: "1", grantUnits: "1", replayed: false } });
});

describe("sandbox and mock funding routes", () => {
  it("fixes actor, conversation and sandbox mode on the server", async () => {
    const result = await sandboxPost(request({ text: "Question", requestKey: "key-1" }), context);
    expect(result.status).toBe(200);
    expect(result.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(mocked.run).toHaveBeenCalledWith({ agentId: "agent-a", actorId: "maria",
      conversationId: "sandbox:agent-a", requestKey: "key-1", text: "Question", mode: "sandbox" });
    expect(await result.text()).toContain('"type":"done"');
  });

  it("rejects client model, price and mode controls before dispatch", async () => {
    for (const extra of [{ mode: "chat" }, { multiplier: 0 }, { model: "free" }]) {
      const result = await sandboxPost(request({ text: "Question", requestKey: "key-1", ...extra }), context);
      expect(result.status).toBe(400);
    }
    expect(mocked.run).not.toHaveBeenCalled();
  });

  it("rejects an unowned sandbox and arbitrary grant amount", async () => {
    mocked.conversation.mockResolvedValueOnce({ data: { id: "sandbox:agent-a", agent_id: "agent-a", hirer_id: "sam", mode: "sandbox" }, error: null });
    expect((await sandboxPost(request({ text: "Question", requestKey: "key-1" }), context)).status).toBe(404);
    const grant = new Request("https://local.example/api/wallet/grants", { method: "POST", headers,
      body: JSON.stringify({ kind: "pack", requestKey: "key-1", amount: 999999 }) });
    expect((await grantPost(grant)).status).toBe(400);
    expect(mocked.grant).not.toHaveBeenCalled();
  });
});
