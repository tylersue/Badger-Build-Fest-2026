"use client";

import { allAgents, currentIdentity, knowledgeStats, useDemo, type DemoState } from "@/lib/demo-store";
import type { Category } from "@/lib/config/categories";
import type { Agent, Identity } from "@/lib/types";
import { benchmarkAgent, isLiveScored, medianMetrics, rankAgents, type BenchmarkMetrics, type BenchmarkResult, type RankedBenchmark } from "@/features/benchmark/score";

/** Agents the current identity can see on the board: every published agent plus their own drafts. */
function boardAgents(s: DemoState, me: Identity): Agent[] {
  return allAgents(s).filter((agent) => agent.status === "published" || agent.ownerId === me.id);
}

/** Drafts are scored from their live knowledge base, which only the owner can see. */
function knowledgeFor(s: DemoState, me: Identity) {
  return (agent: Agent) => (agent.ownerId === me.id && isLiveScored(agent) ? knowledgeStats(s, agent.id).total : null);
}

export function useBenchmarkBoard(category: Category | "all") {
  const s = useDemo();
  const me = currentIdentity(s);
  const agents = boardAgents(s, me);
  const knowledge = knowledgeFor(s, me);
  const everyone = rankAgents(agents, { knowledgeFor: knowledge });
  const rows = category === "all" ? everyone : rankAgents(agents, { category, knowledgeFor: knowledge });
  const publishedAll = everyone.filter((row) => !row.live);
  return {
    me,
    loading: s.status === "loading" && agents.length === 0,
    rows,
    everyone,
    publishedCount: publishedAll.length,
    median: medianMetrics(publishedAll),
    medianScore: medianOf(publishedAll.map((row) => row.score)),
    knowledgeItems: (agent: Agent) => knowledge(agent),
  };
}

export type AgentBenchmarkView = {
  result: BenchmarkResult;
  overall: RankedBenchmark | undefined;
  inCategory: RankedBenchmark | undefined;
  publishedCount: number;
  categoryCount: number;
  median: BenchmarkMetrics | null;
  knowledgeItems: number | null;
};

export function useAgentBenchmark(agent: Agent): AgentBenchmarkView {
  const s = useDemo();
  const me = currentIdentity(s);
  const visible = boardAgents(s, me);
  const agents = visible.some((candidate) => candidate.id === agent.id) ? visible : [...visible, agent];
  const knowledge = knowledgeFor(s, me);
  const everyone = rankAgents(agents, { knowledgeFor: knowledge });
  const category = rankAgents(agents, { category: agent.persona.category, knowledgeFor: knowledge });
  const overall = everyone.find((row) => row.agentId === agent.id);
  const knowledgeItems = knowledge(agent);
  return {
    result: overall ?? benchmarkAgent(agent, { knowledgeItems }),
    overall,
    inCategory: category.find((row) => row.agentId === agent.id),
    publishedCount: everyone.filter((row) => !row.live).length,
    categoryCount: category.filter((row) => !row.live).length,
    median: medianMetrics(everyone.filter((row) => !row.live)),
    knowledgeItems,
  };
}

/** Just the agent's own score, for badges rendered once per card. */
export function useAgentScore(agent: Agent): BenchmarkResult {
  const s = useDemo();
  return benchmarkAgent(agent, { knowledgeItems: knowledgeFor(s, currentIdentity(s))(agent) });
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
