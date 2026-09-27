import "server-only";
import { z } from "zod";
import type { ProviderLimits, ServiceResult, SourceLimits } from "@/lib/contracts/phase2";

type Environment = Record<string, string | undefined>;
const secret = z.string().trim().min(1);
const httpUrl = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
});
const integer = (fallback: number, maximum: number, minimum = 1) => z.coerce.number().int().min(minimum).max(maximum).default(fallback);
const domainList = z.string().default("").transform((value) => value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)).pipe(z.array(z.string().max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/)).max(100));
const databaseSchema = z.strictObject({ SUPABASE_URL: httpUrl, SUPABASE_SERVICE_ROLE_KEY: secret });
const anthropicSchema = z.strictObject({ ANTHROPIC_API_KEY: secret });
const voyageSchema = z.strictObject({ VOYAGE_API_KEY: secret });
const openaiSchema = z.strictObject({ OPENAI_API_KEY: secret });
const policySchema = z.strictObject({
  LLM_DAILY_SPEND_CAP_USD: z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,9})?$/).default("20"),
  LLM_PRICE_VERSION: z.string().min(1).max(100).default("2026-09-27-luna-v1"),
  LLM_PRICE_POLICY: z.enum(["standard"]).default("standard"),
  DEFAULT_AGENT_CATEGORY: z.enum(["health_pt", "tax_finance", "career_admissions"]).default("career_admissions"),
  SOURCE_MAX_COUNT: integer(10, 100), SOURCE_MAX_FILE_BYTES: integer(5 * 1024 * 1024, 5 * 1024 * 1024),
  SOURCE_MAX_AGENT_BYTES: integer(25 * 1024 * 1024, 1024 * 1024 * 1024), SOURCE_MAX_PDF_PAGES: integer(100, 1000),
  SOURCE_MAX_EXTRACTED_CHARS: integer(100_000, 1_000_000), SOURCE_MAX_ACTIVE_CHUNKS: integer(1000, 10_000),
  SOURCE_CHUNK_TARGET_CHARS: integer(2000, 10_000), SOURCE_CHUNK_OVERLAP_CHARS: integer(200, 2000, 0),
  SOURCE_PARSER_TIMEOUT_MS: integer(15_000, 60_000), SOURCE_PARSER_HEAP_MB: integer(128, 512, 32),
  SOURCE_MAX_DOCX_INFLATED_BYTES: integer(20 * 1024 * 1024, 100 * 1024 * 1024),
  LLM_MAX_INPUT_CHARS: integer(100_000, 1_000_000), LLM_MAX_HISTORY_MESSAGES: integer(20, 100),
  LLM_MAX_OUTPUT_TOKENS: integer(4096, 16_384), LLM_TIMEOUT_MS: integer(30_000, 120_000),
  LLM_MAX_CONTEXT_TOKENS: integer(200_000, 1_000_000), LLM_MAX_CONTINUATIONS: integer(3, 5, 0),
  WEB_MAX_SEARCHES: integer(1, 1, 0), WEB_MAX_FETCHES: integer(2, 2, 0),
  WEB_MAX_OUTPUT_TOKENS: integer(1200, 1200), WEB_FETCH_CONTENT_TOKENS: integer(4000, 4000),
  WEB_ALLOWED_DOMAINS: domainList, WEB_BLOCKED_DOMAINS: domainList,
});

/** Read only named keys; never expose Zod messages, values or raw environment data. */
function read<S extends z.ZodRawShape>(schema: z.ZodObject<S>, env: Environment): ServiceResult<z.output<z.ZodObject<S>>> {
  const selected = Object.fromEntries(Object.keys(schema.shape).map((key) => [key, env[key]?.trim() || undefined]));
  const parsed = schema.safeParse(selected);
  if (parsed.success) return { ok: true, data: parsed.data };
  const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))].sort();
  return configurationFailure(names);
}
function configurationFailure(names: string[]): { ok: false; error: { code: "configuration"; message: string; retryable: false } } {
  return { ok: false, error: { code: "configuration", message: `Configure server environment: ${names.join(", ")}.`, retryable: false } };
}
/** No reads occur at module import; missing services never select a mock adapter. */
export function getDatabaseEnv(env: Environment = process.env) { return read(databaseSchema, env); }
export function getAnthropicEnv(env: Environment = process.env) { return read(anthropicSchema, env); }
export function getVoyageEnv(env: Environment = process.env) { return read(voyageSchema, env); }
export function getOpenAIEnv(env: Environment = process.env) { return read(openaiSchema, env); }
export function getPolicyEnv(env: Environment = process.env) {
  const result = read(policySchema, env);
  if (!result.ok) return result;
  const p = result.data;
  if (p.SOURCE_CHUNK_OVERLAP_CHARS >= p.SOURCE_CHUNK_TARGET_CHARS) return configurationFailure(["SOURCE_CHUNK_OVERLAP_CHARS", "SOURCE_CHUNK_TARGET_CHARS"]);
  if (p.SOURCE_MAX_FILE_BYTES > p.SOURCE_MAX_AGENT_BYTES) return configurationFailure(["SOURCE_MAX_FILE_BYTES", "SOURCE_MAX_AGENT_BYTES"]);
  if (p.WEB_ALLOWED_DOMAINS.length && p.WEB_BLOCKED_DOMAINS.length) return configurationFailure(["WEB_ALLOWED_DOMAINS", "WEB_BLOCKED_DOMAINS"]);
  return result;
}
export function getServerEnv(env: Environment = process.env) {
  const database = getDatabaseEnv(env);
  const openai = getOpenAIEnv(env);
  const policy = getPolicyEnv(env);
  if (!database.ok) return database;
  if (!openai.ok) return openai;
  if (!policy.ok) return policy;
  return { ok: true as const, data: { ...database.data, ...openai.data, ...policy.data } };
}
export type PolicyEnv = z.output<typeof policySchema>;
export function sourceLimitsFromEnv(p: PolicyEnv): SourceLimits {
  return { maxSources: p.SOURCE_MAX_COUNT, maxFileBytes: p.SOURCE_MAX_FILE_BYTES, maxAgentBytes: p.SOURCE_MAX_AGENT_BYTES,
    maxPdfPages: p.SOURCE_MAX_PDF_PAGES, maxExtractedChars: p.SOURCE_MAX_EXTRACTED_CHARS, maxActiveChunks: p.SOURCE_MAX_ACTIVE_CHUNKS,
    chunkTargetChars: p.SOURCE_CHUNK_TARGET_CHARS, chunkOverlapChars: p.SOURCE_CHUNK_OVERLAP_CHARS,
    parserTimeoutMs: p.SOURCE_PARSER_TIMEOUT_MS, parserHeapMb: p.SOURCE_PARSER_HEAP_MB, maxDocxInflatedBytes: p.SOURCE_MAX_DOCX_INFLATED_BYTES };
}
export function providerLimitsFromEnv(p: PolicyEnv): ProviderLimits {
  return { maxInputChars: p.LLM_MAX_INPUT_CHARS, maxHistoryMessages: p.LLM_MAX_HISTORY_MESSAGES,
    maxOutputTokens: p.LLM_MAX_OUTPUT_TOKENS, timeoutMs: p.LLM_TIMEOUT_MS,
    maxContextTokens: p.LLM_MAX_CONTEXT_TOKENS, maxContinuations: p.LLM_MAX_CONTINUATIONS };
}
