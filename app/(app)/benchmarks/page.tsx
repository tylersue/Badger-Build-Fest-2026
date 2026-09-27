"use client";

import { useState } from "react";
import { AgentTile, Breadcrumbs, Card, DataTable, Num, PageBody, PageHeader, Pill } from "@/components/app/ui";
import { AgentBenchmarkPanel } from "@/components/benchmark/agent-benchmark-panel";
import { SampleDataLabel, ScoreBar } from "@/components/benchmark/benchmark-ui";
import { allAgents, useDemo } from "@/lib/demo-store";
import { BENCHMARK_SAMPLE_CAPTION } from "@/lib/data/benchmarks";
import { CATEGORIES, type Category } from "@/lib/config/categories";
import { agentBenchmarkRow, BENCHMARK_DIMENSIONS, leaderboard } from "@/features/benchmark/score";
import type { Agent } from "@/lib/types";

const FILTERS: readonly { id: Category | "all"; label: string }[] = [{ id: "all", label: "All" }, ...CATEGORIES];

function metric(value: number, unit: string): string {
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  return unit === "%" ? `${number}%` : `${number} ${unit}`;
}

export default function BenchmarksPage() {
  const state = useDemo();
  const agents = allAgents(state);
  const published = agents.filter((agent) => agent.status === "published");
  const benchmarked = published.filter((agent) => agentBenchmarkRow(agent));
  const [category, setCategory] = useState<Category | "all">("all");
  const [agentId, setAgentId] = useState(benchmarked[0]?.id ?? "");
  const selected = benchmarked.find((agent) => agent.id === agentId) ?? benchmarked[0];
  const rows = leaderboard(agents, category);

  return <>
    <Breadcrumbs items={[{ label: "Benchmarks" }]} />
    <PageBody>
      <PageHeader title="Benchmarks" subtitle="Our expert agents against general-purpose agents on an internal suite built on τ²-bench, BFCL and GAIA task formats." />
      <div className="mb-5 flex flex-wrap items-center gap-2"><SampleDataLabel /><span className="text-xs text-fg-muted">{BENCHMARK_SAMPLE_CAPTION}</span></div>
      <div className="mb-4 flex flex-wrap gap-1" aria-label="Benchmark category">
        {FILTERS.map((filter) => <button key={filter.id} type="button" aria-pressed={category === filter.id} onClick={() => setCategory(filter.id)} className={`rounded px-3 py-1.5 text-[13px] ${category === filter.id ? "bg-surface-3 font-medium" : "text-fg-muted hover:bg-surface-2"}`}>{filter.label}</button>)}
      </div>
      <section aria-label="Benchmark leaderboard">
        <DataTable head={[{ label: "Rank", numeric: true }, { label: "Agent" }, { label: "Type" }, { label: "Overall", numeric: true }, ...BENCHMARK_DIMENSIONS.map((dim) => ({ label: dim.label, numeric: true }))]}>
          {rows.map((row, index) => {
            const agent = row.kind === "expert" ? agents.find((candidate) => candidate.id === row.id) : undefined;
            return <tr key={row.id} data-testid="benchmark-row" className="border-b border-line-subtle">
              <Num>{index + 1}</Num>
              <td className="min-w-48"><span className="flex items-center gap-2">{agent ? <AgentTile icon={agent.icon} size="sm" /> : null}{row.name}</span></td>
              <td>{row.kind === "expert" ? <Pill>Expert agent</Pill> : <Pill>General agent</Pill>}</td>
              <Num><span className="inline-flex min-w-24 items-center justify-end gap-2"><strong>{row.score}</strong><span className="w-10"><ScoreBar value={row.score} tone={row.kind === "expert" ? "ours" : "general"} /></span></span></Num>
              {BENCHMARK_DIMENSIONS.map((dim) => <Num key={dim.id}>{metric(row.metrics[dim.id], dim.unit)}</Num>)}
            </tr>;
          })}
        </DataTable>
      </section>
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Compare an agent</h2><p className="text-xs text-fg-muted">Select a published expert agent to compare its sample scores.</p></div>
          <select aria-label="Compare an agent" value={selected?.id ?? ""} onChange={(event) => setAgentId(event.target.value)} className="h-8 min-w-64 rounded border border-line-muted bg-surface-1 px-2 text-sm" disabled={!selected}>
            {benchmarked.map((agent: Agent) => <option key={agent.id} value={agent.id}>{agent.persona.name}</option>)}
          </select>
        </div>
        {selected ? <AgentBenchmarkPanel agent={selected} /> : <Card className="p-5 text-sm text-fg-muted">No published agents are benchmarked yet.</Card>}
      </section>
      <Card className="mt-6 p-5">
        <h2 className="font-semibold">How we score</h2>
        <p className="mt-1 text-sm text-fg-muted">Overall = weighted average of 0–100 dimension scores.</p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">{BENCHMARK_DIMENSIONS.map((dim) => <li key={dim.id} className="flex justify-between gap-3"><span>{dim.label} <span className="text-fg-muted">({dim.direction === "lower" ? "lower is better" : "higher is better"})</span></span><strong>{Math.round(dim.weight * 100)}%</strong></li>)}</ul>
      </Card>
    </PageBody>
  </>;
}
