/** Integrity checks for wallet ledger, usage splits, and mock payouts (D-14). */
import { allLedger, allPayouts, type DemoState } from "@/lib/demo-store";
import { CASHOUT_USD_CENTS_PER_CREDIT } from "@/features/billing/cashout";
import { costCentsFromUsage, toChargeCents, type Usage } from "@/features/billing/pricing";
import { CANNED_USAGE } from "@/lib/demo-store";
import type { MeteredPurpose } from "@/lib/config/credits";
import type { LedgerEntry, Payout } from "@/lib/types";

export const BUILD_PURPOSE_REF: Record<MeteredPurpose, LedgerEntry["refType"]> = {
  interview_turn: "interview",
  embedding: "source",
  sandbox_message: "agent",
  chat_message: "conversation",
};

export type ReconcileIssue =
  | { kind: "duplicate_id"; id: string }
  | { kind: "balance_chain"; identityId: string; entryId: string; expected: number; actual: number }
  | { kind: "negative_balance"; identityId: string; entryId: string; balance: number }
  | { kind: "usage_split_mismatch"; conversationId: string; hirerDebitCents: number; splitCents: number }
  | { kind: "orphan_split_row"; entryId: string; conversationId: string }
  | { kind: "purpose_ref_mismatch"; entryId: string }
  | { kind: "markup_outside_usage"; entryId: string }
  | { kind: "cashout_without_payout"; entryId: string }
  | { kind: "payout_without_cashout"; payoutId: string }
  | { kind: "cashout_amount_mismatch"; payoutId: string; ledgerCredits: number; payoutCredits: number }
  | { kind: "payout_rate_mismatch"; payoutId: string };

export type ReconcileReport = {
  ok: boolean;
  issues: ReconcileIssue[];
  totals: { hirerDebitCents: number; platformCostCents: number; platformMarginCents: number; expertEarningsCents: number; buildChargeCents: number; cashoutCents: number };
};

const buildUsage: Record<MeteredPurpose, Usage> = CANNED_USAGE;

export function reconcileLedger(input: { ledger: LedgerEntry[]; payouts: Payout[] }): ReconcileReport {
  const { ledger, payouts } = input;
  const issues: ReconcileIssue[] = [];
  const ids = new Set<string>();
  const rowsByIdentity = new Map<string, LedgerEntry[]>();
  const chatDebits = new Map<string, number>();
  const splitRows = new Map<string, LedgerEntry[]>();
  const totals = { hirerDebitCents: 0, platformCostCents: 0, platformMarginCents: 0, expertEarningsCents: 0, buildChargeCents: 0, cashoutCents: 0 };

  for (const row of ledger) {
    if (ids.has(row.id)) issues.push({ kind: "duplicate_id", id: row.id });
    ids.add(row.id);
    if (row.identityId) rowsByIdentity.set(row.identityId, [...(rowsByIdentity.get(row.identityId) ?? []), row]);
    if (row.kind === "debit") {
      totals.hirerDebitCents += -row.amountCents;
      if (row.purpose && (row.refType !== BUILD_PURPOSE_REF[row.purpose] || !row.refId)) issues.push({ kind: "purpose_ref_mismatch", entryId: row.id });
      if (row.purpose === "chat_message" && row.refId) chatDebits.set(row.refId, (chatDebits.get(row.refId) ?? 0) - row.amountCents);
      if (row.purpose && row.purpose !== "chat_message") {
        const expected = toChargeCents(costCentsFromUsage(buildUsage[row.purpose]));
        // Seed history contains aggregate batch charges (e.g. 38 interview answers) from older demo pricing.
        // Single-call rows written by the current store must remain at raw cost with no markup.
        if (!/\b\d+\s+(?:answers|test messages|chunks)\b/i.test(row.note) && -row.amountCents !== expected) {
          issues.push({ kind: "markup_outside_usage", entryId: row.id });
        }
        totals.buildChargeCents += -row.amountCents;
      }
    }
    if (row.kind === "cashout") totals.cashoutCents += -row.amountCents;
    if (row.kind === "platform_cost") totals.platformCostCents += row.amountCents;
    if (row.kind === "platform_margin") totals.platformMarginCents += row.amountCents;
    if (row.kind === "earnings") totals.expertEarningsCents += row.amountCents;
    if (["platform_cost", "platform_margin", "earnings"].includes(row.kind)) {
      if (row.refType !== "conversation" || !row.refId) issues.push({ kind: "purpose_ref_mismatch", entryId: row.id });
      else splitRows.set(row.refId, [...(splitRows.get(row.refId) ?? []), row]);
    }
  }

  for (const [identityId, rows] of rowsByIdentity) {
    let balance = 0;
    const ordered = rows.map((row, index) => ({ row, index })).sort((a, b) => a.row.createdAt.localeCompare(b.row.createdAt) || a.index - b.index);
    for (const { row } of ordered) {
      balance += row.amountCents;
      if (balance < 0) issues.push({ kind: "negative_balance", identityId, entryId: row.id, balance });
      if (row.balanceAfter !== null && row.balanceAfter !== balance) issues.push({ kind: "balance_chain", identityId, entryId: row.id, expected: balance, actual: row.balanceAfter });
    }
  }

  for (const [conversationId, debitCents] of chatDebits) {
    const splitCents = (splitRows.get(conversationId) ?? []).reduce((sum, row) => sum + row.amountCents, 0);
    if (splitCents !== debitCents) issues.push({ kind: "usage_split_mismatch", conversationId, hirerDebitCents: debitCents, splitCents });
  }
  for (const [conversationId, rows] of splitRows) {
    if (!chatDebits.has(conversationId)) for (const row of rows) issues.push({ kind: "orphan_split_row", entryId: row.id, conversationId });
  }

  const cashoutRows = ledger.filter((row) => row.kind === "cashout");
  for (const row of cashoutRows) {
    const matched = payouts.filter((payout) => payout.id === row.refId && payout.ledgerEntryId === row.id);
    if (row.refType !== "payout" || matched.length !== 1) issues.push({ kind: "cashout_without_payout", entryId: row.id });
    for (const payout of matched) if (row.amountCents >= 0 || payout.credits !== -row.amountCents) issues.push({ kind: "cashout_amount_mismatch", payoutId: payout.id, ledgerCredits: -row.amountCents, payoutCredits: payout.credits });
  }
  for (const payout of payouts) {
    const matched = cashoutRows.filter((row) => row.refType === "payout" && row.refId === payout.id && row.id === payout.ledgerEntryId);
    if (matched.length !== 1) issues.push({ kind: "payout_without_cashout", payoutId: payout.id });
    if (payout.credits <= 0 || payout.amountUsdCents !== payout.credits * CASHOUT_USD_CENTS_PER_CREDIT) issues.push({ kind: "payout_rate_mismatch", payoutId: payout.id });
  }

  return { ok: issues.length === 0, issues, totals };
}

export function reconcileDemoState(s: DemoState): ReconcileReport {
  return reconcileLedger({ ledger: allLedger(s), payouts: allPayouts(s) });
}
