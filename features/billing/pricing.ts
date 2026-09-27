import { PLATFORM_MARGIN_SHARE, TYPICAL_CALL_CENTS, type MeteredPurpose } from "@/lib/config/credits";
import type { ModelId } from "@/lib/config/models";

export const PRICE_VERSION = "2026-09-27-luna-v1";
/** Nanodollars per million tokens; immutable versioned standard-rate snapshot. */
export const PRICING_UNITS_PER_MTOK: Record<ModelId | "gpt-4.1-mini" | "text-embedding-3-small" | "voyage-4-lite" | "claude-sonnet-5" | "claude-opus-5-5" | "claude-haiku-4-5", { input: bigint; output: bigint; cacheRead: bigint; cacheWrite: bigint; embedding: bigint }> = {
  "gpt-6-luna": { input: BigInt("100000000"), output: BigInt("500000000"), cacheRead: BigInt("10000000"), cacheWrite: BigInt("125000000"), embedding: BigInt("0") },
  "gpt-4.1-mini": { input: BigInt("400000000"), output: BigInt("1600000000"), cacheRead: BigInt("100000000"), cacheWrite: BigInt("400000000"), embedding: BigInt("0") },
  "gpt-4.1": { input: BigInt("2000000000"), output: BigInt("8000000000"), cacheRead: BigInt("500000000"), cacheWrite: BigInt("2000000000"), embedding: BigInt("0") },
  "text-embedding-3-small": { input: BigInt("0"), output: BigInt("0"), cacheRead: BigInt("0"), cacheWrite: BigInt("0"), embedding: BigInt("20000000") },
  "claude-sonnet-5": { input: BigInt("2000000000"), output: BigInt("10000000000"), cacheRead: BigInt("200000000"), cacheWrite: BigInt("2500000000"), embedding: BigInt("0") },
  "claude-opus-5-5": { input: BigInt("4000000000"), output: BigInt("20000000000"), cacheRead: BigInt("200000000"), cacheWrite: BigInt("5000000000"), embedding: BigInt("0") },
  "claude-haiku-4-5": { input: BigInt("1000000000"), output: BigInt("5000000000"), cacheRead: BigInt("100000000"), cacheWrite: BigInt("1250000000"), embedding: BigInt("0") },
  "voyage-4-lite": { input: BigInt("0"), output: BigInt("0"), cacheRead: BigInt("0"), cacheWrite: BigInt("0"), embedding: BigInt("20000000") },
};
export const SEARCH_FEE_UNITS = BigInt("10000000");
export const PRICING_CENTS_PER_MTOK = Object.fromEntries(Object.entries(PRICING_UNITS_PER_MTOK).map(([model, rate]) => [model, {
  input: Number(rate.input || rate.embedding) / 10_000_000, output: Number(rate.output) / 10_000_000, cacheRead: Number(rate.cacheRead) / 10_000_000,
}])) as Record<keyof typeof PRICING_UNITS_PER_MTOK, { input: number; output: number; cacheRead: number }>;
export type Usage = { model: keyof typeof PRICING_UNITS_PER_MTOK; tokensIn?: number; tokensOut?: number; cacheReadTokens?: number; cacheWriteTokens?: number; embeddingTokens?: number; successfulSearchCount?: number };
function count(value: number | undefined): bigint {
  if (value === undefined) return BigInt("0");
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("usage counts must be nonnegative safe integers");
  return BigInt(value);
}
/** Round once after summing token components. Search fees are per successful search. */
export function costUnitsFromUsage(usage: Usage): bigint {
  const rate = PRICING_UNITS_PER_MTOK[usage.model];
  const input = count(usage.tokensIn), output = count(usage.tokensOut);
  const cacheRead = count(usage.cacheReadTokens), cacheWrite = count(usage.cacheWriteTokens);
  // Luna's >272K prompt tier prices the entire request at 2x input/cache and 1.5x output.
  const longContext = usage.model === "gpt-6-luna" && input + cacheRead + cacheWrite > BigInt(272_000);
  const inputFactor = longContext ? BigInt(2) : BigInt(1);
  const outputRate = longContext ? rate.output * BigInt(3) / BigInt(2) : rate.output;
  const numerator = input * rate.input * inputFactor + output * outputRate
    + cacheRead * rate.cacheRead * inputFactor + cacheWrite * rate.cacheWrite * inputFactor
    + count(usage.embeddingTokens) * rate.embedding;
  return (numerator === BigInt("0") ? BigInt("0") : (numerator + BigInt("999999")) / BigInt("1000000")) + count(usage.successfulSearchCount) * SEARCH_FEE_UNITS;
}
export type PriceSnapshot = { version: typeof PRICE_VERSION; policy: "standard"; grossUnits: bigint; effectiveUnits: bigint };
/** Discounts require a future verified policy; computed standard usage is the default. */
export function priceUsage(usage: Usage): PriceSnapshot {
  const grossUnits = costUnitsFromUsage(usage);
  return { version: PRICE_VERSION, policy: "standard", grossUnits, effectiveUnits: grossUnits };
}
/** Display-only compatibility selectors. Floating point never enters settlement. */
export function costCentsFromUsage(usage: Usage): number { return Number(costUnitsFromUsage(usage)) / 10_000_000; }
export function estimateCents(purpose: MeteredPurpose, multiplier = 1): number { return Math.ceil(TYPICAL_CALL_CENTS[purpose] * multiplier); }
export function toChargeCents(rawCents: number): number {
  if (!Number.isFinite(rawCents) || rawCents < 0) throw new RangeError("invalid charge");
  return rawCents;
}
export type UsageSplit = { hirerDebitCents: number; platformCostCents: number; platformMarginCents: number; expertCreditCents: number };
/** Phase 1 display compatibility. Phase 3 owns transactional hirer/expert settlement. */
export function splitUsageCharge(input: { rawCents: number; multiplier: number; marginShare?: number }): UsageSplit {
  const { rawCents, multiplier, marginShare = PLATFORM_MARGIN_SHARE } = input;
  if (multiplier < 1 || multiplier > 5 || !Number.isFinite(multiplier)) throw new RangeError("multiplier must be between 1 and 5");
  const platformCostCents = toChargeCents(rawCents);
  const hirerDebitCents = platformCostCents * multiplier;
  const margin = hirerDebitCents - platformCostCents;
  const platformMarginCents = margin * marginShare;
  return { hirerDebitCents, platformCostCents, platformMarginCents, expertCreditCents: margin - platformMarginCents };
}
export function typicalMessageCents(multiplier: number): number { return estimateCents("chat_message", multiplier); }
