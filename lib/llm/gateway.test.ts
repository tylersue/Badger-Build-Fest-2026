import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { z } from "zod";
import { PRICE_VERSION } from "@/features/billing/pricing";
import type { Operation, ProviderLimits } from "@/lib/contracts/phase2";
import type { BillingRpc } from "@/features/billing/service";
import { meteredStructured, meteredStream, normalizeUsage, runMeteredStage } from "./gateway";
import type { AnthropicAdapter } from "./anthropic";

const op: Operation = { id: "op_11111111-1111-4111-8111-111111111111", identityId: "maria", agentId: "agent-1",
  purpose: "interview", requestKey: "turn-1", payloadHash: "a".repeat(64), state: "reserved",
  estimateUnits: "100", heldUnits: "1000000000", actualUnits: null, priceVersion: PRICE_VERSION,
  createdAt: "2026-09-27T00:00:00Z" };
const limits: ProviderLimits = { maxInputChars: 10000, maxHistoryMessages: 20, maxOutputTokens: 100,
  timeoutMs: 30000, maxContextTokens: 1000, maxContinuations: 0 };
const usage = { inputTokens: 12, outputTokens: 4, cacheReadTokens: 3, cacheWriteTokens: 2,
  embeddingTokens: 0, successfulSearchCount: 1 };
function billing(log: string[], error?: string): BillingRpc {
  return async (name, args) => {
    log.push(name);
    if (error && name === "record_provider_attempt" && (args.p_attempt as { state: string }).state === "prepared")
      return { data: null, error: { message: error } };
    if (name === "record_provider_attempt") {
      const row = args.p_attempt as Record<string, unknown>;
      return { data: { id: row.id, operation_id: row.operationId, stage_key: row.stageKey, attempt: row.attempt,
        provider: row.provider, model: row.model, state: row.state, provider_request_id: row.providerRequestId,
        dispatch_day: "2026-09-27", input_tokens: row.inputTokens, output_tokens: row.outputTokens,
        cache_read_tokens: row.cacheReadTokens, cache_write_tokens: row.cacheWriteTokens,
        embedding_tokens: row.embeddingTokens, successful_search_count: row.successfulSearchCount,
        gross_cost_units: "100", effective_cost_units: "100", latency_ms: row.latencyMs,
        request_metadata: row.requestMetadata }, error: null };
    }
    return { data: { id: op.id, identity_id: op.identityId, agent_id: op.agentId, request_key: op.requestKey,
      purpose: op.purpose, state: name === "settle_operation" ? "settled" : "reserved", estimate_units: "100",
      held_units: name === "settle_operation" ? "0" : "1000000000", actual_units: "100", price_version: PRICE_VERSION,
      payload_hash: op.payloadHash, created_at: op.createdAt }, error: null };
  };
}

describe("metered provider gateway", () => {
  it("normalizes per-step usage without counting cumulative totals twice", () => {
    const step = { inputTokens: 10, outputTokens: 4, inputTokenDetails: { noCacheTokens: 5,
      cacheReadTokens: 3, cacheWriteTokens: 2 } };
    expect(normalizeUsage([step, step], 1)).toEqual({ inputTokens: 10, outputTokens: 8,
      cacheReadTokens: 6, cacheWriteTokens: 4, embeddingTokens: 0, successfulSearchCount: 1 });
    expect(normalizeUsage([{ inputTokens: undefined, outputTokens: 1, inputTokenDetails: {
      noCacheTokens: undefined, cacheReadTokens: 0, cacheWriteTokens: 0 } }])).toBeNull();
  });
  it("journals and holds before network, then records cache and search cost", async () => {
    const log: string[] = [];
    const result = await runMeteredStage({ operation: op, stageKey: "web", provider: "anthropic", model: "claude-sonnet-5",
      inputChars: 20, maxOutputTokens: 100, holdUnits: BigInt(1_000_000), settle: false },
      async () => { log.push("network"); return { value: "answer", usage, providerRequestId: "req-1" }; }, { billing: billing(log) });
    expect(result.ok).toBe(true);
    expect(log).toEqual(["record_provider_attempt", "record_provider_attempt", "network", "record_provider_attempt"]);
    if (result.ok) {
      expect(result.data.price.grossUnits).toBeGreaterThan(BigInt(10_000_000));
      expect(result.data.attempt.providerRequestId).toBe("req-1");
    }
  });
  it("refuses precheck before network and retains a lost-usage hold", async () => {
    const denied: string[] = [];
    const run = vi.fn(async () => ({ value: "ignored", usage, providerRequestId: null }));
    const refused = await runMeteredStage({ operation: op, stageKey: "deny", provider: "anthropic", model: "claude-sonnet-5",
      inputChars: 1, maxOutputTokens: 1, holdUnits: BigInt(100) }, run,
      { billing: billing(denied, "DAILY_CAP") });
    expect(refused).toMatchObject({ ok: false, error: { code: "daily_cap" } });
    expect(run).not.toHaveBeenCalled();
    const log: string[] = [];
    const unknown = await runMeteredStage({ operation: op, stageKey: "lost", provider: "anthropic", model: "claude-sonnet-5",
      inputChars: 1, maxOutputTokens: 1, holdUnits: BigInt(100) },
      async () => { throw new Error("connection lost"); }, { billing: billing(log) });
    expect(unknown).toMatchObject({ ok: false, error: { code: "unknown_usage" } });
    expect(log).toEqual(["record_provider_attempt", "record_provider_attempt", "record_provider_attempt", "settle_operation"]);
  });
  it("expands only the missing stage allocation before dispatch", async () => {
    const log: string[] = [];
    const normal = billing(log);
    let first = true;
    let expandedBy: unknown;
    const rpc: BillingRpc = async (name, args) => {
      if (name === "record_provider_attempt" && (args.p_attempt as { state: string }).state === "prepared" && first) {
        first = false;
        log.push(name);
        return { data: null, error: { message: "INSUFFICIENT_CREDITS", details: "available=300 needed=700" } };
      }
      if (name === "expand_reservation") expandedBy = args.p_additional_units;
      return normal(name, args);
    };
    const network = vi.fn(async () => ({ value: "ok", usage, providerRequestId: "req-expand" }));
    const result = await runMeteredStage({ operation: op, stageKey: "second", provider: "anthropic",
      model: "claude-sonnet-5", inputChars: 20, maxOutputTokens: 100, holdUnits: BigInt(700), settle: false },
      network, { billing: rpc });
    expect(result.ok).toBe(true);
    expect(log.slice(0, 4)).toEqual(["record_provider_attempt", "expand_reservation", "record_provider_attempt", "record_provider_attempt"]);
    expect(expandedBy).toBe("400");
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("charges a malformed structured response before returning a typed failure", async () => {
    const log: string[] = [];
    const adapter: AnthropicAdapter = { structured: async () => ({ value: { answer: 42 }, steps: [{ inputTokens: 10,
      outputTokens: 5, inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 } }],
      providerRequestId: "req-2", successfulSearchCount: 0 }), stream: vi.fn() };
    const result = await meteredStructured({ operation: op, stageKey: "question", model: "claude-haiku-4-5",
      instructions: "Instructions", input: "Input", schema: z.object({ answer: z.string() }), limits },
      {}, { billing: billing(log), anthropic: adapter });
    expect(result).toMatchObject({ ok: false, error: { code: "provider" } });
    expect(log.at(-1)).toBe("settle_operation");
  });
  it("settles measured usage from a partial provider failure", async () => {
    const log: string[] = [];
    const adapter: AnthropicAdapter = { structured: vi.fn(), stream: async () => ({ value: "partial",
      steps: [{ inputTokens: 10, outputTokens: 3, inputTokenDetails: { noCacheTokens: 10,
        cacheReadTokens: 0, cacheWriteTokens: 0 } }], providerRequestId: "req-partial",
      successfulSearchCount: 0, failed: true }) };
    const result = await meteredStream({ operation: op, stageKey: "partial", model: "claude-sonnet-5",
      instructions: "rules", input: "question", limits }, {}, { billing: billing(log), anthropic: adapter });
    expect(result).toMatchObject({ ok: false, error: { code: "provider" } });
    expect(log).toEqual(["record_provider_attempt", "record_provider_attempt", "record_provider_attempt", "settle_operation"]);
  });
  it("streams with explicit adapter and blocks an oversized envelope", async () => {
    const adapter: AnthropicAdapter = { structured: vi.fn(), stream: async () => ({ value: "hello",
      steps: [{ inputTokens: 1, outputTokens: 2, inputTokenDetails: { noCacheTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 } }],
      providerRequestId: "req-3", successfulSearchCount: 0 }) };
    const events: string[] = [];
    const result = await meteredStream({ operation: op, stageKey: "synthesis", model: "claude-sonnet-5",
      instructions: "rules", input: "question", limits },
      { onEvent: () => { events.push("event"); } }, { billing: billing([]), anthropic: adapter });
    expect(result).toMatchObject({ ok: true, data: { value: "hello" } });
    const oversized = await meteredStream({ operation: op, stageKey: "oversized", model: "claude-sonnet-5",
      instructions: "x".repeat(1001), input: "", limits }, {}, { billing: billing([]), anthropic: adapter });
    expect(oversized).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    expect(events).toEqual([]);
  });
});
