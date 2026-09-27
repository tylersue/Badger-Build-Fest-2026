import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocked = vi.hoisted(() => ({ run: vi.fn(), owner: vi.fn(), grant: vi.fn(), conversation: vi.fn(), transcript: vi.fn(),
  replay: vi.fn(), recover: vi.fn(), operation: vi.fn() }));
vi.mock("@/features/runtime/agent", () => ({
  AnswerFailure: class AnswerFailure extends Error { constructor(readonly detail: unknown) { super("failure"); } },
  runAnswer: (...args: unknown[]) => mocked.run(...args),
  createSqlAnswerStore: () => ({ replay: (...args: unknown[]) => mocked.replay(...args),
    recover: (...args: unknown[]) => mocked.recover(...args) }),
}));
vi.mock("@/features/billing/service", () => ({
  grantMockCredits: (...args: unknown[]) => mocked.grant(...args),
  getOperationForIdentity: (...args: unknown[]) => mocked.operation(...args),
}));
vi.mock("@/lib/server/db", () => ({
  DatabaseFailure: class DatabaseFailure extends Error {},
  requireServiceDb: () => ({ from: (table: string) => ({ select: () => ({ eq: () => table === "messages"
    ? { order: () => mocked.transcript() } : { maybeSingle: () => mocked.conversation() } }) }) }),
}));
vi.mock("@/lib/server/request", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/server/request")>();
  return { ...actual, requireAgentOwner: (...args: unknown[]) => mocked.owner(...args) };
});
import { GET as sandboxGet, POST as sandboxPost } from "@/app/api/agents/[agentId]/sandbox/route";
import { POST as grantPost } from "@/app/api/wallet/grants/route";

const sandboxUrl = "https://local.example/api/agents/agent-a/sandbox";
const headers = { origin: "https://local.example", "Content-Type": "application/json", "Idempotency-Key": "key-1" };
const request = (body: unknown) => new Request(sandboxUrl, { method: "POST", headers, body: JSON.stringify(body) });
const context = { params: Promise.resolve({ agentId: "agent-a" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocked.owner.mockResolvedValue(undefined);
  mocked.conversation.mockResolvedValue({ data: { id: "sandbox:agent-a", agent_id: "agent-a", hirer_id: "maria", mode: "sandbox" }, error: null });
  mocked.transcript.mockResolvedValue({ data: [], error: null });
  mocked.replay.mockResolvedValue([]);
  mocked.recover.mockResolvedValue(false);
  mocked.operation.mockResolvedValue({ ok: false, error: { code: "not_owner", message: "Unavailable", retryable: false } });
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

  it("returns exact decimal charges for safe numeric and bigint-string transcript values", async () => {
    mocked.transcript.mockResolvedValueOnce({ data: [
      { id: "small", charged_units: 42 },
      { id: "large", charged_units: "9223372036854775807" },
      { id: "pending", charged_units: null },
    ], error: null });
    const response = await sandboxGet(new Request(sandboxUrl), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data.messages.map((row: { charged_units: string | null }) => row.charged_units))
      .toEqual(["42", "9223372036854775807", null]);
  });

  it("rejects an unsafe numeric transcript charge at the API boundary", async () => {
    mocked.transcript.mockResolvedValueOnce({ data: [{ id: "unsafe", charged_units: Number.MAX_SAFE_INTEGER + 1 }], error: null });
    const response = await sandboxGet(new Request(sandboxUrl), context);
    expect(response.status).not.toBe(200);
  });

  it("asks the database to recover an unfinished replay before returning events", async () => {
    mocked.operation.mockResolvedValueOnce({ ok: true, data: { operation: { agentId: "agent-a", purpose: "sandbox" } } });
    mocked.replay.mockResolvedValueOnce([{ type: "operation-start", sequence: 0 }])
      .mockResolvedValueOnce([{ type: "operation-start", sequence: 0 }, { type: "done", sequence: 1 }]);
    const response = await sandboxGet(new Request(`${sandboxUrl}?operationId=op-1`), context);
    expect(response.status).toBe(200);
    expect(mocked.recover).toHaveBeenCalledWith("op-1");
    expect((await response.json()).data.events.at(-1).type).toBe("done");
  });
});
