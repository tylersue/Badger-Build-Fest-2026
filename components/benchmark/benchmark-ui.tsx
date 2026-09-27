import { BENCHMARK_SAMPLE_CAPTION, BENCHMARK_SAMPLE_LABEL } from "@/lib/data/benchmarks";
import type { Agent } from "@/lib/types";
import { agentBenchmarkRow } from "@/features/benchmark/score";
export function SampleDataLabel() {
  return <span title={BENCHMARK_SAMPLE_CAPTION} data-testid="benchmark-sample-label" className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning">{BENCHMARK_SAMPLE_LABEL}</span>;
}

export function BenchmarkScoreBadge({ agent }: { agent: Agent }) {
  const row = agentBenchmarkRow(agent);
  if (!row) return null;
  const label = "Sample data · illustrative benchmark score, not a measured run";
  return <span title={label} aria-label={label} data-testid="benchmark-badge" className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-fg-tertiary">Bench {row.score}</span>;
}

export function ScoreBar({ value, tone }: { value: number; tone: "ours" | "general" }) {
  const score = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
      <div className={`h-full rounded-full ${tone === "ours" ? "bg-success" : "bg-line-default"}`} style={{ width: `${score}%` }} />
    </div>
  );
}
