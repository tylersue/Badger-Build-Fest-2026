import { describe, expect, it } from "vitest";
import { parseStoredMoney } from "./money";

describe("stored bigint money", () => {
  it("preserves safe numeric JSON and exact decimal string values", () => {
    expect(parseStoredMoney(0)).toBe("0");
    expect(parseStoredMoney(Number.MAX_SAFE_INTEGER)).toBe(String(Number.MAX_SAFE_INTEGER));
    expect(parseStoredMoney("9223372036854775807")).toBe("9223372036854775807");
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, -1, 1.5, NaN, Infinity, "-1", "1.5", "01",
    "9223372036854775808", null, {}])("rejects unsafe value %s", value => {
    expect(() => parseStoredMoney(value)).toThrow("Unsafe monetary value");
  });
});
