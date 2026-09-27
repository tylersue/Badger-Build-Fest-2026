import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createHash } from "node:crypto";
import type { KnowledgeSource, ServiceResult, SourceInput } from "@/lib/contracts/phase2";
import { confirmSource, deleteSource, preflightSource, preflightSourceRetry, retrySource,
  type IntakeDependencies, type SourceListItem } from "./intake";

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const failure = (code: "quota" | "conflict"): ServiceResult<never> =>
  ({ ok: false, error: { code, message: code, retryable: false } });
type Estimate = Awaited<ReturnType<IntakeDependencies["loadEstimate"]>>;
type Source = KnowledgeSource & { storagePath: string | null };
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

function fixture() {
  let now = Date.now();
  let parses = 0;
  let indexes = 0;
  let reservations = 0;
  let settlements = 0;
  let parseShouldFail = false;
  let deleteWhileParsing = false;
  let baseBytes = 0;
  const estimates = new Map<string, Estimate>();
  const sources = new Map<string, Source>();
  const runs = new Map<string, { revisionId: string; jobId: string; operationId: string; sourceId: string; state: string; requestKey: string }>();
  const blobs = new Map<string, Uint8Array>();
  const paid = new Set<string>();
  const deps: IntakeDependencies = {
    now: () => now,
    async snapshot() {
      const active = [...sources.values()].filter(s => !s.deletedAt);
      return { identityId: "maria", usage: { sources: active.length,
        bytes: baseBytes + active.reduce((n, s) => n + s.byteCount, 0), chunks: 0 },
        heldBytes: 0, heldChunks: 0, walletBalanceUnits: "20000000000", walletHeldUnits: "0" };
    },
    async saveEstimate(row) { estimates.set(row.token_hash, { ...row }); },
    async loadEstimate(tokenHash) { return estimates.get(tokenHash) ?? null; },
    async reserveBilling({ requestKey }) {
      reservations++;
      return ok({ id: `op_${requestKey}` });
    },
    async settle() { settlements++; return ok({}); },
    async reserveQuota(input) {
      const key = String(input.p_request_key);
      const prior = [...runs.values()].find(run => run.requestKey === key);
      if (prior) {
        const source = sources.get(prior.sourceId)!;
        if (source.contentHash !== input.p_content_hash) return failure("conflict");
        return ok({ sourceId: prior.sourceId, revisionId: prior.revisionId, jobId: prior.jobId,
          operationId: prior.operationId, storagePath: source.storagePath!, replayed: true });
      }
      const estimate = estimates.get(String(input.p_token_hash));
      if (!estimate || estimate.consumed_at) return failure("conflict");
      const retry = input.p_retry_source_id ? sources.get(String(input.p_retry_source_id)) : null;
      // No await between observing and updating capacity: models the SQL agent row lock.
      const active = [...sources.values()].filter(s => !s.deletedAt);
      const usedBytes = baseBytes + active.reduce((n, s) => n + s.byteCount, 0);
      if (active.length - (retry ? 1 : 0) + 1 > 10 ||
          usedBytes - (retry ? retry.byteCount : 0) + Number(input.p_byte_count) > 25 * 1024 * 1024)
        return failure("quota");
      const sourceId = retry?.id ?? String(input.p_source_id);
      const revisionId = String(input.p_revision_id);
      const storagePath = retry?.storagePath ?? String(input.p_storage_path);
      const source: Source = { id: sourceId, agentId: "a", kind: String(input.p_kind) as Source["kind"],
        name: String(input.p_name), state: "queued", currentRevisionId: revisionId,
        activeRevisionId: null, contentHash: String(input.p_content_hash),
        byteCount: Number(input.p_byte_count), pageCount: null, chunkCount: 0,
        deletedAt: null, error: null, origin: "live", storagePath };
      sources.set(sourceId, source);
      runs.set(revisionId, { sourceId, revisionId, jobId: String(input.p_job_id),
        operationId: String(input.p_operation_id), state: "queued", requestKey: key });
      estimate.consumed_at = new Date(now).toISOString();
      return ok({ sourceId, revisionId, jobId: String(input.p_job_id),
        operationId: String(input.p_operation_id), storagePath: storagePath!, replayed: false });
    },
    async upload(path, bytes) { blobs.set(path, bytes); return true; },
    async download(path) { return blobs.get(path) ?? null; },
    async remove(path) { return blobs.delete(path); },
    async failUpload(revisionId) { runs.get(revisionId)!.state = "failed"; },
    async claim(revisionId) {
      const run = runs.get(revisionId)!;
      if (run.state === "indexed" || run.state === "failed") return ok({ claimed: false, state: run.state });
      run.state = "processing";
      const source = sources.get(run.sourceId)!;
      source.state = "processing";
      return ok({ claimed: true, state: "processing", sourceId: source.id, operationId: run.operationId,
        jobId: run.jobId, storagePath: source.storagePath!, name: source.name, kind: source.kind as "text" });
    },
    async finish(revisionId, _lease, state, pages, code) {
      const run = runs.get(revisionId)!;
      const source = sources.get(run.sourceId)!;
      if (source.deletedAt) return failure("conflict");
      run.state = state;
      source.state = state === "failed" ? "failed" : "processing";
      source.pageCount = pages;
      if (code) source.error = { code: code as "indexing", message: code, retryable: false };
      return ok(true);
    },
    async source(_agentId, sourceId) { return sources.get(sourceId) ?? null; },
    async run(revisionId) { return runs.get(revisionId) ?? null; },
    async runByKey(_agentId, requestKey) { return [...runs.values()].find(r => r.requestKey === requestKey) ?? null; },
    async list() { return [...sources.values()].filter(s => !s.deletedAt).map(s => ({ ...s,
      jobId: null, operationId: null, estimatedUnits: null, chargedUnits: null,
      pendingUnits: null, progress: null } satisfies SourceListItem)); },
    async tombstone(_agentId, sourceId) {
      const source = sources.get(sourceId);
      if (!source) return { ok: false, error: { code: "not_owner", message: "not owner", retryable: false } };
      source.deletedAt = new Date(now).toISOString();
      source.state = "failed";
      return ok({ sourceId, storagePath: source.storagePath,
        operationIds: [...runs.values()].filter(r => r.sourceId === sourceId).map(r => r.operationId), deleted: true });
    },
    async parse() {
      parses++;
      if (deleteWhileParsing) {
        const source = [...sources.values()].at(-1)!;
        source.deletedAt = new Date(now).toISOString();
      }
      if (parseShouldFail) return { ok: false, error: { code: "invalid_input", message: "bad parse", retryable: false } };
      return ok({ segments: [{ content: "Meaningful source text", page: null, headingPath: null }],
        pageCount: null, characterCount: 22 });
    },
    async enqueue({ sourceId }) {
      if (sources.get(sourceId)?.deletedAt) return failure("conflict");
      return ok({ state: "pending", jobId: "job", progress: { completedBatches: 0, totalBatches: 1, indexedChunks: 0 } });
    },
    async index(jobId) {
      indexes++;
      paid.add(jobId);
      const run = [...runs.values()].find(r => r.jobId === jobId)!;
      sources.get(run.sourceId)!.state = "ready";
      return ok({ state: "ready", jobId, progress: { completedBatches: 1, totalBatches: 1, indexedChunks: 1 } });
    },
  };
  return { deps, sources, blobs, estimates, setNow(value: number) { now = value; },
    setParseFail(value: boolean) { parseShouldFail = value; },
    setDeleteWhileParsing(value: boolean) { deleteWhileParsing = value; },
    setBaseBytes(value: number) { baseBytes = value; },
    counts: () => ({ parses, indexes, reservations, settlements, paid: paid.size }) };
}
const input = { agentId: "a", name: "notes", fileOrText: "A detailed answer about the topic." };
const confirm = async (f: ReturnType<typeof fixture>, source: SourceInput = input, key = "request-1") => {
  const estimated = await preflightSource(source, f.deps);
  if (!estimated.ok) throw new Error(estimated.error.code);
  const result = await confirmSource({ ...source, estimateToken: estimated.data.estimateToken, requestKey: key }, f.deps);
  return { estimated, result };
};

describe("confirmed source intake", () => {
  it("preflights without paid work and confirms the same bytes across separate calls", async () => {
    const f = fixture();
    const estimate = await preflightSource(input, f.deps);
    expect(estimate.ok).toBe(true);
    expect(f.counts()).toMatchObject({ parses: 0, indexes: 0, reservations: 0 });
    if (!estimate.ok) return;
    expect(estimate.data.projectedChunkCount).toBeNull();
    expect(estimate.data.walletAvailableUnits).toBe("20000000000");
    const confirmed = await confirmSource({ ...input, estimateToken: estimate.data.estimateToken,
      requestKey: "same-key" }, f.deps);
    expect(confirmed).toMatchObject({ ok: true, data: { state: "ready" } });
    expect(f.counts()).toMatchObject({ parses: 1, indexes: 1, reservations: 1 });
    const replay = await confirmSource({ ...input, estimateToken: estimate.data.estimateToken,
      requestKey: "same-key" }, f.deps);
    expect(replay.ok).toBe(true);
    expect(f.counts()).toMatchObject({ parses: 1, indexes: 2, reservations: 1 });
  });

  it("rejects absent, changed, expired, and repriced confirmation before billing", async () => {
    const f = fixture();
    const estimate = await preflightSource(input, f.deps);
    if (!estimate.ok) throw new Error("preflight failed");
    const token = estimate.data.estimateToken;
    expect((await confirmSource({ ...input, fileOrText: undefined as never,
      estimateToken: token, requestKey: "missing" }, f.deps)).ok).toBe(false);
    const changed = await confirmSource({ ...input, fileOrText: "Different text",
      estimateToken: token, requestKey: "changed" }, f.deps);
    expect(changed).toMatchObject({ ok: false, error: { code: "stale_estimate" } });
    f.setNow(Date.parse(estimate.data.expiresAt) + 1);
    expect(await confirmSource({ ...input, estimateToken: token, requestKey: "expired" }, f.deps))
      .toMatchObject({ ok: false, error: { code: "stale_estimate" } });
    f.setNow(Date.now());
    const row = f.estimates.get(hash(token))!;
    row.price_version = "retired-price";
    expect(await confirmSource({ ...input, estimateToken: token, requestKey: "price" }, f.deps))
      .toMatchObject({ ok: false, error: { code: "stale_estimate" } });
    expect(f.counts()).toMatchObject({ reservations: 0, parses: 0, indexes: 0 });
  });

  it.each([
    ["pdf", "%PDF-1.7 sample"], ["docx", "PK\u0003\u0004sample"],
    ["txt", "plain text"], ["md", "# A heading\n\ntext"],
  ])("accepts bounded %s file through confirmed path", async (extension, contents) => {
    const f = fixture();
    const mime = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain", md: "text/markdown" }[extension]!;
    const file = new File([contents], `sample.${extension}`, { type: mime });
    const result = await confirm(f, { agentId: "a", name: file.name, fileOrText: file });
    expect(result.result).toMatchObject({ ok: true, data: { state: "ready" } });
  });

  it("retries a failed source using its retained private blob and a fresh estimate", async () => {
    const f = fixture(); f.setParseFail(true);
    const initial = await confirm(f);
    expect(initial.result).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    const sourceId = [...f.sources.keys()][0];
    expect(f.blobs.size).toBe(1);
    f.setParseFail(false);
    const retryEstimate = await preflightSourceRetry("a", sourceId, f.deps);
    if (!retryEstimate.ok) throw new Error(retryEstimate.error.code);
    const retry = await retrySource({ agentId: "a", sourceId,
      estimateToken: retryEstimate.data.estimateToken, requestKey: "retry-1" }, f.deps);
    expect(retry).toMatchObject({ ok: true, data: { state: "ready" } });
    expect(f.sources.size).toBe(1);
    expect(f.counts()).toMatchObject({ parses: 2, indexes: 1 });
  });

  it("enforces quota atomically after concurrent preflights", async () => {
    const f = fixture(); f.setBaseBytes(22 * 1024 * 1024);
    const file = new File(["x".repeat(2 * 1024 * 1024)], "big.txt", { type: "text/plain" });
    const a = await preflightSource({ agentId: "a", name: file.name, fileOrText: file }, f.deps);
    const b = await preflightSource({ agentId: "a", name: file.name, fileOrText: file }, f.deps);
    if (!a.ok || !b.ok) throw new Error("preflight failed");
    const results = await Promise.all([a, b].map((estimate, i) => confirmSource({ agentId: "a",
      name: file.name, fileOrText: file, estimateToken: estimate.data.estimateToken,
      requestKey: `race-${i}` }, f.deps)));
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.filter(r => !r.ok).map(r => !r.ok && r.error.code)).toEqual(["quota"]);
    expect(f.counts()).toMatchObject({ indexes: 1, settlements: 1 });
  });

  it("tombstones during parsing and never indexes deleted knowledge", async () => {
    const f = fixture(); f.setDeleteWhileParsing(true);
    const result = await confirm(f);
    expect(result.result.ok).toBe(false);
    expect(f.counts().indexes).toBe(0);
    const sourceId = [...f.sources.keys()][0];
    const deleted = await deleteSource("a", sourceId, f.deps);
    expect(deleted).toMatchObject({ ok: true, data: { historicalCitationsRetained: true } });
    expect(f.sources.get(sourceId)?.deletedAt).not.toBeNull();
  });
});
