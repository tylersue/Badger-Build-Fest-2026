import { afterEach, describe, expect, it } from "vitest";
import { createInitialDemoState } from "@/lib/demo-store";
import type { LedgerEntry, Payout } from "@/lib/types";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { reconcileDemoState, reconcileLedger } from "./reconcile";

const AGENT_ID = "maria-chen-physical-therapy";
afterEach(() => resetDemoHarness());

async function makeSession() {
  const { store } = await loadDemoStore();
  const { reconcileDemoState } = await import("./reconcile");
  const pricing = await import("@/features/billing/pricing");
  const { CANNED_USAGE } = store;
  const { cashoutSummary, requestCashout } = await import("@/features/billing/cashout");

  store.switchIdentity("sam");
  const conversationId = store.startConversation(AGENT_ID, "Recon");
  for (let index = 0; index < 3; index += 1) {
    const result = await store.sendChatMessage(conversationId, "Is swelling after my ACL repair normal?");
    expect(result).toMatchObject({ ok: true, grounded: true });
  }

  store.switchIdentity("maria");
  const interview = store.answerInterview(AGENT_ID, "A demo interview answer for ledger reconciliation.");
  expect(interview.ok).toBe(true);
  const sandbox = await store.sendSandboxMessage(AGENT_ID, "Is swelling after my ACL repair normal?");
  expect(sandbox.ok).toBe(true);
  const beforeCashout = store.readDemo();
  const cashout = requestCashout(cashoutSummary(beforeCashout, "maria").availableCents);
  expect(cashout.ok).toBe(true);
  const state = store.readDemo();
  return { store, state, conversationId, reconcileDemoState, pricing, CANNED_USAGE };
}

describe("ledger reconciliation", () => {
  it("reconciles the seeded ledger with no issues", () => {
    const report = reconcileDemoState(createInitialDemoState());
    expect(report).toEqual({
      ok: true,
      issues: [],
      totals: { hirerDebitCents: expect.any(Number), platformCostCents: expect.any(Number), platformMarginCents: expect.any(Number), expertEarningsCents: expect.any(Number), buildChargeCents: expect.any(Number), cashoutCents: 0 },
    });
  });

  it("reconciles a scripted store session through chat, build costs, earnings, and cash-out", async () => {
    const { store, state, conversationId, reconcileDemoState, pricing, CANNED_USAGE } = await makeSession();
    const report = reconcileDemoState(state);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);

    const chatCharge = pricing.splitUsageCharge({ rawCents: pricing.costCentsFromUsage(CANNED_USAGE.chat_message), multiplier: 2 }).hirerDebitCents;
    expect(store.allLedger(state).filter((row) => row.kind === "debit" && row.refId === conversationId).map((row) => -row.amountCents)).toEqual([chatCharge, chatCharge, chatCharge]);
    for (const purpose of ["interview_turn", "sandbox_message"] as const) {
      const expected = pricing.toChargeCents(pricing.costCentsFromUsage(CANNED_USAGE[purpose]));
      expect(state.ledger.filter((row) => row.kind === "debit" && row.purpose === purpose).map((row) => -row.amountCents)).toEqual([expected]);
    }
    const earnings = state.ledger.filter((row) => row.kind === "earnings" && row.refId === conversationId).reduce((sum, row) => sum + row.amountCents, 0);
    const buildCharges = state.ledger.filter((row) => row.kind === "debit" && ["interview_turn", "sandbox_message"].includes(row.purpose ?? "")).reduce((sum, row) => sum - row.amountCents, 0);
    const cashout = state.ledger.filter((row) => row.kind === "cashout").reduce((sum, row) => sum - row.amountCents, 0);
    expect(store.balanceOf(state, "maria")).toBe(5000 + earnings - buildCharges - cashout);
    expect(store.balanceOf(state, "maria")).toBeGreaterThanOrEqual(0);
    expect(report.totals.cashoutCents).toBe(cashout);
  });

  it("catches a duplicated ledger id", async () => {
    const { state } = await makeSession();
    const row = state.ledger[0];
    expect(reconcileLedger({ ledger: [...state.ledger, row], payouts: state.payouts ?? [] }).issues).toContainEqual({ kind: "duplicate_id", id: row.id });
  });

  it("catches a duplicated earnings split with a distinct row id", async () => {
    const { state } = await makeSession();
    const row = state.ledger.find((entry) => entry.kind === "earnings")!;
    const duplicate = { ...row, id: "l-tampered-earnings" };
    expect(reconcileLedger({ ledger: [...state.ledger, duplicate], payouts: state.payouts ?? [] }).issues.some((issue) => issue.kind === "usage_split_mismatch")).toBe(true);
  });

  it("catches a removed platform cost split row", async () => {
    const { state, conversationId } = await makeSession();
    const removed = state.ledger.find((row) => row.kind === "platform_cost" && row.refId === conversationId)!;
    expect(reconcileLedger({ ledger: state.ledger.filter((row) => row !== removed), payouts: state.payouts ?? [] }).issues.some((issue) => issue.kind === "usage_split_mismatch")).toBe(true);
  });

  it("catches a cash-out row after its payout is removed", async () => {
    const { state } = await makeSession();
    expect(state.payouts).toHaveLength(1);
    expect(reconcileLedger({ ledger: state.ledger, payouts: [] }).issues.some((issue) => issue.kind === "cashout_without_payout")).toBe(true);
  });

  it("catches a payout that has no cash-out ledger row", async () => {
    const { state } = await makeSession();
    const orphan: Payout = { ...state.payouts![0], id: "p-orphan", ledgerEntryId: "l-orphan", credits: 1, amountUsdCents: 1 };
    expect(reconcileLedger({ ledger: state.ledger, payouts: [...state.payouts!, orphan] }).issues).toContainEqual({ kind: "payout_without_cashout", payoutId: "p-orphan" });
  });

  it("catches a payout credit amount that disagrees with its cash-out row", async () => {
    const { state } = await makeSession();
    const changed = { ...state.payouts![0], credits: state.payouts![0].credits + 1 };
    expect(reconcileLedger({ ledger: state.ledger, payouts: [changed] }).issues.some((issue) => issue.kind === "cashout_amount_mismatch")).toBe(true);
  });

  it("catches a payout amount that is not one cent per credit", async () => {
    const { state } = await makeSession();
    const changed = { ...state.payouts![0], amountUsdCents: state.payouts![0].amountUsdCents + 1 };
    expect(reconcileLedger({ ledger: state.ledger, payouts: [changed] }).issues.some((issue) => issue.kind === "payout_rate_mismatch")).toBe(true);
  });

  it("catches an earnings row with a build-purpose reference", async () => {
    const { state } = await makeSession();
    const index = state.ledger.findIndex((row) => row.kind === "earnings");
    const tampered = [...state.ledger];
    tampered[index] = { ...tampered[index], refType: "interview" } as LedgerEntry;
    expect(reconcileLedger({ ledger: tampered, payouts: state.payouts ?? [] }).issues.some((issue) => issue.kind === "purpose_ref_mismatch")).toBe(true);
  });

  it("catches markup added to a single build charge", async () => {
    const { state } = await makeSession();
    const index = state.ledger.findIndex((row) => row.kind === "debit" && row.purpose === "interview_turn");
    const tampered = [...state.ledger];
    tampered[index] = { ...tampered[index], amountCents: tampered[index].amountCents - 1 };
    expect(reconcileLedger({ ledger: tampered, payouts: state.payouts ?? [] }).issues.some((issue) => issue.kind === "markup_outside_usage")).toBe(true);
  });

  it("catches a debit that drives its balance below zero", async () => {
    const { state, conversationId } = await makeSession();
    const index = state.ledger.findIndex((row) => row.kind === "debit" && row.refId === conversationId);
    const tampered = [...state.ledger];
    tampered[index] = { ...tampered[index], amountCents: -10_000, balanceAfter: -1 };
    expect(reconcileLedger({ ledger: tampered, payouts: state.payouts ?? [] }).issues.some((issue) => issue.kind === "negative_balance")).toBe(true);
  });
});
