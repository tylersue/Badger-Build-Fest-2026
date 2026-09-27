"use client";

import { Gauge } from "lucide-react";
import { SUITE_SCENARIOS } from "@/features/benchmark/score";
import type { Agent } from "@/lib/types";
import { useAgentScore } from "@/components/benchmark/use-benchmarks";

export const BENCHMARK_SUITE_CAPTION = `Simulated demo runs of the Proxier founder suite (${SUITE_SCENARIOS} scenarios), stable per agent.`;

/** Honest label for demo numbers: neutral pill, not a warning. */
export function SampleDataLabel() {
  return <span title={BENCHMARK_SUITE_CAPTION} data-testid="benchmark-sample-label" className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-fg-tertiary">Simulated suite</span>;
}

export function NotPublishedPill() {
  return <span className="inline-flex shrink-0 items-center rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium whitespace-nowrap text-warning">Not published</span>;
}

/** Green at 80 and above, shading to yellow by 70, then toward red below 60. */
export function benchmarkColor(score: number): string {
  if (score >= 80) return "var(--color-success)";
  if (score >= 70) return `color-mix(in srgb, var(--color-success) ${Math.round((score - 70) * 10)}%, var(--color-warning))`;
  if (score >= 60) return `color-mix(in srgb, var(--color-warning) ${Math.round((score - 60) * 10)}%, var(--color-danger))`;
  return "var(--color-danger)";
}

export function BenchmarkScoreBadge({ agent }: { agent: Agent }) {
  const result = useAgentScore(agent);
  const label = `Proxier benchmark score ${result.score} of 100 (simulated suite)`;
  const color = benchmarkColor(result.score);
  return (
    <span title={label} aria-label={label} data-testid="benchmark-badge"
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)` }}>
      <Gauge className="size-3" aria-hidden />{result.score}
    </span>
  );
}

/** Neutral 0–100 bar (DESIGN.md: no color unless it signals state). `strong` marks the agent in focus. */
export function ScoreBar({ value, strong = false, marker }: { value: number; strong?: boolean; marker?: number }) {
  const score = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-1.5 w-full rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(score)}>
      <div className={`h-full rounded-full ${strong ? "bg-foreground" : "bg-fg-muted"}`} style={{ width: `${score}%` }} />
      {marker !== undefined && <div className="absolute -top-0.5 h-2.5 w-px bg-fg-tertiary" style={{ left: `${Math.max(0, Math.min(100, marker))}%` }} aria-hidden />}
    </div>
  );
}
