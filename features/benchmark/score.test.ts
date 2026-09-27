import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/config/categories";
import { AGENTS } from "@/lib/data/seed";
import { AGENT_BENCHMARKS, COMPETITOR_BENCHMARKS, type BenchmarkMetrics } from "@/lib/data/benchmarks";
import { agentBenchmarkRow, agentComparison, BENCHMARK_DIMENSIONS, competitorRow, dimensionScore, leaderboard, overallScore } from "@/features/benchmark/score";

describe("benchmark scoring", () => {
  it("weights total one", () => expect(BENCHMARK_DIMENSIONS.reduce((sum, dim) => sum + dim.weight, 0)).toBeCloseTo(1));

  it("clamps each dimension at and beyond its anchors", () => {
    for (const dim of BENCHMARK_DIMENSIONS) {
      expect(dimensionScore(dim, dim.best)).toBe(100);
      expect(dimensionScore(dim, dim.worst)).toBe(0);
      expect(dimensionScore(dim, dim.best + Math.sign(dim.best - dim.worst) * 10_000)).toBe(100);
      expect(dimensionScore(dim, dim.worst - Math.sign(dim.best - dim.worst) * 10_000)).toBe(0);
    }
  });

  it("returns integer overall scores between zero and one hundred", () => {
    for (const metrics of Object.values(AGENT_BENCHMARKS)) {
      const score = overallScore(metrics);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("never lowers the overall score when one metric improves", () => {
    const baseline = { costCreditsPerTask: 30, tokensPerTask: 30_000, secondsToAnswer: 20, buildMinutes: 200, taskSuccessPct: 60, toolCallAccuracyPct: 60 } satisfies BenchmarkMetrics;
    for (const dim of BENCHMARK_DIMENSIONS) {
      const improved = { ...baseline, [dim.id]: baseline[dim.id] + Math.sign(dim.best - dim.worst) };
      expect(overallScore(improved)).toBeGreaterThanOrEqual(overallScore(baseline));
    }
  });

  it("covers all published seed agents and ranks each above its category competitors", () => {
    const published = AGENTS.filter((agent) => agent.status === "published");
    expect(published).toHaveLength(6);
    for (const agent of published) {
      expect(AGENT_BENCHMARKS[agent.id]).toBeDefined();
      const score = agentBenchmarkRow(agent)!.score;
      for (const competitor of ["muse", "grok", "hermes"] as const) expect(score).toBeGreaterThan(competitorRow(competitor, agent.persona.category).score);
    }
  });

  it("excludes unpublished and unbenchmarked agents", () => {
    const agent = AGENTS[0];
    const rows = leaderboard([{ ...agent, status: "unpublished" }, { ...agent, id: "new-agent" }], agent.persona.category);
    expect(rows.filter((row) => row.kind === "expert")).toHaveLength(0);
  });

  it("returns no comparison rows for an unbenchmarked agent", () => {
    const agent = { ...AGENTS[0], id: "new-agent" };
    expect(agentBenchmarkRow(agent)).toBeNull();
    expect(agentComparison(agent)).toEqual([]);
  });

  it("aggregates competitor metrics across all categories", () => {
    const expected = CATEGORIES.reduce((sum, category) => sum + COMPETITOR_BENCHMARKS.muse[category.id].costCreditsPerTask, 0) / CATEGORIES.length;
    expect(competitorRow("muse", "all").metrics.costCreditsPerTask).toBeCloseTo(expected);
  });
});
