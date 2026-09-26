/**
 * Knowledge lane contract. Phase 1 returns canned chunks (placeholder, D-14);
 * the real version embeds the query and searches only this agent's chunks
 * (the agent filter is the tenant boundary, RETR-03). Never throws.
 */
import { CHUNKS, SOURCES } from "@/lib/data/seed";
import type { Agent, Citation } from "@/lib/types";

export type RetrievedChunk = {
  id: string;
  agentId: string;
  sourceType: "interview" | "document";
  sourceName: string;
  question: string | null;
  page: number | null;
  headingPath: string | null;
  content: string;
  score: number;
};

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);

export async function searchKnowledge(agent: Agent, query: string, k = 4): Promise<RetrievedChunk[]> {
  const q = words(query);
  const own = CHUNKS.filter((c) => c.agentId === agent.id).map((c) => {
    const source = SOURCES.find((s) => s.id === c.sourceId);
    const overlap = [...words(c.content + " " + (c.question ?? ""))].filter((w) => q.has(w)).length;
    return {
      id: c.id,
      agentId: c.agentId,
      sourceType: c.question ? ("interview" as const) : ("document" as const),
      sourceName: source?.name ?? "Interview answers",
      question: c.question,
      page: c.page,
      headingPath: c.headingPath,
      content: c.content,
      score: Math.min(0.95, 0.55 + overlap * 0.08),
    };
  });

  const chunks = own.length
    ? own
    : [
        {
          id: `${agent.id}-canned-1`,
          agentId: agent.id,
          sourceType: "interview" as const,
          sourceName: "Interview answers",
          question: agent.persona.exampleQuestions[0] ?? "How do you work?",
          page: null,
          headingPath: null,
          content: agent.persona.howIWork || agent.persona.description,
          score: 0.71,
        },
        {
          id: `${agent.id}-canned-2`,
          agentId: agent.id,
          sourceType: "interview" as const,
          sourceName: "Interview answers",
          question: "What do people most often get wrong?",
          page: null,
          headingPath: null,
          content: agent.persona.description,
          score: 0.63,
        },
      ];

  return chunks.sort((a, b) => b.score - a.score).slice(0, k);
}

export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((c, i) => ({
    n: i + 1,
    chunkId: c.id,
    sourceType: c.sourceType,
    sourceName: c.sourceName,
    question: c.question,
    page: c.page,
    headingPath: c.headingPath,
  }));
}
