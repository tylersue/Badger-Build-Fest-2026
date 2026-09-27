import "server-only";
import type { Operation, ProviderAttempt, ReconciliationEvidence, ReserveOperationInput, ServiceResult } from "@/lib/contracts/phase2";
import { getServiceDb } from "@/lib/server/db";
import { getPolicyEnv } from "@/lib/server/env";
import { PRICE_VERSION } from "./pricing";

type RpcError = { message: string; details?: string | null; code?: string };
export type BillingRpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }>;
const money = (value: bigint) => value.toString();
function capUnits(): ServiceResult<string> {
  const policy = getPolicyEnv();
  if (!policy.ok) return policy;
  const [whole, decimal = ""] = policy.data.LLM_DAILY_SPEND_CAP_USD.split(".");
  return { ok: true, data: (BigInt(whole) * BigInt("1000000000") + BigInt(decimal.padEnd(9, "0"))).toString() };
}
function rpcAdapter(): ServiceResult<BillingRpc> {
  const result = getServiceDb();
  if (!result.ok) return result;
  const db = result.data;
  const call = db.rpc as unknown as BillingRpc;
  return { ok: true, data: (name, args) => call.call(db, name, args) };
}
function failure(error: RpcError, operationId?: string): ServiceResult<never> {
  const match = error.message.match(/\b(INSUFFICIENT_CREDITS|DAILY_CAP|NOT_OWNER|CONFLICT|INVALID_INPUT|UNKNOWN_USAGE|INVALID_EVIDENCE|STALE_ESTIMATE)\b/);
  const code = error.code === "23505" ? "CONFLICT" : match?.[1];
  if (code === "INSUFFICIENT_CREDITS" || code === "DAILY_CAP") {
    const available = error.details?.match(/available=(\d+)/)?.[1];
    const needed = error.details?.match(/needed=(\d+)/)?.[1];
    return { ok: false, error: { code: code === "DAILY_CAP" ? "daily_cap" : "insufficient_credits",
      message: code === "DAILY_CAP" ? "Daily spending limit reached." : "Insufficient credits.",
      retryable: false, operationId, availableUnits: available, neededUnits: needed,
      resetAt: code === "DAILY_CAP" ? new Date(Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z") + 86_400_000).toISOString() : undefined } };
  }
  const mapped = code === "NOT_OWNER" ? "not_owner" : code === "CONFLICT" ? "conflict"
    : code === "UNKNOWN_USAGE" ? "unknown_usage" : code === "STALE_ESTIMATE" ? "stale_estimate"
    : code === "INVALID_INPUT" || code === "INVALID_EVIDENCE" ? "invalid_input" : "provider";
  return { ok: false, error: { code: mapped, message: mapped === "provider" ? "Billing operation failed." : "Billing request was rejected.",
    retryable: mapped === "provider", operationId } };
}
function parseMoney(value: unknown): string {
  if (typeof value === "string" && /^(0|[1-9]\d{0,18})$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new Error("Unsafe monetary response");
}
function parseOperation(data: unknown): Operation {
  if (!data || typeof data !== "object") throw new Error("Missing operation");
  const row = data as Record<string, unknown>;
  return { id: String(row.id), requestKey: String(row.request_key), identityId: String(row.identity_id),
    agentId: String(row.agent_id), purpose: row.purpose as Operation["purpose"], state: row.state as Operation["state"],
    estimateUnits: parseMoney(row.estimate_units), heldUnits: parseMoney(row.held_units),
    actualUnits: row.actual_units == null ? null : parseMoney(row.actual_units), priceVersion: String(row.price_version),
    payloadHash: String(row.payload_hash), createdAt: String(row.created_at),
    chatRateMultiplier: row.chat_rate_multiplier == null ? null : Number(row.chat_rate_multiplier) };
}
function parseAttempt(data: unknown): ProviderAttempt {
  if (!data || typeof data !== "object") throw new Error("Missing attempt");
  const row = data as Record<string, unknown>;
  return { id: String(row.id), operationId: String(row.operation_id), stageKey: String(row.stage_key),
    attempt: Number(row.attempt), provider: row.provider as ProviderAttempt["provider"], model: String(row.model),
    state: row.state as ProviderAttempt["state"], providerRequestId: row.provider_request_id as string | null,
    dispatchDay: row.dispatch_day as string | null, inputTokens: row.input_tokens as number | null,
    outputTokens: row.output_tokens as number | null, cacheReadTokens: row.cache_read_tokens as number | null,
    cacheWriteTokens: row.cache_write_tokens as number | null, embeddingTokens: row.embedding_tokens as number | null,
    successfulSearchCount: row.successful_search_count as number | null,
    grossCostUnits: row.gross_cost_units == null ? null : parseMoney(row.gross_cost_units),
    effectiveCostUnits: row.effective_cost_units == null ? null : parseMoney(row.effective_cost_units),
    latencyMs: row.latency_ms as number | null, requestMetadata: row.request_metadata as ProviderAttempt["requestMetadata"] };
}
function adapter(injected?: BillingRpc): ServiceResult<BillingRpc> { return injected ? { ok: true, data: injected } : rpcAdapter(); }
async function invoke<T>(rpc: BillingRpc, name: string, args: Record<string, unknown>, parse: (data: unknown) => T, operationId?: string): Promise<ServiceResult<T>> {
  try {
    const result = await rpc(name, args);
    if (result.error) return failure(result.error, operationId);
    return { ok: true, data: parse(result.data) };
  } catch {
    return { ok: false, error: { code: "provider", message: "Billing operation failed.", retryable: true, operationId } };
  }
}
function validReservation(input: ReserveOperationInput): boolean {
  return !!input.identityId && !!input.agentId && input.requestKey.length > 0 && input.requestKey.length <= 200
    && /^[a-f0-9]{64}$/.test(input.payloadHash) && input.priceVersion === PRICE_VERSION
    && input.estimateUnits >= BigInt("0") && input.maxUnits > BigInt("0") && input.estimateUnits <= input.maxUnits;
}
export async function reserveOperation(input: ReserveOperationInput, injected?: BillingRpc): Promise<ServiceResult<Operation>> {
  if (!validReservation(input)) return { ok: false, error: { code: "invalid_input", message: "Invalid reservation.", retryable: false } };
  const cap = capUnits(); if (!cap.ok) return cap;
  const db = adapter(injected); if (!db.ok) return db;
  return invoke(db.data, "reserve_operation", { p_id: `op_${crypto.randomUUID()}`, p_identity_id: input.identityId,
    p_agent_id: input.agentId, p_route: input.purpose, p_request_key: input.requestKey, p_payload_hash: input.payloadHash,
    p_purpose: input.purpose, p_estimate_units: money(input.estimateUnits), p_max_units: money(input.maxUnits),
    p_price_version: input.priceVersion, p_cap_units: cap.data }, parseOperation);
}
export async function expandReservation(operationId: string, additionalUnits: bigint, injected?: BillingRpc): Promise<ServiceResult<Operation>> {
  if (!operationId || additionalUnits <= BigInt("0")) return { ok: false, error: { code: "invalid_input", message: "Invalid expansion.", retryable: false } };
  const cap = capUnits(); if (!cap.ok) return cap;
  const db = adapter(injected); if (!db.ok) return db;
  return invoke(db.data, "expand_reservation", { p_operation_id: operationId, p_additional_units: money(additionalUnits),
    p_cap_units: cap.data }, parseOperation, operationId);
}
export type PreparedAttempt = ProviderAttempt & { heldUnits?: string };
export async function recordAttempt(attempt: PreparedAttempt, injected?: BillingRpc): Promise<ServiceResult<ProviderAttempt>> {
  const counts = [attempt.inputTokens, attempt.outputTokens, attempt.cacheReadTokens, attempt.cacheWriteTokens,
    attempt.embeddingTokens, attempt.successfulSearchCount, attempt.latencyMs];
  const completedCounts = counts.slice(0, 6);
  if (!/^att_[0-9a-f-]{36}$/.test(attempt.id) || !/^op_[0-9a-f-]{36}$/.test(attempt.operationId) ||
    !attempt.stageKey || attempt.stageKey.length > 120 || !Number.isSafeInteger(attempt.attempt) || attempt.attempt < 1 ||
    !["prepared","dispatched","completed","failed","unknown"].includes(attempt.state) ||
    !["anthropic","voyage","openai"].includes(attempt.provider) ||
    !Number.isSafeInteger(attempt.requestMetadata.inputChars) || attempt.requestMetadata.inputChars < 0 ||
    !Number.isSafeInteger(attempt.requestMetadata.maxOutputTokens) || attempt.requestMetadata.maxOutputTokens < 0 ||
    counts.some((value) => value !== null && (!Number.isSafeInteger(value) || value < 0)) ||
    (attempt.state === "completed" && completedCounts.some((value) => value === null)) ||
    (attempt.heldUnits !== undefined && !/^[1-9]\d{0,18}$/.test(attempt.heldUnits)))
    return { ok: false, error: { code: "invalid_input", message: "Invalid attempt.", retryable: false } };
  const cap = capUnits(); if (!cap.ok) return cap;
  const db = adapter(injected); if (!db.ok) return db;
  return invoke(db.data, "record_provider_attempt", { p_attempt: {
    id: attempt.id, operationId: attempt.operationId, stageKey: attempt.stageKey, attempt: attempt.attempt,
    provider: attempt.provider, model: attempt.model, state: attempt.state, heldUnits: attempt.heldUnits,
    providerRequestId: attempt.providerRequestId, inputTokens: attempt.inputTokens, outputTokens: attempt.outputTokens,
    cacheReadTokens: attempt.cacheReadTokens, cacheWriteTokens: attempt.cacheWriteTokens,
    embeddingTokens: attempt.embeddingTokens, successfulSearchCount: attempt.successfulSearchCount,
    latencyMs: attempt.latencyMs, requestMetadata: attempt.requestMetadata,
  }, p_cap_units: cap.data }, parseAttempt, attempt.operationId);
}
export async function settleOperation(operationId: string, injected?: BillingRpc): Promise<ServiceResult<Operation>> {
  const db = adapter(injected); if (!db.ok) return db;
  return invoke(db.data, "settle_operation", { p_operation_id: operationId }, parseOperation, operationId);
}
export async function reconcileOperation(operationId: string, evidence: ReconciliationEvidence[], injected?: BillingRpc): Promise<ServiceResult<Operation>> {
  const usageKeys = ["inputTokens","outputTokens","cacheReadTokens","cacheWriteTokens","embeddingTokens","successfulSearchCount"] as const;
  if (!operationId || evidence.length === 0 || evidence.some((item) => !item.attemptId || item.note.trim().length < 12
    || item.recordedBy.trim().length < 2 || (item.action === "record_usage" && !item.usage)
    || (item.action === "record_usage" && usageKeys.some((key) => !Number.isSafeInteger(item.usage?.[key]) || (item.usage?.[key] ?? -1) < 0))
    || !["prove_undispatched","record_usage"].includes(item.action)))
    return { ok: false, error: { code: "invalid_input", message: "Recorded operator evidence is required.", retryable: false } };
  const db = adapter(injected); if (!db.ok) return db;
  return invoke(db.data, "reconcile_operation", { p_operation_id: operationId, p_evidence: evidence }, parseOperation, operationId);
}

export async function grantMockCredits(identityId: string, kind: "subscription" | "pack", requestKey: string,
  injected?: BillingRpc): Promise<ServiceResult<{ balanceUnits: string; grantUnits: string; replayed: boolean }>> {
  if (!["maria","sam"].includes(identityId) || !requestKey || requestKey.length > 200)
    return { ok: false, error: { code: "invalid_input", message: "Invalid grant.", retryable: false } };
  const db = adapter(injected); if (!db.ok) return db;
  return invoke(db.data, "grant_mock_credits", { p_identity_id: identityId, p_kind: kind, p_request_key: requestKey },
    (data) => {
      const row = data as Record<string, unknown>;
      return { balanceUnits: parseMoney(row.balance_units), grantUnits: parseMoney(row.grant_units), replayed: row.replayed === true };
    });
}

export type OperationPoll = { operation: Operation; attempts: ProviderAttempt[];
  costEvents: { id: string; sequence: number; status: "settled" | "pending"; chargedUnits: string | null }[] };
/** The selected demo identity is checked before exposing cost state or event history. */
export async function getOperationForIdentity(operationId: string, identityId: string): Promise<ServiceResult<OperationPoll>> {
  if (!/^op_[0-9a-f-]{36}$/.test(operationId)) return { ok: false, error: { code: "invalid_input", message: "Invalid operation ID.", retryable: false } };
  const result = getServiceDb(); if (!result.ok) return result;
  const db = result.data;
  const { data: row, error } = await db.from("operations").select("*").eq("id", operationId).maybeSingle();
  if (error) return { ok: false, error: { code: "provider", message: "Operation lookup failed.", retryable: true } };
  if (!row || row.identity_id !== identityId) return { ok: false, error: { code: "not_owner", message: "Operation is unavailable.", retryable: false } };
  const [attemptsResult, eventsResult] = await Promise.all([
    db.from("provider_attempts").select("*").eq("operation_id", operationId).order("created_at"),
    db.from("message_events").select("id,sequence,type,payload").eq("operation_id", operationId).eq("type", "cost").order("sequence"),
  ]);
  if (attemptsResult.error || eventsResult.error) return { ok: false, error: { code: "provider", message: "Operation lookup failed.", retryable: true } };
  try {
    const costEvents = (eventsResult.data ?? []).map((event) => {
      const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? event.payload as Record<string, unknown> : {};
      return { id: event.id, sequence: event.sequence, status: payload.status === "settled" ? "settled" as const : "pending" as const,
        chargedUnits: payload.chargedUnits == null ? null : parseMoney(payload.chargedUnits) };
    });
    return { ok: true, data: { operation: parseOperation(row), attempts: (attemptsResult.data ?? []).map(parseAttempt), costEvents } };
  } catch {
    return { ok: false, error: { code: "provider", message: "Unsafe monetary response.", retryable: false } };
  }
}
