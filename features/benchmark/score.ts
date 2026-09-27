import type { Category } from "@/lib/config/categories";
import type { Agent, PersonaForm } from "@/lib/types";

/**
 * Proxier benchmark: every agent on the platform runs the same founder suite.
 *
 * Results are simulated for the demo but deterministic: each agent gets a stable
 * hash-seeded suite result (keyed by agent id), shifted by signals the platform
 * already has — persona completeness, ratings, usage and, for unpublished agents,
 * the live size of the knowledge base. Published agents keep the score of their
 * last full run, so every viewer sees the same number; drafts are re-scored live
 * as the owner adds knowledge.
 */

export const SUITE_SCENARIOS = 40;

export type BenchmarkMetrics = {
  taskSuccessPct: number;
  groundedPct: number;
  citationPct: number;
  boundaryPct: number;
  secondsToAnswer: number;
};

export type BenchmarkDimension = {
  id: keyof BenchmarkMetrics;
  label: string;
  short: string;
  unit: "%" | "s";
  direction: "higher" | "lower";
  weight: number;
  best: number;
  worst: number;
  description: string;
};

export const BENCHMARK_DIMENSIONS: readonly BenchmarkDimension[] = [
  { id: "taskSuccessPct", label: "Task success", short: "Tasks", unit: "%", direction: "higher", weight: 0.3, best: 100, worst: 0,
    description: `Share of the ${SUITE_SCENARIOS} multi-turn founder scenarios the agent resolves end to end.` },
  { id: "groundedPct", label: "Grounded answers", short: "Grounded", unit: "%", direction: "higher", weight: 0.25, best: 100, worst: 0,
    description: "Share of answer claims backed by the expert's own interview answers or documents." },
  { id: "citationPct", label: "Citation accuracy", short: "Citations", unit: "%", direction: "higher", weight: 0.2, best: 100, worst: 0,
    description: "Share of citations that point at the passage that actually supports the claim." },
  { id: "boundaryPct", label: "Boundary handling", short: "Boundaries", unit: "%", direction: "higher", weight: 0.15, best: 100, worst: 0,
    description: "Out-of-scope and \"never\" questions the agent declines or redirects correctly." },
  { id: "secondsToAnswer", label: "Time to answer", short: "Latency", unit: "s", direction: "lower", weight: 0.1, best: 1, worst: 11,
    description: "Median seconds to a complete first answer." },
];

/** Stable value in [0, 1) for a seed string (FNV-1a, then a murmur-style finalizer). */
export function hashUnit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Share of the seven persona fields that are filled in, 0–1. */
export function personaCompleteness(persona: PersonaForm): number {
  const filled = [
    persona.headline, persona.description, persona.howIWork, persona.greeting,
  ].filter((text) => text.trim().length > 0).length
    + [persona.always, persona.never, persona.exampleQuestions].filter((list) => list.some((item) => item.trim().length > 0)).length;
  return filled / 7;
}

/** Rating quality with a neutral prior, so a handful of reviews moves it less than dozens. */
export function ratingSignal(agent: Pick<Agent, "ratingAvg" | "ratingCount">): number {
  const count = Math.max(0, agent.ratingCount);
  const confidence = count / (count + 8);
  const quality = clamp((agent.ratingAvg - 3) / 2, 0, 1);
  return confidence * quality + (1 - confidence) * 0.5;
}

/** Usage on a log scale: 100 conversations or more counts as fully proven. */
export function usageSignal(agent: Pick<Agent, "usageCount">): number {
  return clamp(Math.log10(1 + Math.max(0, agent.usageCount)) / Math.log10(101), 0, 1);
}

/** Knowledge base depth on a log scale: 60 answers and document passages or more counts as full. */
export function knowledgeSignal(items: number): number {
  return clamp(Math.log(1 + Math.max(0, items)) / Math.log(61), 0, 1);
}

export type BenchmarkInput = {
  /** Interview answers plus document passages. Only used for agents that are not published. */
  knowledgeItems?: number | null;
};

export function isLiveScored(agent: Pick<Agent, "status">): boolean {
  return agent.status !== "published";
}

export function benchmarkMetrics(agent: Agent, input: BenchmarkInput = {}): BenchmarkMetrics {
  const noise = (key: string) => hashUnit(`${agent.id}:${key}`);
  const persona = personaCompleteness(agent.persona);
  const rating = ratingSignal(agent);
  const usage = usageSignal(agent);
  // Published agents were benchmarked on a full run; drafts use what is in the knowledge base right now.
  const knowledge = isLiveScored(agent) ? knowledgeSignal(input.knowledgeItems ?? 0) : 0.4 + 0.6 * noise("coverage");
  const hasBoundaries = agent.persona.never.some((rule) => rule.trim().length > 0) ? 1 : 0;

  const pct = (value: number) => Math.round(clamp(value, 50, 99));
  return {
    taskSuccessPct: pct(58 + 14 * knowledge + 12 * rating + 6 * usage + 10 * noise("tasks")),
    groundedPct: pct(60 + 26 * knowledge + 8 * persona + 6 * noise("grounded")),
    citationPct: pct(62 + 20 * knowledge + 6 * rating + 8 * noise("citations")),
    boundaryPct: pct(62 + 12 * persona + 6 * hasBoundaries + 6 * rating + 8 * noise("boundaries")),
    secondsToAnswer: Math.round(clamp(1.8 + 2.6 * noise("latency") + 0.9 * knowledge, 1.2, 9) * 10) / 10,
  };
}

export function dimensionScore(dim: BenchmarkDimension, value: number): number {
  const raw = ((value - dim.worst) / (dim.best - dim.worst)) * 100;
  return clamp(raw, 0, 100);
}

/** Weighted average of the 0–100 dimension scores, unrounded. */
export function exactOverall(metrics: BenchmarkMetrics): number {
  return BENCHMARK_DIMENSIONS.reduce((total, dim) => total + dimensionScore(dim, metrics[dim.id]) * dim.weight, 0);
}

export function overallScore(metrics: BenchmarkMetrics): number {
  return Math.round(exactOverall(metrics));
}

export type BenchmarkResult = {
  agentId: string;
  metrics: BenchmarkMetrics;
  /** Rounded overall score shown in the UI. */
  score: number;
  /** Unrounded overall, used for ranking. */
  exact: number;
  /** True for drafts and unpublished agents, which are scored from their current knowledge. */
  live: boolean;
};

export function benchmarkAgent(agent: Agent, input: BenchmarkInput = {}): BenchmarkResult {
  const metrics = benchmarkMetrics(agent, input);
  const exact = exactOverall(metrics);
  return { agentId: agent.id, metrics, score: Math.round(exact), exact, live: isLiveScored(agent) };
}

export type RankedBenchmark = BenchmarkResult & {
  agent: Agent;
  /** Rank among published agents in the current view; null when the agent is not published. */
  rank: number | null;
  /** Where the agent places among published agents in the current view (its rank, or where a draft would land). */
  placement: number;
};

function compare(a: { exact: number; metrics: BenchmarkMetrics; agent: Agent }, b: { exact: number; metrics: BenchmarkMetrics; agent: Agent }): number {
  return b.exact - a.exact || b.metrics.taskSuccessPct - a.metrics.taskSuccessPct || a.agent.persona.name.localeCompare(b.agent.persona.name) || a.agent.id.localeCompare(b.agent.id);
}

/**
 * Scores and orders agents. Published agents are ranked 1..n; unpublished agents
 * are placed by score among them without taking a rank.
 */
export function rankAgents(
  agents: Agent[],
  options: { category?: Category | "all"; knowledgeFor?: (agent: Agent) => number | null } = {},
): RankedBenchmark[] {
  const category = options.category ?? "all";
  const scored = agents
    .filter((agent) => category === "all" || agent.persona.category === category)
    .map((agent) => ({ agent, ...benchmarkAgent(agent, { knowledgeItems: isLiveScored(agent) ? options.knowledgeFor?.(agent) : null }) }))
    .sort(compare);
  const published = scored.filter((row) => !row.live);
  return scored.map((row) => {
    if (!row.live) {
      const rank = published.indexOf(row) + 1;
      return { ...row, rank, placement: rank };
    }
    return { ...row, rank: null, placement: published.filter((other) => compare(other, row) < 0).length + 1 };
  });
}

/** Median of each metric across results, for "vs platform" comparisons. */
export function medianMetrics(results: Pick<BenchmarkResult, "metrics">[]): BenchmarkMetrics | null {
  if (!results.length) return null;
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return Object.fromEntries(BENCHMARK_DIMENSIONS.map((dim) => [dim.id, median(results.map((result) => result.metrics[dim.id]))])) as BenchmarkMetrics;
}

export function formatMetric(dim: BenchmarkDimension, value: number): string {
  if (dim.unit === "%") return `${Math.round(value)}%`;
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} s`;
}
