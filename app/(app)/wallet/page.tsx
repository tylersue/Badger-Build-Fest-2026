"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { Breadcrumbs, DataTable, EmptyState, Num, PageBody, PageHeader, SearchField, StatTile, Toolbar } from "@/components/app/ui";
import { currentIdentity, ledgerFor, useDemo, walletStatus } from "@/lib/demo-store";
import { PURPOSE_LABELS } from "@/lib/config/credits";
import { formatCreditUnits, formatCredits, formatNumber, formatRelative, formatSignedCredits, formatUsd, isoDaysAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/lib/types";

const KIND_LABELS: Record<LedgerEntry["kind"], string> = {
  seed: "Seed",
  subscription: "Subscription",
  pack: "Credit pack",
  debit: "Debit",
  earnings: "Earnings",
  cashout: "Cash-out",
  platform_cost: "Platform cost",
  platform_margin: "Platform margin",
};

/* Wallet (CRED-01, CRED-06): balance, mock funding, full ledger history. */
export default function WalletPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const [query, setQuery] = useState("");
  const rows = ledgerFor(s, me.id);
  const wallet = walletStatus(s);
  const weekAgo = isoDaysAgo(7);
  const monthAgo = isoDaysAgo(30);
  const debitsThisWeek = rows.filter((r) => r.kind === "debit" && r.createdAt > weekAgo);
  const spentThisWeek = -debitsThisWeek.reduce((n, r) => n + r.amountCents, 0);
  const byPurpose = (p: keyof typeof PURPOSE_LABELS) => -debitsThisWeek.filter((r) => r.purpose === p).reduce((n, r) => n + r.amountCents, 0);
  const added = rows.filter((r) => r.amountCents > 0 && r.createdAt > monthAgo).reduce((n, r) => n + r.amountCents, 0);
  const visible = rows.filter((r) => !query || `${r.note} ${KIND_LABELS[r.kind]}`.toLowerCase().includes(query.toLowerCase()));
  const breakdown = (["interview_turn", "chat_message", "sandbox_message", "embedding"] as const)
    .map((p) => [PURPOSE_LABELS[p], byPurpose(p)] as const)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} ${formatNumber(v)}`)
    .join(" · ");

  return (
    <>
      <Breadcrumbs items={[{ label: "Wallet" }]} />
      <PageBody>
        <PageHeader title="Wallet" subtitle="1 credit = 1 cent. Charges and reservations come from the server ledger." />
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Balance" value={formatCreditUnits(wallet.balanceUnits)} caption={formatUsd(Number(BigInt(wallet.balanceUnits)) / 10_000_000)} testId="wallet-balance" />
          <StatTile label="Spent this week" value={formatCredits(spentThisWeek)} caption={breakdown || "Nothing yet"} />
          <StatTile label="Added this month" value={formatCredits(added)} caption="Seed, plans, packs and earnings" />
          <StatTile label="Pending holds" value={formatCreditUnits(wallet.heldUnits)} caption={`${formatCreditUnits(wallet.availableUnits)} available`} />
        </div>
        <Toolbar>
          <AddCreditsButton />
          <SearchField placeholder="Search history…" value={query} onChange={setQuery} />
        </Toolbar>
        {visible.length === 0 ? (
          <EmptyState icon={Wallet} heading="No activity yet" body="Credits appear here when you build, chat, or add credits." />
        ) : (
          <DataTable head={[{ label: "When" }, { label: "Purpose" }, { label: "Detail" }, { label: "Credits", numeric: true }, { label: "Balance", numeric: true }]}>
            {visible.map((r) => (
              <tr key={r.id} data-testid="ledger-row">
                <td className="text-fg-muted">{formatRelative(r.createdAt)}</td>
                <td>{r.purpose ? PURPOSE_LABELS[r.purpose] : KIND_LABELS[r.kind]}</td>
                <td className="text-fg-tertiary">{r.note}</td>
                <Num className={cn(r.amountCents < 0 ? "text-foreground" : "text-success")}>{formatSignedCredits(r.amountCents)}</Num>
                <Num>{r.balanceAfter === null ? "—" : formatNumber(r.balanceAfter)}</Num>
              </tr>
            ))}
          </DataTable>
        )}
      </PageBody>
    </>
  );
}
