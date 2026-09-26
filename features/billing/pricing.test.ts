import { describe, expect, it } from "vitest";
import { costCentsFromUsage, estimateCents, splitUsageCharge, toChargeCents } from "./pricing";

describe("billing math", () => {
  it("prices usage in fractional cents", () => {
    expect(costCentsFromUsage({ model: "claude-sonnet-5", tokensIn: 1200, tokensOut: 300 })).toBeCloseTo(0.54);
    expect(costCentsFromUsage({ model: "voyage-4-lite", tokensIn: 1_000_000, tokensOut: 0 })).toBe(2);
  });

  it("reserves the typical cost times the multiplier", () => {
    expect(estimateCents("chat_message", 3)).toBe(9);
    expect(estimateCents("interview_turn")).toBe(2);
  });

  it("charges at least one credit for any non-zero cost", () => {
    expect(toChargeCents(0.54)).toBe(1);
    expect(toChargeCents(0)).toBe(0);
  });

  it("splits a chat charge so every credit is accounted for", () => {
    expect(splitUsageCharge({ rawCents: 10, multiplier: 3 })).toEqual({ hirerDebitCents: 30, platformCostCents: 10, platformMarginCents: 3, expertCreditCents: 17 });
    for (let raw = 0.3; raw < 40; raw += 1.7) {
      for (const m of [1, 1.5, 2, 3, 4.5, 5]) {
        const s = splitUsageCharge({ rawCents: raw, multiplier: m });
        expect(s.hirerDebitCents).toBe(s.platformCostCents + s.platformMarginCents + s.expertCreditCents);
        expect(s.expertCreditCents).toBeGreaterThanOrEqual(0);
      }
    }
    expect(() => splitUsageCharge({ rawCents: 1, multiplier: 6 })).toThrow(RangeError);
  });
});
