import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { BillingRpc } from "@/features/billing/service";
import { PRICE_VERSION } from "@/features/billing/pricing";
import type { Operation } from "@/lib/contracts/phase2";
import { embedTexts } from "./openai-embedding";

const operation: Operation = { id: "op_11111111-1111-4111-8111-111111111111", identityId: "maria", agentId: "agent-1",
  purpose: "embedding", requestKey: "index-1", payloadHash: "a".repeat(64), state: "reserved",
  estimateUnits: "100", heldUnits: "1000000000", actualUnits: null, priceVersion: PRICE_VERSION,
  createdAt: "2026-09-27T00:00:00Z" };
const payload = (tokens: unknown = 12) => ({ model: "text-embedding-3-small", data: [
  { index: 0, embedding: Array(1024).fill(0.25) }], usage: { total_tokens: tokens } });
function billing(states: string[]): BillingRpc {
  return async (name, args) => {
    if (name === "record_provider_attempt") {
      const row = args.p_attempt as Record<string, unknown>;
      states.push(String(row.state));
      return { data: { id: row.id, operation_id: row.operationId, stage_key: row.stageKey, attempt: row.attempt,
        provider: row.provider, model: row.model, state: row.state, provider_request_id: row.providerRequestId,
        dispatch_day: "2026-09-27", input_tokens: row.inputTokens, output_tokens: row.outputTokens,
        cache_read_tokens: row.cacheReadTokens, cache_write_tokens: row.cacheWriteTokens,
        embedding_tokens: row.embeddingTokens, successful_search_count: row.successfulSearchCount,
        gross_cost_units: "240", effective_cost_units: "240", latency_ms: row.latencyMs,
        request_metadata: row.requestMetadata }, error: null };
    }
    return { data: { id: operation.id, identity_id: operation.identityId, agent_id: operation.agentId,
      request_key: operation.requestKey, purpose: operation.purpose, state: "settled", estimate_units: "100",
      held_units: "0", actual_units: "240", price_version: PRICE_VERSION, payload_hash: operation.payloadHash,
      created_at: operation.createdAt }, error: null };
  };
}
afterEach(() => { delete process.env.OPENAI_API_KEY; });

describe("OpenAI embedding adapter", () => {
  it("uses the OpenAI key and requests a 1024 dimension vector after a durable hold", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const states: string[] = [];
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(states).toEqual(["prepared", "dispatched"]);
      expect(init?.headers).toMatchObject({ Authorization: "Bearer test-key" });
      expect(JSON.parse(init?.body as string)).toEqual({ input: ["question"], model: "text-embedding-3-small",
        dimensions: 1024, encoding_format: "float" });
      return new Response(JSON.stringify(payload()), { status: 200 });
    }) as unknown as typeof fetch;
    const result = await embedTexts({ operation, stageKey: "query-1", texts: ["question"], inputType: "query" },
      {}, { billing: billing(states), fetch: fetcher });
    expect(result).toMatchObject({ ok: true, data: { usage: { embeddingTokens: 12 },
      attempt: { provider: "openai", model: "text-embedding-3-small" } } });
    expect(states).toEqual(["prepared", "dispatched", "completed"]);
    expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/embeddings", expect.any(Object));
  });
  it("holds missing usage and settles known usage even when vectors are malformed", async () => {
    const known = payload(); known.data[0].embedding.pop();
    const states: string[] = [];
    expect(await embedTexts({ operation, stageKey: "bad-vector", texts: ["question"], inputType: "query" },
      {}, { billing: billing(states), openaiEmbedding: { embed: async () => known } }))
      .toMatchObject({ ok: false, error: { code: "provider" } });
    expect(states).toEqual(["prepared", "dispatched", "completed"]);
    const unknown: string[] = [];
    expect(await embedTexts({ operation, stageKey: "bad-usage", texts: ["question"], inputType: "query" },
      {}, { billing: billing(unknown), openaiEmbedding: { embed: async () => payload(null) } }))
      .toMatchObject({ ok: false, error: { code: "unknown_usage" } });
    expect(unknown).toEqual(["prepared", "dispatched", "unknown"]);
    expect(await embedTexts({ operation, stageKey: "too-large", texts: ["x".repeat(8192)], inputType: "query" },
      {}, { billing: billing([]), openaiEmbedding: { embed: async () => payload() } }))
      .toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
});
