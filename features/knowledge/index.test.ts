import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { Operation } from "@/lib/contracts/phase2";
import { enqueueIndexRevision, indexRevision, type IndexDependencies } from "./index";

const operation: Operation = { id: "op_00000000-0000-4000-8000-000000000001", agentId: "agent-a",
  identityId: "maria", purpose: "embedding", requestKey: "key", payloadHash: "a".repeat(64),
  state: "reserved", estimateUnits: "1", heldUnits: "10", actualUnits: null,
  priceVersion: "v1", createdAt: new Date().toISOString() };
type TestJob = { id: string; agent_id: string; revision_id: string; answer_id: string | null; source_id: string | null;
  operation_id: string; state: string; lease_owner: string | null; completed_batches: number;
  total_batches: number; indexed_chunks: number; batch_size: number; retry_generation: number;
  segments: { content: string }[]; error: { code: string } | null };

function rig() {
  const jobs = new Map<string, TestJob>();
  const stage = new Map<string, string>();
  const owner = { current: "rev-1", deleted: false, active: null as string | null };
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let failEmbed = false;
  let unknown = false;
  const settle = vi.fn(async () => ({ ok: true as const, data: operation }));
  const embed = vi.fn(async (input: { stageKey: string; texts: string[] }) => {
    stage.set(input.stageKey, unknown ? "unknown" : failEmbed ? "failed" : "completed");
    if (unknown) return { ok: false as const, error: { code: "unknown_usage" as const, message: "unknown", retryable: false } };
    if (failEmbed) return { ok: false as const, error: { code: "provider" as const, message: "failed", retryable: true } };
    return { ok: true as const, data: { value: input.texts.map(() => Array(1024).fill(0.1)) } };
  });
  const deps = { settle, embed, loadOperation: async () => operation,
    loadAnswer: async () => ({ question: "What happened?", text: "A concrete example." }),
    stageState: async (_: string, key: string) => stage.get(key) ?? null,
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      const id = String(args.p_job_id);
      let job = jobs.get(id);
      if (name === "enqueue_index_revision") {
        job ??= { id, agent_id: String(args.p_agent_id), revision_id: String(args.p_revision_id),
          answer_id: args.p_answer_id as string | null, source_id: args.p_source_id as string | null,
          operation_id: String(args.p_operation_id), state: "queued", lease_owner: null,
          completed_batches: 0, total_batches: Math.ceil((args.p_segments as unknown[]).length / 8),
          indexed_chunks: 0, batch_size: 8, retry_generation: 0,
          segments: args.p_segments as TestJob["segments"], error: null };
        jobs.set(id, job);
      } else if (!job) return { data: null, error: { message: "INVALID_INPUT" } };
      else if (name === "claim_index_job") {
        if (job.state === "failed" && job.error?.code === "unknown_usage") return { data: job, error: null };
        if (job.state === "failed") job.retry_generation++;
        job.state = "processing"; job.lease_owner = String(args.p_lease_owner);
      } else if (name === "complete_index_batch") {
        if (job.lease_owner !== args.p_lease_owner) return { data: null, error: { message: "CONFLICT" } };
        job.completed_batches++; job.indexed_chunks += (args.p_chunks as unknown[]).length;
      } else if (name === "activate_revision") {
        if (owner.deleted || owner.current !== job.revision_id) {
          job.state = "failed"; job.error = { code: "stale" };
        } else { job.state = "ready"; owner.active = job.revision_id; }
      } else if (name === "fail_index_job") {
        job.state = "failed"; job.error = { code: String(args.p_code) };
      } else if (name === "yield_index_job") { job.state = "queued"; job.lease_owner = null; }
      return { data: job, error: null };
    },
  } as unknown as IndexDependencies;
  return { deps, owner, jobs, calls, embed, settle,
    setFail: (value: boolean) => { failEmbed = value; }, setUnknown: (value: boolean) => { unknown = value; } };
}

describe("indexRevision", () => {
  it("finishes a short answer before returning and preserves its source question", async () => {
    const r = rig();
    const enqueued = await enqueueIndexRevision({ jobId: "job-1", agentId: "agent-a", revisionId: "rev-1",
      answerId: "answer-1", operationId: operation.id }, r.deps);
    expect(enqueued).toMatchObject({ ok: true, data: { state: "pending", progress: { totalBatches: 1 } } });
    expect(r.calls[0].args.p_segments).toMatchObject([{ question: "What happened?", answerId: "answer-1" }]);
    expect(await indexRevision("job-1", {}, r.deps)).toMatchObject({ ok: true, data: { state: "ready", progress: { indexedChunks: 1 } } });
    expect(r.owner.active).toBe("rev-1");
    expect(r.embed).toHaveBeenCalledOnce();
    expect(r.settle).toHaveBeenCalledOnce();
  });

  it("cannot activate an edit superseded by another edit or a delete", async () => {
    for (const deleted of [false, true]) {
      const r = rig(); r.owner.active = "rev-old";
      await enqueueIndexRevision({ jobId: "job-1", agentId: "agent-a", revisionId: "rev-1",
        answerId: "answer-1", operationId: operation.id }, r.deps);
      r.owner.current = deleted ? "rev-1" : "rev-2"; r.owner.deleted = deleted;
      expect(await indexRevision("job-1", {}, r.deps)).toMatchObject({ ok: true, data: { state: "failed" } });
      expect(r.owner.active).toBe("rev-old");
    }
  });

  it("retries a known failed batch with a new stage key and activates once", async () => {
    const r = rig(); r.owner.active = "rev-old"; r.setFail(true);
    await enqueueIndexRevision({ jobId: "job-1", agentId: "agent-a", revisionId: "rev-1",
      answerId: "answer-1", operationId: operation.id }, r.deps);
    expect(await indexRevision("job-1", { settle: false }, r.deps)).toMatchObject({ ok: true, data: { state: "failed" } });
    expect(r.owner.active).toBe("rev-old");
    r.setFail(false);
    expect(await indexRevision("job-1", { settle: false }, r.deps)).toMatchObject({ ok: true, data: { state: "ready" } });
    expect(r.embed.mock.calls.map(c => c[0].stageKey)).toEqual([
      "index:job-1:batch:0:retry:0", "index:job-1:batch:0:retry:1"]);
    expect(r.calls.filter(c => c.name === "activate_revision")).toHaveLength(1);
    expect(r.settle).not.toHaveBeenCalled();
  });

  it("never redispatches an ambiguous paid attempt", async () => {
    const r = rig(); r.setUnknown(true);
    await enqueueIndexRevision({ jobId: "job-1", agentId: "agent-a", revisionId: "rev-1",
      answerId: "answer-1", operationId: operation.id }, r.deps);
    expect(await indexRevision("job-1", {}, r.deps)).toMatchObject({ ok: true, data: { state: "failed" } });
    expect(await indexRevision("job-1", {}, r.deps)).toMatchObject({ ok: true, data: { state: "failed" } });
    expect(r.embed).toHaveBeenCalledOnce();
  });
});
