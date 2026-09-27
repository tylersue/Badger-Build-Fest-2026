"use client";

import { TrendingUp } from "lucide-react";
import { CashoutButton } from "@/components/earnings/cashout-dialog";
import { Breadcrumbs, DataTable, EmptyState, Num, NumberPill, PageBody, PageHeader, StatTile, Toolbar } from "@/components/app/ui";
import { agentById, allConversations, allLedger, conversationStats, currentIdentity, ledgerFor, payoutsFor, useDemo } from "@/lib/demo-store";
import { cashoutSummary } from "@/features/billing/cashout";
import { formatCredits, formatRelative, formatUsd, isoDaysAgo } from "@/lib/format";

/* Earnings: per conversation gross, platform share, net, from ledger rows (CRED-08 lands fully in Phase 4). */
export default function EarningsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const ledger = allLedger(s);
  const mine = ledgerFor(s, me.id);
  const earningsRefs = [...new Set(mine.filter((r) => r.kind === "earnings" && r.refType === "conversation").map((r) => r.refId!))];
  const rows = earningsRefs.map((refId) => {
    const conv = allConversations(s).find((c) => c.id === refId);
    const sum = (pred: (r: (typeof ledger)[number]) => boolean) => ledger.filter((r) => r.refId === refId && pred(r)).reduce((n, r) => n + r.amountCents, 0);
    return {
      id: refId,
      title: conv?.title ?? "Conversation",
      agent: conv ? agentById(s, conv.agentId)?.persona.name ?? "" : "",
      messages: conv ? conversationStats(s, conv.id).messageCount : 0,
      gross: -sum((r) => r.kind === "debit"),
      platform: sum((r) => r.kind === "platform_cost" || r.kind === "platform_margin"),
      net: sum((r) => r.kind === "earnings" && r.identityId === me.id),
    };
  });
  const monthAgo = isoDaysAgo(30);
  const net = mine.filter((r) => r.kind === "earnings" && r.createdAt > monthAgo).reduce((n, r) => n + r.amountCents, 0);
  const gross = rows.reduce((n, r) => n + r.gross, 0);
  const platform = rows.reduce((n, r) => n + r.platform, 0);
  const summary = cashoutSummary(s, me.id);
  const payouts = payoutsFor(s, me.id);

  return (
    <>
      <Breadcrumbs items={[{ label: "Earnings" }]} />
      <PageBody>
        <PageHeader title="Earnings" subtitle="Per conversation: gross, what the platform keeps, what you get. Real ledger rows, no estimates." />
        {rows.length === 0 ? (
          <EmptyState icon={TrendingUp} heading="Nothing earned yet" body="Publish an agent. You're credited each time someone uses it." action={{ label: "Publish agent", href: "/build" }} />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label="Net this month" value={formatCredits(net)} caption={formatUsd(net)} tone="success" testId="earnings-net" />
              <StatTile label="Gross" value={formatCredits(gross)} caption="Raw cost × your multiplier" />
              <StatTile label="Platform share" value={formatCredits(platform)} caption="Raw cost + 15% of margin" />
              <StatTile label="Cash-out" value={formatCredits(summary.lifetimeCashoutCents)} caption={`${payouts.length} requested · ${formatCredits(summary.availableCents)} available`} />
            </div>
              <Toolbar>
              <CashoutButton />
            </Toolbar>
            <DataTable head={[{ label: "Conversation" }, { label: "Agent" }, { label: "Messages", numeric: true }, { label: "Gross", numeric: true }, { label: "Platform", numeric: true }, { label: "Net to you", numeric: true }]}>
              {rows.map((r) => (
                <tr key={r.id} data-testid="earnings-row">
                  <td>{r.title}</td>
                  <td className="text-fg-tertiary">{r.agent}</td>
                  <Num><NumberPill value={r.messages} /></Num>
                  <Num>{r.gross}</Num>
                  <Num className="text-fg-muted">{r.platform}</Num>
                  <Num className="text-success">+{r.net}</Num>
                </tr>
              ))}
            </DataTable>
            {payouts.length > 0 && (
              <section className="mb-6">
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
          </>
        )}
      </PageBody>
    </>
  );
}
