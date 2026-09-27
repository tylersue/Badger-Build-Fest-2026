/** Mock expert cash-outs (CRED-09), written through the demo store seam. */
import { allLedger, balanceOf, commitDemo, currentIdentity, payoutsFor, readDemo, type DemoState } from "@/lib/demo-store";
import { formatUsd } from "@/lib/format";
import type { LedgerEntry, Payout } from "@/lib/types";

export const CASHOUT_USD_CENTS_PER_CREDIT = 1;

export type CashoutSummary = {
  balanceCents: number;
  lifetimeEarningsCents: number;
  lifetimeCashoutCents: number;
  availableCents: number;
  payouts: Payout[];
};

export function cashoutSummary(s: DemoState, identityId: string): CashoutSummary {
  const rows = allLedger(s).filter((row) => row.identityId === identityId);
  const lifetimeEarningsCents = rows.filter((row) => row.kind === "earnings").reduce((sum, row) => sum + row.amountCents, 0);
  const lifetimeCashoutCents = Math.max(0, -rows.filter((row) => row.kind === "cashout").reduce((sum, row) => sum + row.amountCents, 0));
  const balanceCents = Math.max(0, balanceOf(s, identityId) - (s.v === 2 ? lifetimeCashoutCents : 0));
  return {
    balanceCents,
    lifetimeEarningsCents,
    lifetimeCashoutCents,
    availableCents: s.v === 2
      ? Math.floor(Math.max(0, Math.min(balanceCents - Number(BigInt(s.snapshot?.wallet.heldUnits ?? "0")) / 10_000_000, lifetimeEarningsCents - lifetimeCashoutCents)))
      : Math.max(0, Math.min(balanceCents, lifetimeEarningsCents - lifetimeCashoutCents)),
    payouts: payoutsFor(s, identityId),
  };
}

export type CashoutPlan = { ok: true; ledgerRow: LedgerEntry; payout: Payout };
export type CashoutError = "invalid_amount" | "nothing_available" | "exceeds_available";
export type CashoutResult = CashoutPlan | { ok: false; error: CashoutError };

export function planCashout(
  s: DemoState,
  identityId: string,
  credits: number,
  now: string,
  ids?: { ledgerId: string; payoutId: string },
): CashoutResult {
  if (!Number.isSafeInteger(credits) || credits <= 0) return { ok: false, error: "invalid_amount" };
  const summary = cashoutSummary(s, identityId);
  if (summary.availableCents === 0) return { ok: false, error: "nothing_available" };
  if (credits > summary.availableCents) return { ok: false, error: "exceeds_available" };

  const payoutId = ids?.payoutId ?? `p-${crypto.randomUUID()}`;
  const ledgerId = ids?.ledgerId ?? `l-${crypto.randomUUID()}`;
  const amountUsdCents = credits * CASHOUT_USD_CENTS_PER_CREDIT;
  const payout: Payout = {
    id: payoutId,
    identityId,
    credits,
    amountUsdCents,
    status: "requested",
    ledgerEntryId: ledgerId,
    createdAt: now,
  };
  const ledgerRow: LedgerEntry = {
    id: ledgerId,
    identityId,
    kind: "cashout",
    amountCents: -credits,
    balanceAfter: summary.balanceCents - credits,
    purpose: null,
    refType: "payout",
    refId: payoutId,
    note: `Mock cash-out · ${formatUsd(amountUsdCents)} requested · no payment sent`,
    createdAt: now,
  };
  return { ok: true, ledgerRow, payout };
}

export function applyCashout(s: DemoState, plan: CashoutPlan): DemoState {
  return { ...s, ledger: [...s.ledger, plan.ledgerRow], payouts: [...(s.payouts ?? []), plan.payout] };
}

export function requestCashout(credits: number): CashoutResult {
  const identityId = currentIdentity(readDemo()).id;
  const now = new Date().toISOString();
  let result = planCashout(readDemo(), identityId, credits, now);
  if (!result.ok) return result;
  commitDemo((s) => {
    const current = planCashout(s, identityId, credits, now);
    result = current;
    return current.ok ? applyCashout(s, current) : s;
  });
  return result;
}
