"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, BadgeCheck, Plus, Store } from "lucide-react";
import { Breadcrumbs, DataTable, EmptyState, Num, PageBody, PageHeader, Pill, PlaceholderNote, SearchField, Toolbar, AgentTile, buttonClass } from "@/components/app/ui";
import { allAgents, currentIdentity, displayName, useDemo } from "@/lib/demo-store";
import { CATEGORIES, CATEGORY_GRADIENTS, categoryLabel, type Category } from "@/lib/config/categories";
import { typicalMessageCents } from "@/features/billing/pricing";
import { cn } from "@/lib/utils";

type Sort = "rating" | "newest" | "used";
const SORT_LABELS: Record<Sort, string> = { rating: "Rating", newest: "Newest", used: "Most used" };

export function MarketplaceView() {
  const s = useDemo();
  const me = currentIdentity(s);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [category, setCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<Sort>("rating");

  const agents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAgents(s)
      .filter((a) => a.status === "published")
      .filter((a) => category === "all" || a.persona.category === category)
      .filter((a) => !q || `${a.persona.name} ${a.persona.description} ${a.persona.headline}`.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "rating" ? b.ratingAvg - a.ratingAvg : sort === "used" ? b.usageCount - a.usageCount : b.createdAt.localeCompare(a.createdAt),
      );
  }, [s, query, category, sort]);

  const nextSort: Record<Sort, Sort> = { rating: "newest", newest: "used", used: "rating" };

  return (
    <>
      <Breadcrumbs items={[{ label: "Marketplace" }]} />
      <PageBody>
        <PageHeader title="Marketplace" subtitle="Agents built from real experts' own answers. Every reply cites what they said." />
        <Toolbar>
          {me.kind === "expert" && (
            <Link href="/build/new" className={buttonClass("primary")}>
              <Plus />
              New agent
            </Link>
          )}
          <SearchField placeholder="Search by name…" value={query} onChange={setQuery} />
          <div className="inline-flex overflow-hidden rounded border border-line-muted">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("h-[22px] px-2 text-[13px] capitalize", view === v ? "bg-surface-3 text-foreground" : "text-fg-tertiary")}>
                {v}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "all")}
            className="h-6 rounded border border-line-muted bg-surface-1 px-2 text-[13px] text-fg-secondary"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button onClick={() => setSort(nextSort[sort])} className={buttonClass("secondary")}>
            <ArrowDownUp />
            {SORT_LABELS[sort]}
          </button>
        </Toolbar>

        {agents.length === 0 ? (
          <EmptyState icon={Store} heading="No agents published yet" body="Build the first one from an interview." action={{ label: "New agent", href: "/build/new" }} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a) => (
              <Link
                key={a.id}
                href={`/agents/${a.slug}`}
                data-testid="agent-card"
                className="overflow-hidden rounded-xl border border-line-subtle bg-surface-1 transition-colors hover:border-line-default"
              >
                <div className="aspect-video" style={{ background: CATEGORY_GRADIENTS[a.persona.category] }} />
                <div className="flex gap-3 p-4">
                  <AgentTile icon={a.icon} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">{a.persona.name}</h4>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-fg-muted">{a.persona.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 text-xs text-fg-muted">
                  <Pill>{categoryLabel(a.persona.category)}</Pill>
                  <span>★ {a.ratingAvg.toFixed(1)} ({a.ratingCount})</span>
                  <span>{typicalMessageCents(a.rateMultiplier)} credits / msg</span>
                  <span className="ml-auto flex items-center gap-1">
                    by {displayName(s, a.ownerId)}
                    <BadgeCheck className="size-3 text-selected-fg" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <DataTable head={[{ label: "Agent" }, { label: "Category" }, { label: "Expert" }, { label: "Rating", numeric: true }, { label: "Chats", numeric: true }, { label: "Credits / msg", numeric: true }]}>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/agents/${a.slug}`} className="flex items-center gap-2 hover:text-selected-fg">
                    <AgentTile icon={a.icon} size="sm" />
                    {a.persona.name}
                  </Link>
                </td>
                <td className="text-fg-tertiary">{categoryLabel(a.persona.category)}</td>
                <td className="text-fg-tertiary">{displayName(s, a.ownerId)}</td>
                <Num className="text-success">{a.ratingAvg.toFixed(1)}</Num>
                <Num>{a.usageCount}</Num>
                <Num>{typicalMessageCents(a.rateMultiplier)}</Num>
              </tr>
            ))}
          </DataTable>
        )}
        <PlaceholderNote feature="marketplace queries" phase={3} />
      </PageBody>
    </>
  );
}
