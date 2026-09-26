import { describe, expect, it } from "vitest";
import { AGENTS } from "@/lib/data/seed";
import type { Chunk } from "@/lib/types";
import { BASE_SCORE, isWeakRetrieval, searchKnowledge, toCitations } from "./search";

const maria = AGENTS[0];
const dev = AGENTS[1];

describe("searchKnowledge", () => {
  it("returns only the agent's own chunks, best match first", async () => {
    const chunks = await searchKnowledge(maria, "Is swelling after my ACL repair normal?");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.agentId === maria.id)).toBe(true);
    expect(chunks[0].score).toBeGreaterThan(BASE_SCORE);
    for (let i = 1; i < chunks.length; i++) expect(chunks[i - 1].score).toBeGreaterThanOrEqual(chunks[i].score);
  });

  it("searches interview answers typed in the browser and cites them as interview sources", async () => {
    const extra: Chunk[] = [
      { id: "ic-1", agentId: maria.id, sourceId: "interview:maria", page: null, headingPath: null, question: "How do you treat plantar fasciitis?", content: "Plantar fasciitis responds to calf loading and a heel raise before anything fancy." },
      { id: "ic-other", agentId: dev.id, sourceId: "interview:dev", page: null, headingPath: null, question: "Plantar?", content: "Plantar fasciitis is not a tax question." },
    ];
    const chunks = await searchKnowledge(maria, "What helps plantar fasciitis?", 4, extra);
    expect(chunks[0].id).toBe("ic-1");
    expect(chunks[0].sourceType).toBe("interview");
    expect(chunks.some((c) => c.agentId !== maria.id)).toBe(false);
    expect(toCitations(chunks)[0]).toMatchObject({ n: 1, chunkId: "ic-1", question: "How do you treat plantar fasciitis?" });
  });

  it("flags weak retrieval when no chunk shares a word with the question", async () => {
    const chunks = await searchKnowledge(maria, "What is the capital of France?");
    expect(isWeakRetrieval(chunks)).toBe(true);
    expect(isWeakRetrieval(await searchKnowledge(maria, "knee swelling three weeks after ACL surgery"))).toBe(false);
    expect(isWeakRetrieval([])).toBe(true);
  });

  it("keeps persona fallback chunks for seeded agents without stored chunks", async () => {
    const chunks = await searchKnowledge(dev, "What is the capital of France?");
    expect(chunks.length).toBe(2);
    expect(isWeakRetrieval(chunks)).toBe(false);
  });
});
