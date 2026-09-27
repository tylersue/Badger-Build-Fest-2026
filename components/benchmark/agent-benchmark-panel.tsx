"use client";

import Link from "next/link";
import { categoryLabel } from "@/lib/config/categories";
import type { Agent } from "@/lib/types";
import { BENCHMARK_DIMENSIONS, dimensionScore, formatMetric, SUITE_SCENARIOS } from "@/features/benchmark/score";
import { NotPublishedPill, SampleDataLabel, ScoreBar } from "@/components/benchmark/benchmark-ui";
import { useAgentBenchmark } from "@/components/benchmark/use-benchmarks";

/** Benchmark tab on the agent listing: overall score, placement, and each metric against the platform median. */
export function AgentBenchmarkPanel({ agent }: { agent: Agent }) {
  const view = useAgentBenchmark(agent);
  const { result, overall, inCategory, publishedCount, categoryCount, median } = view;
  const category = categoryLabel(agent.persona.category);

  const placement = publishedCount === 0 ? "No published agents to compare against yet"
    : result.live ? `Would place #${overall?.placement ?? 1} of ${publishedCount + 1} once published`
    : `#${overall?.rank ?? 1} of ${publishedCount} published agents`;
  const categoryPlacement = inCategory && categoryCount > 0
    ? result.live ? `would place #${inCategory.placement} of ${categoryCount} in ${category}` : `#${inCategory.rank} of ${categoryCount} in ${category}`
    : null;

  return (
    <div data-testid="agent-benchmark-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Proxier benchmark</h2>
            {result.live && <NotPublishedPill />}
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">The same {SUITE_SCENARIOS} founder scenarios every agent on Proxier runs.</p>
        </div>
        <SampleDataLabel />
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-1" data-testid="agent-benchmark-score">
          <span className="text-4xl leading-none font-semibold tabular-nums">{result.score}</span>
          <span className="text-sm text-fg-muted">/ 100</span>
        </div>
        <div className="text-[13px]">
          <div className="font-medium">{placement}</div>
          {categoryPlacement && <div className="text-fg-muted">{categoryPlacement.charAt(0).toUpperCase() + categoryPlacement.slice(1)}</div>}
        </div>
      </div>
      {result.live && view.knowledgeItems !== null && (
        <p className="mt-2 text-xs text-fg-muted">Scored live from {view.knowledgeItems} knowledge {view.knowledgeItems === 1 ? "item" : "items"}. More interview answers and documents raise grounding and citation scores.</p>
      )}

      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {BENCHMARK_DIMENSIONS.map((dim) => {
          const value = result.metrics[dim.id];
          const reference = median?.[dim.id];
          return (
            <div key={dim.id}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <dt title={dim.description}>{dim.label}</dt>
                <dd className="font-medium tabular-nums">{formatMetric(dim, value)}</dd>
              </div>
              <div className="mt-1.5"><ScoreBar value={dimensionScore(dim, value)} strong marker={reference === undefined ? undefined : dimensionScore(dim, reference)} /></div>
              <p className="mt-1 text-xs text-fg-muted">{reference === undefined ? dim.description : `Platform median ${formatMetric(dim, reference)}${dim.direction === "lower" ? " · lower is better" : ""}`}</p>
            </div>
          );
        })}
      </dl>

      <p className="mt-5 text-xs text-fg-muted">
        Overall is a weighted average of the five metrics. <Link href="/benchmarks" className="font-medium text-foreground underline-offset-2 hover:underline">See the full leaderboard</Link>
      </p>
    </div>
  );
}
