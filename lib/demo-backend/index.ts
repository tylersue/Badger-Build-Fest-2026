/**
 * Browser-only demo backend. With NEXT_PUBLIC_DEMO_MODE=1, every same-origin
 * /api/* fetch is answered here from hardcoded Proxier data kept in
 * localStorage, so the whole BUILD → PUBLISH → HIRE → USE loop runs with no
 * database, keys, or network. Response shapes match the real route handlers.
 */
import type { Agent, Conversation, LedgerEntry, Message, PersonaForm, Profile, Source } from "@/lib/types";
import type { IndexResult, Operation, PersonaFieldName, PersonaState, SourceEstimate, SourceLimits } from "@/lib/contracts/phase2";
import type { ChatStreamEvent } from "@/features/runtime/events";
import type { InterviewView } from "@/features/builder/interview";
import type { DemoSnapshot } from "@/lib/server/demo";
import type { SourceListItem, SourceOverview } from "@/features/knowledge/intake";
import { personaToSystemPrompt } from "@/features/builder/prompt-template";
import { modelForCategory } from "@/lib/config/models";
import { PLATFORM_MARGIN_SHARE, SUBSCRIPTION_GRANT_CENTS, PACK_GRANT_CENTS } from "@/lib/config/credits";
import { PURCHASE_EXPERT_SHARE, agentPriceCredits } from "@/lib/config/purchase";
import * as seed from "./seed";
import { INTERVIEW_LENGTH, STYLE_LABELS, applyDraft, composeAnswer, formOf, interviewQuestion, parseFeedback, personaDraft, personaState, rawCostCredits, seedKnowledge, toneFromAnswers, type AnswerStyle, type ComposedAnswer, type KnowledgeChunk } from "./engine";

const STORAGE_KEY = "proxier-demo-db-v5";
const UNITS_PER_CREDIT = 10_000_000;
const PRICE_VERSION = "2026-09-26-standard-v1";
const units = (credits: number) => String(Math.round(credits * UNITS_PER_CREDIT));
const credits = (value: string) => Number(value) / UNITS_PER_CREDIT;
const iso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AnswerView = InterviewView["answers"][number];
type StoredAnswer = AnswerView & { chunks: number; readyAt: number };
type Interview = { state: InterviewView["state"]; version: number; pending: { id: string; text: string } | null;
  answers: StoredAnswer[]; skipped: string[]; asked: number };
type StoredSource = Source & { byteCount: number; revisionId: string };
type SandboxRow = { id: string; role: "user" | "assistant"; content: string; operation_id: string | null;
  citations: unknown[]; retrieved: { chunks: unknown[]; gap: string | null }; tool_steps: unknown[];
  charged_units: string | null; created_at: string };
type Db = {
  v: 1; seq: number; identityId: string;
  profiles: (Profile & { version: number })[]; agents: Agent[]; personas: Record<string, PersonaState>;
  sources: StoredSource[]; knowledge: KnowledgeChunk[]; interviews: Record<string, Interview>;
  conversations: Conversation[]; messages: Message[]; sandbox: Record<string, SandboxRow[]>;
  ledger: LedgerEntry[]; wallets: Record<string, string>;
  operations: Record<string, { operation: Operation; events: ChatStreamEvent[] }>;
  attachments: Record<string, { name: string; chars: number; text: string }>;
  estimates: Record<string, { agentId: string; name: string; kind: SourceEstimate["kind"]; byteCount: number; chunks: number; pages: number | null; credits: number; text: string }>;
  /** Persona Voice & tone per agent: tone traits and how answers are said. Optional so older saved data still loads. */
  styles?: Record<string, AnswerStyle[]>; tone?: Record<string, string[]>; toneEdited?: Record<string, boolean>;
  /** Agents each identity bought from the marketplace, with the chat created for it. */
  purchases?: Record<string, { agentId: string; conversationId: string; credits: number; purchasedAt: string }[]>;
};

// State ------------------------------------------------------------------------------------------

function fresh(): Db {
  const wallets: Record<string, string> = {};
  for (const row of seed.LEDGER) if (row.identityId) wallets[row.identityId] = units(credits(wallets[row.identityId] ?? "0") + row.amountCents);
  const sourceName = (id: string) => seed.SOURCES.find((s) => s.id === id)?.name ?? "Interview answers";
  const db: Db = {
    v: 1, seq: 0, identityId: seed.MARIA,
    profiles: seed.PROFILES.map((p) => ({ ...p, version: 1 })),
    agents: seed.AGENTS.map((a) => ({ ...a, persona: { ...a.persona } })),
    personas: {}, sources: seed.SOURCES.map((s) => ({ ...s, byteCount: s.kind === "interview" ? 0 : 180_000, revisionId: `rev-${s.id}` })),
    knowledge: seed.CHUNKS.map((c) => seedKnowledge(c, sourceName(c.sourceId))),
    interviews: {}, conversations: seed.CONVERSATIONS.map((c) => ({ ...c })), messages: seed.MESSAGES.map((m) => ({ ...m })),
    sandbox: {}, ledger: seed.LEDGER.map((l) => ({ ...l })), wallets, operations: {}, attachments: {}, estimates: {},
  };
  for (const agent of db.agents.filter((a) => a.ownerId === seed.MARIA)) {
    db.personas[agent.id] = personaState(agent.persona, "expert");
    const turns = seed.INTERVIEW_TURNS.filter((t) => t.agentId === agent.id).sort((a, b) => a.position - b.position);
    const pending = turns.find((t) => t.answer === null);
    db.interviews[agent.id] = {
      state: pending ? "active" : "completed", version: 1, pending: pending ? { id: pending.id, text: pending.question } : null,
      skipped: [], asked: turns.length,
      answers: turns.filter((t) => t.answer !== null).map((t) => answerRecord(t.id, t.question, t.answer!, t.createdAt, 0)),
    };
  }
  return db;
}

function answerRecord(questionId: string, question: string, text: string, createdAt: string, chunks: number, id = `ans-${questionId}`): StoredAnswer {
  const revisionId = `rev-${id}-1`;
  return { id, questionId, question, text, parentAnswerId: null, revisionId, indexedRevisionId: revisionId, version: 1,
    state: "ready", createdAt, jobId: null, jobOperationId: null, jobErrorCode: null, previousActive: false, progress: null,
    chunks, readyAt: 0 };
}

let db: Db | null = null;
function state(): Db {
  if (db) return db;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Db : null;
    db = parsed?.v === 1 ? parsed : fresh();
  } catch { db = fresh(); }
  return db;
}
function save() { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* In-memory only. */ } }
const id = (prefix: string) => { const d = state(); d.seq += 1; return `${prefix}-${Date.now().toString(36)}${d.seq}`; };

class DemoError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message); }
}
const agentOf = (agentId: string) => {
  const agent = state().agents.find((a) => a.id === agentId || a.slug === agentId);
  if (!agent) throw new DemoError("not_owner", "Agent is unavailable.", 404);
  return agent;
};
const ownedAgent = (agentId: string) => {
  const agent = agentOf(agentId);
  if (agent.ownerId !== state().identityId) throw new DemoError("not_owner", "Switch to this agent's owner to edit it.", 404);
  return agent;
};
const profileOf = (identityId: string) => state().profiles.find((p) => p.identityId === identityId);
const expertName = (agent: Agent) => profileOf(agent.ownerId)?.displayName
  ?? seed.IDENTITIES.find((i) => i.id === agent.ownerId)?.displayName ?? "The expert";

// Money ------------------------------------------------------------------------------------------

function post(identityId: string | null, kind: LedgerEntry["kind"], amount: number, note: string, extra: Partial<LedgerEntry> = {}): LedgerEntry {
  const d = state();
  let balanceAfter: number | null = null;
  if (identityId) {
    const next = credits(d.wallets[identityId] ?? "0") + amount;
    d.wallets[identityId] = units(next);
    balanceAfter = Math.round(next * 100) / 100;
  }
  const row: LedgerEntry = { id: id("l"), identityId, kind, amountCents: Math.round(amount * 100) / 100, balanceAfter,
    purpose: null, refType: null, refId: null, note, createdAt: iso(), origin: "live", ...extra };
  d.ledger.push(row);
  return row;
}
const balanceUnits = (identityId: string) => state().wallets[identityId] ?? "0";

// Views ------------------------------------------------------------------------------------------

function answerView(answer: StoredAnswer): AnswerView {
  const { chunks: _chunks, readyAt, ...view } = answer;
  void _chunks;
  if (Date.now() >= readyAt) return { ...view, state: "ready", indexedRevisionId: view.revisionId,
    progress: readyAt ? { completedBatches: 1, totalBatches: 1, indexedChunks: answer.chunks } : null };
  return { ...view, state: "indexing", indexedRevisionId: null, progress: { completedBatches: 0, totalBatches: 1, indexedChunks: 0 } };
}
function interviewOf(agentId: string): Interview {
  const d = state();
  d.interviews[agentId] ??= { state: "active", version: 1, pending: null, answers: [], skipped: [], asked: 0 };
  return d.interviews[agentId];
}
function interviewView(agentId: string): InterviewView {
  const interview = interviewOf(agentId);
  const depth = (["opening", "example", "exception", "complete"] as const)[Math.min(interview.asked, 3)];
  const evidence = { concreteExampleRevisionIds: [], principleRevisionIds: [], exceptionRevisionIds: [] };
  return { state: interview.state, version: interview.version,
    topic: { topic: agentOf(agentId).persona.name, depth, pendingQuestionId: interview.pending?.id ?? null },
    pendingQuestion: interview.pending, answers: interview.answers.map(answerView), skippedQuestionIds: interview.skipped,
    readiness: { suggested: false, evidence, dismissed: false } };
}
function activeChunks(agentId: string): number {
  const d = state();
  const sourceChunks = d.sources.filter((s) => s.agentId === agentId && s.status === "ready").reduce((sum, s) => sum + s.chunkCount, 0);
  const answerChunks = (d.interviews[agentId]?.answers ?? []).reduce((sum, a) => sum + a.chunks, 0);
  return sourceChunks + answerChunks;
}
function knowledgeFor(agentId: string): KnowledgeChunk[] {
  const d = state();
  const answers = (d.interviews[agentId]?.answers ?? []).filter((a) => a.chunks > 0).map((a): KnowledgeChunk => ({
    id: `chunk-${a.id}`, agentId, sourceId: a.id, revisionId: a.revisionId, sourceType: "interview", sourceName: "Interview answers",
    content: a.text, question: a.question, page: null, headingPath: null }));
  return [...d.knowledge.filter((k) => k.agentId === agentId), ...answers];
}
function personaPayload(agentId: string) {
  const personaStateValue = state().personas[agentId];
  const form = formOf(personaStateValue);
  const generatedPrompt = personaToSystemPrompt(form);
  return { state: personaStateValue, form, generatedPrompt,
    activePrompt: personaStateValue.promptMode === "custom" ? personaStateValue.customPrompt ?? "" : generatedPrompt,
    model: modelForCategory(form.category),
    reviewFieldIds: (Object.keys(personaStateValue.fields) as PersonaFieldName[]).filter((f) => personaStateValue.fields[f].pendingSuggestion),
    voice: voiceOf(agentId) };
}
function voiceOf(agentId: string) {
  const d = state();
  const defaults = seed.AGENTS.some((a) => a.id === agentId) ? ["Direct", "Specific, with numbers", "Teaches with real stories"] : [];
  return { tone: d.tone?.[agentId] ?? defaults, styles: d.styles?.[agentId] ?? [], options: STYLE_LABELS };
}
function addPersonaRules(agentId: string, always: string[], never: string[]) {
  const d = state();
  const current = d.personas[agentId];
  const fields = { ...current.fields };
  const merge = (name: "always" | "never", extra: string[]) => {
    if (!extra.length) return;
    const field = fields[name];
    const value = [...new Set([...(field.value as string[]), ...extra])];
    fields[name] = { ...field, value, origin: "expert", version: field.version + 1, pendingSuggestion: null };
  };
  merge("always", always); merge("never", never);
  d.personas[agentId] = { ...current, fields, version: current.version + 1 };
  syncAgentPersona(agentId);
}
function syncAgentPersona(agentId: string) {
  const agent = agentOf(agentId);
  const persona = state().personas[agentId];
  agent.persona = formOf(persona);
  agent.systemPromptOverride = persona.promptMode === "custom" ? persona.customPrompt : null;
  agent.updatedAt = iso();
}

function snapshot(): DemoSnapshot {
  const d = state();
  const me = d.identityId;
  const conversationsMine = d.conversations.filter((c) => c.hirerId === me);
  const agentIds = new Set(d.agents.filter((a) => a.status === "published" || a.ownerId === me).map((a) => a.id));
  for (const c of conversationsMine) agentIds.add(c.agentId);
  const agents = d.agents.filter((a) => agentIds.has(a.id));
  const owned = new Set(agents.filter((a) => a.ownerId === me).map((a) => a.id));
  const shared = d.conversations.filter((c) => owned.has(c.agentId) && c.shareTranscript && c.hirerId !== me);
  const conversations = [...conversationsMine, ...shared];
  const conversationIds = new Set(conversations.map((c) => c.id));
  const ownedConversation = new Map(d.conversations.filter((c) => owned.has(c.agentId)).map((c) => [c.id, c.agentId]));
  const earningAgents: Record<string, string> = {};
  const ledger = d.ledger.filter((row) => {
    if (row.identityId === me) return true;
    const agentId = row.refType === "conversation" && row.refId ? ownedConversation.get(row.refId) : undefined;
    if (agentId && ["debit", "platform_cost", "platform_margin"].includes(row.kind)) { earningAgents[row.refId!] = agentId; return true; }
    return false;
  }).map((row) => row.identityId === me ? row : { ...row, identityId: null })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ownerIds = new Set(agents.map((a) => a.ownerId));
  const ownedSources = d.sources.filter((s) => owned.has(s.agentId) && s.kind !== "interview");
  const answerStates: DemoSnapshot["backend"]["answerStates"] = {};
  for (const agentId of owned) {
    for (const answer of interviewOf(agentId).answers.map(answerView))
      answerStates[answer.id] = { origin: "live", state: answer.state, currentRevisionId: answer.revisionId, indexedRevisionId: answer.indexedRevisionId };
    for (const source of d.sources.filter((s) => s.agentId === agentId && s.kind === "interview"))
      answerStates[source.id] = { origin: "fixture", state: "ready", currentRevisionId: source.revisionId, indexedRevisionId: source.revisionId };
  }
  return {
    identityId: me,
    identities: seed.IDENTITIES.filter((i) => i.isSwitchable),
    profiles: d.profiles.filter((p) => p.identityId === me || ownerIds.has(p.identityId)).map(({ version: _v, ...p }) => { void _v; return p; }),
    agents: agents.map((a) => ({ ...a, persona: { ...a.persona } })),
    sources: ownedSources.map(({ byteCount: _b, revisionId: _r, ...s }) => { void _b; void _r; return s; }),
    interviewTurns: [...owned].flatMap((agentId) => {
      const interview = interviewOf(agentId);
      const turns = interview.answers.map((a, index) => ({ id: a.questionId, agentId, position: index + 1, question: a.question, answer: a.text, createdAt: a.createdAt, origin: "live" as const }));
      return interview.pending ? [...turns, { id: interview.pending.id, agentId, position: turns.length + 1, question: interview.pending.text, answer: null, createdAt: iso(), origin: "live" as const }] : turns;
    }),
    conversations: conversations.map((c) => ({ id: c.id, agentId: c.agentId, hirerId: c.hirerId, title: c.title, shareTranscript: c.shareTranscript, createdAt: c.createdAt, origin: c.origin ?? "live" })),
    messages: d.messages.filter((m) => conversationIds.has(m.conversationId)),
    ledger, earningAgents, purchases: d.purchases?.[me] ?? [],
    wallet: { balanceUnits: balanceUnits(me), heldUnits: "0", balanceCents: credits(balanceUnits(me)) },
    backend: {
      configured: true,
      agentOrigins: Object.fromEntries(agents.map((a) => [a.id, a.origin ?? "live"])),
      sourceStates: Object.fromEntries(ownedSources.map((s) => [s.id, { origin: s.origin ?? "live", state: s.status, currentRevisionId: s.revisionId, activeRevisionId: s.status === "ready" ? s.revisionId : null }])),
      answerStates,
      personaStates: Object.fromEntries([...owned].map((agentId) => [agentId, d.personas[agentId]])),
      indexJobs: {}, profileVersion: profileOf(me)?.version ?? 1,
    },
  };
}

// Interview --------------------------------------------------------------------------------------

function askNext(agentId: string) {
  const interview = interviewOf(agentId);
  if (interview.asked >= INTERVIEW_LENGTH) { interview.pending = null; interview.state = "completed"; return; }
  const last = interview.answers.at(-1)?.text;
  interview.pending = { id: id("q"), text: interviewQuestion(agentOf(agentId), interview.asked, last) };
  interview.asked += 1;
  interview.state = "active";
}
function interviewControl(agentId: string, control: string): InterviewView {
  ownedAgent(agentId);
  const interview = interviewOf(agentId);
  if (control === "pause") interview.state = "paused";
  else if (control === "skip") { if (interview.pending) interview.skipped.push(interview.pending.id); askNext(agentId); }
  else if (control === "start" || control === "continue" || control === "resume") {
    interview.state = "active";
    if (!interview.pending) askNext(agentId);
  }
  interview.version += 1;
  save();
  return interviewView(agentId);
}
function interviewSubmit(agentId: string, body: { questionId: string; text: string }): InterviewView {
  const agent = ownedAgent(agentId);
  const interview = interviewOf(agentId);
  if (!interview.pending || interview.pending.id !== body.questionId) throw new DemoError("conflict", "Interview changed. Reload and try again.", 409);
  const text = body.text.trim();
  const chunks = Math.max(2, Math.ceil(text.length / 200));
  const answer = { ...answerRecord(interview.pending.id, interview.pending.text, text, iso(), chunks, id("ans")), readyAt: Date.now() + 2500 };
  interview.answers.push(answer);
  post(state().identityId, "debit", -2, `${agent.persona.name} · interview answer`, { purpose: "interview_turn", refType: "interview", refId: agentId });
  post(state().identityId, "debit", -0.05 * chunks, `${agent.persona.name} · ${chunks} chunks indexed`, { purpose: "embedding", refType: "interview", refId: agentId });
  const d = state();
  d.personas[agentId] = applyDraft(d.personas[agentId], personaDraft(agent, expertName(agent), interview.answers.map((a) => a.text)), answer.revisionId);
  syncAgentPersona(agentId);
  if (!d.toneEdited?.[agentId]) (d.tone ??= {})[agentId] = toneFromAnswers(interview.answers.map((a) => a.text));
  askNext(agentId);
  interview.version += 1;
  save();
  return interviewView(agentId);
}
function answerAction(agentId: string, answerId: string, body: { action: string; text?: string }) {
  ownedAgent(agentId);
  const interview = interviewOf(agentId);
  const answer = interview.answers.find((a) => a.id === answerId);
  if (!answer) throw new DemoError("not_owner", "Answer is unavailable.", 404);
  if ((body.action === "edit" || body.action === "add-detail") && body.text?.trim()) {
    answer.text = body.action === "edit" ? body.text.trim() : `${answer.text}\n\n${body.text.trim()}`;
    answer.version += 1;
    answer.revisionId = `rev-${answer.id}-${answer.version}`;
    answer.chunks = Math.max(2, Math.ceil(answer.text.length / 200));
    answer.readyAt = Date.now() + 2000;
  }
  interview.version += 1;
  save();
  return { answerId, version: answer.version };
}

// Sources ----------------------------------------------------------------------------------------

const LIMITS: SourceLimits = { maxSources: 10, maxFileBytes: 5 * 1024 * 1024, maxAgentBytes: 25 * 1024 * 1024, maxPdfPages: 100,
  maxExtractedChars: 100_000, maxActiveChunks: 1000, chunkTargetChars: 2000, chunkOverlapChars: 200, parserTimeoutMs: 15_000,
  parserHeapMb: 128, maxDocxInflatedBytes: 20 * 1024 * 1024 };
function sourceItem(source: StoredSource): SourceListItem {
  return { id: source.id, agentId: source.agentId, kind: source.kind, name: source.name, state: source.status,
    currentRevisionId: source.revisionId, activeRevisionId: source.status === "ready" ? source.revisionId : null,
    contentHash: source.revisionId, byteCount: source.byteCount, pageCount: source.pageCount, chunkCount: source.chunkCount,
    deletedAt: null, error: null, origin: source.origin ?? "live", jobId: null, operationId: null,
    estimatedUnits: null, chargedUnits: units(source.chunkCount * 0.2), pendingUnits: null,
    progress: { completedBatches: 1, totalBatches: 1, indexedChunks: source.chunkCount } };
}
function sourceOverview(agentId: string): SourceOverview {
  const d = state();
  const sources = d.sources.filter((s) => s.agentId === agentId && s.kind !== "interview");
  const bytes = sources.reduce((sum, s) => sum + s.byteCount, 0);
  const me = d.identityId;
  return { sources: sources.map(sourceItem), limits: LIMITS,
    remaining: { sources: LIMITS.maxSources - sources.length, bytes: LIMITS.maxAgentBytes - bytes, chunks: LIMITS.maxActiveChunks - activeChunks(agentId) },
    walletAvailableUnits: balanceUnits(me), walletHeldUnits: "0" };
}
const kindOf = (name: string): SourceEstimate["kind"] => {
  const ext = name.toLowerCase().split(".").pop();
  return ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "md" ? "md" : ext === "txt" ? "txt" : "text";
};
async function readBody(init?: RequestInit): Promise<{ json: Record<string, unknown>; file: File | null }> {
  const body = init?.body;
  if (body instanceof FormData) {
    const json: Record<string, unknown> = {};
    let file: File | null = null;
    for (const [key, value] of body.entries()) { if (value instanceof File) file = value; else json[key] = value; }
    return { json, file };
  }
  if (typeof body === "string" && body) return { json: JSON.parse(body) as Record<string, unknown>, file: null };
  return { json: {}, file: null };
}
async function fileText(file: File | null, fallback: unknown): Promise<{ text: string; bytes: number; name?: string }> {
  if (file) {
    const kind = kindOf(file.name);
    const text = kind === "pdf" || kind === "docx" ? "" : await file.text();
    return { text, bytes: file.size, name: file.name };
  }
  const text = typeof fallback === "string" ? fallback : "";
  return { text, bytes: new Blob([text]).size };
}
async function sourcePreflight(agentId: string, init?: RequestInit): Promise<SourceEstimate> {
  ownedAgent(agentId);
  const { json, file } = await readBody(init);
  const name = String(json.name || file?.name || "Pasted text");
  const { text, bytes } = await fileText(file, json.fileOrText);
  const kind = kindOf(name);
  const pages = kind === "pdf" ? Math.max(1, Math.round(bytes / 60_000)) : null;
  const chunks = Math.max(1, text ? Math.ceil(text.length / 1800) : Math.ceil(bytes / 12_000));
  const cost = Math.round(chunks * 20) / 100;
  const token = id("est");
  const d = state();
  d.estimates[token] = { agentId, name, kind, byteCount: bytes, chunks, pages, credits: cost, text };
  const used = sourceOverview(agentId);
  return { agentId, name, kind, contentHash: token, estimateToken: token, version: 1, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    byteCount: bytes, projectedUse: { sources: 1, bytes, chunks }, remaining: used.remaining, limits: LIMITS,
    estimateUnits: units(cost), maxUnits: units(cost * 1.5), priceVersion: PRICE_VERSION, projectedPageCount: pages,
    projectedChunkCount: chunks, walletAvailableUnits: balanceUnits(d.identityId), walletHeldUnits: "0" };
}
async function sourceConfirm(agentId: string, init?: RequestInit): Promise<IndexResult> {
  const agent = ownedAgent(agentId);
  const { json } = await readBody(init);
  const d = state();
  const estimate = d.estimates[String(json.estimateToken)];
  if (!estimate || estimate.agentId !== agentId) throw new DemoError("stale_estimate", "The estimate expired. Get a fresh estimate.", 409);
  delete d.estimates[String(json.estimateToken)];
  const sourceId = id("src");
  d.sources.push({ id: sourceId, agentId, kind: estimate.kind, name: estimate.name, status: "ready", chunkCount: estimate.chunks,
    pageCount: estimate.pages, createdAt: iso(), origin: "live", byteCount: estimate.byteCount, revisionId: `rev-${sourceId}` });
  const pieces = estimate.text ? estimate.text.match(/[\s\S]{1,1800}/g) ?? [] : [];
  pieces.forEach((content, index) => d.knowledge.push({ id: `${sourceId}-${index}`, agentId, sourceId, revisionId: `rev-${sourceId}`,
    sourceType: "document", sourceName: estimate.name, content: content.trim(), question: null, page: null, headingPath: null }));
  post(d.identityId, "debit", -estimate.credits, `${estimate.name} · ${estimate.chunks} chunks`, { purpose: "embedding", refType: "source", refId: sourceId });
  agent.updatedAt = iso();
  save();
  return { state: "ready", jobId: `job-${sourceId}`, progress: { completedBatches: 1, totalBatches: 1, indexedChunks: estimate.chunks } };
}

// Answers ----------------------------------------------------------------------------------------

type EventBody = ChatStreamEvent extends infer E ? E extends ChatStreamEvent ? Omit<E, "operationId" | "eventId" | "sequence"> : never : never;
type AnswerJob = { mode: "sandbox" | "chat"; agent: Agent; text: string; requestKey: string; conversationId?: string;
  override?: ComposedAnswer; onCommit?: () => void };
function runAnswer(job: AnswerJob): { events: ChatStreamEvent[]; commit: () => void } {
  const d = state();
  const me = d.identityId;
  const now = iso();
  const attachment = job.conversationId ? d.attachments[job.conversationId] ?? null : null;
  const answer = job.override ?? composeAnswer({ agent: job.agent, expertName: expertName(job.agent), question: job.text,
    knowledge: knowledgeFor(job.agent.id), attachment, now, styles: d.styles?.[job.agent.id] });
  const raw = rawCostCredits(answer.text);
  // Chats with an agent the hirer bought are included in the purchase.
  const owned = job.mode === "chat" && (d.purchases?.[me] ?? []).some((p) => p.agentId === job.agent.id);
  const charge = owned ? 0 : job.mode === "chat" ? Math.round(raw * job.agent.rateMultiplier * 100) / 100 : raw;
  const operationId = id("op");
  const operation: Operation = { id: operationId, requestKey: job.requestKey, identityId: me, agentId: job.agent.id,
    purpose: job.mode, state: "settled", estimateUnits: units(charge), heldUnits: "0", actualUnits: units(charge),
    priceVersion: PRICE_VERSION, payloadHash: "demo", createdAt: now, chatRateMultiplier: job.mode === "chat" ? job.agent.rateMultiplier : null };
  const messageId = id("msg");
  const balanceAfter = units(credits(balanceUnits(me)) - charge);
  let sequence = 0;
  const events: ChatStreamEvent[] = [];
  const push = (event: EventBody) =>
    events.push({ ...event, operationId, eventId: `${operationId}:${sequence}`, sequence: sequence++ } as ChatStreamEvent);
  push({ type: "operation-start", operation });
  const steps = answer.steps.map((step) => ({ ...step, operationId }));
  for (const step of steps) { push({ type: "tool-start", step: { ...step, status: "running" } }); push({ type: "tool-result", step }); }
  push({ type: "sources", chunks: answer.sources });
  const words = answer.text.match(/\S+\s*/g) ?? [];
  const size = Math.max(6, Math.ceil(words.length / 12));
  for (let index = 0; index < words.length; index += size) push({ type: "text-delta", delta: words.slice(index, index + size).join("") });
  push({ type: "citations", citations: answer.citations });
  if (answer.gap) push({ type: "knowledge-gap", message: answer.gap });
  push({ type: "cost", status: "settled", estimateUnits: units(charge), chargedUnits: units(charge), balanceUnits: balanceAfter, heldUnits: "0" });
  push({ type: "done", messageId });

  const commit = () => {
    job.onCommit?.();
    d.operations[operationId] = { operation, events };
    if (job.mode === "sandbox") {
      post(me, "debit", -charge, `${job.agent.persona.name} · sandbox test`, { purpose: "sandbox_message", refType: "agent", refId: job.agent.id });
      const rows = d.sandbox[job.agent.id] ??= [];
      rows.push({ id: id("sb"), role: "user", content: job.text, operation_id: operationId, citations: [], retrieved: { chunks: [], gap: null }, tool_steps: [], charged_units: null, created_at: now });
      rows.push({ id: messageId, role: "assistant", content: answer.text, operation_id: operationId, citations: answer.citations,
        retrieved: { chunks: answer.sources, gap: answer.gap }, tool_steps: steps, charged_units: units(charge), created_at: iso() });
    } else {
      const conversationId = job.conversationId!;
      const conversation = d.conversations.find((c) => c.id === conversationId)!;
      const margin = Math.round((charge - raw) * PLATFORM_MARGIN_SHARE * 100) / 100;
      const net = Math.round((charge - raw - margin) * 100) / 100;
      const ref = { purpose: "chat_message" as const, refType: "conversation" as const, refId: conversationId };
      if (!owned) {
        post(me, "debit", -charge, `${job.agent.persona.name} · 1 message`, ref);
        post(null, "platform_cost", raw, "Raw LLM cost", ref);
        if (margin > 0) post(null, "platform_margin", margin, "15% of margin", ref);
        post(job.agent.ownerId, "earnings", net, `${conversation.title} · net`, { refType: "conversation", refId: conversationId });
      }
      d.messages.push({ id: id("msg-u"), conversationId, role: "user", content: job.text, citations: [], feedback: null, costCents: null, createdAt: now, origin: "live" });
      d.messages.push({ id: messageId, conversationId, role: "assistant", content: answer.text, citations: answer.citations, feedback: null,
        costCents: charge, retrieved: answer.sources, gap: answer.gap, steps, createdAt: iso(), origin: "live" });
      job.agent.usageCount += 1;
    }
    save();
  };
  return { events, commit };
}
function streamEvents(events: ChatStreamEvent[], commit: () => void, signal?: AbortSignal | null): Response {
  const encoder = new TextEncoder();
  const delay = (event: ChatStreamEvent) => event.type === "operation-start" ? 150 : event.type === "tool-start" ? 700
    : event.type === "tool-result" ? 500 : event.type === "sources" ? 900 : event.type === "text-delta" ? 110 : 60;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        if (signal?.aborted) return controller.error(new DOMException("Aborted", "AbortError"));
        await sleep(delay(event));
        if (event.type === "done") commit();
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "application/x-ndjson" } });
}

// Router -----------------------------------------------------------------------------------------

const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { "Content-Type": "application/json" } });
const fail = (code: string, message: string, status: number) =>
  new Response(JSON.stringify({ ok: false, error: { code, message, retryable: false } }), { status, headers: { "Content-Type": "application/json" } });

async function route(method: string, url: URL, init?: RequestInit): Promise<Response> {
  const d = state();
  const parts = url.pathname.replace(/^\/api\//, "").split("/").map(decodeURIComponent);
  const body = async () => (await readBody(init)).json;
  const [head, second, third, fourth] = parts;

  if (head === "demo") {
    if (second === "snapshot") return ok(snapshot());
    if (second === "identity") { const { identityId } = await body(); if (identityId === "maria" || identityId === "sam") { d.identityId = identityId; save(); } return ok({ identityId: d.identityId }); }
    if (second === "reset") { const identityId = d.identityId; db = fresh(); db.identityId = identityId; save(); return ok(snapshot()); }
    if (second === "import") return ok({ results: [] });
  }
  if (head === "profile" && method === "PATCH") {
    const { patch } = await body() as { patch: Partial<Profile> };
    const profile = profileOf(d.identityId)!;
    Object.assign(profile, patch, { version: profile.version + 1 });
    save();
    const { version, ...rest } = profile;
    return ok({ profile: rest, version });
  }
  if (head === "wallet" && second === "grants") {
    const { kind } = await body();
    const grant = kind === "pack" ? PACK_GRANT_CENTS : SUBSCRIPTION_GRANT_CENTS;
    post(d.identityId, kind === "pack" ? "pack" : "subscription", grant, kind === "pack" ? "Mock credit pack · no payment taken" : "Mock monthly plan · no payment taken");
    save();
    return ok({ balanceUnits: balanceUnits(d.identityId), grantUnits: units(grant), replayed: false });
  }
  if (head === "operations" && second) {
    const found = d.operations[second];
    return found ? ok({ operation: found.operation }) : fail("not_owner", "Operation is unavailable.", 404);
  }
  if (head === "agents" && !second && method === "POST") {
    if (d.identityId !== seed.MARIA) return fail("not_owner", "Only the expert demo identity can create agents.", 404);
    const { name, category } = await body() as { name: string; category: PersonaForm["category"] };
    const agentId = `agent-${Date.now().toString(36)}`;
    const now = iso();
    const persona: PersonaForm = { name, category, headline: "", description: "", howIWork: "", always: [], never: [], exampleQuestions: [], greeting: "" };
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
    const slug = d.agents.some((a) => a.slug === base) ? `${base}-${agentId.slice(-4)}` : base;
    const agent: Agent = { id: agentId, slug, ownerId: d.identityId, icon: "bot", status: "draft", rateMultiplier: 1, consentAcceptedAt: null,
      ratingAvg: 0, ratingCount: 0, usageCount: 0, createdAt: now, updatedAt: now, origin: "live", systemPromptOverride: null, persona };
    d.agents.push(agent);
    d.personas[agentId] = personaState(persona, "expert");
    save();
    return ok(agent);
  }
  if (head === "agents" && second) {
    const agentId = second;
    if (third === "interview") {
      ownedAgent(agentId);
      if (method === "GET") return ok(interviewView(agentId));
      const input = await body() as { action: string; control?: string; questionId: string; text: string };
      return ok(input.action === "control" ? interviewControl(agentId, input.control ?? "start") : interviewSubmit(agentId, input));
    }
    if (third === "answers" && fourth) {
      if (method === "DELETE") {
        ownedAgent(agentId);
        const interview = interviewOf(agentId);
        interview.answers = interview.answers.filter((a) => a.id !== fourth);
        interview.version += 1; save();
        return ok({ deleted: true });
      }
      return ok(answerAction(agentId, fourth, await body() as { action: string; text?: string }));
    }
    if (third === "persona") {
      ownedAgent(agentId);
      if (method === "PATCH") {
        const input = await body() as { action: string; patch?: Partial<PersonaForm>; field?: PersonaFieldName; text?: string };
        const current = d.personas[agentId];
        const fields = { ...current.fields } as Record<PersonaFieldName, PersonaState["fields"][PersonaFieldName]>;
        let next: PersonaState = current;
        if (input.action === "save-fields" && input.patch) {
          for (const [name, value] of Object.entries(input.patch) as [PersonaFieldName, PersonaForm[PersonaFieldName]][])
            fields[name] = { ...fields[name], value, origin: "expert", version: fields[name].version + 1, pendingSuggestion: null };
          next = { ...current, fields: fields as PersonaState["fields"], version: current.version + 1 };
        } else if ((input.action === "accept-suggestion" || input.action === "keep-suggestion") && input.field) {
          const field = fields[input.field];
          fields[input.field] = input.action === "accept-suggestion" && field.pendingSuggestion
            ? { ...field, value: field.pendingSuggestion.value, origin: "interview", version: field.version + 1, pendingSuggestion: null }
            : { ...field, pendingSuggestion: null };
          next = { ...current, fields: fields as PersonaState["fields"], version: current.version + 1 };
        } else if (input.action === "custom-prompt") {
          next = { ...current, promptMode: "custom", customPrompt: input.text ?? "", promptVersion: current.promptVersion + 1 };
        } else if (input.action === "voice") {
          const voice = input as unknown as { tone?: string[]; styles?: AnswerStyle[] };
          if (voice.tone) { (d.tone ??= {})[agentId] = voice.tone.map((t) => t.trim()).filter(Boolean).slice(0, 6); (d.toneEdited ??= {})[agentId] = true; }
          if (voice.styles) (d.styles ??= {})[agentId] = voice.styles.filter((style) => style in STYLE_LABELS);
        } else if (input.action === "regenerate-prompt") {
          next = { ...current, promptMode: "generated", customPrompt: null, promptVersion: current.promptVersion + 1 };
        }
        d.personas[agentId] = next;
        syncAgentPersona(agentId);
        save();
      }
      return ok(personaPayload(agentId));
    }
    if (third === "sources" && !fourth) {
      ownedAgent(agentId);
      if (method === "GET") return ok(sourceOverview(agentId));
      const action = init?.body instanceof FormData ? init.body.get("action") : (await body()).action;
      return ok(action === "confirm" ? await sourceConfirm(agentId, init) : await sourcePreflight(agentId, init));
    }
    if (third === "sources" && fourth) {
      ownedAgent(agentId);
      if (method === "DELETE") {
        d.sources = d.sources.filter((s) => s.id !== fourth);
        d.knowledge = d.knowledge.filter((k) => k.sourceId !== fourth);
        save();
        return ok({ deleted: true });
      }
      const source = d.sources.find((s) => s.id === fourth);
      const { action } = await body();
      if (action === "preflight-retry" && source) {
        const token = id("est");
        d.estimates[token] = { agentId, name: source.name, kind: kindOf(source.name), byteCount: source.byteCount, chunks: source.chunkCount, pages: source.pageCount, credits: 0.2 * source.chunkCount, text: "" };
        return ok({ ...(await sourcePreflight(agentId, { body: JSON.stringify({ name: source.name, fileOrText: "" }) })), estimateToken: token });
      }
      return ok({ state: "ready", jobId: `job-${fourth}`, progress: { completedBatches: 1, totalBatches: 1, indexedChunks: source?.chunkCount ?? 0 } });
    }
    if (third === "sandbox") {
      const agent = ownedAgent(agentId);
      if (method === "GET") {
        const operationId = url.searchParams.get("operationId");
        if (operationId) return ok({ events: d.operations[operationId]?.events ?? [] });
        return ok({ messages: d.sandbox[agentId] ?? [] });
      }
      const input = await body() as { text: string; requestKey: string };
      const fix = parseFeedback(input.text, expertName(agent));
      if (fix) {
        // "If you don't like something, just say it": apply the change, then replay the last test question with it.
        const styles = [...new Set([...(d.styles?.[agent.id] ?? []), ...fix.styles])];
        const lastQuestion = [...(d.sandbox[agent.id] ?? [])].reverse()
          .find((row) => row.role === "user" && !parseFeedback(row.content, expertName(agent)))?.content;
        const rerun = lastQuestion ? composeAnswer({ agent, expertName: expertName(agent), question: lastQuestion,
          knowledge: knowledgeFor(agent.id), now: iso(), styles }) : null;
        const saved = [...fix.always.map((rule) => `Always: "${rule}"`), ...fix.never.map((rule) => `Never: "${rule}"`)];
        const text = `Fixed. Here's what I changed in ${agent.persona.name}:\n${fix.changes.map((change) => `- ${change}`).join("\n")}${
          saved.length ? `\n- Saved to the persona: ${saved.join(" · ")}` : ""}${
          rerun ? `\n\nHere's your last test question again with the change.\nQ: ${lastQuestion}\n\n${rerun.text}` : "\n\nAsk a test question to see the change."}`;
        const override: ComposedAnswer = { text, citations: rerun?.citations ?? [], sources: rerun?.sources ?? [], steps: [], gap: rerun?.gap ?? null };
        const { events, commit } = runAnswer({ mode: "sandbox", agent, text: input.text, requestKey: input.requestKey, override,
          onCommit: () => {
            (d.styles ??= {})[agent.id] = styles;
            if (fix.tone.length) (d.tone ??= {})[agent.id] = [...new Set([...(voiceOf(agent.id).tone), ...fix.tone])].slice(0, 5);
            addPersonaRules(agent.id, fix.always, fix.never);
          } });
        return streamEvents(events, commit, init?.signal);
      }
      const { events, commit } = runAnswer({ mode: "sandbox", agent, text: input.text, requestKey: input.requestKey });
      return streamEvents(events, commit, init?.signal);
    }
    if (third === "publish") {
      const agent = ownedAgent(agentId);
      if (method === "GET") return ok({ activeChunks: activeChunks(agentId) });
      const { publish, acceptConsent } = await body() as { publish: boolean; acceptConsent?: boolean };
      agent.status = publish ? "published" : "unpublished";
      if (publish && (acceptConsent || !agent.consentAcceptedAt)) agent.consentAcceptedAt ??= iso();
      if (publish && agent.icon === "bot") agent.icon = "rocket";
      agent.updatedAt = iso();
      save();
      return ok({ status: agent.status, consentAcceptedAt: agent.consentAcceptedAt, activeChunks: activeChunks(agentId) });
    }
    if (third === "stats") {
      const answers = (d.interviews[agentId]?.answers.length ?? 0) + d.sources.filter((s) => s.agentId === agentId && s.kind === "interview").reduce((sum, s) => sum + s.chunkCount, 0);
      const documents = d.sources.filter((s) => s.agentId === agentId && s.kind !== "interview").length;
      return ok({ answers, documents, activeChunks: activeChunks(agentId), lastUpdatedAt: agentOf(agentId).updatedAt });
    }
    if (third === "purchase" && method === "POST") {
      // One-click checkout: debit the buyer, pay the expert, add the agent to My agents with a chat ready.
      const agent = agentOf(agentId);
      if (agent.ownerId === d.identityId) return fail("invalid_input", "This is your own agent.", 400);
      const mine = ((d.purchases ??= {})[d.identityId] ??= []);
      const existing = mine.find((p) => p.agentId === agent.id);
      if (existing) return ok({ ...existing, balanceUnits: balanceUnits(d.identityId), replayed: true });
      const price = agentPriceCredits(agent.rateMultiplier);
      if (credits(balanceUnits(d.identityId)) < price)
        return new Response(JSON.stringify({ ok: false, error: { code: "insufficient_credits", message: "Not enough credits to buy this agent.", retryable: false,
          neededUnits: units(price), availableUnits: balanceUnits(d.identityId) } }), { status: 402, headers: { "Content-Type": "application/json" } });
      const conversation: Conversation = { id: id("c"), agentId: agent.id, hirerId: d.identityId, title: agent.persona.name, shareTranscript: false, createdAt: iso(), origin: "live" };
      d.conversations.push(conversation);
      const expertShare = Math.round(price * PURCHASE_EXPERT_SHARE * 100) / 100;
      const ref = { refType: "agent" as const, refId: agent.id };
      post(d.identityId, "debit", -price, `Bought ${agent.persona.name}`, ref);
      post(agent.ownerId, "earnings", expertShare, `Sale · ${agent.persona.name}`, ref);
      post(null, "platform_margin", Math.round((price - expertShare) * 100) / 100, "15% of sale", ref);
      agent.usageCount += 1;
      const purchase = { agentId: agent.id, conversationId: conversation.id, credits: price, purchasedAt: iso() };
      mine.push(purchase);
      save();
      return ok({ ...purchase, balanceUnits: balanceUnits(d.identityId), replayed: false });
    }
    if (third === "rate") {
      const agent = ownedAgent(agentId);
      const { multiplier } = await body() as { multiplier: number };
      agent.rateMultiplier = multiplier; agent.updatedAt = iso(); save();
      return ok({ multiplier });
    }
  }
  if (head === "conversations" && !second && method === "POST") {
    const { agentId, title } = await body() as { agentId: string; title: string };
    const agent = agentOf(agentId);
    const conversation: Conversation = { id: id("c"), agentId: agent.id, hirerId: d.identityId, title: title || agent.persona.name, shareTranscript: false, createdAt: iso(), origin: "live" };
    d.conversations.push(conversation);
    save();
    return ok({ id: conversation.id });
  }
  if (head === "conversations" && second) {
    const conversation = d.conversations.find((c) => c.id === second);
    if (!conversation) return fail("not_owner", "Conversation is unavailable.", 404);
    if (third === "messages") {
      if (method === "GET") {
        const operationId = url.searchParams.get("operationId");
        if (operationId) { const found = d.operations[operationId]; return ok({ events: found?.events ?? [], operation: found?.operation }); }
        return ok({ messages: d.messages.filter((m) => m.conversationId === second) });
      }
      const input = await body() as { text: string; requestKey: string };
      const { events, commit } = runAnswer({ mode: "chat", agent: agentOf(conversation.agentId), text: input.text, requestKey: input.requestKey, conversationId: second });
      return streamEvents(events, commit, init?.signal);
    }
    if (third === "controls") {
      const input = await body() as { action: string; shareTranscript?: boolean; messageId?: string; feedback?: "up" | "down" | null };
      if (input.action === "share") { conversation.shareTranscript = !!input.shareTranscript; save(); return ok({ shareTranscript: conversation.shareTranscript }); }
      const message = d.messages.find((m) => m.id === input.messageId);
      if (message) message.feedback = input.feedback ?? null;
      save();
      return ok({ feedback: input.feedback ?? null });
    }
    if (third === "attachment") {
      if (method === "GET") { const a = d.attachments[second]; return ok(a ? { name: a.name, chars: a.chars } : null); }
      if (method === "DELETE") { delete d.attachments[second]; save(); return ok({ removed: true }); }
      const { file } = await readBody(init);
      if (!file) return fail("invalid_input", "Choose a file to attach.", 400);
      const { text } = await fileText(file, "");
      const extracted = text || `${file.name}: ${Math.round(file.size / 1024)} KB document.`;
      d.attachments[second] = { name: file.name, chars: extracted.length, text: extracted };
      save();
      return ok({ name: file.name, chars: extracted.length });
    }
  }
  return fail("configuration", "This action isn't available in the demo.", 404);
}

let installed = false;
/** Route same-origin /api/* requests to the in-browser demo backend. */
export function installDemoBackend(): void {
  if (installed || typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) return original(input, init);
    const url = new URL(String(input), window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return original(input, init);
    try { return await route((init?.method ?? "GET").toUpperCase(), url, init); }
    catch (error) {
      if (error instanceof DemoError) return fail(error.code, error.message, error.status);
      console.error("[demo-backend]", error);
      return fail("provider", "The demo backend hit an error. Try again.", 500);
    }
  };
}
