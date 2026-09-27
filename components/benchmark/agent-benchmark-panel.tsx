import { BENCHMARK_SAMPLE_CAPTION, BENCHMARK_SUITES } from "@/lib/data/benchmarks";
import { categoryLabel } from "@/lib/config/categories";
import type { Agent } from "@/lib/types";
import { agentComparison, BENCHMARK_DIMENSIONS, dimensionScore } from "@/features/benchmark/score";
import { Card } from "@/components/app/ui";
import { SampleDataLabel, ScoreBar } from "@/components/benchmark/benchmark-ui";

function formatMetric(value: number, unit: string): string {
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  return unit === "%" ? `${number}%` : `${number} ${unit}`;
}

export function AgentBenchmarkPanel({ agent }: { agent: Agent }) {
  const rows = agentComparison(agent);
  if (!rows.length) {
    return <div className="rounded-xl border border-line-subtle bg-surface-1 p-5 text-sm text-fg-muted" data-testid="agent-benchmark-panel">Not benchmarked yet. Benchmarks cover the seeded published agents.</div>;
  }
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SampleDataLabel />
        <span className="text-xs text-fg-muted">{BENCHMARK_SAMPLE_CAPTION}</span>
      </div>
      <h2 className="mt-4 text-base font-semibold">{agent.persona.name} vs Muse, Grok and Hermes · {categoryLabel(agent.persona.category)}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-line-subtle bg-surface-1 p-3">
            <div className="flex justify-between text-sm"><span className="truncate">{row.name}</span><strong className="tabular-nums">{row.score}</strong></div>
            <div className="mt-2"><ScoreBar value={row.score} tone={row.kind === "expert" ? "ours" : "general"} /></div>
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-xs">
          <thead><tr><th className="h-9 pr-3 text-left text-fg-muted">Dimension</th>{rows.map((row) => <th key={row.id} className="min-w-32 px-2 text-left font-medium text-fg-muted">{row.name}</th>)}</tr></thead>
          <tbody>{BENCHMARK_DIMENSIONS.map((dim) => <tr key={dim.id} className="border-t border-line-subtle">
            <th className="py-2 pr-3 text-left font-medium">{dim.label}</th>
            {rows.map((row) => {
              const score = dimensionScore(dim, row.metrics[dim.id]);
              return <td key={row.id} className="px-2 py-2"><div className="mb-1 whitespace-nowrap tabular-nums">{formatMetric(row.metrics[dim.id], dim.unit)}</div><ScoreBar value={score} tone={row.kind === "expert" ? "ours" : "general"} /></td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-fg-muted">Suite formats: {BENCHMARK_SUITES.map((suite) => <span key={suite.name} className="mr-1">{suite.name} ({suite.measures});</span>)}</p>
    </Card>
  );
}
