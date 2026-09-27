"use client";

import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs, Card, DataTable, Num, PageBody, PageHeader, Pill } from "@/components/app/ui";
import { IdentityLogo } from "@/components/app/identity-logo";
import { BENCHMARK_SUITE_CAPTION, NotPublishedPill, SampleDataLabel, ScoreBar } from "@/components/benchmark/benchmark-ui";
import { useBenchmarkBoard } from "@/components/benchmark/use-benchmarks";
import { displayName, useDemo, type DemoState } from "@/lib/demo-store";
import { CATEGORIES, categoryLabel, type Category } from "@/lib/config/categories";
import { BENCHMARK_DIMENSIONS, dimensionScore, formatMetric, type RankedBenchmark } from "@/features/benchmark/score";
import type { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: readonly { id: Category | "all"; label: string }[] = [{ id: "all", label: "All" }, ...CATEGORIES];

/** Seed agent names read "Expert Name · Topic"; the expert has their own column, so show the topic. */
function agentTitle(agent: Agent, expert: string): string {
  const prefix = `${expert} · `;
  return agent.persona.name.startsWith(prefix) ? agent.persona.name.slice(prefix.length) : agent.persona.name;
}

function agentHref(row: RankedBenchmark, mine: boolean): string {
  return row.live && mine ? `/build/${row.agent.id}` : `/agents/${row.agent.slug}`;
}

function Expert({ s, ownerId, you }: { s: DemoState; ownerId: string; you: boolean }) {
  const name = displayName(s, ownerId);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <IdentityLogo identityId={ownerId} size={22} />
      <span className="truncate">{name}</span>
      {you && <Pill className="shrink-0">You</Pill>}
    </span>
  );
}

export default function BenchmarksPage() {
  const s = useDemo();
  const [category, setCategory] = useState<Category | "all">("all");
  const board = useBenchmarkBoard(category);
  const mine = board.everyone.filter((row) => row.agent.ownerId === board.me.id);
  const publishedInView = board.rows.filter((row) => !row.live).length;

  return <>
    <Breadcrumbs items={[{ label: "Benchmarks" }]} />
    <PageBody>
      <PageHeader title="Benchmarks" />

      {mine.length > 0 && (
        <section aria-label="Your agents" className="mb-8" data-testid="benchmark-your-agents">
          <h2 className="mb-3 text-base font-semibold">Your agents</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((row) => <YourAgentCard key={row.agentId} row={row} publishedCount={board.publishedCount} knowledgeItems={board.knowledgeItems(row.agent)} />)}
          </div>
        </section>
      )}

      <section aria-label="Benchmark leaderboard">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Leaderboard</h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {publishedInView} published {publishedInView === 1 ? "agent" : "agents"} ranked by overall score
              {board.medianScore !== null && category === "all" ? ` · platform median ${board.medianScore}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Benchmark category">
            {FILTERS.map((filter) => {
              const active = category === filter.id;
              return (
                <button key={filter.id} type="button" aria-pressed={active} onClick={() => setCategory(filter.id)}
                  className={cn("h-7 rounded-full border px-3 text-[13px] font-medium transition-colors",
                    active ? "border-brand-border bg-brand text-primary-foreground" : "border-line-subtle text-fg-tertiary hover:bg-surface-2 hover:text-foreground")}>
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <DataTable head={[{ label: "Rank", numeric: true }, { label: "Agent" }, { label: "Expert" }, { label: "Category" }, { label: "Overall", numeric: true }, ...BENCHMARK_DIMENSIONS.map((dim) => ({ label: dim.label, numeric: true }))]}>
            {board.rows.map((row) => {
              const you = row.agent.ownerId === board.me.id;
              const expert = displayName(s, row.agent.ownerId);
              return (
                <tr key={row.agentId} data-testid="benchmark-row" data-mine={you || undefined} className={cn(you && "bg-surface-2/60")}>
                  <Num className="w-14 font-medium">{row.rank ?? <span className="text-fg-muted" title={`Would place #${row.placement}`}>–</span>}</Num>
                  <td className="min-w-52">
                    <span className="flex items-center gap-2">
                      <Link href={agentHref(row, you)} className="truncate font-medium hover:underline underline-offset-2">{agentTitle(row.agent, expert)}</Link>
                      {row.live && <NotPublishedPill />}
                    </span>
                  </td>
                  <td className="min-w-44"><Expert s={s} ownerId={row.agent.ownerId} you={you} /></td>
                  <td className="whitespace-nowrap text-fg-tertiary">{categoryLabel(row.agent.persona.category)}</td>
                  <Num>
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="w-12"><ScoreBar value={row.score} strong={you} /></span>
                      <strong className="w-6 text-right">{row.score}</strong>
                    </span>
                  </Num>
                  {BENCHMARK_DIMENSIONS.map((dim) => <Num key={dim.id} className="text-fg-secondary">{formatMetric(dim, row.metrics[dim.id])}</Num>)}
                </tr>
              );
            })}
          </DataTable>
          {board.rows.length === 0 && (
            <p className="py-10 text-center text-[13px] text-fg-muted">
              {board.loading ? "Loading agents…" : "No agents in this category yet."}
            </p>
          )}
        </div>
      </section>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">How scores are computed</h2>
          <SampleDataLabel />
        </div>
        <p className="mt-1 text-[13px] text-fg-muted">
          Overall is a weighted average of five 0–100 metric scores. Published agents keep the result of their last full run.
          Drafts are re-scored live as the expert adds interview answers and documents.
        </p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2 xl:grid-cols-3">
          {BENCHMARK_DIMENSIONS.map((dim) => (
            <li key={dim.id}>
              <div className="flex justify-between gap-3"><span className="font-medium">{dim.label}</span><span className="tabular-nums text-fg-muted">{Math.round(dim.weight * 100)}% of overall</span></div>
              <p className="mt-0.5 text-xs text-fg-muted">{dim.description}{dim.direction === "lower" ? " Lower is better." : ""}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-fg-muted">{BENCHMARK_SUITE_CAPTION} Results also reflect persona completeness, ratings and usage.</p>
      </Card>
    </PageBody>
  </>;
}

function YourAgentCard({ row, publishedCount, knowledgeItems }: { row: RankedBenchmark; publishedCount: number; knowledgeItems: number | null }) {
  const placement = publishedCount === 0 ? "No published agents to compare against yet"
    : row.live ? `Would place #${row.placement} of ${publishedCount + 1} if published` : `#${row.rank} of ${publishedCount} published agents`;
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={agentHref(row, true)} className="block truncate text-sm font-medium hover:underline underline-offset-2">{row.agent.persona.name}</Link>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{categoryLabel(row.agent.persona.category)}</p>
        </div>
        {row.live && <NotPublishedPill />}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl leading-none font-semibold tabular-nums" data-testid="your-agent-score">{row.score}</span>
        <span className="text-xs text-fg-muted">/ 100</span>
        <span className="ml-auto text-right text-xs font-medium">{placement}</span>
      </div>
      <dl className="mt-4 space-y-2">
        {BENCHMARK_DIMENSIONS.map((dim) => (
          <div key={dim.id} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-xs">
            <dt className="truncate text-fg-muted">{dim.label}</dt>
            <ScoreBar value={dimensionScore(dim, row.metrics[dim.id])} strong />
            <dd className="text-right tabular-nums">{formatMetric(dim, row.metrics[dim.id])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-4 text-xs text-fg-muted">
        {row.live
          ? <>Scored live from {knowledgeItems ?? 0} knowledge {knowledgeItems === 1 ? "item" : "items"}. <Link href={`/build/${row.agent.id}`} className="font-medium text-foreground hover:underline underline-offset-2">Keep building</Link> to raise it.</>
          : <><Link href={`/agents/${row.agent.slug}`} className="font-medium text-foreground hover:underline underline-offset-2">View listing</Link> · {row.agent.ratingCount} {row.agent.ratingCount === 1 ? "rating" : "ratings"}, {row.agent.usageCount} {row.agent.usageCount === 1 ? "use" : "uses"}</>}
      </p>
    </Card>
  );
}
