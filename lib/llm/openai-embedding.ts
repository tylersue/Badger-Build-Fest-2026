import "server-only";
import type { EmbedTextsInput, ServiceResult } from "@/lib/contracts/phase2";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/config/models";
import { getOpenAIEnv } from "@/lib/server/env";
import { PRICING_UNITS_PER_MTOK } from "@/features/billing/pricing";
import { runMeteredStage, type GatewayDependencies, type MeteredResult } from "./gateway";

const ENDPOINT = "https://api.openai.com/v1/embeddings";
const MAX_BATCH = 32;
const MAX_CONTEXT_BYTES = 32_000;
const MAX_ITEM_BYTES = 8191;
export type OpenAIEmbeddingAdapter = { embed(texts: string[]): Promise<unknown> };
export type EmbeddingDependencies = GatewayDependencies & { openaiEmbedding?: OpenAIEmbeddingAdapter; fetch?: typeof fetch };

function liveEmbedding(fetcher: typeof fetch = fetch): ServiceResult<OpenAIEmbeddingAdapter> {
  const env = getOpenAIEnv();
  if (!env.ok) return env;
  return { ok: true, data: { async embed(texts) {
    const response = await fetcher(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json",
      Authorization: `Bearer ${env.data.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS,
        encoding_format: "float" }) });
    if (!response.ok) throw new Error("OpenAI embedding request failed");
    return response.json();
  } } };
}

function parsePayload(payload: unknown, expected: number): { vectors: number[][]; tokens: number; requestId: string | null } | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (row.model !== EMBEDDING_MODEL || !Array.isArray(row.data) || row.data.length !== expected) return null;
  const usage = row.usage as Record<string, unknown> | undefined;
  const tokens = usage?.total_tokens;
  if (!Number.isSafeInteger(tokens) || (tokens as number) < 0) return null;
  const vectors: number[][] = Array.from({ length: expected });
  for (const item of row.data) {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    if (!Number.isSafeInteger(entry.index) || (entry.index as number) < 0 || (entry.index as number) >= expected || vectors[entry.index as number]) return null;
    if (!Array.isArray(entry.embedding) || entry.embedding.length !== EMBEDDING_DIMENSIONS ||
      !entry.embedding.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
    vectors[entry.index as number] = entry.embedding as number[];
  }
  if (vectors.some((vector) => !vector)) return null;
  return { vectors, tokens: tokens as number, requestId: typeof row.id === "string" ? row.id : null };
}

/** Reserve before dispatch; malformed vectors with known token usage still settle. */
export async function embedTexts(input: EmbedTextsInput, options: { settle?: boolean } = {},
  deps: EmbeddingDependencies = {}): Promise<ServiceResult<MeteredResult<number[][]>>> {
  const { texts, inputType } = input;
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > MAX_BATCH ||
    (inputType !== "document" && inputType !== "query") || (inputType === "query" && texts.length !== 1) ||
    texts.some((text) => typeof text !== "string" || !text.trim() || Buffer.byteLength(text, "utf8") > MAX_ITEM_BYTES) ||
    texts.reduce((total, text) => total + Buffer.byteLength(text, "utf8"), 0) > MAX_CONTEXT_BYTES)
    return { ok: false, error: { code: "invalid_input", message: "Embedding batch exceeds provider bounds.", retryable: false,
      operationId: input.operation.id } };
  const adapter = deps.openaiEmbedding ? { ok: true as const, data: deps.openaiEmbedding } : liveEmbedding(deps.fetch);
  if (!adapter.ok) return adapter;
  const rate = PRICING_UNITS_PER_MTOK[EMBEDDING_MODEL].embedding;
  const holdUnits = (BigInt(MAX_CONTEXT_BYTES) * rate + BigInt(999999)) / BigInt(1000000);
  const result = await runMeteredStage({ operation: input.operation, stageKey: input.stageKey, provider: "openai",
    model: EMBEDDING_MODEL, inputChars: texts.join("").length, maxOutputTokens: 0, holdUnits,
    settle: options.settle }, async () => {
      const raw = await adapter.data.embed(texts);
      const parsed = parsePayload(raw, texts.length);
      if (!parsed) {
        const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
        const token = row.usage && typeof row.usage === "object" ? (row.usage as Record<string, unknown>).total_tokens : undefined;
        return { value: null, usage: Number.isSafeInteger(token) && (token as number) >= 0 ? {
          inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
          embeddingTokens: token as number, successfulSearchCount: 0 } : null,
          providerRequestId: typeof row.id === "string" ? row.id : null };
      }
      return { value: parsed.vectors, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0,
        cacheWriteTokens: 0, embeddingTokens: parsed.tokens, successfulSearchCount: 0 },
        providerRequestId: parsed.requestId };
    }, deps);
  if (!result.ok) return result;
  if (!result.data.value) return { ok: false, error: { code: "provider", message: "Invalid embedding response.",
    retryable: false, operationId: input.operation.id } };
  return result as ServiceResult<MeteredResult<number[][]>>;
}
