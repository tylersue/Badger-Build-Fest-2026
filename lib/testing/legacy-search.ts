/** Fixture-only Phase 4 acceptance engine; never used for live requests. */
/**
 * Knowledge lane contract. Phase 1 returns canned chunks (placeholder, D-14);
 * Phase 3 also searches interview answers typed in this browser (passed in as
 * `extraChunks`) so a freshly built agent cites its own interview. The real
 * version embeds the query and searches only this agent's chunks (the agent
 * filter is the tenant boundary, RETR-03). Never throws.
 */
import { CHUNKS, SOURCES } from "@/lib/data/seed";
import type { Agent, Chunk, Citation } from "@/lib/types";

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

/** Score of a chunk that shares no content word with the query. */
export const BASE_SCORE = 0.55;
const PER_WORD = 0.08;
const MAX_SCORE = 0.95;

/** Function words that would make any question "match" any chunk. */
const STOP_WORDS = new Set([
  "what", "when", "where", "which", "while", "that", "this", "these", "those", "there", "their", "they", "them", "then", "than",
  "with", "without", "have", "having", "from", "your", "yours", "does", "doing", "done", "should", "would", "could", "about", "into",
  "also", "been", "being", "will", "just", "like", "some", "more", "most", "very", "only", "over", "after", "before", "because",
  "want", "need", "know", "take", "make", "much", "many", "such", "each", "other", "here", "come", "comes", "going", "were",
  "first", "thing", "things", "someone", "something", "anything", "everything", "still", "again", "back", "says", "said", "tell",
  "told", "help", "please", "question", "questions", "answer", "answers", "really", "think", "good", "well", "even", "ever",
]);

const words = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP_WORDS.has(w)));

export async function searchKnowledge(agent: Agent, query: string, k = 4, extraChunks: Chunk[] = []): Promise<RetrievedChunk[]> {
  const q = words(query);
  const own = [...CHUNKS, ...extraChunks]
    .filter((c) => c.agentId === agent.id)
    .map((c) => {
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
        score: Math.min(MAX_SCORE, BASE_SCORE + overlap * PER_WORD),
      };
    });

  /* When anything overlaps the question, drop the chunks that don't, so no unrelated chunk gets cited. */
  const hits = own.filter((c) => c.score > BASE_SCORE);
  const chunks = own.length
    ? hits.length
      ? hits
      : own
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

/**
 * Weak retrieval (CHAT-03): nothing came back, or nothing shares a content
 * word with the question. Seeded agents without stored chunks fall back to
 * persona-derived chunks above the base score, so they are never "weak".
 */
export function isWeakRetrieval(chunks: RetrievedChunk[]): boolean {
  return chunks.length === 0 || chunks.every((c) => c.score <= BASE_SCORE);
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
