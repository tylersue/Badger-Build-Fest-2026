import "server-only";
import type { IndexResult, Operation, ServiceResult, TextSegment } from "@/lib/contracts/phase2";
import { getServiceDb } from "@/lib/server/db";
import { embedTexts } from "@/lib/llm/voyage";
import { settleOperation } from "@/features/billing/service";
import { chunkSegments, type ChunkSegment } from "./chunk";

type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
export type IndexRpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
type Segment = { content: string; question: string | null; page: number | null;
  headingPath: string | null; sourceId: string | null; answerId: string | null };
type Job = { id: string; agent_id: string; revision_id: string; answer_id: string | null;
  source_id: string | null; operation_id: string; state: "queued" | "processing" | "ready" | "failed";
  lease_owner: string | null; completed_batches: number; total_batches: number;
  indexed_chunks: number; batch_size: number; retry_generation: number; segments: Segment[]; error: { code?: string } | null };
export type IndexDependencies = {
  rpc: IndexRpc;
  loadOperation(operationId: string): Promise<Operation | null>;
  loadAnswer(revisionId: string, agentId: string, answerId: string): Promise<{ question: string; text: string } | null>;
  stageState(operationId: string, stageKey: string): Promise<string | null>;
  embed: typeof embedTexts;
  settle: typeof settleOperation;
};

function fail(code: "invalid_input" | "configuration" | "indexing" | "quota" | "unknown_usage" | "conflict", retryable: boolean): ServiceResult<never> {
  const message = code === "configuration" ? "Knowledge service is not configured."
    : code === "quota" ? "Knowledge chunk limit reached."
    : code === "unknown_usage" ? "Embedding usage needs reconciliation before retry."
    : code === "conflict" ? "Knowledge revision changed during indexing."
    : code === "invalid_input" ? "Invalid index request." : "Indexing could not complete.";
  return { ok: false, error: { code, message, retryable } };
}
function adapter(): ServiceResult<IndexDependencies> {
  const result = getServiceDb(); if (!result.ok) return result;
  const db = result.data;
  const rpc = db.rpc as unknown as IndexRpc;
  return { ok: true, data: {
    rpc: (name, args) => rpc.call(db, name, args),
    async loadOperation(id) {
      const { data, error } = await db.from("operations").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error("operation lookup failed");
      if (!data) return null;
      const money = (value: number | string | null): string | null => {
        if (value === null) return null;
        if (typeof value === "number") { if (!Number.isSafeInteger(value)) throw new Error("unsafe money"); return String(value); }
        if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error("unsafe money"); return value;
      };
      return { id: data.id, agentId: data.agent_id, identityId: data.identity_id,
        requestKey: data.request_key, purpose: data.purpose as Operation["purpose"],
        state: data.state as Operation["state"], estimateUnits: money(data.estimate_units)!,
        heldUnits: money(data.held_units)!, actualUnits: money(data.actual_units),
        priceVersion: data.price_version, payloadHash: data.payload_hash, createdAt: data.created_at };
    },
    async loadAnswer(revisionId, agentId, answerId) {
      const { data, error } = await db.from("answer_revisions").select("question,text")
        .eq("id", revisionId).eq("agent_id", agentId).eq("answer_id", answerId).is("deleted_at", null).maybeSingle();
      if (error) throw new Error("answer lookup failed");
      return data;
    },
    async stageState(operationId, stageKey) {
      const { data, error } = await db.from("provider_attempts").select("state")
        .eq("operation_id", operationId).eq("stage_key", stageKey).order("attempt", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error("attempt lookup failed");
      return data?.state ?? null;
    },
    embed: embedTexts, settle: settleOperation,
  } };
}
function depsOrConfig(injected?: IndexDependencies): ServiceResult<IndexDependencies> {
  return injected ? { ok: true, data: injected } : adapter();
}
async function rpcJob(deps: IndexDependencies, name: string, args: Record<string, unknown>): Promise<ServiceResult<Job>> {
  try {
    const response = await deps.rpc(name, args);
    if (response.error) {
      const code = /\bQUOTA\b/.test(response.error.message) ? "quota"
        : /\bCONFLICT\b/.test(response.error.message) ? "conflict"
        : /\bINVALID_INPUT\b/.test(response.error.message) ? "invalid_input" : "indexing";
      return fail(code, code === "indexing");
    }
    if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) return fail("indexing", true);
    return { ok: true, data: response.data as Job };
  } catch { return fail("indexing", true); }
}
function progress(job: Job): IndexResult {
  return { state: job.state === "ready" ? "ready" : job.state === "failed" ? "failed" : "pending",
    jobId: job.id, progress: { completedBatches: job.completed_batches,
      totalBatches: job.total_batches, indexedChunks: job.indexed_chunks } };
}

export type EnqueueIndexInput = { jobId: string; agentId: string; revisionId: string; operationId: string;
  answerId?: string; sourceId?: string; sourceSegments?: readonly TextSegment[]; maxChunks?: number };
/** Atomically freezes input chunks, checks active plus reserved quota, and creates one job per revision. */
export async function enqueueIndexRevision(input: EnqueueIndexInput,
  injected?: IndexDependencies): Promise<ServiceResult<IndexResult>> {
  if (!input.jobId || !input.agentId || !input.revisionId || !input.operationId ||
    Number(!!input.answerId) + Number(!!input.sourceId) !== 1) return fail("invalid_input", false);
  const configured = depsOrConfig(injected); if (!configured.ok) return configured;
  const deps = configured.data;
  try {
    let segments: ChunkSegment[];
    if (input.answerId) {
      const revision = await deps.loadAnswer(input.revisionId, input.agentId, input.answerId);
      if (!revision || !revision.question.trim() || !revision.text.trim()) return fail("invalid_input", false);
      segments = [{ content: `${revision.question}\n\n${revision.text}`, question: revision.question,
        page: null, headingPath: null, answerId: input.answerId }];
    } else {
      if (!input.sourceSegments?.length) return fail("invalid_input", false);
      segments = input.sourceSegments.map(s => ({ ...s, sourceId: input.sourceId! }));
    }
    const chunks = chunkSegments(segments);
    if (!chunks.length) return fail("invalid_input", false);
    const response = await rpcJob(deps, "enqueue_index_revision", {
      p_job_id: input.jobId, p_agent_id: input.agentId, p_answer_id: input.answerId ?? null,
      p_source_id: input.sourceId ?? null, p_revision_id: input.revisionId,
      p_operation_id: input.operationId, p_max_chunks: input.maxChunks ?? 1000,
      p_segments: chunks.map(c => ({ content: c.content, question: c.question,
        page: c.page, headingPath: c.headingPath, answerId: c.answerId, sourceId: c.sourceId })),
    });
    return response.ok ? { ok: true, data: progress(response.data) } : response;
  } catch { return fail("indexing", true); }
}

/** Awaited, bounded consumer: at most four 8-chunk batches per request. */
export async function indexRevision(jobId: string, options: { settle?: boolean } = {},
  injected?: IndexDependencies): Promise<ServiceResult<IndexResult>> {
  if (!jobId) return fail("invalid_input", false);
  const configured = depsOrConfig(injected); if (!configured.ok) return configured;
  const deps = configured.data;
  const lease = `lease_${crypto.randomUUID()}`;
  let current = await rpcJob(deps, "claim_index_job", { p_job_id: jobId, p_lease_owner: lease });
  if (!current.ok) return current;
  let job = current.data;
  if (job.state === "ready" || job.state === "failed") return { ok: true, data: progress(job) };
  if (job.lease_owner !== lease) return { ok: true, data: progress(job) };
  let shouldSettle = false;
  try {
    const operation = await deps.loadOperation(job.operation_id);
    if (!operation || operation.agentId !== job.agent_id) throw new Error("missing operation");
    for (let processed = 0; processed < 4 && job.completed_batches < job.total_batches; processed++) {
      const batch = job.completed_batches;
      const stageKey = `index:${job.id}:batch:${batch}:retry:${job.retry_generation}`;
      const existing = await deps.stageState(operation.id, stageKey);
      if (existing) {
        const code = existing === "failed" ? "indexing" : "unknown_usage";
        current = await rpcJob(deps, "fail_index_job", { p_job_id: job.id, p_lease_owner: lease, p_code: code });
        shouldSettle = code === "unknown_usage";
        return current.ok ? { ok: true, data: progress(current.data) } : current;
      }
      const start = batch * job.batch_size;
      const part = job.segments.slice(start, start + job.batch_size);
      if (!part.length) throw new Error("invalid batch");
      const embedded = await deps.embed({ operation, stageKey, texts: part.map(p => p.content), inputType: "document" }, { settle: false });
      if (!embedded.ok) {
        const code = embedded.error.code === "unknown_usage" ? "unknown_usage" : "provider";
        current = await rpcJob(deps, "fail_index_job", { p_job_id: job.id, p_lease_owner: lease, p_code: code });
        shouldSettle = code === "unknown_usage";
        return current.ok ? { ok: true, data: progress(current.data) } : current;
      }
      current = await rpcJob(deps, "complete_index_batch", { p_job_id: job.id, p_lease_owner: lease,
        p_batch: batch, p_chunks: embedded.data.value.map((embedding, ordinal) => ({ ordinal: start + ordinal, embedding })) });
      if (!current.ok) {
        const observed = await rpcJob(deps, "claim_index_job", { p_job_id: job.id, p_lease_owner: lease });
        if (observed.ok && observed.data.state === "failed" && observed.data.error?.code === "stale") {
          shouldSettle = true;
          return { ok: true, data: progress(observed.data) };
        }
        return current;
      }
      job = current.data;
    }
    if (job.completed_batches === job.total_batches) {
      current = await rpcJob(deps, "activate_revision", { p_job_id: job.id, p_lease_owner: lease });
      if (!current.ok) return current;
      job = current.data;
      shouldSettle = true;
    } else {
      current = await rpcJob(deps, "yield_index_job", { p_job_id: job.id, p_lease_owner: lease });
      if (!current.ok) return current;
      job = current.data;
    }
    return { ok: true, data: progress(job) };
  } catch {
    current = await rpcJob(deps, "fail_index_job", { p_job_id: job.id, p_lease_owner: lease, p_code: "indexing" });
    return current.ok ? { ok: true, data: progress(current.data) } : current;
  } finally {
    if (shouldSettle && options.settle !== false) await deps.settle(job.operation_id);
  }
}
