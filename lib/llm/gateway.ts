import "server-only";
import type { MeteredStreamInput, MeteredStructuredInput, Operation, ProviderAttempt, ServiceResult } from "@/lib/contracts/phase2";
import { expandReservation, recordAttempt, settleOperation, type BillingRpc } from "@/features/billing/service";
import { PRICE_VERSION, PRICING_UNITS_PER_MTOK, SEARCH_FEE_UNITS, priceUsage } from "@/features/billing/pricing";
import type { ModelId } from "@/lib/config/models";
import { anthropicAdapter, type AnthropicAdapter, type AnthropicEvent, type AnthropicResponse, type ProviderUsage } from "./anthropic";

export type GatewayDependencies = { billing?: BillingRpc; anthropic?: AnthropicAdapter };
export type MeteredOptions = { settle?: boolean; web?: boolean; onEvent?: (event: AnthropicEvent) => Promise<void> | void };
type Counts = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; embeddingTokens: number; successfulSearchCount: number };
export type MeteredResult<T> = { value: T; attempt: ProviderAttempt; operation: Operation; usage: Counts; price: ReturnType<typeof priceUsage> };
const fail = (code: "invalid_input" | "configuration" | "provider" | "unknown_usage", message: string, operationId?: string): ServiceResult<never> =>
  ({ ok: false, error: { code, message, retryable: code === "provider" || code === "unknown_usage", operationId } });
const validCount = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;

/** AI SDK total input includes cache buckets. Preserve only uncached tokens in the base input rate. */
export function normalizeUsage(steps: ProviderUsage[], searches = 0): Counts | null {
  if (!steps.length || !validCount(searches)) return null;
  const result: Counts = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, embeddingTokens: 0, successfulSearchCount: searches };
  for (const usage of steps) {
    const read = usage.inputTokenDetails?.cacheReadTokens ?? 0;
    const write = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
    const total = usage.inputTokens;
    const direct = usage.inputTokenDetails?.noCacheTokens;
    const uncached = direct ?? (total === undefined ? undefined : total - read - write);
    if (![read, write, uncached, usage.outputTokens].every(validCount) ||
      (total !== undefined && (!validCount(total) || (uncached as number) + read + write > total))) return null;
    result.inputTokens += uncached as number;
    result.outputTokens += usage.outputTokens as number;
    result.cacheReadTokens += read;
    result.cacheWriteTokens += write;
  }
  return Object.values(result).every(validCount) ? result : null;
}

export type StageInput = { operation: Operation; stageKey: string; provider: "anthropic" | "voyage"; model: ModelId | "voyage-4-lite";
  inputChars: number; maxOutputTokens: number; holdUnits: bigint; settle?: boolean };
export type StageOutput<T> = { value: T; usage: Counts | null; providerRequestId?: string | null };

/** A prepared and dispatched attempt is durable before any provider bytes leave this process. */
export async function runMeteredStage<T>(input: StageInput, dispatch: () => Promise<StageOutput<T>>,
  deps: GatewayDependencies = {}): Promise<ServiceResult<MeteredResult<T>>> {
  const { operation, stageKey, model, provider, holdUnits } = input;
  if (!/^op_[0-9a-f-]{36}$/.test(operation.id) || operation.priceVersion !== PRICE_VERSION ||
    operation.state === "settled" || operation.state === "cancelled" || !stageKey || stageKey.length > 120 ||
    !validCount(input.inputChars) || !validCount(input.maxOutputTokens) || holdUnits <= BigInt(0) || holdUnits > BigInt("9223372036854775807"))
    return fail("invalid_input", "Invalid metered stage.", operation.id);
  const billing = deps.billing;
  const base: ProviderAttempt & { heldUnits: string } = {
    id: `att_${crypto.randomUUID()}`, operationId: operation.id, stageKey, attempt: 1, provider, model,
    state: "prepared", providerRequestId: null, dispatchDay: null, inputTokens: null, outputTokens: null,
    cacheReadTokens: null, cacheWriteTokens: null, embeddingTokens: null, successfulSearchCount: null,
    grossCostUnits: null, effectiveCostUnits: null, latencyMs: null,
    requestMetadata: { inputChars: input.inputChars, maxOutputTokens: input.maxOutputTokens }, heldUnits: holdUnits.toString(),
  };
  let prepared = await recordAttempt(base, billing);
  if (!prepared.ok && prepared.error.code === "insufficient_credits") {
    const expanded = await expandReservation(operation.id, holdUnits, billing);
    if (!expanded.ok) return expanded;
    prepared = await recordAttempt(base, billing);
  }
  if (!prepared.ok) return prepared;
  const dispatched = await recordAttempt({ ...base, state: "dispatched" }, billing);
  if (!dispatched.ok) {
    await recordAttempt({ ...base, state: "failed" }, billing);
    if (input.settle !== false) await settleOperation(operation.id, billing);
    return dispatched;
  }
  const started = performance.now();
  let response: StageOutput<T>;
  try { response = await dispatch(); }
  catch {
    await recordAttempt({ ...base, state: "unknown", latencyMs: Math.round(performance.now() - started) }, billing);
    if (input.settle !== false) await settleOperation(operation.id, billing);
    return fail("unknown_usage", "Provider result could not be reconciled; the hold remains pending.", operation.id);
  }
  if (!response.usage || !Object.values(response.usage).every(validCount)) {
    await recordAttempt({ ...base, state: "unknown", providerRequestId: response.providerRequestId ?? null,
      latencyMs: Math.round(performance.now() - started) }, billing);
    if (input.settle !== false) await settleOperation(operation.id, billing);
    return fail("unknown_usage", "Provider usage is incomplete; the hold remains pending.", operation.id);
  }
  const usage = response.usage;
  const price = priceUsage({ model, tokensIn: usage.inputTokens, tokensOut: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens, cacheWriteTokens: usage.cacheWriteTokens,
    embeddingTokens: usage.embeddingTokens, successfulSearchCount: usage.successfulSearchCount });
  const completed = await recordAttempt({ ...base, state: "completed", providerRequestId: response.providerRequestId ?? null,
    ...usage, latencyMs: Math.round(performance.now() - started) }, billing);
  if (!completed.ok) {
    await recordAttempt({ ...base, state: "unknown", providerRequestId: response.providerRequestId ?? null }, billing);
    if (input.settle !== false) await settleOperation(operation.id, billing);
    return fail("unknown_usage", "Usage recording failed; the hold remains pending.", operation.id);
  }
  const settled = input.settle === false ? { ok: true as const, data: operation } : await settleOperation(operation.id, billing);
  if (!settled.ok) return settled;
  return { ok: true, data: { value: response.value, attempt: completed.data, operation: settled.data, usage, price } };
}

function bound(input: MeteredStreamInput, web: boolean): bigint | null {
  const { limits, instructions, input: prompt, model } = input;
  if (!(model in PRICING_UNITS_PER_MTOK) || model === "voyage-4-lite" ||
    !Number.isSafeInteger(limits.maxInputChars) || !Number.isSafeInteger(limits.maxOutputTokens) ||
    !Number.isSafeInteger(limits.maxContextTokens) || !Number.isSafeInteger(limits.timeoutMs) ||
    limits.timeoutMs < 1 || limits.maxOutputTokens < 1 || limits.maxContextTokens < 1 ||
    instructions.length + prompt.length > limits.maxInputChars ||
    Buffer.byteLength(instructions + prompt, "utf8") > limits.maxContextTokens) return null;
  const rate = PRICING_UNITS_PER_MTOK[model as ModelId];
  const inputRate = rate.input > rate.cacheWrite ? rate.input : rate.cacheWrite;
  const numerator = BigInt(limits.maxContextTokens) * inputRate + BigInt(limits.maxOutputTokens) * rate.output;
  return (numerator + BigInt(999999)) / BigInt(1000000) + (web ? SEARCH_FEE_UNITS : BigInt(0));
}
async function call<T>(input: MeteredStreamInput, mode: "structured" | "stream", schema: MeteredStructuredInput<T>["schema"] | undefined,
  options: MeteredOptions = {}, deps: GatewayDependencies = {}): Promise<ServiceResult<MeteredResult<T | string>>> {
  const hold = bound(input, options.web === true);
  if (hold === null) return fail("invalid_input", "Provider envelope exceeds configured limits.", input.operation.id);
  const adapter: ServiceResult<AnthropicAdapter> = deps.anthropic ? { ok: true, data: deps.anthropic } : anthropicAdapter();
  if (!adapter.ok) return adapter;
  const result = await runMeteredStage({ operation: input.operation, stageKey: input.stageKey, provider: "anthropic",
    model: input.model as ModelId, inputChars: input.instructions.length + input.input.length,
    maxOutputTokens: input.limits.maxOutputTokens, holdUnits: hold, settle: options.settle }, async () => {
      const response: AnthropicResponse = mode === "structured"
        ? await adapter.data.structured({ ...input, schema: schema! }, schema!)
        : await adapter.data.stream(input, { web: options.web === true, onEvent: options.onEvent });
      const usage = normalizeUsage(response.steps, response.successfulSearchCount);
      if (!usage) return { value: response.value, usage: null, providerRequestId: response.providerRequestId };
      return { value: response.value, usage, providerRequestId: response.providerRequestId };
    }, deps);
  if (!result.ok) return result;
  if (mode === "structured") {
    const parsed = schema!.safeParse(result.data.value);
    if (!parsed.success) return fail("provider", "Provider output failed validation.", input.operation.id);
    return { ok: true, data: { ...result.data, value: parsed.data } };
  }
  return result as ServiceResult<MeteredResult<T | string>>;
}
export async function meteredStructured<T>(input: MeteredStructuredInput<T>, options: MeteredOptions = {}, deps: GatewayDependencies = {}): Promise<ServiceResult<MeteredResult<T>>> {
  return call(input, "structured", input.schema, options, deps) as Promise<ServiceResult<MeteredResult<T>>>;
}
export async function meteredStream(input: MeteredStreamInput, options: MeteredOptions = {}, deps: GatewayDependencies = {}): Promise<ServiceResult<MeteredResult<string>>> {
  return call(input, "stream", undefined, options, deps) as Promise<ServiceResult<MeteredResult<string>>>;
}
