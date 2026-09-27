import { CATEGORIES, type Category } from "@/lib/config/categories";
import { AGENT_BENCHMARKS, COMPETITORS, COMPETITOR_BENCHMARKS, type BenchmarkMetrics, type CompetitorId } from "@/lib/data/benchmarks";
import type { Agent } from "@/lib/types";

export const BENCHMARK_DIMENSIONS = [
  { id: "costCreditsPerTask", label: "Cost per task", unit: "credits", direction: "lower", weight: 0.2, best: 0, worst: 60 },
  { id: "tokensPerTask", label: "Tokens per task", unit: "tokens", direction: "lower", weight: 0.1, best: 0, worst: 60_000 },
  { id: "secondsToAnswer", label: "Time to answer", unit: "s", direction: "lower", weight: 0.15, best: 0, worst: 45 },
  { id: "buildMinutes", label: "Build time", unit: "min", direction: "lower", weight: 0.1, best: 0, worst: 480 },
  { id: "taskSuccessPct", label: "Task success", unit: "%", direction: "higher", weight: 0.3, best: 100, worst: 0 },
  { id: "toolCallAccuracyPct", label: "Tool-call accuracy", unit: "%", direction: "higher", weight: 0.15, best: 100, worst: 0 },
] as const satisfies readonly { id: keyof BenchmarkMetrics; label: string; unit: string; direction: "lower" | "higher"; weight: number; best: number; worst: number }[];

export type BenchmarkRow = { id: string; name: string; kind: "expert" | "general"; category: Category | "all"; metrics: BenchmarkMetrics; score: number };

export function dimensionScore(dim: (typeof BENCHMARK_DIMENSIONS)[number], value: number): number {
  const raw = ((value - dim.worst) / (dim.best - dim.worst)) * 100;
  return Math.max(0, Math.min(100, raw));
}

export function overallScore(metrics: BenchmarkMetrics): number {
  return Math.round(BENCHMARK_DIMENSIONS.reduce((total, dim) => total + dimensionScore(dim, metrics[dim.id]) * dim.weight, 0));
}

export function agentBenchmarkRow(agent: Agent): BenchmarkRow | null {
  const metrics = AGENT_BENCHMARKS[agent.id];
  return metrics ? { id: agent.id, name: agent.persona.name, kind: "expert", category: agent.persona.category, metrics, score: overallScore(metrics) } : null;
}

export function competitorRow(id: CompetitorId, category: Category | "all"): BenchmarkRow {
  const info = COMPETITORS.find((competitor) => competitor.id === id)!;
  const categoryData = COMPETITOR_BENCHMARKS[id];
  const metrics = category === "all" ? Object.fromEntries(
    (Object.keys(categoryData.health_pt) as (keyof BenchmarkMetrics)[]).map((key) => [key, CATEGORIES.reduce((sum, item) => sum + categoryData[item.id][key], 0) / CATEGORIES.length]),
  ) as BenchmarkMetrics : categoryData[category];
  return { id, name: info.name, kind: "general", category, metrics, score: overallScore(metrics) };
}

export function agentComparison(agent: Agent): BenchmarkRow[] {
  const row = agentBenchmarkRow(agent);
  return row ? [row, ...COMPETITORS.map(({ id }) => competitorRow(id, agent.persona.category))] : [];
}

export function leaderboard(agents: Agent[], category: Category | "all"): BenchmarkRow[] {
  const experts = agents
    .filter((agent) => agent.status === "published" && (category === "all" || agent.persona.category === category))
    .map(agentBenchmarkRow)
    .filter((row): row is BenchmarkRow => row !== null);
  return [...experts, ...COMPETITORS.map(({ id }) => competitorRow(id, category))].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
