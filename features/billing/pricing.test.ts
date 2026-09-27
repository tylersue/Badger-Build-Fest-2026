import { describe, expect, it } from "vitest";
import { costCentsFromUsage, costUnitsFromUsage, estimateCents, priceUsage, splitUsageCharge, toChargeCents } from "./pricing";
describe("billing math", () => {
  it("prices fractional credits and all usage components", () => {
    expect(costUnitsFromUsage({ model: "claude-sonnet-5", tokensIn: 1200, tokensOut: 300 })).toBe(BigInt("5400000"));
    expect(costCentsFromUsage({ model: "claude-sonnet-5", tokensIn: 1200, tokensOut: 300 })).toBe(0.54);
    expect(costUnitsFromUsage({ model: "voyage-4-lite", embeddingTokens: 1_000_000 })).toBe(BigInt("20000000"));
    expect(costUnitsFromUsage({ model: "claude-sonnet-5", cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000, successfulSearchCount: 2 })).toBe(BigInt("2720000000"));
    expect(costUnitsFromUsage({ model: "claude-haiku-4-5", tokensIn: 1 })).toBe(BigInt("1000"));
    expect(priceUsage({ model: "claude-haiku-4-5", tokensIn: 1 })).toMatchObject({ policy: "standard", grossUnits: BigInt("1000"), effectiveUnits: BigInt("1000") });
    expect(() => costUnitsFromUsage({ model: "claude-sonnet-5", tokensIn: -1 })).toThrow(RangeError);
  });
  it("retains estimates only as display metadata", () => {
    expect(estimateCents("chat_message", 3)).toBe(9);
    expect(estimateCents("interview_turn")).toBe(2);
    expect(toChargeCents(0.54)).toBe(0.54);
  });
  it("conserves fractional usage in legacy split selectors", () => {
    for (const raw of [0.001, 0.3, 10, 39.9]) for (const multiplier of [1, 1.5, 2, 3, 4.5, 5]) {
      const split = splitUsageCharge({ rawCents: raw, multiplier });
      expect(split.hirerDebitCents).toBeCloseTo(split.platformCostCents + split.platformMarginCents + split.expertCreditCents, 10);
      expect(split.expertCreditCents).toBeGreaterThanOrEqual(0);
    }
    expect(() => splitUsageCharge({ rawCents: 1, multiplier: 6 })).toThrow(RangeError);
  });
});
