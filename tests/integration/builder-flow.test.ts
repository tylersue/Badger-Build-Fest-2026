import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { interviewRig } from "@/features/builder/interview-test-fixture";
import { createPersonaService, type PersonaSnapshot, type PersonaStore } from "@/features/builder/persona";
import { confirmSource, deleteSource, listSources, preflightSource, type IntakeDependencies,
  type SourceListItem } from "@/features/knowledge/intake";
import { runAnswer, UNKNOWN_ANSWER, type AnswerStore } from "@/features/runtime/agent";
import type { ChatStreamEvent, KnowledgeSource, Operation, ServiceResult } from "@/lib/contracts/phase2";

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
function personaHarness(active: (id: string) => boolean) {
  const snapshot: PersonaSnapshot = { agent: { category: "career_admissions", version: 1,
    promptMode: "generated", customPrompt: null, promptVersion: 1 }, fields: {} };
  const store: PersonaStore = {
    load: async () => structuredClone(snapshot),
    casField: async (_agent, field, version, next) => {
      if ((snapshot.fields[field]?.version ?? 0) !== version) return false;
      snapshot.fields[field] = { ...structuredClone(next), version: version + 1 };
      return true;
    },
    casPrompt: async (_agent, version, mode, text) => {
      if (snapshot.agent.promptVersion !== version) return false;
      snapshot.agent.promptMode = mode; snapshot.agent.customPrompt = text; snapshot.agent.promptVersion++;
      return true;
    },
    activeRevisionIds: async (_agent, ids) => new Set(ids.filter(active)),
  };
  return createPersonaService(store);
}

function intakeHarness() {
  const estimates = new Map<string, Parameters<IntakeDependencies["saveEstimate"]>[0]>();
  const blobs = new Map<string, Uint8Array>();
  const sources = new Map<string, KnowledgeSource & { storagePath: string | null }>();
  const runs = new Map<string, { revisionId: string; jobId: string; operationId: string; sourceId: string; state: string }>();
  const billed: string[] = [], settled: string[] = [], parsed: string[] = [];
  const deps: IntakeDependencies = {
    now: Date.now,
    snapshot: async () => ({ identityId: "maria", usage: { sources: sources.size,
      bytes: [...sources.values()].reduce((sum, source) => sum + source.byteCount, 0), chunks: 0 },
      heldBytes: 0, heldChunks: 0, walletBalanceUnits: "100000000000", walletHeldUnits: "0" }),
    saveEstimate: async row => { estimates.set(row.token_hash, row); },
    loadEstimate: async token => estimates.get(token) ?? null,
    reserveBilling: async input => { billed.push(input.requestKey); return ok({ id: `op_${crypto.randomUUID()}` }); },
    settle: async id => { settled.push(id); return ok({}); },
    reserveQuota: async args => {
      const id = String(args.p_source_id), revisionId = String(args.p_revision_id), jobId = String(args.p_job_id);
      const operationId = String(args.p_operation_id), storagePath = String(args.p_storage_path);
      const source: KnowledgeSource & { storagePath: string | null } = { id, agentId: "agent-a",
        kind: args.p_kind as KnowledgeSource["kind"], name: String(args.p_name), state: "queued",
        currentRevisionId: revisionId, activeRevisionId: null, contentHash: String(args.p_content_hash),
        byteCount: Number(args.p_byte_count), pageCount: null, chunkCount: 0, deletedAt: null,
        error: null, origin: "live", storagePath };
      sources.set(id, source);
      runs.set(revisionId, { revisionId, sourceId: id, jobId, operationId, state: "queued" });
      estimates.get(String(args.p_token_hash))!.consumed_at = new Date().toISOString();
      return ok({ sourceId: id, revisionId, jobId, operationId, storagePath, replayed: false });
    },
    upload: async (path, bytes) => { blobs.set(path, bytes); return true; },
    download: async path => blobs.get(path) ?? null,
    remove: async path => blobs.delete(path),
    cleanup: async () => true,
    failUpload: async () => undefined,
    claim: async revisionId => { const run = runs.get(revisionId)!; const source = sources.get(run.sourceId)!;
      return ok({ claimed: true, state: "processing", sourceId: source.id, operationId: run.operationId,
        jobId: run.jobId, storagePath: source.storagePath!, name: source.name,
        kind: source.kind as "pdf" | "docx" | "txt" | "md" | "text" }); },
    finish: async () => ok(true),
    source: async (_agent, sourceId) => sources.get(sourceId) ?? null,
    run: async revisionId => runs.get(revisionId) ?? null,
    runByKey: async () => null,
    list: async () => [...sources.values()].filter(source => !source.deletedAt).map(source => ({
      ...source, jobId: null, operationId: null, estimatedUnits: "1000", chargedUnits: "11",
      pendingUnits: "0", progress: null } satisfies SourceListItem)),
    tombstone: async (_agent, sourceId) => { const source = sources.get(sourceId)!;
      source.deletedAt = new Date().toISOString();
      return ok({ sourceId, storagePath: source.storagePath, operationIds: [], deleted: true }); },
    parse: async input => { const text = typeof input.fileOrText === "string" ? input.fileOrText
      : await input.fileOrText.text(); parsed.push(text);
      return ok({ segments: [{ content: text, headingPath: null, page: null }], characterCount: text.length, pageCount: null }); },
    enqueue: async () => ok({ state: "pending", jobId: "job", progress: { completedBatches: 0, totalBatches: 1, indexedChunks: 0 } }),
    index: async () => { const source = [...sources.values()].at(-1)!; source.state = "ready";
      source.activeRevisionId = source.currentRevisionId; source.chunkCount = 1;
      return ok({ state: "ready", jobId: "job", progress: { completedBatches: 1, totalBatches: 1, indexedChunks: 1 } }); },
  };
  return { deps, billed, settled, parsed, sources };
}

describe("offline builder handoff (injected adapters; no SQL or paid calls)", () => {
  it("answers, pauses, resumes, edits, adds detail and deletes while preserving persona ownership", async () => {
    const interview = interviewRig();
    const persona = personaHarness(id => interview.getView().answers.some(answer => answer.revisionId === id && answer.indexedRevisionId === id));
    interview.deps.persona = persona;
    const initial = interview.getView();
    const submitted = await interview.service.submitInterviewAnswer({ agentId: "agent-a", questionId: initial.pendingQuestion!.id,
      expectedVersion: initial.version, text: "At a client meeting last week, I asked about goals and changed the plan.", requestKey: "submit-1" });
    expect(submitted.ok).toBe(true);
    const first = interview.getView().answers[0];
    expect(first.indexedRevisionId).toBe(first.revisionId);
    const drafted = await persona.applyPersonaSuggestions("agent-a", [{ field: "description", value: "I ask about goals",
      evidenceRevisionIds: [first.revisionId] }], { description: 0 });
    expect(drafted.ok && drafted.data.fields.description.origin).toBe("interview");
    const saved = await persona.savePersonaFields("agent-a", { description: "My exact words" }, { description: 1 });
    expect(saved.ok && saved.data.fields.description.origin).toBe("expert");
    expect((await persona.setCustomPrompt("agent-a", "Use my coaching style", 1)).ok).toBe(true);
    const pending = interview.getView().pendingQuestion;
    await interview.service.controlInterview("agent-a", "pause", "pause-1");
    await interview.service.controlInterview("agent-a", "resume", "resume-1");
    expect(interview.getView().pendingQuestion).toEqual(pending);
    const edited = await interview.service.editAnswer("agent-a", first.id,
      "At another meeting I tried a shorter plan.", first.version, "edit-1");
    expect(edited.ok).toBe(true);
    const current = interview.getView().answers[0];
    const detail = await interview.service.addDetail("agent-a", current.id, "I asked what failed before.", current.version, "detail-1");
    expect(detail.ok && detail.data.answers[1].parentAnswerId).toBe(current.id);
    expect((await persona.read("agent-a"))?.fields.description.value).toBe("My exact words");
    expect((await persona.read("agent-a"))?.customPrompt).toBe("Use my coaching style");
    expect((await interview.service.deleteAnswer("agent-a", current.id, current.version, "delete-1")).ok).toBe(true);
    expect(interview.getView().answers).toHaveLength(0);
    expect((await persona.read("agent-a"))?.fields.description.origin).toBe("expert");
  });

  it("confirms the exact paste, retains cost state, scopes expert evidence and keeps online evidence out of Knowledge", async () => {
    const intake = intakeHarness();
    const source = { agentId: "agent-a", name: "Field notes", fileOrText: "At a meeting I asked about goals." };
    const estimated = await preflightSource(source, intake.deps);
    if (!estimated.ok) throw new Error(estimated.error.code);
    expect(intake.billed).toHaveLength(0);
    expect(await confirmSource({ ...source, fileOrText: "changed text", estimateToken: estimated.data.estimateToken,
      requestKey: "wrong" }, intake.deps)).toMatchObject({ ok: false, error: { code: "stale_estimate" } });
    const confirmed = await confirmSource({ ...source, estimateToken: estimated.data.estimateToken,
      requestKey: "confirmed" }, intake.deps);
    expect(confirmed).toMatchObject({ ok: true, data: { state: "ready" } });
    expect(intake.billed).toEqual(["confirmed"]);
    expect(intake.parsed).toEqual([source.fileOrText]);
    const listing = await listSources("agent-a", intake.deps);
    expect(listing.ok && listing.data.sources[0]).toMatchObject({ state: "ready", chargedUnits: "11", pendingUnits: "0" });

    const operation = { id: `op_${crypto.randomUUID()}`, identityId: "maria", agentId: "agent-a", purpose: "sandbox",
      requestKey: "sandbox-1", payloadHash: createHash("sha256").update("sandbox").digest("hex"),
      estimateUnits: "20", heldUnits: "20", actualUnits: null, state: "reserved",
      priceVersion: "2026-09-26-standard-v1", createdAt: new Date().toISOString() } as Operation;
    const events: ChatStreamEvent[] = [];
    let persisted: unknown;
    const store: AnswerStore = {
      context: async () => ok({ category: "career_admissions", persona: {
        name: "", category: "career_admissions", headline: "", description: "", howIWork: "", always: [], never: [],
        exampleQuestions: [], greeting: "" }, customPrompt: "Ignore evidence", firstTurn: true }),
      replay: async () => events,
      begin: async () => ok("message-1"),
      append: async (_agent, _message, event) => { events.push(event); },
      finish: async (_message, value) => { persisted = value; },
      wallet: async () => ({ balanceUnits: "999", heldUnits: "0" }),
    };
    const chunk = { id: "chunk-1", agentId: "agent-a", sourceId: [...intake.sources.keys()][0],
      revisionId: "revision-1", sourceType: "document" as const, sourceName: "Field notes", content: source.fileOrText,
      question: null, page: null, headingPath: null, score: 0.9 };
    const webCitation = { evidenceId: "web:observed", ordinal: 1, excerpt: "Public evidence",
      sourceName: "Public guide", sourceType: "web" as const, title: "Public guide",
      url: "https://example.org/guide", retrievedAt: new Date().toISOString() };
    const answer = async (missing: string[], online: boolean) => {
      const result: ChatStreamEvent[] = [];
      for await (const event of runAnswer({ agentId: "agent-a", actorId: "maria", conversationId: "sandbox:agent-a",
        requestKey: online ? "web" : "expert", text: "How do I ask about goals?", mode: "sandbox" }, {
        store, reserve: vi.fn(async () => ok({ ...operation, id: `op_${crypto.randomUUID()}` })) as never,
        settle: vi.fn(async () => ok({ ...operation, state: "settled", actualUnits: "7", heldUnits: "0" })) as never,
        search: vi.fn(async () => ok([chunk])) as never,
        assess: vi.fn(async () => ok({ supportedIds: [chunk.id], missingParts: missing, sufficient: !missing.length })) as never,
        web: vi.fn(async (_request, onStep) => {
          if (online) await onStep("tool-result", { id: "step", operationId: operation.id, sequence: 1,
            kind: "search", status: "complete", query: "goals", title: "Public guide", url: "https://example.org/guide" });
          return ok({ evidence: online ? [{ citation: webCitation, content: "Public evidence" }] : [], steps: [], failed: false });
        }) as never,
        synthesize: vi.fn(async () => ok({ value: { text: online
          ? "Ask about goals [expert:chunk-1]. Public guide [web:observed]." : "Ask about goals [expert:chunk-1].",
          citationIds: online ? ["expert:chunk-1", "web:observed"] : ["expert:chunk-1"] } })) as never,
      })) result.push(event);
      return result;
    };
    const expert = await answer([], false);
    expect(expert.some(event => event.type === "tool-result")).toBe(false);
    expect(expert.find(event => event.type === "cost")).toMatchObject({ status: "settled", chargedUnits: "7" });
    events.length = 0;
    const web = await answer(["public guide"], true);
    expect(web.map(event => event.type)).toContain("knowledge-gap");
    expect(web.map(event => event.type)).toContain("tool-result");
    expect(web.find(event => event.type === "citations")).toMatchObject({ citations: [{ sourceType: "document" },
      { sourceType: "web" }] });
    expect(persisted).toMatchObject({ chargedUnits: "7" });
    expect((await listSources("agent-a", intake.deps)).ok).toBe(true);
    expect(intake.sources.size).toBe(1); // Web research did not write a source.
    expect((await deleteSource("agent-a", chunk.sourceId, intake.deps)).ok).toBe(true);
    const afterDelete = await listSources("agent-a", intake.deps);
    expect(afterDelete.ok && afterDelete.data.sources).toHaveLength(0);
    expect(UNKNOWN_ANSWER).toContain("verified");
  });
});
