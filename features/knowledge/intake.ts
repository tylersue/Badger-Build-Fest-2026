import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { ConfirmSourceInput, IndexResult, KnowledgeSource, ServiceResult, SourceEstimate,
  SourceInput, SourceLimits, SourceUsage, TextSegment } from "@/lib/contracts/phase2";
import { getServiceDb } from "@/lib/server/db";
import { reserveOperation, settleOperation } from "@/features/billing/service";
import { PRICE_VERSION, costUnitsFromUsage } from "@/features/billing/pricing";
import { parseSource, type ParsedSource } from "./parse";
import { enqueueIndexRevision, indexRevision } from "./index";

const LIMITS: SourceLimits = { maxSources: 10, maxFileBytes: 5 * 1024 * 1024,
  maxAgentBytes: 25 * 1024 * 1024, maxPdfPages: 100, maxExtractedChars: 100_000,
  maxActiveChunks: 1000, chunkTargetChars: 2000, chunkOverlapChars: 200,
  parserTimeoutMs: 15_000, parserHeapMb: 128, maxDocxInflatedBytes: 20 * 1024 * 1024 };
const ESTIMATE_VERSION = 1;
type Kind = "pdf" | "docx" | "txt" | "md" | "text";
type Inspected = { bytes: Uint8Array; hash: string; kind: Kind; name: string; byteCount: number;
  mime: string; fileOrText: File | string };
type EstimateRow = { agent_id: string; name: string; kind: Kind; content_hash: string;
  byte_count: number; estimate_units: number | string; max_units: number | string;
  price_version: string; estimate_version: number; expires_at: string; consumed_at: string | null;
  retry_source_id?: string | null };
type Snapshot = { identityId: string; usage: SourceUsage; heldBytes: number; heldChunks: number;
  walletBalanceUnits: string; walletHeldUnits: string };
type Reserved = { sourceId: string; revisionId: string; jobId: string; operationId: string;
  storagePath: string; replayed: boolean };
type Claim = { claimed: boolean; state: string; sourceId?: string; operationId?: string;
  jobId?: string; storagePath?: string; name?: string; kind?: Kind };
type Deleted = { sourceId: string; storagePath: string | null; operationIds: string[]; deleted: boolean };
type Run = { revisionId: string; jobId: string; operationId: string; sourceId: string; state: string };
export type SourceListItem = KnowledgeSource & { jobId: string | null; operationId: string | null;
  estimatedUnits: string | null; chargedUnits: string | null; pendingUnits: string | null;
  progress: IndexResult["progress"] | null };
export type SourceOverview = { sources: SourceListItem[]; limits: SourceLimits; remaining: SourceUsage;
  walletAvailableUnits: string; walletHeldUnits: string };
export type IntakeDependencies = {
  now(): number;
  snapshot(agentId: string): Promise<Snapshot>;
  saveEstimate(row: EstimateRow & { id: string; token_hash: string }): Promise<void>;
  loadEstimate(tokenHash: string, agentId: string): Promise<EstimateRow | null>;
  reserveBilling(input: { identityId: string; agentId: string; requestKey: string; hash: string;
    estimate: bigint; max: bigint }): Promise<ServiceResult<{ id: string }>>;
  settle(operationId: string): Promise<ServiceResult<unknown>>;
  reserveQuota(input: Record<string, unknown>): Promise<ServiceResult<Reserved>>;
  upload(path: string, bytes: Uint8Array, mime: string): Promise<boolean>;
  download(path: string): Promise<Uint8Array | null>;
  remove(path: string): Promise<boolean>;
  cleanup(agentId: string, targetSourceId?: string): Promise<boolean>;
  failUpload(revisionId: string): Promise<void>;
  claim(revisionId: string, lease: string): Promise<ServiceResult<Claim>>;
  finish(revisionId: string, lease: string, state: "indexed" | "failed", pages: number | null,
    errorCode?: string): Promise<ServiceResult<boolean>>;
  source(agentId: string, sourceId: string): Promise<KnowledgeSource & { storagePath: string | null } | null>;
  run(revisionId: string): Promise<Run | null>;
  runByKey(agentId: string, requestKey: string): Promise<Run | null>;
  list(agentId: string): Promise<SourceListItem[]>;
  tombstone(agentId: string, sourceId: string, identityId: string): Promise<ServiceResult<Deleted>>;
  parse(input: { fileOrText: File | string; name: string }, limits: SourceLimits): Promise<ServiceResult<ParsedSource>>;
  enqueue(input: { jobId: string; agentId: string; revisionId: string; operationId: string;
    sourceId: string; sourceSegments: TextSegment[]; maxChunks: number }): Promise<ServiceResult<IndexResult>>;
  index(jobId: string): Promise<ServiceResult<IndexResult>>;
};

function err(code: "invalid_input" | "stale_estimate" | "quota" | "not_owner" | "provider" | "indexing" | "conflict" | "insufficient_credits",
  message: string, retryable = false): ServiceResult<never> {
  return { ok: false, error: { code, message, retryable } };
}
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function number(value: number | string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("unsafe count");
  return n;
}
function sourceRow(row: Record<string, unknown>): KnowledgeSource & { storagePath: string | null } {
  return { id: String(row.id), agentId: String(row.agent_id), kind: row.kind as KnowledgeSource["kind"],
    name: String(row.name), state: row.state as KnowledgeSource["state"],
    currentRevisionId: String(row.current_revision_id), activeRevisionId: row.active_revision_id as string | null,
    contentHash: String(row.content_hash), byteCount: number(row.byte_count as number),
    pageCount: row.page_count as number | null, chunkCount: number(row.chunk_count as number),
    deletedAt: row.deleted_at as string | null, error: row.error as KnowledgeSource["error"],
    origin: row.origin as KnowledgeSource["origin"], storagePath: row.storage_path as string | null };
}
function rpcError(message: string): ServiceResult<never> {
  const match = message.match(/\b(NOT_OWNER|STALE_ESTIMATE|UNKNOWN_USAGE|QUOTA|CONFLICT|INVALID_INPUT)\b/);
  const code = match?.[1] === "NOT_OWNER" ? "not_owner" : match?.[1] === "STALE_ESTIMATE" ? "stale_estimate"
    : match?.[1] === "QUOTA" ? "quota" : match?.[1] === "UNKNOWN_USAGE" ? "unknown_usage"
    : match?.[1] === "CONFLICT" ? "conflict" : match?.[1] === "INVALID_INPUT" ? "invalid_input" : "indexing";
  return { ok: false, error: { code, message: "Source request could not be completed.", retryable: code === "indexing" } };
}
function dbDependencies(): ServiceResult<IntakeDependencies> {
  const configured = getServiceDb(); if (!configured.ok) return configured;
  const db = configured.data;
  const rpc = db.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  const invoke = async <T>(name: string, args: Record<string, unknown>): Promise<ServiceResult<T>> => {
    const { data, error } = await rpc.call(db, name, args);
    return error ? rpcError(error.message) : { ok: true, data: data as T };
  };
  return { ok: true, data: {
    now: Date.now,
    async snapshot(agentId) {
      const [{ data: agent, error: agentError }, usageResult] = await Promise.all([
        db.from("agents").select("owner_id").eq("id", agentId).is("deleted_at", null).maybeSingle(),
        invoke<Record<string, number>>("source_usage", { p_agent_id: agentId }),
      ]);
      if (agentError || !agent || !usageResult.ok) throw new Error("source snapshot failed");
      const { data: wallet, error: walletError } = await db.from("wallets")
        .select("balance_units,held_units").eq("identity_id", agent.owner_id).maybeSingle();
      if (walletError) throw new Error("wallet snapshot failed");
      const u = usageResult.data;
      return { identityId: agent.owner_id,
        usage: { sources: number(u.sources), bytes: number(u.bytes), chunks: number(u.chunks) },
        heldBytes: number(u.heldBytes), heldChunks: number(u.heldChunks),
        walletBalanceUnits: String(wallet?.balance_units ?? 0), walletHeldUnits: String(wallet?.held_units ?? 0) };
    },
    async saveEstimate(row) {
      const { error } = await db.from("intake_estimates").insert(row as unknown as never);
      if (error) throw new Error("estimate write failed");
    },
    async loadEstimate(tokenHash, agentId) {
      const { data, error } = await db.from("intake_estimates").select("*")
        .eq("token_hash", tokenHash).eq("agent_id", agentId).maybeSingle();
      if (error) throw new Error("estimate lookup failed");
      return data as EstimateRow | null;
    },
    reserveBilling: async input => reserveOperation({ identityId: input.identityId, agentId: input.agentId,
      purpose: "source", requestKey: input.requestKey, payloadHash: input.hash,
      estimateUnits: input.estimate, maxUnits: input.max, priceVersion: PRICE_VERSION }),
    settle: settleOperation,
    reserveQuota: input => invoke<Reserved>("reserve_source_quota", input),
    async upload(path, bytes, mime) {
      const { error } = await db.storage.from("expert-sources").upload(path,
        new Blob([Uint8Array.from(bytes)], { type: mime }), { contentType: mime, upsert: false });
      return !error;
    },
    async download(path) {
      const { data, error } = await db.storage.from("expert-sources").download(path);
      if (error || !data) return null;
      const bytes = new Uint8Array(await data.arrayBuffer());
      return bytes.length <= LIMITS.maxFileBytes ? bytes : null;
    },
    async remove(path) { const { error } = await db.storage.from("expert-sources").remove([path]); return !error; },
    async cleanup(agentId, targetSourceId) {
      const query = db.from("source_cleanup_jobs").select("source_id,storage_path,attempts")
        .eq("agent_id", agentId).eq("state", "pending").order("created_at").limit(3);
      const { data, error } = await query;
      if (error) throw new Error("cleanup lookup failed");
      for (const job of data ?? []) {
        const removed = await db.storage.from("expert-sources").remove([job.storage_path]);
        const { error: updateError } = await db.from("source_cleanup_jobs").update({
          state: removed.error ? "pending" : "done", attempts: job.attempts + 1,
          updated_at: new Date().toISOString() })
          .eq("source_id", job.source_id).eq("agent_id", agentId).eq("state", "pending");
        if (updateError) throw new Error("cleanup state update failed");
      }
      if (!targetSourceId) return true;
      const { data: pending, error: pendingError } = await db.from("source_cleanup_jobs")
        .select("state").eq("source_id", targetSourceId).eq("agent_id", agentId).maybeSingle();
      if (pendingError) throw new Error("cleanup status failed");
      return pending?.state !== "pending";
    },
    async failUpload(revisionId) { const result = await invoke<boolean>("fail_source_upload", { p_revision_id: revisionId }); if (!result.ok) throw new Error("upload failure state failed"); },
    claim: (revisionId, lease) => invoke<Claim>("claim_source_processing", { p_revision_id: revisionId, p_lease_owner: lease }),
    finish: (revisionId, lease, state, pages, code) => invoke<boolean>("finish_source_parsing", {
      p_revision_id: revisionId, p_lease_owner: lease, p_state: state, p_page_count: pages, p_error_code: code ?? null }),
    async source(agentId, sourceId) {
      const { data, error } = await db.from("sources").select("*").eq("id", sourceId)
        .eq("agent_id", agentId).is("deleted_at", null).maybeSingle();
      if (error) throw new Error("source lookup failed");
      return data ? sourceRow(data) : null;
    },
    async run(revisionId) {
      const { data, error } = await db.from("source_intake_runs").select("*")
        .eq("revision_id", revisionId).maybeSingle();
      if (error) throw new Error("run lookup failed");
      return data ? { revisionId: data.revision_id, jobId: data.job_id, operationId: data.operation_id,
        sourceId: data.source_id, state: data.state } : null;
    },
    async runByKey(agentId, requestKey) {
      const { data, error } = await db.from("source_intake_runs").select("*")
        .eq("agent_id", agentId).eq("request_key", requestKey).maybeSingle();
      if (error) throw new Error("run lookup failed");
      return data ? { revisionId: data.revision_id, jobId: data.job_id, operationId: data.operation_id,
        sourceId: data.source_id, state: data.state } : null;
    },
    async list(agentId) {
      const { data, error } = await db.from("sources").select("*").eq("agent_id", agentId)
        .is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw new Error("source list failed");
      const rows = data ?? [];
      if (!rows.length) return [];
      const { data: runs, error: runError } = await db.from("source_intake_runs").select("*")
        .in("source_id", rows.map(row => row.id));
      if (runError) throw new Error("source run list failed");
      const operations = (runs ?? []).map(run => run.operation_id);
      const jobs = (runs ?? []).map(run => run.job_id);
      const [operationRows, jobRows] = await Promise.all([
        operations.length ? db.from("operations").select("id,estimate_units,actual_units,held_units")
          .in("id", operations) : Promise.resolve({ data: [], error: null }),
        jobs.length ? db.from("index_jobs").select("id,completed_batches,total_batches,indexed_chunks")
          .in("id", jobs) : Promise.resolve({ data: [], error: null }),
      ]);
      if (operationRows.error || jobRows.error) throw new Error("source cost lookup failed");
      return rows.map(row => {
        const run = (runs ?? []).find(item => item.revision_id === row.current_revision_id);
        const operation = (operationRows.data ?? []).find(item => item.id === run?.operation_id);
        const sourceOperationIds = new Set((runs ?? []).filter(item => item.source_id === row.id)
          .map(item => item.operation_id));
        const allOperations = (operationRows.data ?? []).filter(item => sourceOperationIds.has(item.id));
        const job = (jobRows.data ?? []).find(item => item.id === run?.job_id);
        const { storagePath: _privatePath, ...safe } = sourceRow(row);
        void _privatePath;
        return { ...safe, jobId: run?.job_id ?? null, operationId: run?.operation_id ?? null,
          estimatedUnits: operation ? String(operation.estimate_units) : null,
          chargedUnits: allOperations.length ? allOperations.reduce((sum, item) =>
            sum + BigInt(String(item.actual_units ?? 0)), BigInt(0)).toString() : null,
          pendingUnits: allOperations.length ? allOperations.reduce((sum, item) =>
            sum + BigInt(String(item.held_units)), BigInt(0)).toString() : null,
          progress: job ? { completedBatches: job.completed_batches, totalBatches: job.total_batches,
            indexedChunks: job.indexed_chunks } : null };
      });
    },
    tombstone: (agentId, sourceId, identityId) => invoke<Deleted>("tombstone_source", {
      p_agent_id: agentId, p_source_id: sourceId, p_identity_id: identityId }),
    parse: parseSource, enqueue: enqueueIndexRevision, index: indexRevision,
  } };
}
function dependencies(injected?: IntakeDependencies): ServiceResult<IntakeDependencies> {
  return injected ? { ok: true, data: injected } : dbDependencies();
}
async function inspect(input: SourceInput): Promise<ServiceResult<Inspected>> {
  const { name, fileOrText } = input;
  if (!input.agentId || !/^.{1,200}$/.test(input.agentId) || typeof name !== "string" ||
      !name.trim() || name.length > 200 || /[\u0000-\u001f]/.test(name))
    return err("invalid_input", "Choose a source name.");
  const pasted = typeof fileOrText === "string";
  if (!pasted && (!fileOrText || typeof fileOrText.arrayBuffer !== "function" || fileOrText.name !== name))
    return err("stale_estimate", "Select the original file and get a new estimate.");
  const kind: Kind = pasted ? "text" : (name.toLowerCase().split(".").pop() as Kind);
  const mimes: Record<Kind, string[]> = { pdf: ["application/pdf"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    txt: ["text/plain"], md: ["text/markdown", "text/x-markdown", "text/plain"], text: ["text/plain"] };
  if (!mimes[kind] || (!pasted && fileOrText.type && !mimes[kind].includes(fileOrText.type.toLowerCase())))
    return err("invalid_input", "Use a PDF, DOCX, TXT, or MD file.");
  if (pasted && (!fileOrText.trim() || !fileOrText.isWellFormed() || fileOrText.length > LIMITS.maxExtractedChars))
    return err("invalid_input", "Paste valid text within the source limit.");
  if (!pasted && fileOrText.size > LIMITS.maxFileBytes) return err("invalid_input", "File exceeds 5 MiB.");
  let bytes: Uint8Array;
  try { bytes = pasted ? new TextEncoder().encode(fileOrText) : new Uint8Array(await fileOrText.arrayBuffer()); }
  catch { return err("invalid_input", "File could not be read."); }
  if (!bytes.length || bytes.length > LIMITS.maxFileBytes) return err("invalid_input", "Source is empty or too large.");
  if (kind === "pdf" && Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-")
    return err("invalid_input", "PDF signature is invalid.");
  if (kind === "docx" && (bytes.length < 4 || Buffer.from(bytes.subarray(0, 4)).readUInt32LE() !== 0x04034b50))
    return err("invalid_input", "DOCX signature is invalid.");
  if (kind === "txt" || kind === "md" || kind === "text") {
    try { const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error("binary"); }
    catch { return err("invalid_input", "Text must be plain UTF-8."); }
  }
  return { ok: true, data: { bytes, hash: digest(bytes), kind, name, byteCount: bytes.length,
    mime: pasted ? "text/plain" : fileOrText.type || mimes[kind][0], fileOrText } };
}
function cost(byteCount: number, kind: Kind): { estimate: bigint; max: bigint } {
  // A display approximation from known bytes. Extraction and overlap are unknown
  // until confirmed parsing; reserve a bounded worst-case 100k-character envelope.
  const guessedChars = kind === "pdf" || kind === "docx" ? Math.min(LIMITS.maxExtractedChars, byteCount * 3)
    : byteCount;
  const estimate = costUnitsFromUsage({ model: "voyage-4-lite", embeddingTokens: Math.ceil(guessedChars / 2) });
  // Up to 1,000 chunks produce at most 125 eight-chunk batches; each Voyage
  // batch accepts at most 32,000 bytes. Reserve that full dispatch envelope.
  const max = costUnitsFromUsage({ model: "voyage-4-lite", embeddingTokens: 4_000_000 });
  return { estimate, max };
}
async function preflight(input: SourceInput, deps: IntakeDependencies, retrySourceId: string | null): Promise<ServiceResult<SourceEstimate>> {
  const checked = await inspect(input); if (!checked.ok) return checked;
  const s = checked.data;
  try {
    const snapshot = await deps.snapshot(input.agentId);
    const usedSources = snapshot.usage.sources - (retrySourceId ? 1 : 0);
    const usedBytes = snapshot.usage.bytes - (retrySourceId ? s.byteCount : 0);
    const remaining = { sources: Math.max(0, LIMITS.maxSources - snapshot.usage.sources),
      bytes: Math.max(0, LIMITS.maxAgentBytes - snapshot.usage.bytes - snapshot.heldBytes),
      chunks: Math.max(0, LIMITS.maxActiveChunks - snapshot.usage.chunks - snapshot.heldChunks) };
    if (s.byteCount > LIMITS.maxFileBytes || usedSources + 1 > LIMITS.maxSources ||
      usedBytes + snapshot.heldBytes + s.byteCount > LIMITS.maxAgentBytes || remaining.chunks < 1)
      return err("quota", "Source limits reached; remove another source or shorten this one.");
    const price = cost(s.byteCount, s.kind);
    const available = BigInt(snapshot.walletBalanceUnits) - BigInt(snapshot.walletHeldUnits);
    if (available < price.max) return err("insufficient_credits", "Not enough available credits for source processing.");
    const token = `est_${randomUUID()}`;
    const expiresAt = new Date(deps.now() + 10 * 60_000).toISOString();
    await deps.saveEstimate({ id: `estimate_${randomUUID()}`, token_hash: digest(new TextEncoder().encode(token)),
      agent_id: input.agentId, name: s.name, kind: s.kind, content_hash: s.hash,
      byte_count: s.byteCount, estimate_units: price.estimate.toString(), max_units: price.max.toString(),
      price_version: PRICE_VERSION, estimate_version: ESTIMATE_VERSION, expires_at: expiresAt,
      consumed_at: null, retry_source_id: retrySourceId });
    return { ok: true, data: { agentId: input.agentId, name: s.name, kind: s.kind, contentHash: s.hash,
      estimateToken: token, version: ESTIMATE_VERSION, expiresAt, byteCount: s.byteCount,
      projectedUse: { sources: retrySourceId ? 0 : 1, bytes: retrySourceId ? 0 : s.byteCount, chunks: 0 }, remaining, limits: LIMITS,
      projectedPageCount: null, projectedChunkCount: null,
      walletAvailableUnits: available.toString(), walletHeldUnits: snapshot.walletHeldUnits,
      estimateUnits: price.estimate.toString(), maxUnits: price.max.toString(), priceVersion: PRICE_VERSION } };
  } catch { return err("indexing", "Source estimate could not be saved.", true); }
}
export async function preflightSource(input: SourceInput, injected?: IntakeDependencies): Promise<ServiceResult<SourceEstimate>> {
  const configured = dependencies(injected); return configured.ok ? preflight(input, configured.data, null) : configured;
}
export async function preflightSourceRetry(agentId: string, sourceId: string, injected?: IntakeDependencies): Promise<ServiceResult<SourceEstimate>> {
  const configured = dependencies(injected); if (!configured.ok) return configured;
  const deps = configured.data;
  try {
    const source = await deps.source(agentId, sourceId);
    if (!source || source.deletedAt) return err("not_owner", "Source is unavailable.");
    if (source.error?.code === "unknown_usage") return { ok: false, error: { code: "unknown_usage",
      message: "Source usage must be reconciled before retry.", retryable: false } };
    if (source.state !== "failed" || !source.storagePath) return err("conflict", "Source is not ready for retry.");
    const bytes = await deps.download(source.storagePath);
    if (!bytes || digest(bytes) !== source.contentHash) return err("conflict", "Stored source is unavailable; upload it again.");
    const payload = source.kind === "text" ? new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      : new File([Uint8Array.from(bytes)], source.name, { type: mimeFor(source.kind as Kind) });
    return preflight({ agentId, name: source.name, fileOrText: payload }, deps, sourceId);
  } catch { return err("indexing", "Source could not be inspected.", true); }
}
function mimeFor(kind: Kind): string {
  return { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain", md: "text/markdown", text: "text/plain" }[kind];
}
async function process(reserved: Reserved, agentId: string, deps: IntakeDependencies): Promise<ServiceResult<IndexResult>> {
  const lease = `lease_${randomUUID()}`;
  const claimed = await deps.claim(reserved.revisionId, lease);
  if (!claimed.ok) return claimed;
  if (claimed.data.state === "failed") return { ok: true, data: { state: "failed", jobId: reserved.jobId,
    progress: { completedBatches: 0, totalBatches: 0, indexedChunks: 0 } } };
  if (!claimed.data.claimed && claimed.data.state === "processing") return { ok: true,
    data: { state: "pending", jobId: reserved.jobId, progress: { completedBatches: 0, totalBatches: 0, indexedChunks: 0 } } };
  if (claimed.data.claimed) {
    const item = claimed.data;
    if (!item.storagePath || !item.name || !item.kind) return err("indexing", "Source state is incomplete.", true);
    const bytes = await deps.download(item.storagePath);
    const source = await deps.source(agentId, reserved.sourceId);
    if (!bytes || !source || digest(bytes) !== source.contentHash) {
      await deps.finish(reserved.revisionId, lease, "failed", null, "storage");
      await deps.settle(reserved.operationId);
      return err("indexing", "Stored source is unavailable.", true);
    }
    let parsed: ServiceResult<ParsedSource>;
    try {
      const payload = item.kind === "text" ? new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        : new File([Uint8Array.from(bytes)], item.name, { type: mimeFor(item.kind) });
      parsed = await deps.parse({ fileOrText: payload, name: item.name }, LIMITS);
    } catch { parsed = err("invalid_input", "Source text could not be decoded."); }
    if (!parsed.ok) {
      await deps.finish(reserved.revisionId, lease, "failed", null, "parse");
      await deps.settle(reserved.operationId);
      return parsed;
    }
    const queued = await deps.enqueue({ jobId: reserved.jobId, agentId,
      revisionId: reserved.revisionId, operationId: reserved.operationId,
      sourceId: reserved.sourceId, sourceSegments: parsed.data.segments, maxChunks: LIMITS.maxActiveChunks });
    if (!queued.ok) {
      await deps.finish(reserved.revisionId, lease, "failed", null, queued.error.code);
      await deps.settle(reserved.operationId);
      return queued;
    }
    const finished = await deps.finish(reserved.revisionId, lease, "indexed", parsed.data.pageCount);
    if (!finished.ok) return finished;
  }
  const indexed = await deps.index(reserved.jobId);
  if (indexed.ok && indexed.data.state === "failed") await deps.settle(reserved.operationId);
  return indexed;
}
async function confirm(input: ConfirmSourceInput, deps: IntakeDependencies, retrySourceId: string | null): Promise<ServiceResult<IndexResult>> {
  if (!input.estimateToken || !input.requestKey || input.requestKey.length > 200)
    return err("invalid_input", "Confirmation token and request key are required.");
  const checked = await inspect(input); if (!checked.ok) return checked.error.code === "invalid_input"
    ? err("stale_estimate", "Source changed; get a fresh estimate.") : checked;
  const s = checked.data;
  let unassignedOperationId: string | null = null;
  try {
    const tokenHash = digest(new TextEncoder().encode(input.estimateToken));
    const estimate = await deps.loadEstimate(tokenHash, input.agentId);
    if (!estimate || Date.parse(estimate.expires_at) <= deps.now() ||
      estimate.estimate_version !== ESTIMATE_VERSION || estimate.price_version !== PRICE_VERSION ||
      estimate.retry_source_id !== retrySourceId || estimate.name !== s.name || estimate.kind !== s.kind ||
      estimate.content_hash !== s.hash || number(estimate.byte_count) !== s.byteCount)
      return err("stale_estimate", "Source or estimate changed; get a fresh estimate.");
    if (estimate.consumed_at) {
      const prior = await deps.runByKey(input.agentId, input.requestKey);
      const source = prior && await deps.source(input.agentId, prior.sourceId);
      if (!prior || !source || source.contentHash !== s.hash || source.name !== s.name ||
          source.kind !== s.kind || (retrySourceId !== null && prior.sourceId !== retrySourceId))
        return err("stale_estimate", "This estimate was already used; get a fresh estimate.");
      if (prior.state === "queued") return { ok: true, data: { state: "pending", jobId: prior.jobId,
        progress: { completedBatches: 0, totalBatches: 0, indexedChunks: 0 } } };
      return process({ sourceId: prior.sourceId, revisionId: prior.revisionId, jobId: prior.jobId,
        operationId: prior.operationId, storagePath: source.storagePath ?? "", replayed: true }, input.agentId, deps);
    }
    const snapshot = await deps.snapshot(input.agentId);
    const price = cost(s.byteCount, s.kind);
    if (BigInt(estimate.estimate_units) !== price.estimate || BigInt(estimate.max_units) !== price.max)
      return err("stale_estimate", "Price changed; get a fresh estimate.");
    if (snapshot.usage.sources - (retrySourceId ? 1 : 0) + 1 > LIMITS.maxSources ||
        snapshot.usage.bytes - (retrySourceId ? s.byteCount : 0) + snapshot.heldBytes + s.byteCount > LIMITS.maxAgentBytes ||
        snapshot.usage.chunks + snapshot.heldChunks >= LIMITS.maxActiveChunks)
      return err("quota", "Source limits changed; get a fresh estimate.");
    if (BigInt(snapshot.walletBalanceUnits) - BigInt(snapshot.walletHeldUnits) < price.max)
      return err("insufficient_credits", "Not enough available credits for source processing.");
    const billed = await deps.reserveBilling({ identityId: snapshot.identityId, agentId: input.agentId,
      requestKey: input.requestKey, hash: s.hash, estimate: price.estimate, max: price.max });
    if (!billed.ok) return billed;
    unassignedOperationId = billed.data.id;
    const sourceId = retrySourceId ?? `src_${randomUUID()}`;
    const revisionId = `srev_${randomUUID()}`;
    const jobId = `job_${randomUUID()}`;
    const storagePath = `${input.agentId}/${sourceId}/${randomUUID()}`;
    const reserved = await deps.reserveQuota({ p_agent_id: input.agentId, p_identity_id: snapshot.identityId,
      p_token_hash: tokenHash, p_request_key: input.requestKey, p_source_id: sourceId,
      p_revision_id: revisionId, p_job_id: jobId, p_storage_path: storagePath,
      p_operation_id: billed.data.id, p_name: s.name, p_kind: s.kind,
      p_content_hash: s.hash, p_byte_count: s.byteCount, p_price_version: PRICE_VERSION,
      p_max_sources: LIMITS.maxSources, p_max_agent_bytes: LIMITS.maxAgentBytes,
      p_retry_source_id: retrySourceId });
    if (!reserved.ok) { await deps.settle(billed.data.id); unassignedOperationId = null; return reserved; }
    unassignedOperationId = null;
    if (!reserved.data.replayed && !retrySourceId) {
      if (!await deps.upload(reserved.data.storagePath, s.bytes, s.mime)) {
        await Promise.allSettled([deps.failUpload(reserved.data.revisionId),
          deps.settle(reserved.data.operationId)]);
        return err("indexing", "Source could not be stored; retry the upload.", true);
      }
    }
    if (reserved.data.replayed) return { ok: true, data: { state: "pending", jobId: reserved.data.jobId,
      progress: { completedBatches: 0, totalBatches: 0, indexedChunks: 0 } } };
    return process(reserved.data, input.agentId, deps);
  } catch {
    if (unassignedOperationId) await deps.settle(unassignedOperationId).catch(() => undefined);
    return err("indexing", "Source confirmation could not complete.", true);
  }
}
export async function confirmSource(input: ConfirmSourceInput, injected?: IntakeDependencies): Promise<ServiceResult<IndexResult>> {
  const configured = dependencies(injected); return configured.ok ? confirm(input, configured.data, null) : configured;
}
export async function retrySource(input: { agentId: string; sourceId: string; estimateToken: string; requestKey: string },
  injected?: IntakeDependencies): Promise<ServiceResult<IndexResult>> {
  const configured = dependencies(injected); if (!configured.ok) return configured;
  const deps = configured.data;
  try {
    const source = await deps.source(input.agentId, input.sourceId);
    if (!source || source.deletedAt) return err("not_owner", "Source is unavailable.");
    const prior = await deps.runByKey(input.agentId, input.requestKey);
    if ((source.state !== "failed" && !prior) || !source.storagePath)
      return err("conflict", "Source is not ready for retry.");
    const bytes = await deps.download(source.storagePath);
    if (!bytes || digest(bytes) !== source.contentHash) return err("conflict", "Stored source is unavailable; upload it again.");
    const payload = source.kind === "text" ? new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      : new File([Uint8Array.from(bytes)], source.name, { type: mimeFor(source.kind as Kind) });
    return confirm({ agentId: input.agentId, fileOrText: payload, name: source.name,
      estimateToken: input.estimateToken, requestKey: input.requestKey }, deps, input.sourceId);
  } catch { return err("indexing", "Source retry could not complete.", true); }
}
export async function resumeSource(agentId: string, sourceId: string, injected?: IntakeDependencies): Promise<ServiceResult<IndexResult>> {
  const configured = dependencies(injected); if (!configured.ok) return configured;
  try {
    const source = await configured.data.source(agentId, sourceId);
    if (!source || source.deletedAt) return err("not_owner", "Source is unavailable.");
    if (source.state === "failed") return err("conflict", "Get a fresh retry estimate.");
    const run = await configured.data.run(source.currentRevisionId);
    if (!run || run.sourceId !== sourceId) return err("indexing", "Source processing state is unavailable.", true);
    return process({ sourceId, revisionId: run.revisionId, jobId: run.jobId,
      operationId: run.operationId, storagePath: source.storagePath ?? "", replayed: true }, agentId, configured.data);
  } catch { return err("indexing", "Source processing could not resume.", true); }
}
export async function listSources(agentId: string, injected?: IntakeDependencies): Promise<ServiceResult<SourceOverview>> {
  const configured = dependencies(injected); if (!configured.ok) return configured;
  try {
    await configured.data.cleanup(agentId);
    const [sources, snapshot] = await Promise.all([configured.data.list(agentId), configured.data.snapshot(agentId)]);
    return { ok: true, data: { sources, limits: LIMITS,
      remaining: { sources: Math.max(0, LIMITS.maxSources - snapshot.usage.sources),
        bytes: Math.max(0, LIMITS.maxAgentBytes - snapshot.usage.bytes - snapshot.heldBytes),
        chunks: Math.max(0, LIMITS.maxActiveChunks - snapshot.usage.chunks - snapshot.heldChunks) },
      walletAvailableUnits: (BigInt(snapshot.walletBalanceUnits) - BigInt(snapshot.walletHeldUnits)).toString(),
      walletHeldUnits: snapshot.walletHeldUnits } };
  }
  catch { return err("indexing", "Sources could not be loaded.", true); }
}
export async function deleteSource(agentId: string, sourceId: string, injected?: IntakeDependencies): Promise<ServiceResult<{ sourceId: string; deleted: true; cleanupPending: boolean; historicalCitationsRetained: true }>> {
  const configured = dependencies(injected); if (!configured.ok) return configured;
  const deps = configured.data;
  try {
    const snapshot = await deps.snapshot(agentId);
    const deleted = await deps.tombstone(agentId, sourceId, snapshot.identityId);
    if (!deleted.ok) return deleted;
    await Promise.allSettled(deleted.data.operationIds.map(operationId => deps.settle(operationId)));
    let removed = !deleted.data.storagePath;
    try { removed = await deps.cleanup(agentId, sourceId); }
    catch { removed = false; }
    return { ok: true, data: { sourceId, deleted: true, cleanupPending: !removed,
      historicalCitationsRetained: true } };
  } catch { return err("indexing", "Source could not be deleted.", true); }
}
