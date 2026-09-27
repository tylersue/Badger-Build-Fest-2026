import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { Operation } from "@/lib/contracts/phase2";
import { searchKnowledge, toCitations, type SearchDependencies } from "./search";

const op: Operation = { id: "op_11111111-1111-4111-8111-111111111111", agentId: "agent-a",
  identityId: "maria", purpose: "sandbox", requestKey: "q", payloadHash: "a".repeat(64),
  state: "reserved", estimateUnits: "1", heldUnits: "10", actualUnits: null,
  priceVersion: "v1", createdAt: "2026-09-27T00:00:00Z" };
const vector = Array(1024).fill(0.1);
const row = (type: "interview" | "document") => ({ id: `chunk-${type}`, agent_id: "agent-a",
  revision_id: `revision-${type}`, source_id: `source-${type}`, source_type: type,
  source_name: type === "interview" ? "Interview answers" : "Guide.pdf", content: "Original evidence text.",
  question: type === "interview" ? "What did you do?" : null,
  page: type === "document" ? 3 : null, heading_path: type === "document" ? "Chapter 1" : null,
  score: type === "document" ? -0.12 : 0.84 });
function rig(data: unknown = []) {
  const embed = vi.fn(async () => ({ ok: true as const, data: { value: [vector] } }));
  const rpc = vi.fn(async () => ({ data, error: null }));
  return { embed, rpc, deps: { embed, rpc } as unknown as SearchDependencies };
}
describe("searchKnowledge", () => {
  it("passes the exact agent, vector and clamped k to the SQL RPC; empty stays empty", async () => {
    const r = rig();
    expect(await searchKnowledge({ agentId: "agent-a", query: "What works?", operation: op, k: 99 }, r.deps))
      .toEqual({ ok: true, data: [] });
    expect(r.embed).toHaveBeenCalledWith(expect.objectContaining({ inputType: "query", texts: ["What works?"], operation: op }),
      { settle: false });
    expect(r.rpc).toHaveBeenCalledWith("search_agent_knowledge", {
      p_agent_id: "agent-a", p_embedding: vector, p_k: 12 });
  });
  it("preserves original scores and both evidence coordinate types", async () => {
    const r = rig([row("interview"), row("document")]);
    const result = await searchKnowledge({ agentId: "agent-a", query: "Advice", operation: op }, r.deps);
    expect(result).toMatchObject({ ok: true, data: [
      { sourceType: "interview", revisionId: "revision-interview", question: "What did you do?", score: 0.84 },
      { sourceType: "document", sourceName: "Guide.pdf", page: 3, headingPath: "Chapter 1", score: -0.12 },
    ] });
    if (!result.ok) throw new Error("expected search results");
    const citations = toCitations(result.data);
    expect(citations[1]).toMatchObject({ revisionId: "revision-document", excerpt: "Original evidence text.",
      page: 3, headingPath: "Chapter 1", historical: false });
    expect(Object.isFrozen(citations)).toBe(true);
    expect(Object.isFrozen(citations[0])).toBe(true);
  });
  it("keeps embedding, database and cross-agent failures typed", async () => {
    const r = rig();
    r.embed.mockResolvedValueOnce({ ok: false, error: { code: "provider", message: "Provider unavailable", retryable: true } } as never);
    expect(await searchKnowledge({ agentId: "agent-a", query: "q", operation: op }, r.deps))
      .toMatchObject({ ok: false, error: { code: "provider" } });
    r.rpc.mockResolvedValueOnce({ data: null, error: { message: "database down" } } as never);
    expect(await searchKnowledge({ agentId: "agent-a", query: "q", operation: op }, r.deps))
      .toMatchObject({ ok: false, error: { code: "indexing" } });
    r.rpc.mockResolvedValueOnce({ data: [{ ...row("document"), agent_id: "agent-b" }], error: null } as never);
    expect(await searchKnowledge({ agentId: "agent-a", query: "q", operation: op }, r.deps))
      .toMatchObject({ ok: false, error: { code: "indexing" } });
    expect(await searchKnowledge({ agentId: "agent-b", query: "q", operation: op }, r.deps))
      .toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
});
