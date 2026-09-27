import { afterEach, describe, expect, it } from "vitest";
import { LEDGER } from "@/lib/data/seed";
import { createInitialDemoState } from "@/lib/demo-store";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { applyCashout, cashoutSummary, planCashout } from "./cashout";

afterEach(() => resetDemoHarness());

describe("cashoutSummary and planCashout", () => {
  it("limits Maria's available cash-out to her earned credits", () => {
    const s = createInitialDemoState();
    const earned = LEDGER.filter((row) => row.identityId === "maria" && row.kind === "earnings").reduce((sum, row) => sum + row.amountCents, 0);
    expect(cashoutSummary(s, "maria").availableCents).toBe(earned);
  });

  it("records a cash-out ledger row and matching requested payout", () => {
    const s = createInitialDemoState();
    const available = cashoutSummary(s, "maria").availableCents;
    const plan = planCashout(s, "maria", available, "2026-09-26T12:00:00.000Z", { ledgerId: "l-test", payoutId: "p-test" });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("expected cash-out plan");
    expect(plan.ledgerRow.balanceAfter).toBe(cashoutSummary(s, "maria").balanceCents - available);
    expect(plan.payout.amountUsdCents).toBe(available);
    expect(plan.ledgerRow.refId).toBe(plan.payout.id);
    expect(plan.payout.ledgerEntryId).toBe(plan.ledgerRow.id);
    const after = applyCashout(s, plan);
    expect(cashoutSummary(after, "maria").availableCents).toBe(0);
  });

  it("reports nothing available after applying a full cash-out", () => {
    const s = createInitialDemoState();
    const available = cashoutSummary(s, "maria").availableCents;
    const plan = planCashout(s, "maria", available, "2026-09-26T12:00:00.000Z", { ledgerId: "l-empty", payoutId: "p-empty" });
    if (!plan.ok) throw new Error("expected cash-out plan");
    expect(planCashout(applyCashout(s, plan), "maria", 1, "2026-09-26T12:00:00.000Z")).toMatchObject({ ok: false, error: "nothing_available" });
  });

  it("rejects non-integer, non-positive and over-available requests", () => {
    const s = createInitialDemoState();
    const available = cashoutSummary(s, "maria").availableCents;
    for (const amount of [0, -5, 2.5, Number.NaN]) {
      expect(planCashout(s, "maria", amount, "2026-09-26T12:00:00.000Z")).toMatchObject({ ok: false, error: "invalid_amount" });
    }
    expect(planCashout(s, "maria", available + 1, "2026-09-26T12:00:00.000Z")).toMatchObject({ ok: false, error: "exceeds_available" });
    expect(planCashout(s, "sam", 1, "2026-09-26T12:00:00.000Z")).toMatchObject({ ok: false, error: "nothing_available" });
  });

  it("rejects a second cash-out after the available balance is spent", () => {
    const s = createInitialDemoState();
    const available = cashoutSummary(s, "maria").availableCents;
    const plan = planCashout(s, "maria", available, "2026-09-26T12:00:00.000Z");
    if (!plan.ok) throw new Error("expected cash-out plan");
    expect(planCashout(applyCashout(s, plan),  "maria", 1, "2026-09-26T12:00:00.000Z")).toMatchObject({ ok: false, error: "nothing_available" });
  });
});

describe("requestCashout store action", () => {
  it("revalidates a repeated request and persists one payout and row", async () => {
    const { store, storage } = await loadDemoStore();
    const { requestCashout } = await import("./cashout");
    const start = store.balanceOf(store.readDemo(), "maria");
    const available = cashoutSummary(store.readDemo(), "maria").availableCents;
    expect(requestCashout(available).ok).toBe(true);
    expect(requestCashout(1)).toMatchObject({ ok: false, error: "nothing_available" });
    const state = store.readDemo();
    expect(state.ledger.filter((row) => row.kind === "cashout")).toHaveLength(1);
    expect(store.allPayouts(state)).toHaveLength(1);
    expect(store.balanceOf(state, "maria")).toBe(start - available);
    const reloaded = await loadDemoStore(JSON.parse(storage.getItem("bx-demo-v1")!));
    expect(reloaded.store.allPayouts(reloaded.store.readDemo())).toHaveLength(1);
  });
});
