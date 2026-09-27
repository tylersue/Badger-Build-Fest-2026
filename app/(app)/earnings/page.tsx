"use client";

import Link from "next/link";
import { Banknote, Clock, History, TrendingUp } from "lucide-react";
import { CashoutButton } from "@/components/earnings/cashout-dialog";
import { InlineEmpty, LedgerActivity, Metric, MetricRow, SectionHeader, creditUnit, displayCredits, signedCredits } from "@/components/app/dashboard-kit";
import { Breadcrumbs, PageBody, PageHeader, Pill, buttonClass } from "@/components/app/ui";
import { cashoutSummary } from "@/features/billing/cashout";
import { earningsByConversation, earningsTotals, type ConversationEarnings } from "@/features/billing/earnings";
import { currentIdentity, ledgerFor, payoutsFor, useDemo } from "@/lib/demo-store";
import { formatUsd, isoDaysAgo } from "@/lib/format";
import type { LedgerEntry } from "@/lib/types";

const TREND_DAYS = 14;

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
  const byAgent = groupByAgent(conversationRows);

  return (
    <>
      <Breadcrumbs items={[{ label: "Earnings" }]} />
      <PageBody>
        <div className="max-w-[960px]">
          <PageHeader title="Earnings" />

          <section aria-label="Earnings summary" className="rounded-xl border border-line-subtle bg-surface-1">
            <div className="flex flex-wrap items-end justify-between gap-6 p-6">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-fg-tertiary">Net earnings, last 30 days</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span data-testid="earnings-net" className="text-[40px] leading-none font-semibold tracking-[-0.02em] text-success tabular-nums">
                    {displayCredits(netThisMonth)}
                  </span>
                  <span className="text-base text-fg-muted">{creditUnit(netThisMonth)}</span>
                </div>
                <div className="mt-2 text-[13px] text-fg-muted tabular-nums">
                  {formatUsd(netThisMonth)} · {displayCredits(cashout.availableCents)} {creditUnit(cashout.availableCents)} available to cash out
                </div>
              </div>
              <div className="flex flex-col items-end gap-4">
                <EarningsTrend history={history} />
                <CashoutButton />
              </div>
            </div>
            <div className="border-t border-line-subtle px-6 py-4">
              <MetricRow>
                <Metric label="Gross" value={displayCredits(totals.grossCents)} unit={creditUnit(totals.grossCents)} caption="Raw cost × your multiplier" />
                <Metric label="Platform share" value={displayCredits(totals.platformCents)} unit={creditUnit(totals.platformCents)} caption="Raw cost + 15% of margin" />
                <Metric label="Net to you" value={displayCredits(totals.netCents)} unit={creditUnit(totals.netCents)} tone="success" caption="All conversations" />
                <Metric label="Cashed out" value={displayCredits(cashout.lifetimeCashoutCents)} unit={creditUnit(cashout.lifetimeCashoutCents)} caption={`${payouts.length} ${payouts.length === 1 ? "payout" : "payouts"} requested`} />
              </MetricRow>
              {totals.grossCents > 0 && <SplitBar platform={totals.platformCents} net={totals.netCents} />}
            </div>
          </section>

          {conversationRows.length === 0 ? (
            <section className="mt-8">
              <SectionHeader title="By conversation" />
              <div className="rounded-xl border border-line-subtle bg-surface-1">
                <InlineEmpty
                  icon={TrendingUp}
                  heading="Nothing earned yet"
                  body="Publish an agent. You're credited each time someone uses it."
                  action={<Link href="/build" className={buttonClass("primary")}>Publish agent</Link>}
                />
              </div>
            </section>
          ) : (
            <>
              <section className="mt-8">
                <SectionHeader title="By agent" count={byAgent.length} />
                <ul className="divide-y divide-line-subtle overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
                  {byAgent.map((agent) => (
                    <li key={agent.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 px-4 py-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{agent.name}</div>
                        <div className="text-xs text-fg-muted">
                          {agent.conversations} {agent.conversations === 1 ? "conversation" : "conversations"}
                          {agent.messages > 0 && <> · {agent.messages} messages</>}
                        </div>
                      </div>
                      <div className="order-last col-span-2 sm:order-none sm:col-span-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-success/70" style={{ width: `${Math.max(2, (agent.net / Math.max(byAgent[0].net, 1e-9)) * 100)}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-fg-muted tabular-nums">
                          Gross {displayCredits(agent.gross)} · Platform {displayCredits(agent.platform)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-success tabular-nums">{signedCredits(agent.net)}</div>
                        <div className="text-xs text-fg-muted">net</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-8">
                <SectionHeader title="By conversation" count={conversationRows.length} />
                <div className="overflow-x-auto rounded-xl border border-line-subtle bg-surface-1">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line-subtle text-xs text-fg-muted">
                        <th className="h-9 px-4 text-left font-medium">Conversation</th>
                        <th className="h-9 px-4 text-right font-medium">Messages</th>
                        <th className="h-9 px-4 text-right font-medium">Gross</th>
                        <th className="h-9 px-4 text-right font-medium">Platform</th>
                        <th className="h-9 px-4 text-right font-medium">Net to you</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-subtle">
                      {conversationRows.map((row) => (
                        <tr key={row.conversationId} data-testid="earnings-row" className="transition-colors hover:bg-surface-2">
                          <td className="max-w-0 px-4 py-2">
                            <div className="truncate font-medium">{row.title}</div>
                            <div className="truncate text-xs text-fg-muted">{row.agentName || "Unknown agent"}</div>
                          </td>
                          <td className="px-4 py-2 text-right text-fg-tertiary tabular-nums">{row.messages === null ? "—" : row.messages}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{displayCredits(row.grossCents)}</td>
                          <td className="px-4 py-2 text-right text-fg-muted tabular-nums">{displayCredits(row.platformCents)}</td>
                          <td className="px-4 py-2 text-right font-medium text-success tabular-nums">{signedCredits(row.netCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-line-default bg-surface-2">
                        <td className="px-4 py-2 font-semibold">Total</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">{displayCredits(totals.grossCents)}</td>
                        <td className="px-4 py-2 text-right text-fg-tertiary tabular-nums">{displayCredits(totals.platformCents)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-success tabular-nums">{signedCredits(totals.netCents)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </>
          )}

          {payouts.length > 0 && (
            <section className="mt-8">
              <SectionHeader title="Payouts" count={payouts.length} />
              <ul className="divide-y divide-line-subtle overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
                {payouts.map((payout) => (
                  <li key={payout.id} data-testid="payout-row" className="flex min-h-14 items-center gap-4 px-4 py-2">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md border border-line-subtle bg-surface-3 text-fg-tertiary">
                      <Banknote className="size-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium tabular-nums">{formatUsd(payout.amountUsdCents)}</div>
                      <div className="text-xs text-fg-muted tabular-nums">
                        {displayCredits(payout.credits)} {creditUnit(payout.credits)} · {new Date(payout.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <Pill><Clock className="size-3" strokeWidth={2} />Requested</Pill>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <SectionHeader title="Wallet history" />
            {history.length === 0 ? (
              <div className="rounded-xl border border-line-subtle bg-surface-1">
                <InlineEmpty
                  icon={History}
                  heading="No activity yet"
                  body="Activity appears here when you build, chat, or top up."
                  action={<Link href="/wallet" className={buttonClass("secondary")}>Open wallet</Link>}
                />
              </div>
            ) : (
              <LedgerActivity rows={history} rowTestId="earnings-history-row" />
            )}
          </section>
        </div>
      </PageBody>
    </>
  );
}

function groupByAgent(rows: ConversationEarnings[]) {
  const map = new Map<string, { name: string; conversations: number; messages: number; gross: number; platform: number; net: number }>();
  for (const row of rows) {
    const name = row.agentName || "Unknown agent";
    const entry = map.get(name) ?? { name, conversations: 0, messages: 0, gross: 0, platform: 0, net: 0 };
    entry.conversations += 1;
    entry.messages += row.messages ?? 0;
    entry.gross += row.grossCents;
    entry.platform += row.platformCents;
    entry.net += row.netCents;
    map.set(name, entry);
  }
  return [...map.values()].sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));
}

/* Where each gross credit went: platform share vs net to the expert. */
function SplitBar({ platform, net }: { platform: number; net: number }) {
  const total = platform + net;
  if (total <= 0) return null;
  const netPct = Math.round((net / total) * 100);
  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${netPct}% of gross goes to you`}>
        <div className="h-full bg-success/70" style={{ width: `${(net / total) * 100}%` }} />
        <div className="h-full bg-fg-muted/40" style={{ width: `${(platform / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success/70" />You keep {netPct}% of gross</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-fg-muted/40" />Platform {100 - netPct}%</span>
      </div>
    </div>
  );
}

/* 14-day net earnings, one bar per day. Plain divs, no chart library. */
function EarningsTrend({ history }: { history: LedgerEntry[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: TREND_DAYS }, (_, i) => {
    const day = new Date(start.getTime() - (TREND_DAYS - 1 - i) * 86_400_000);
    const next = day.getTime() + 86_400_000;
    const net = history
      .filter((row) => row.kind === "earnings")
      .filter((row) => { const t = new Date(row.createdAt).getTime(); return t >= day.getTime() && t < next; })
      .reduce((n, row) => n + row.amountCents, 0);
    return { day, net };
  });
  const max = Math.max(...days.map((d) => d.net), 0);
  if (max <= 0) return null;
  return (
    <div className="text-right">
      <div className="flex h-10 items-end gap-1" role="img" aria-label="Net earnings per day, last 14 days">
        {days.map(({ day, net }) => (
          <div
            key={day.toISOString()}
            title={`${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${signedCredits(net)} ${creditUnit(net)}`}
            className={net > 0 ? "w-2 rounded-sm bg-success/70" : "w-2 rounded-sm bg-surface-3"}
            style={{ height: net > 0 ? `${Math.max(12, (net / max) * 100)}%` : "2px" }}
          />
        ))}
      </div>
      <div className="mt-1 text-xs text-fg-muted">Last 14 days</div>
    </div>
  );
}
