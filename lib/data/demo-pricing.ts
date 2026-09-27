/** Frozen whole-credit pricing for local-demo fixtures only. Live billing uses features/billing/pricing.ts. */
import { PLATFORM_MARGIN_SHARE, TYPICAL_CALL_CENTS, type MeteredPurpose } from "@/lib/config/credits";
import type { ModelId } from "@/lib/config/models";

/** Cents per million tokens (claude-api pricing, 2026). */
export const PRICING_CENTS_PER_MTOK: Record<ModelId | "voyage-4-lite" | "claude-sonnet-5" | "claude-opus-5-5" | "claude-haiku-4-5", { input: number; output: number; cacheRead: number }> = {
  "gpt-6-luna": { input: 10, output: 50, cacheRead: 1 },
  "gpt-4.1": { input: 200, output: 800, cacheRead: 50 },
  "claude-sonnet-5": { input: 200, output: 1000, cacheRead: 10 },
  "claude-opus-5-5": { input: 400, output: 2000, cacheRead: 20 },
  "claude-haiku-4-5": { input: 100, output: 500, cacheRead: 5 },
  "voyage-4-lite": { input: 2, output: 0, cacheRead: 0 },
};

export type Usage = { model: keyof typeof PRICING_CENTS_PER_MTOK; tokensIn: number; tokensOut: number; cacheReadTokens?: number };

/** Raw cost of one call in fractional cents. */
export function costCentsFromUsage(usage: Usage): number {
  const p = PRICING_CENTS_PER_MTOK[usage.model];
  return (usage.tokensIn * p.input + usage.tokensOut * p.output + (usage.cacheReadTokens ?? 0) * p.cacheRead) / 1_000_000;
}

/** The amount reserved before a metered call (D-10). */
export function estimateCents(purpose: MeteredPurpose, multiplier = 1): number {
  return Math.ceil(TYPICAL_CALL_CENTS[purpose] * multiplier);
}

/** Whole credits charged for a raw cost: at least 1 credit for any non-zero cost. */
export function toChargeCents(rawCents: number): number {
  if (rawCents <= 0) return 0;
  return Math.max(1, Math.ceil(rawCents));
}

export type UsageSplit = {
  hirerDebitCents: number;
  platformCostCents: number;
  platformMarginCents: number;
  expertCreditCents: number;
};

/**
 * Chat charge = raw cost x the agent's multiplier. The platform keeps the raw
 * cost plus its share of the margin; the rest credits the expert (CRED-04).
 * Invariant: hirerDebit = platformCost + platformMargin + expertCredit.
 */
export function splitUsageCharge(input: { rawCents: number; multiplier: number; marginShare?: number }): UsageSplit {
  const { rawCents, multiplier, marginShare = PLATFORM_MARGIN_SHARE } = input;
  if (multiplier < 1 || multiplier > 5) throw new RangeError("multiplier must be between 1 and 5");
  const platformCostCents = toChargeCents(rawCents);
  const hirerDebitCents = Math.ceil(platformCostCents * multiplier);
  const margin = hirerDebitCents - platformCostCents;
  const platformMarginCents = Math.round(margin * marginShare);
  return {
    hirerDebitCents,
    platformCostCents,
    platformMarginCents,
    expertCreditCents: margin - platformMarginCents,
  };
}

/** Listing price signal: typical credits per message for a multiplier. */
export function typicalMessageCents(multiplier: number): number {
  return estimateCents("chat_message", multiplier);
}
