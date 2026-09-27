import "server-only";
import { createHash } from "node:crypto";
import type { EvidenceCitation, RetrievedChunk, SearchKnowledgeInput, ServiceResult } from "@/lib/contracts/phase2";
import { getServiceDb } from "@/lib/server/db";
import { embedTexts } from "@/lib/llm/voyage";

type RpcResult = { data: unknown; error: { message: string } | null };
export type SearchDependencies = {
  embed: typeof embedTexts;
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

function production(): ServiceResult<SearchDependencies> {
  const result = getServiceDb(); if (!result.ok) return result;
  const db = result.data;
  const rpc = db.rpc as unknown as SearchDependencies["rpc"];
  return { ok: true, data: { embed: embedTexts, rpc: (name, args) => rpc.call(db, name, args) } };
}
function invalid(): ServiceResult<never> {
  return { ok: false, error: { code: "invalid_input", message: "Invalid knowledge query.", retryable: false } };
}
function dbFailure(): ServiceResult<never> {
  return { ok: false, error: { code: "indexing", message: "Knowledge search failed.", retryable: true } };
}
function rowToChunk(value: unknown, agentId: string): RetrievedChunk {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid search row");
  const row = value as Record<string, unknown>;
  if (row.agent_id !== agentId || typeof row.id !== "string" || typeof row.revision_id !== "string" ||
    typeof row.source_id !== "string" || !["interview","document"].includes(String(row.source_type)) ||
    typeof row.source_name !== "string" || typeof row.content !== "string" ||
    typeof row.score !== "number" || !Number.isFinite(row.score) ||
    (row.question !== null && typeof row.question !== "string") ||
    (row.page !== null && (!Number.isSafeInteger(row.page) || (row.page as number) < 1)) ||
    (row.heading_path !== null && typeof row.heading_path !== "string")) throw new Error("Invalid search row");
  return { id: row.id, agentId, revisionId: row.revision_id, sourceId: row.source_id,
    sourceType: row.source_type as RetrievedChunk["sourceType"], sourceName: row.source_name,
    content: row.content, question: row.question as string | null, page: row.page as number | null,
    headingPath: row.heading_path as string | null, score: row.score };
}

/** Query embedding is metered into the caller's operation; the caller settles after all answer stages. */
export async function searchKnowledge(input: SearchKnowledgeInput,
  injected?: SearchDependencies): Promise<ServiceResult<RetrievedChunk[]>> {
  if (!input?.agentId || !input.operation || input.operation.agentId !== input.agentId ||
    typeof input.query !== "string" || !input.query.trim() || Buffer.byteLength(input.query, "utf8") > 8000 ||
    (input.k !== undefined && (!Number.isFinite(input.k) || !Number.isSafeInteger(input.k)))) return invalid();
  const deps = injected ? { ok: true as const, data: injected } : production();
  if (!deps.ok) return deps;
  const k = Math.max(1, Math.min(12, input.k ?? 6));
  const stageKey = `retrieval:query:${createHash("sha256").update(input.query).digest("hex").slice(0, 24)}`;
  const embedded = await deps.data.embed({ operation: input.operation, stageKey,
    texts: [input.query], inputType: "query" }, { settle: false });
  if (!embedded.ok) return embedded;
  const vector = embedded.data.value[0];
  if (!Array.isArray(vector) || vector.length !== 1024 || vector.some(n => typeof n !== "number" || !Number.isFinite(n))) return dbFailure();
  try {
    const response = await deps.data.rpc("search_agent_knowledge", {
      p_agent_id: input.agentId, p_embedding: vector, p_k: k,
    });
    if (response.error || !Array.isArray(response.data)) return dbFailure();
    const chunks = response.data.map(row => rowToChunk(row, input.agentId));
    return { ok: true, data: chunks };
  } catch { return dbFailure(); }
}

/** Snapshots survive later edits/deletions; their revision and coordinates never change. */
export function toCitations(chunks: readonly RetrievedChunk[]): readonly EvidenceCitation[] {
  return Object.freeze(chunks.map((chunk, index): EvidenceCitation => Object.freeze({
    evidenceId: `expert:${chunk.id}`, ordinal: index + 1, excerpt: chunk.content.slice(0, 1000),
    sourceType: chunk.sourceType, sourceId: chunk.sourceId, sourceName: chunk.sourceName,
    revisionId: chunk.revisionId, chunkId: chunk.id, question: chunk.question,
    page: chunk.page, headingPath: chunk.headingPath, historical: false,
  })));
}
