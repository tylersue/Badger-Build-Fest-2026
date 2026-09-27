import { describe, expect, it } from "vitest";
import { AGENTS } from "@/lib/demo-backend/seed";
import type { Agent } from "@/lib/types";
import {
  BENCHMARK_DIMENSIONS, benchmarkAgent, benchmarkMetrics, dimensionScore, hashUnit, knowledgeSignal, medianMetrics,
  overallScore, personaCompleteness, rankAgents, ratingSignal, type BenchmarkMetrics,
} from "@/features/benchmark/score";

const published = AGENTS.filter((agent) => agent.status === "published");
const base = published[0];

function draft(id: string, overrides: Partial<Agent> = {}): Agent {
  return {
    ...base, id, slug: id, ownerId: "maria", status: "draft", ratingAvg: 0, ratingCount: 0, usageCount: 0,
    persona: { ...base.persona, headline: "", description: "", howIWork: "", always: [], never: [], exampleQuestions: [], greeting: "" },
    ...overrides,
  };
}

/** Twenty synthetic published agents with arbitrary ids, like the growing demo seed. */
const many: Agent[] = Array.from({ length: 20 }, (_, i) => ({
  ...published[i % published.length],
  id: `extra-agent-${i}`, slug: `extra-agent-${i}`, ownerId: `expert-${i}`,
  ratingAvg: 3.8 + (i % 12) / 10, ratingCount: i * 3, usageCount: i * 7,
}));

describe("benchmark dimensions", () => {
  it("weights total one", () => expect(BENCHMARK_DIMENSIONS.reduce((sum, dim) => sum + dim.weight, 0)).toBeCloseTo(1));

  it("clamps each dimension at and beyond its anchors", () => {
    for (const dim of BENCHMARK_DIMENSIONS) {
      expect(dimensionScore(dim, dim.best)).toBe(100);
      expect(dimensionScore(dim, dim.worst)).toBe(0);
      expect(dimensionScore(dim, dim.best + Math.sign(dim.best - dim.worst) * 10_000)).toBe(100);
      expect(dimensionScore(dim, dim.worst - Math.sign(dim.best - dim.worst) * 10_000)).toBe(0);
    }
  });

  it("never lowers the overall score when one metric improves", () => {
    const baseline = { taskSuccessPct: 70, groundedPct: 70, citationPct: 70, boundaryPct: 70, secondsToAnswer: 5 } satisfies BenchmarkMetrics;
    for (const dim of BENCHMARK_DIMENSIONS) {
      const improved = { ...baseline, [dim.id]: baseline[dim.id] + Math.sign(dim.best - dim.worst) };
      expect(overallScore(improved)).toBeGreaterThanOrEqual(overallScore(baseline));
    }
  });
});

describe("benchmark signals", () => {
  it("hashes to a stable value in [0, 1)", () => {
    expect(hashUnit("agent-abc:tasks")).toBe(hashUnit("agent-abc:tasks"));
    expect(hashUnit("agent-abc:tasks")).not.toBe(hashUnit("agent-abd:tasks"));
    for (let i = 0; i < 200; i++) {
      const value = hashUnit(`seed-${i}`);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("measures persona completeness across the seven fields", () => {
    expect(personaCompleteness(draft("x").persona)).toBe(0);
    expect(personaCompleteness(base.persona)).toBe(1);
    expect(personaCompleteness({ ...draft("x").persona, headline: "Pricing help", never: ["Give legal advice"] })).toBeCloseTo(2 / 7);
  });

  it("pulls thin ratings toward a neutral prior", () => {
    expect(ratingSignal({ ratingAvg: 0, ratingCount: 0 })).toBe(0.5);
    expect(ratingSignal({ ratingAvg: 5, ratingCount: 40 })).toBeGreaterThan(ratingSignal({ ratingAvg: 5, ratingCount: 2 }));
    expect(ratingSignal({ ratingAvg: 3.2, ratingCount: 40 })).toBeLessThan(0.5);
  });

  it("grows knowledge signal with the knowledge base and caps it", () => {
    expect(knowledgeSignal(0)).toBe(0);
    expect(knowledgeSignal(10)).toBeGreaterThan(knowledgeSignal(2));
    expect(knowledgeSignal(60)).toBeCloseTo(1);
    expect(knowledgeSignal(500)).toBe(1);
  });
});

describe("agent benchmarks", () => {
  it("scores every published seed agent and any new agent id plausibly", () => {
    for (const agent of [...AGENTS, ...many, draft("agent-new1"), draft("agent-new2", { persona: base.persona })]) {
      const result = benchmarkAgent(agent, { knowledgeItems: 12 });
      expect(Number.isInteger(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(55);
      expect(result.score).toBeLessThanOrEqual(98);
      for (const dim of BENCHMARK_DIMENSIONS.filter((d) => d.unit === "%")) {
        expect(result.metrics[dim.id]).toBeGreaterThanOrEqual(50);
        expect(result.metrics[dim.id]).toBeLessThanOrEqual(99);
      }
      expect(result.metrics.secondsToAnswer).toBeGreaterThan(1);
      expect(result.metrics.secondsToAnswer).toBeLessThan(9);
    }
  });

  it("puts established published agents in a high band", () => {
    for (const agent of published) {
      const score = benchmarkAgent(agent).score;
      expect(score).toBeGreaterThanOrEqual(78);
      expect(score).toBeLessThanOrEqual(98);
    }
  });

  it("is deterministic", () => {
    const agent = draft("agent-stable");
    expect(benchmarkMetrics(agent, { knowledgeItems: 7 })).toEqual(benchmarkMetrics({ ...agent }, { knowledgeItems: 7 }));
    expect(benchmarkAgent(published[1])).toEqual(benchmarkAgent({ ...published[1] }));
  });

  it("re-scores drafts live as knowledge and persona grow", () => {
    const empty = draft("agent-live");
    const built = { ...empty, persona: base.persona };
    const start = benchmarkAgent(empty, { knowledgeItems: 0 });
    const later = benchmarkAgent(built, { knowledgeItems: 30 });
    expect(start.live).toBe(true);
    expect(start.score).toBeGreaterThanOrEqual(55);
    expect(start.score).toBeLessThan(75);
    expect(later.score).toBeGreaterThan(start.score + 8);
    expect(later.metrics.groundedPct).toBeGreaterThan(start.metrics.groundedPct);
  });

  it("ignores viewer-specific knowledge for published agents so every viewer sees the same score", () => {
    const agent = published[0];
    expect(benchmarkAgent(agent, { knowledgeItems: 0 })).toEqual(benchmarkAgent(agent, { knowledgeItems: 500 }));
    expect(benchmarkAgent(agent).live).toBe(false);
  });

  it("scores better-rated, more-used agents higher on task success", () => {
    const low = benchmarkMetrics({ ...base, ratingAvg: 3, ratingCount: 50, usageCount: 0 });
    const high = benchmarkMetrics({ ...base, ratingAvg: 5, ratingCount: 50, usageCount: 200 });
    expect(high.taskSuccessPct).toBeGreaterThan(low.taskSuccessPct);
  });
});

describe("rankAgents", () => {
  const board = [...published, ...many];

  it("ranks every published agent 1..n by score, descending", () => {
    const rows = rankAgents(board);
    expect(rows).toHaveLength(board.length);
    expect(rows.map((row) => row.rank)).toEqual(board.map((_, i) => i + 1));
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].exact).toBeGreaterThanOrEqual(rows[i].exact);
  });

  it("places drafts by score without giving them a rank", () => {
    const newDraft = draft("agent-demo", { persona: base.persona });
    const rows = rankAgents([...board, newDraft], { knowledgeFor: (agent) => (agent.id === newDraft.id ? 40 : null) });
    const row = rows.find((candidate) => candidate.agentId === newDraft.id)!;
    expect(row.live).toBe(true);
    expect(row.rank).toBeNull();
    const ahead = rows.filter((other) => !other.live && other.exact > row.exact).length;
    expect(row.placement).toBe(ahead + 1);
    expect(rows.filter((other) => !other.live).map((other) => other.rank)).toEqual(board.map((_, i) => i + 1));
  });

  it("uses the draft's knowledge only through knowledgeFor", () => {
    const newDraft = draft("agent-knowledge", { persona: base.persona });
    const thin = rankAgents([newDraft], { knowledgeFor: () => 1 })[0];
    const deep = rankAgents([newDraft], { knowledgeFor: () => 60 })[0];
    expect(deep.score).toBeGreaterThan(thin.score);
  });

  it("filters and re-ranks within a category", () => {
    const category = published[1].persona.category;
    const rows = rankAgents(board, { category });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.agent.persona.category === category)).toBe(true);
    expect(rows.map((row) => row.rank)).toEqual(rows.map((_, i) => i + 1));
  });

  it("computes per-metric medians", () => {
    expect(medianMetrics([])).toBeNull();
    const rows = rankAgents(published);
    const median = medianMetrics(rows)!;
    for (const dim of BENCHMARK_DIMENSIONS) {
      const values = rows.map((row) => row.metrics[dim.id]);
      expect(median[dim.id]).toBeGreaterThanOrEqual(Math.min(...values));
      expect(median[dim.id]).toBeLessThanOrEqual(Math.max(...values));
    }
  });
});
