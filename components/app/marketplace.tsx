"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, Plus, Search, Store, X } from "lucide-react";
import { Breadcrumbs, EmptyState, IdentityAvatar, PageBody, PageHeader, Pill, buttonClass } from "@/components/app/ui";
import { allAgents, currentIdentity, displayName, identityById, profileFor, useDemo } from "@/lib/demo-store";
import { CATEGORIES, categoryLabel, type Category } from "@/lib/config/categories";
import { typicalMessageCents } from "@/features/billing/pricing";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

type Sort = "rating" | "newest" | "used";
const SORT_LABELS: Record<Sort, string> = { rating: "Rating", newest: "Newest", used: "Most used" };
const NEXT_SORT: Record<Sort, Sort> = { rating: "newest", newest: "used", used: "rating" };

/* Marketplace: one wide search field, category chips, then a grid of agent cards in the Kore.ai marketplace shape. */
export function MarketplaceView() {
  const s = useDemo();
  const me = currentIdentity(s);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<Sort>("rating");

  const agents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAgents(s)
      .filter((a) => a.status === "published")
      .filter((a) => category === "all" || a.persona.category === category)
      .filter(
        (a) =>
          !q ||
          `${a.persona.name} ${a.persona.headline} ${a.persona.description} ${categoryLabel(a.persona.category)} ${displayName(s, a.ownerId)}`
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) =>
        sort === "rating" ? b.ratingAvg - a.ratingAvg : sort === "used" ? b.usageCount - a.usageCount : b.createdAt.localeCompare(a.createdAt),
      );
  }, [s, query, category, sort]);

  const chips: { id: Category | "all"; label: string }[] = [{ id: "all", label: "All" }, ...CATEGORIES];

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Marketplace" }]}
        actions={
          me.kind === "expert" ? (
            <Link href="/build/new" className={buttonClass("primary")}>
              <Plus />
              New agent
            </Link>
          ) : undefined
        }
      />
      <PageBody>
        <PageHeader title="Marketplace" subtitle="Agents built from real experts' own answers. Every reply cites what they said." />

        <label className="flex h-10 items-center gap-2.5 rounded-lg border border-line-default bg-surface-2 px-3 text-sm focus-within:border-brand-border">
          <Search className="size-4 shrink-0 text-fg-muted" />
          <input
            data-testid="marketplace-search"
            type="search"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-fg-muted [&::-webkit-search-cancel-button]:hidden"
            placeholder="Search agents by name, topic or expert…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded text-fg-muted hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </label>

        <div className="mt-3 mb-4 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={active}
                className={cn(
                  "h-7 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  active ? "border-brand-border bg-brand text-primary-foreground" : "border-line-subtle text-fg-tertiary hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            );
          })}
          <span className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
            {agents.length} {agents.length === 1 ? "agent" : "agents"}
            <button type="button" onClick={() => setSort(NEXT_SORT[sort])} className={buttonClass("secondary")}>
              <ArrowDownUp />
              {SORT_LABELS[sort]}
            </button>
          </span>
        </div>

        {agents.length === 0 ? (
          query || category !== "all" ? (
            <EmptyState icon={Store} heading="No agents match" body="Try another name, topic or category." />
          ) : (
            <EmptyState icon={Store} heading="No agents published yet" body="Build the first one from an interview." action={{ label: "New agent", href: "/build/new" }} />
          )
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {agents.map((a) => (
              <li key={a.id} className="flex">
                <AgentCard agent={a} />
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}

/* The card leads with the expert (DESIGN.md): who they are, what the agent helps with, then category and price. */
function AgentCard({ agent: a }: { agent: Agent }) {
  const s = useDemo();
  const owner = identityById(a.ownerId);
  const profile = profileFor(s, a.ownerId);
  return (
    <Link
      href={`/agents/${a.slug}`}
      data-testid="agent-card"
      className="group flex w-full flex-col rounded-xl border border-line-subtle bg-surface-1 p-4 transition-colors hover:border-line-outline focus-visible:border-brand-border focus-visible:outline-none"
    >
      <div className="flex items-center gap-3">
        <IdentityAvatar initial={owner.avatarInitial} photoUrl={profile.photoUrl} />
        <div className="min-w-0">
          <h2 className="truncate text-[15px] leading-tight font-semibold">{displayName(s, a.ownerId)}</h2>
          <p className="mt-1 truncate text-xs text-fg-muted">{[profile.field, profile.credentials].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-snug font-medium">{a.persona.headline || a.persona.name}</p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{a.persona.description}</p>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <Pill>{categoryLabel(a.persona.category)}</Pill>
        <span className="ml-auto text-xs text-fg-muted tabular-nums">{typicalMessageCents(a.rateMultiplier)} credits / msg</span>
      </div>
    </Link>
  );
}
