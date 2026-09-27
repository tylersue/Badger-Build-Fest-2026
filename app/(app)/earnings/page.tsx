"use client";

import { TrendingUp } from "lucide-react";
import { CashoutButton } from "@/components/earnings/cashout-dialog";
import { Breadcrumbs, DataTable, EmptyState, Num, NumberPill, PageBody, PageHeader, StatTile, Toolbar } from "@/components/app/ui";
import { cashoutSummary } from "@/features/billing/cashout";
import { earningsByConversation, earningsTotals, LEDGER_KIND_LABELS } from "@/features/billing/earnings";
import { currentIdentity, ledgerFor, payoutsFor, useDemo } from "@/lib/demo-store";
import { PURPOSE_LABELS } from "@/lib/config/credits";
import { formatCredits, formatNumber, formatRelative, formatSignedCredits, formatUsd, isoDaysAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Earnings: per-conversation revenue and full wallet history (CRED-08). */
export default function EarningsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const conversationRows = earningsByConversation(s, me.id);
  const totals = earningsTotals(conversationRows);
  const history = ledgerFor(s, me.id);
  const payouts = payoutsFor(s, me.id);
  const cashout = cashoutSummary(s, me.id);
  const monthAgo = isoDaysAgo(30);
  const netThisMonth = history.filter((row) => row.kind === "earnings" && row.createdAt > monthAgo).reduce((total, row) => total + row.amountCents, 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "Earnings" }]} />
      <PageBody>
        <PageHeader title="Earnings" subtitle="Per conversation: gross, what the platform keeps, what you get. Real ledger rows, no estimates." />
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Net this month" value={formatCredits(netThisMonth)} caption={formatUsd(netThisMonth)} tone="success" testId="earnings-net" />
          <StatTile label="Gross" value={formatCredits(totals.grossCents)} caption="Raw cost × your multiplier" />
          <StatTile label="Platform share" value={formatCredits(totals.platformCents)} caption="Raw cost + 15% of margin" />
          <StatTile label="Cash-out" value={formatCredits(cashout.lifetimeCashoutCents)} caption={`${payouts.length} requested · ${formatCredits(cashout.availableCents)} available`} />
        </div>
        <Toolbar>
          <CashoutButton />
        </Toolbar>

        {conversationRows.length === 0 ? (
          <EmptyState icon={TrendingUp} heading="Nothing earned yet" body="Publish an agent. You're credited each time someone uses it." action={{ label: "Publish agent", href: "/build" }} />
        ) : (
          <DataTable head={[{ label: "Conversation" }, { label: "Agent" }, { label: "Messages", numeric: true }, { label: "Gross", numeric: true }, { label: "Platform", numeric: true }, { label: "Net to you", numeric: true }]}>
            {conversationRows.map((row) => (
              <tr key={row.conversationId} data-testid="earnings-row">
                <td>{row.title}</td>
                <td className="text-fg-tertiary">{row.agentName}</td>
                <Num>{row.messages === null ? "—" : <NumberPill value={row.messages} />}</Num>
                <Num>{row.grossCents}</Num>
                <Num className="text-fg-muted">{row.platformCents}</Num>
                <Num className="text-success">+{row.netCents}</Num>
              </tr>
            ))}
          </DataTable>
        )}

        {payouts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-medium">Payouts</h2>
            <DataTable head={[{ label: "Requested" }, { label: "Credits", numeric: true }, { label: "Amount", numeric: true }, { label: "Status" }]}>
              {payouts.map((payout) => (
                <tr key={payout.id} data-testid="payout-row">
                  <td className="text-fg-muted">{formatRelative(payout.createdAt)}</td>
                  <Num>{formatCredits(payout.credits)}</Num>
                  <Num>{formatUsd(payout.amountUsdCents)}</Num>
                  <td>Requested</td>
                </tr>
              ))}
            </DataTable>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-base font-medium">Wallet history</h2>
            <p className="mt-1 text-sm text-fg-muted">Every debit and credit, including cash-outs.</p>
          </div>
          {history.length === 0 ? (
            <EmptyState icon={TrendingUp} heading="No activity yet" body="Credits appear here when you build, chat, or add credits." />
          ) : (
            <DataTable head={[{ label: "When" }, { label: "Type" }, { label: "Detail" }, { label: "Credits", numeric: true }, { label: "Balance", numeric: true }]}>
              {history.map((row) => (
                <tr key={row.id} data-testid="earnings-history-row">
                  <td className="text-fg-muted">{formatRelative(row.createdAt)}</td>
                  <td>{row.purpose ? PURPOSE_LABELS[row.purpose] : LEDGER_KIND_LABELS[row.kind]}</td>
                  <td className="text-fg-tertiary">{row.note}</td>
                  <Num className={cn(row.amountCents < 0 ? "text-danger" : "text-success")}>{formatSignedCredits(row.amountCents)}</Num>
                  <Num>{row.balanceAfter === null ? "—" : formatNumber(row.balanceAfter)}</Num>
                </tr>
              ))}
            </DataTable>
          )}
        </section>
      </PageBody>
    </>
  );
}
