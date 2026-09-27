"use client";

import { useState } from "react";
import { SearchX, Wallet } from "lucide-react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { InlineEmpty, LEDGER_KIND_TITLES, LedgerActivity, Metric, MetricRow, SectionHeader, Segmented, creditUnit, displayCredits } from "@/components/app/dashboard-kit";
import { Breadcrumbs, PageBody, PageHeader, SearchField } from "@/components/app/ui";
import { currentIdentity, ledgerFor, useDemo, walletStatus } from "@/lib/demo-store";
import { PURPOSE_LABELS } from "@/lib/config/credits";
import { formatCreditUnits, formatUsd, isoDaysAgo } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config/demo";

type Filter = "all" | "in" | "out";

const unitsToCredits = (units: string) => Number(BigInt(units)) / 10_000_000;

/* Wallet (CRED-01, CRED-06): balance, mock funding, full ledger history. */
export default function WalletPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const rows = ledgerFor(s, me.id);
  const wallet = walletStatus(s);
  const balance = unitsToCredits(wallet.balanceUnits);
  const held = unitsToCredits(wallet.heldUnits);
  const available = unitsToCredits(wallet.availableUnits);
  const weekAgo = isoDaysAgo(7);
  const monthAgo = isoDaysAgo(30);
  const debitsThisWeek = rows.filter((r) => r.kind === "debit" && r.createdAt > weekAgo);
  const spentThisWeek = -debitsThisWeek.reduce((n, r) => n + r.amountCents, 0);
  const byPurpose = (p: keyof typeof PURPOSE_LABELS) => -debitsThisWeek.filter((r) => r.purpose === p).reduce((n, r) => n + r.amountCents, 0);
  const added = rows.filter((r) => r.amountCents > 0 && r.createdAt > monthAgo).reduce((n, r) => n + r.amountCents, 0);
  const breakdown = (["interview_turn", "chat_message", "sandbox_message", "embedding"] as const)
    .map((p) => [PURPOSE_LABELS[p], byPurpose(p)] as const)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} ${displayCredits(v)}`)
    .join(" · ");

  const incomingCount = rows.filter((r) => r.amountCents > 0).length;
  const matchesFilter = (r: (typeof rows)[number]) => filter === "all" || (filter === "in" ? r.amountCents > 0 : r.amountCents <= 0);
  const visible = rows.filter(
    (r) => matchesFilter(r) && (!query || `${r.note} ${LEDGER_KIND_TITLES[r.kind]} ${r.purpose ? PURPOSE_LABELS[r.purpose] : ""}`.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <>
      <Breadcrumbs items={[{ label: "Wallet" }]} />
      <PageBody>
        <div className="max-w-[960px]">
          <PageHeader title="Wallet" />

          <section aria-label="Balance" className="rounded-xl border border-line-subtle bg-surface-1">
            <div className="flex flex-wrap items-end justify-between gap-6 p-6">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-fg-tertiary">Balance</div>
                <div className="mt-2 flex items-baseline gap-2">
                  {/* Demo mode shows the prepaid balance in dollars; tokens are what messages are priced in. */}
                  <span data-testid="wallet-balance" title={formatCreditUnits(wallet.balanceUnits)} className="text-[40px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                    {DEMO_MODE ? formatUsd(balance) : displayCredits(balance)}
                  </span>
                  {!DEMO_MODE && <span className="text-base text-fg-muted">{creditUnit(balance)}</span>}
                </div>
                <div className="mt-2 text-[13px] text-fg-muted tabular-nums">
                  {DEMO_MODE ? "1 token = $1.00 · prepaid" : `${formatUsd(balance)} equivalent`}
                  {held > 0 && <> · {displayCredits(available)} available now</>}
                </div>
              </div>
              <AddCreditsButton />
            </div>
            <div className="border-t border-line-subtle px-6 py-4">
              <MetricRow>
                <Metric label="Spent this week" value={displayCredits(spentThisWeek)} unit={creditUnit(spentThisWeek)} caption={breakdown || "Nothing spent yet"} />
                <Metric label="Added this month" value={displayCredits(added)} unit={creditUnit(added)} caption="Seed, plans, packs and earnings" />
                <Metric label="Pending holds" value={displayCredits(held)} unit={creditUnit(held)} caption={held > 0 ? "Reserved for replies in progress" : "No replies in progress"} />
              </MetricRow>
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader
              title="Activity"
              actions={
                <>
                  <Segmented<Filter>
                    label="Filter activity"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: "all", label: "All", count: rows.length },
                      { value: "in", label: "Money in", count: incomingCount },
                      { value: "out", label: "Money out", count: rows.length - incomingCount },
                    ]}
                  />
                  <SearchField placeholder="Search activity…" value={query} onChange={setQuery} />
                </>
              }
            />
            {rows.length === 0 ? (
              <div className="rounded-xl border border-line-subtle bg-surface-1">
                <InlineEmpty icon={Wallet} heading="No activity yet" body="Activity appears here when you build, chat, or top up." />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-line-subtle bg-surface-1">
                <InlineEmpty icon={SearchX} heading="Nothing matches" body="Try a different search or switch the filter back to All." />
              </div>
            ) : (
              <LedgerActivity rows={visible} rowTestId="ledger-row" />
            )}
          </section>
        </div>
      </PageBody>
    </>
  );
}
