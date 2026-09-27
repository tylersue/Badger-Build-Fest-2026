/** PostgreSQL bigint amounts must cross JSON boundaries without losing precision. */
export function parseStoredMoney(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Unsafe monetary value");
    return String(value);
  }
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value) ||
    BigInt(value) > BigInt("9223372036854775807")) throw new Error("Unsafe monetary value");
  return value;
}
