import { vi } from "vitest";
import type { Operation, ServiceResult } from "@/lib/contracts/phase2";
import { searchKnowledge, type SearchDependencies } from "@/features/knowledge/search";
import { enqueueIndexRevision, indexRevision, type IndexDependencies } from "@/features/knowledge/index";
import { createInterviewService, type InterviewDependencies, type InterviewStore, type InterviewView } from "./interview";

const operation: Operation = { id: "op_00000000-0000-4000-8000-000000000001", agentId: "agent-a", identityId: "maria",
  purpose: "interview", requestKey: "key", payloadHash: "a".repeat(64), state: "reserved", estimateUnits: "20000000",
  heldUnits: "60000000", actualUnits: null, priceVersion: "2026-09-27-luna-v1", createdAt: new Date().toISOString() };
type Job = { id: string; agent_id: string; answer_id: string; revision_id: string; operation_id: string;
  state: "queued" | "processing" | "ready" | "failed"; lease_owner: string | null; completed_batches: number;
  total_batches: number; indexed_chunks: number; batch_size: number; retry_generation: number;
  segments: { content: string; question: string | null }[]; error: { code: string } | null };
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const conflict = (): ServiceResult<never> => ({ ok: false, error: { code: "conflict", message: "Changed", retryable: false } });
const blank: InterviewView = { state: "active", version: 2, topic: { topic: "your work", depth: "example", pendingQuestionId: "q1" },
  pendingQuestion: { id: "q1", text: "Tell me about your work" }, answers: [], skippedQuestionIds: [],
  readiness: { suggested: false, evidence: { concreteExampleRevisionIds: [], principleRevisionIds: [], exceptionRevisionIds: [] }, dismissed: false } };
export function interviewRig() {
  const view = structuredClone(blank);
  let serial = 0;
  let providerFails = false;
  let embedFails = false;
  let modelReadiness: InterviewView["readiness"]["evidence"] | null = null;
  let modelPatches: unknown[] = [];
  const requests = new Map<string, { hash: string; result: { sessionVersion: number; answerId: string | null; revisionId: string | null; replayed: boolean } }>();
  const jobs = new Map<string, Job>();
  const question = new Map<string, string>([["q1", "Tell me about your work"]]);
  const active = new Map<string, string>();
  const activeText = new Map<string, string>();
  const stages = new Map<string, string>();
  const calls: string[] = [];
  const store: InterviewStore = {
    async owner() { return "maria"; }, async category() { return "career_admissions"; },
    async operation() { return ok(operation); },
    async view() { return ok(structuredClone(view)); },
    async action(input) {
      const seen = requests.get(input.requestKey);
      if (seen) return seen.hash === input.payloadHash ? ok({ ...seen.result, replayed: true }) : conflict();
      const answer = view.answers.find(a => a.id === input.answerId);
      let answerId: string | null = null; let revisionId: string | null = null;
      if (input.action === "submit") {
        if (input.expectedVersion !== view.version || input.questionId !== view.pendingQuestion?.id || view.state !== "active"
          || input.parentAnswerId) return conflict();
        const pending = view.pendingQuestion!;
        answerId = `answer_${++serial}`; revisionId = `revision_${serial}`;
        view.answers.push({ id: answerId, questionId: input.questionId!, question: pending.text,
          text: input.text!, parentAnswerId: null, revisionId, indexedRevisionId: null, version: 2,
          state: "captured", createdAt: new Date().toISOString(), jobId: null, jobOperationId: null,
          jobErrorCode: null, previousActive: false, progress: null });
        view.pendingQuestion = null; view.topic.pendingQuestionId = null; view.version++;
      } else if (input.action === "edit" && answer) {
        if (answer.version !== input.expectedVersion) return conflict();
        answer.text = input.text!; answer.revisionId = `revision_${++serial}`;
        answer.previousActive = !!answer.indexedRevisionId; answer.state = "captured"; answer.version++;
        answer.jobId = null; answer.jobOperationId = null; revisionId = answer.revisionId; answerId = answer.id;
      } else if (input.action === "add-detail" && answer) {
        if (answer.version !== input.expectedVersion || answer.parentAnswerId) return conflict();
        answerId = `answer_${++serial}`; revisionId = `revision_${serial}`;
        view.answers.push({ ...structuredClone(answer), id: answerId, revisionId, indexedRevisionId: null,
          parentAnswerId: answer.id, text: input.text!, version: 2, state: "captured", jobId: null,
          jobOperationId: null, previousActive: false });
      } else if (input.action === "delete" && answer) {
        if (answer.version !== input.expectedVersion) return conflict();
        view.answers = view.answers.filter(a => a.id !== answer.id && a.parentAnswerId !== answer.id);
        active.delete(answer.id); activeText.delete(answer.id); answerId = answer.id;
      } else if (input.action === "retry-index" && answer) {
        if (answer.version !== input.expectedVersion) return conflict();
        answerId = answer.id; revisionId = answer.revisionId;
      } else if (input.action === "pause") view.state = "paused";
      else if (input.action === "resume" || input.action === "continue") view.state = "active";
      else if (input.action === "dismiss-ready") view.readiness.dismissed = true;
      else if (input.action === "skip") {
        if (!view.pendingQuestion) return conflict();
        view.skippedQuestionIds.push(view.pendingQuestion.id); view.pendingQuestion = null;
        view.topic.pendingQuestionId = null; view.topic.skippedQuestionId = view.skippedQuestionIds.at(-1);
        view.version++;
      } else if (input.action === "start") {
        if (!view.pendingQuestion) view.pendingQuestion = { id: "q1", text: "Tell me about your work" };
        view.state = "active";
      } else return conflict();
      const result = { sessionVersion: view.version, answerId, revisionId, replayed: false };
      requests.set(input.requestKey, { hash: input.payloadHash, result });
      return ok(result);
    },
    async advance(_agentId, expected, next, topic, evidence) {
      if (view.version !== expected || view.pendingQuestion) return conflict();
      const id = `q${++serial + 1}`;
      question.set(id, next); view.pendingQuestion = { id, text: next };
      view.topic = { ...topic, pendingQuestionId: id }; view.version++;
      view.readiness.evidence = evidence;
      view.readiness.suggested = new Set(evidence.concreteExampleRevisionIds).size >= 2
        && evidence.principleRevisionIds.length > 0 && evidence.exceptionRevisionIds.length > 0;
      return ok({ questionId: id, sessionVersion: view.version });
    },
  };
  const rpc: IndexDependencies["rpc"] = async (name, args) => {
    calls.push(name);
    const id = String(args.p_job_id); let job = jobs.get(id);
    if (name === "enqueue_index_revision") {
      if (!job) {
        job = { id, agent_id: "agent-a", answer_id: String(args.p_answer_id), revision_id: String(args.p_revision_id),
          operation_id: String(args.p_operation_id), state: "queued", lease_owner: null, completed_batches: 0,
          total_batches: 1, indexed_chunks: 0, batch_size: 8, retry_generation: 0,
          segments: args.p_segments as Job["segments"], error: null };
        jobs.set(id, job);
      }
      const answer = view.answers.find(a => a.id === job!.answer_id)!;
      answer.jobId = job.id; answer.jobOperationId = job.operation_id; answer.state = "indexing";
      return { data: job, error: null };
    }
    if (!job) return { data: null, error: { message: "INVALID_INPUT" } };
    if (name === "claim_index_job") { if (job.state === "failed") job.retry_generation++;
      job.state = "processing"; job.lease_owner = String(args.p_lease_owner); }
    if (name === "complete_index_batch") { job.completed_batches++; job.indexed_chunks += (args.p_chunks as unknown[]).length; }
    if (name === "activate_revision") {
      job.state = "ready";
      const answer = view.answers.find(a => a.id === job!.answer_id)!;
      answer.indexedRevisionId = job.revision_id; answer.previousActive = false; answer.state = "ready";
      active.set(answer.id, job.revision_id);
      activeText.set(answer.id, `${answer.question}\n\n${answer.text}`);
    }
    if (name === "fail_index_job") { job.state = "failed"; job.error = { code: String(args.p_code) };
      const answer = view.answers.find(a => a.id === job!.answer_id)!;
      answer.state = "failed"; answer.jobErrorCode = job.error.code; }
    return { data: job, error: null };
  };
  const embed = vi.fn(async (input: { stageKey: string; texts: string[] }) => {
    stages.set(input.stageKey, embedFails ? "failed" : "completed");
    if (embedFails) return { ok: false as const, error: { code: "provider" as const, message: "provider failed", retryable: true } };
    return ok({ value: input.texts.map(() => Array(1024).fill(0.1)) });
  });
  const indexDeps: IndexDependencies = { rpc, loadOperation: async () => operation,
    loadAnswer: async (revisionId, _agentId, answerId) => { const a = view.answers.find(a => a.id === answerId && a.revisionId === revisionId);
      return a ? { question: a.question, text: a.text } : null; },
    stageState: async (_operationId, stageKey) => stages.get(stageKey) ?? null,
    embed: embed as unknown as IndexDependencies["embed"], settle: vi.fn(async () => ok(operation)) };
  const structured = vi.fn(async () => providerFails
    ? { ok: false as const, error: { code: "provider" as const, message: "provider failed", retryable: true } }
    : ok({ value: { question: "What led you to that decision?", topicState: { topic: "your work", depth: "reasoning" },
      personaPatches: modelPatches, readiness: modelReadiness ?? { concreteExampleRevisionIds: view.answers.map(a => a.revisionId),
        principleRevisionIds: [], exceptionRevisionIds: [] } } }));
  const reconcile = vi.fn(async () => ok({}));
  const deps: InterviewDependencies = { store, reserve: vi.fn(async () => ok(operation)), settle: vi.fn(async () => ok(operation)),
    enqueue: ((input) => enqueueIndexRevision(input, indexDeps)) as InterviewDependencies["enqueue"],
    index: ((id, options) => indexRevision(id, options, indexDeps)) as InterviewDependencies["index"],
    structured: structured as unknown as InterviewDependencies["structured"],
    persona: { read: async () => null, applyPersonaSuggestions: vi.fn(async () => ok({})),
      reconcilePersonaEvidence: reconcile } as unknown as InterviewDependencies["persona"] };
  const service = createInterviewService(deps);
  const searchDeps: SearchDependencies = { embed: embed as unknown as SearchDependencies["embed"],
    rpc: async (_name, args) => ({ data: view.answers.filter(a => active.has(a.id)).map(a => ({
      id: `chunk_${a.id}`, agent_id: args.p_agent_id, revision_id: active.get(a.id), source_id: a.id,
      source_type: "interview", source_name: "Interview answers", content: activeText.get(a.id),
      question: a.question, page: null, heading_path: null, score: 0.9,
    })), error: null }) };
  return { service, deps, store, calls, jobs, embed, structured, reconcile, operation, getView: () => structuredClone(view),
    search: (query: string) => searchKnowledge({ agentId: "agent-a", query, operation }, searchDeps),
    setProviderFails: (v: boolean) => { providerFails = v; }, setEmbedFails: (v: boolean) => { embedFails = v; },
    setReadiness: (v: InterviewView["readiness"]["evidence"]) => { modelReadiness = v; },
    setPatches: (v: unknown[]) => { modelPatches = v; } };
}
