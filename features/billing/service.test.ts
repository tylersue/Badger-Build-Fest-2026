import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const dbState = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/server/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/db")>()),
  getServiceDb: () => dbState.client ? { ok: true, data: dbState.client } : { ok: false, error: { code: "configuration", message: "Database unavailable.", retryable: false } },
}));
import type { ProviderAttempt } from "@/lib/contracts/phase2";
import { PRICE_VERSION } from "./pricing";
import { expandReservation, recordAttempt, reconcileOperation, reserveOperation, settleOperation, type BillingRpc } from "./service";
import { GET } from "@/app/api/operations/[operationId]/route";

const operationId = "op_11111111-1111-4111-8111-111111111111";
const attemptId = "att_22222222-2222-4222-8222-222222222222";
const operation = { id: operationId, identity_id: "maria", agent_id: "agent-1", request_key: "one",
  purpose: "interview", state: "reserved", estimate_units: "1000", held_units: "10000", actual_units: null,
  price_version: PRICE_VERSION, payload_hash: "a".repeat(64), created_at: "2026-09-27T00:00:00Z" };
const attempt: ProviderAttempt = { id: attemptId, operationId, stageKey: "followup", attempt: 1,
  provider: "anthropic", model: "claude-haiku-4-5", state: "prepared", providerRequestId: null,
  dispatchDay: null, inputTokens: null, outputTokens: null, cacheReadTokens: null, cacheWriteTokens: null,
  embeddingTokens: null, successfulSearchCount: null, grossCostUnits: null, effectiveCostUnits: null,
  latencyMs: null, requestMetadata: { inputChars: 100, maxOutputTokens: 100 } };
const attemptRow = { id: attemptId, operation_id: operationId, stage_key: "followup", attempt: 1,
  provider: "anthropic", model: "claude-haiku-4-5", state: "unknown", provider_request_id: "req-1",
  dispatch_day: "2026-09-26", input_tokens: null, output_tokens: null, cache_read_tokens: null,
  cache_write_tokens: null, embedding_tokens: null, successful_search_count: null,
  gross_cost_units: null, effective_cost_units: null, latency_ms: null, request_metadata: attempt.requestMetadata };
const reservation = { identityId: "maria", agentId: "agent-1", purpose: "interview" as const,
  requestKey: "one", payloadHash: "a".repeat(64), estimateUnits: BigInt(1000), maxUnits: BigInt(10000),
  priceVersion: PRICE_VERSION };

describe("billing RPC boundary", () => {
  it("refuses insufficient reservation before any provider attempt", async () => {
    const rpc = vi.fn<BillingRpc>().mockResolvedValue({ data: null, error: { message: "INSUFFICIENT_CREDITS", details: "available=999 needed=10000" } });
    const result = await reserveOperation(reservation, rpc);
    expect(result).toMatchObject({ ok: false, error: { code: "insufficient_credits", availableUnits: "999", neededUnits: "10000" } });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("reserve_operation");
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_max_units: "10000", p_estimate_units: "1000", p_price_version: PRICE_VERSION });
    expect(await reserveOperation({ ...reservation, maxUnits: BigInt(100) }, rpc)).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("returns a typed cap refusal and keeps the UTC reset timestamp", async () => {
    const rpc = vi.fn<BillingRpc>().mockResolvedValue({ data: null, error: { message: "DAILY_CAP", details: "available=200 needed=10000" } });
    const result = await reserveOperation(reservation, rpc);
    expect(result).toMatchObject({ ok: false, error: { code: "daily_cap", availableUnits: "200", neededUnits: "10000" } });
    if (!result.ok) expect(result.error.resetAt).toMatch(/T00:00:00\.000Z$/);
  });
  it("preserves unknown dispatched holds and their original UTC day", async () => {
    const rpc = vi.fn<BillingRpc>().mockResolvedValue({ data: attemptRow, error: null });
    const result = await recordAttempt({ ...attempt, state: "unknown", providerRequestId: "req-1" }, rpc);
    expect(result).toMatchObject({ ok: true, data: { state: "unknown", dispatchDay: "2026-09-26", grossCostUnits: null } });
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_attempt: { state: "unknown", providerRequestId: "req-1" } });
  });
  it("settlement replay returns the same exact charged units; expansion remains a separate hold", async () => {
    const settled = { ...operation, state: "settled", actual_units: "1234", held_units: "0" };
    const rpc = vi.fn<BillingRpc>().mockResolvedValue({ data: settled, error: null });
    expect(await settleOperation(operationId, rpc)).toMatchObject({ ok: true, data: { actualUnits: "1234", heldUnits: "0" } });
    expect(await settleOperation(operationId, rpc)).toMatchObject({ ok: true, data: { actualUnits: "1234", heldUnits: "0" } });
    expect(rpc.mock.calls.slice(0, 2).map(([name]) => name)).toEqual(["settle_operation", "settle_operation"]);
    await expandReservation(operationId, BigInt(1500), rpc);
    expect(rpc.mock.calls[2][1]).toMatchObject({ p_additional_units: "1500" });
  });
  it("requires recorded evidence to reconcile ambiguous usage", async () => {
    const rpc = vi.fn<BillingRpc>().mockResolvedValue({ data: { ...operation, state: "settled", held_units: "0" }, error: null });
    expect(await reconcileOperation(operationId, [], rpc)).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    expect(await reconcileOperation(operationId, [{ attemptId, action: "record_usage", note: "provider log matched request", recordedBy: "operator" }], rpc))
      .toMatchObject({ ok: false, error: { code: "invalid_input" } });
    expect(rpc).not.toHaveBeenCalled();
    await reconcileOperation(operationId, [{ attemptId, action: "record_usage", note: "provider log matched request",
      recordedBy: "operator", usage: { inputTokens: 500, outputTokens: 100, cacheReadTokens: 0,
        cacheWriteTokens: 0, embeddingTokens: 0, successfulSearchCount: 0 } }], rpc);
    expect(rpc.mock.calls[0][0]).toBe("reconcile_operation");
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_evidence: [{ action: "record_usage", usage: { inputTokens: 500 } }] });
  });
  it("operation polling rejects a different selected identity before reading attempts", async () => {
    const attempts = vi.fn();
    dbState.client = { from: (table: string) => {
      if (table !== "operations") return attempts();
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: operation, error: null }) }) }) };
    } };
    const request = new Request(`https://local.example/api/operations/${operationId}`, { headers: { cookie: "bx-demo-identity=sam" } });
    const response = await GET(request, { params: Promise.resolve({ operationId }) } as RouteContext<"/api/operations/[operationId]">);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "not_owner" } });
    expect(attempts).not.toHaveBeenCalled();
    dbState.client = null;
  });
});
