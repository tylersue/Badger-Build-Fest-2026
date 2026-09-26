import { describe, expect, it } from "vitest";
import { AGENTS, IDENTITIES, LEDGER } from "./seed";

const balance = (id: string) => LEDGER.filter((r) => r.identityId === id).reduce((n, r) => n + r.amountCents, 0);

describe("seed data", () => {
  it("starts both switchable identities at 5,000 credits (D-09)", () => {
    const switchable = IDENTITIES.filter((i) => i.isSwitchable);
    expect(switchable.map((i) => i.kind).sort()).toEqual(["expert", "hirer"]);
    for (const i of switchable) expect(balance(i.id)).toBe(5000);
  });

  it("keeps each ledger row's balance_after equal to the running sum", () => {
    for (const i of IDENTITIES) {
      const rows = LEDGER.filter((r) => r.identityId === i.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      let running = 0;
      for (const r of rows) {
        running += r.amountCents;
        expect(r.balanceAfter).toBe(running);
      }
    }
  });

  it("reconciles every usage charge: hirer debit = platform share + expert earnings", () => {
    const refs = new Set(LEDGER.filter((r) => r.kind === "debit" && r.purpose === "chat_message").map((r) => r.refId));
    for (const ref of refs) {
      const rows = LEDGER.filter((r) => r.refId === ref);
      const debit = -rows.filter((r) => r.kind === "debit").reduce((n, r) => n + r.amountCents, 0);
      const split = rows.filter((r) => ["platform_cost", "platform_margin", "earnings"].includes(r.kind)).reduce((n, r) => n + r.amountCents, 0);
      expect(split).toBe(debit);
    }
  });

  it("covers all three seed categories with published agents", () => {
    const cats = new Set(AGENTS.filter((a) => a.status === "published").map((a) => a.persona.category));
    expect(cats.size).toBe(3);
  });
});
