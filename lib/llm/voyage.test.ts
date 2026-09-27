import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { BillingRpc } from "@/features/billing/service";
import { PRICE_VERSION } from "@/features/billing/pricing";
import type { Operation } from "@/lib/contracts/phase2";
import { embedTexts } from "./voyage";

const op: Operation = { id: "op_11111111-1111-4111-8111-111111111111", identityId: "maria", agentId: "agent-1",
  purpose: "embedding", requestKey: "index-1", payloadHash: "a".repeat(64), state: "reserved",
  estimateUnits: "100", heldUnits: "1000000000", actualUnits: null, priceVersion: PRICE_VERSION,
  createdAt: "2026-09-27T00:00:00Z" };
const payload = (n: number, tokens: unknown = 12) => ({ id: "voy-req-1", model: "voyage-4-lite",
  data: Array.from({ length: n }, (_, index) => ({ index, embedding: Array(1024).fill(index + 0.1) })),
  usage: { total_tokens: tokens } });
function billing(log: string[], rejectReplay = false): BillingRpc {
  const stages = new Set<string>();
  return async (name, args) => {
    log.push(name);
    if (name === "record_provider_attempt") {
      const row = args.p_attempt as Record<string, unknown>;
      if (row.state === "prepared") {
        if (rejectReplay && stages.has(row.stageKey as string)) return { data: null, error: { message: "CONFLICT" } };
        stages.add(row.stageKey as string);
      }
      return { data: { id: row.id, operation_id: row.operationId, stage_key: row.stageKey, attempt: row.attempt,
        provider: row.provider, model: row.model, state: row.state, provider_request_id: row.providerRequestId,
        dispatch_day: "2026-09-27", input_tokens: row.inputTokens, output_tokens: row.outputTokens,
        cache_read_tokens: row.cacheReadTokens, cache_write_tokens: row.cacheWriteTokens,
        embedding_tokens: row.embeddingTokens, successful_search_count: row.successfulSearchCount,
        gross_cost_units: "1", effective_cost_units: "1", latency_ms: row.latencyMs,
        request_metadata: row.requestMetadata }, error: null };
    }
    return { data: { id: op.id, identity_id: op.identityId, agent_id: op.agentId, request_key: op.requestKey,
      purpose: op.purpose, state: "settled", estimate_units: "100", held_units: "0", actual_units: "1",
      price_version: PRICE_VERSION, payload_hash: op.payloadHash, created_at: op.createdAt }, error: null };
  };
}
afterEach(() => { delete process.env.VOYAGE_API_KEY; });

describe("Voyage embedding adapter", () => {
  it("sends bounded document and query REST requests with actual token usage", async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    const requests: Record<string, unknown>[] = [];
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      requests.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify(payload((requests.at(-1)?.input as string[]).length)), { status: 200 });
    }) as unknown as typeof fetch;
    const document = await embedTexts({ operation: op, stageKey: "doc-1", texts: ["first", "second"], inputType: "document" },
      { settle: false }, { billing: billing([]), fetch: fetcher });
    const query = await embedTexts({ operation: op, stageKey: "query-1", texts: ["question"], inputType: "query" },
      {}, { billing: billing([]), fetch: fetcher });
    expect(document).toMatchObject({ ok: true, data: { usage: { embeddingTokens: 12 }, attempt: { providerRequestId: "voy-req-1" } } });
    expect(query).toMatchObject({ ok: true, data: { value: [expect.any(Array)] } });
    expect(requests).toEqual([
      { input: ["first", "second"], model: "voyage-4-lite", input_type: "document", output_dimension: 1024, truncation: false },
      { input: ["question"], model: "voyage-4-lite", input_type: "query", output_dimension: 1024, truncation: false },
    ]);
    expect(fetcher).toHaveBeenCalledWith("https://api.voyageai.com/v1/embeddings", expect.objectContaining({ method: "POST" }));
  });
  it("charges reported tokens on malformed vectors and holds ambiguous usage", async () => {
    const malformed = payload(1);
    malformed.data[0].embedding.pop();
    const log: string[] = [];
    const vector = await embedTexts({ operation: op, stageKey: "bad-vector", texts: ["hello"], inputType: "document" },
      {}, { billing: billing(log), voyage: { embed: async () => malformed } });
    expect(vector).toMatchObject({ ok: false, error: { code: "provider" } });
    expect(log.at(-1)).toBe("settle_operation");
    const unknown = await embedTexts({ operation: op, stageKey: "bad-usage", texts: ["hello"], inputType: "document" },
      {}, { billing: billing([]), voyage: { embed: async () => payload(1, null) } });
    expect(unknown).toMatchObject({ ok: false, error: { code: "unknown_usage" } });
  });
  it("rejects replay and disabled configuration before network", async () => {
    const log: string[] = [];
    const rpc = billing(log, true);
    const adapter = { embed: vi.fn(async () => payload(1)) };
    const input = { operation: op, stageKey: "same-stage", texts: ["hello"], inputType: "document" as const };
    expect((await embedTexts(input, { settle: false }, { billing: rpc, voyage: adapter })).ok).toBe(true);
    expect(await embedTexts(input, { settle: false }, { billing: rpc, voyage: adapter }))
      .toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(adapter.embed).toHaveBeenCalledTimes(1);
    delete process.env.VOYAGE_API_KEY;
    const fetcher = vi.fn();
    expect(await embedTexts({ ...input, stageKey: "disabled" }, {}, { billing: rpc, fetch: fetcher as unknown as typeof fetch }))
      .toMatchObject({ ok: false, error: { code: "configuration" } });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await embedTexts({ ...input, stageKey: "oversized", texts: ["x".repeat(32_001)] },
      {}, { billing: rpc, voyage: adapter })).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
});
