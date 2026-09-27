"use client";

/**
 * Client-side demo state for the presentation MVP (no backend).
 * Seed data is read-only; everything the viewer does (switching identity,
 * adding credits, chatting, interviewing, editing, publishing) is stored as a
 * delta in localStorage so it survives reloads. The mechanics are real: a
 * metered call checks the wallet first and refuses when it doesn't fit (hard
 * stop at zero, D-10), and every balance change writes a ledger row.
 */
import { useSyncExternalStore } from "react";
import { AGENTS, CHUNKS, CONVERSATIONS, FLAGS, IDENTITIES, INTERVIEW_ANSWER_COUNTS, INTERVIEW_TURNS, LEDGER, MARIA, MESSAGES, PROFILES, REVIEWS, SOURCES } from "@/lib/data/seed";
import { PACK_GRANT_CENTS, SUBSCRIPTION_GRANT_CENTS, type MeteredPurpose } from "@/lib/config/credits";
import { disclaimerFor, type Category } from "@/lib/config/categories";
import { clampRate } from "@/lib/config/publish";
import { costCentsFromUsage, estimateCents, splitUsageCharge, toChargeCents } from "@/features/billing/pricing";
import { isWeakRetrieval, searchKnowledge } from "@/features/knowledge/search";
import { publishBlockers } from "@/features/marketplace/publish";
import { cannedAnswer, nextInterviewQuestion, refusalReply } from "@/features/runtime/agent";
import type { Agent, AgentStatus, Chunk, Conversation, Flag, Identity, InterviewTurn, LedgerEntry, Message, ModerationAction, Payout, PersonaForm, Profile, Review } from "@/lib/types";

export const STORAGE_KEY = "bx-demo-v1";

export type DemoState = {
  v: 1;
  identityId: string;
  ledger: LedgerEntry[];
  profileEdits: Record<string, Partial<Profile>>;
  agentEdits: Record<string, Partial<Agent>>;
  newAgents: Agent[];
  conversations: Conversation[];
  conversationEdits: Record<string, Partial<Conversation>>;
  messages: Message[];
  interviewTurns: InterviewTurn[];
  answeredTurns: Record<string, string>;
  /** Last time an agent's knowledge changed in this browser (answers), for "knowledge updated". */
  knowledgeTouchedAt: Record<string, string>;
  /** Reviews written in this browser (Phase 4 MKT-05/MKT-V2-03). Optional so old saved state stays valid (D-03). */
  reviews?: Review[];
  /** Flags written in this browser (Phase 4 MKT-06). Optional so old saved state stays valid (D-03). */
  flags?: Flag[];
  /** Admin edits (resolve/unresolve) overlaid onto seeded and new flags by id (ADMN-01). */
  flagEdits?: Record<string, FlagEdit>;
  /** Thumbs overlay by message id (CHAT-08); overrides the seeded/stored Message.feedback. */
  messageFeedback?: Record<string, Message["feedback"]>;
  /** Mock cash-out records (CRED-09). */
  payouts?: Payout[];
  /** Admin unpublish actions (ADMN-01). */
  moderationActions?: ModerationAction[];
};

/** Admin-editable subset of a Flag, overlaid by id (Phase 4 seam, D-02). */
export type FlagEdit = Partial<Pick<Flag, "status" | "resolvedAt" | "resolutionNote">>;

const initialState = (): DemoState => ({
  v: 1,
  identityId: MARIA,
  ledger: [],
  profileEdits: {},
  agentEdits: {},
  newAgents: [],
  conversations: [],
  conversationEdits: {},
  messages: [],
  interviewTurns: [],
  answeredTurns: {},
  knowledgeTouchedAt: {},
  reviews: [],
  flags: [],
  flagEdits: {},
  messageFeedback: {},
  payouts: [],
  moderationActions: [],
});

let state: DemoState | null = null;
const listeners = new Set<() => void>();

/**
 * Repairs a saved payload into a valid DemoState, or returns null when it
 * isn't one at all (wrong/missing `v`). Old saved browser state (pre-Phase-4)
 * has no Phase 4 keys; those are optional so it still loads unchanged
 * (D-03). Only Phase 4 keys are shape-checked and repaired here — a corrupt
 * Phase 4 collection resets to its default instead of throwing or wiping the
 * rest of the saved state (T-04-01).
 */
export function normalizeDemoState(raw: unknown): DemoState | null {
  if (typeof raw !== "object" || raw === null) return null;
  if ((raw as { v?: unknown }).v !== 1) return null;
  const merged: DemoState = { ...initialState(), ...(raw as Partial<DemoState>) };
  const isRecord = (v: unknown): boolean => typeof v === "object" && v !== null && !Array.isArray(v);
  if (!Array.isArray(merged.reviews)) merged.reviews = [];
  if (!Array.isArray(merged.flags)) merged.flags = [];
  if (!isRecord(merged.flagEdits)) merged.flagEdits = {};
  if (!isRecord(merged.messageFeedback)) merged.messageFeedback = {};
  if (!Array.isArray(merged.payouts)) merged.payouts = [];
  if (!Array.isArray(merged.moderationActions)) merged.moderationActions = [];
  return merged;
}

/** Returns a fresh, unsaved DemoState — the seeded starting point before any browser writes. */
export function createInitialDemoState(): DemoState {
  return initialState();
}

function load(): DemoState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeDemoState(JSON.parse(raw)) ?? initialState();
  } catch {
    // Private window or blocked storage: fall back to the seeded state.
  }
  return initialState();
}

function getSnapshot(): DemoState {
  if (typeof window === "undefined") return serverFallback;
  if (!state) state = load();
  return state;
}

const serverFallback = initialState();

function getServerSnapshot(): DemoState | null {
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(update: (s: DemoState) => DemoState) {
  state = update(getSnapshot());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: keep the in-memory state.
  }
  listeners.forEach((l) => l());
}

/** null during server render and hydration; the app shell waits for it. */
export function useDemoSnapshot(): DemoState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** For components rendered inside the hydrated shell. */
export function useDemo(): DemoState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return s;
}

/** Reads the current committed state outside a React render (Phase 4 seam, D-02). */
export function readDemo(): DemoState {
  return getSnapshot();
}

/**
 * The Phase 4 commit seam (D-02): features/ modules compute with pure
 * functions and commit once through here, instead of calling setState
 * directly. `update` must be pure and must re-validate against the state it
 * receives (it may run against a state that changed since it was read).
 * Porting to the Phase 2 backend replaces this one call per action.
 */
export function commitDemo(update: (s: DemoState) => DemoState): DemoState {
  setState(update);
  return getSnapshot();
}

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------- selectors

export const switchableIdentities = (): Identity[] => IDENTITIES.filter((i) => i.isSwitchable);

export function identityById(id: string): Identity {
  return IDENTITIES.find((i) => i.id === id) ?? IDENTITIES[0];
}

export function currentIdentity(s: DemoState): Identity {
  const found = IDENTITIES.find((i) => i.id === s.identityId && i.isSwitchable);
  return found ?? IDENTITIES[0];
}

export function profileFor(s: DemoState, identityId: string): Profile {
  const base = PROFILES.find((p) => p.identityId === identityId) ?? {
    identityId,
    displayName: identityById(identityId).displayName,
    field: "",
    credentials: "",
    yearsExperience: null,
    contactUrl: "",
    bio: "",
    location: "",
  };
  return { ...base, ...s.profileEdits[identityId] };
}

/** Display name follows profile edits (AUTH-03). */
export function displayName(s: DemoState, identityId: string): string {
  return profileFor(s, identityId).displayName || identityById(identityId).displayName;
}

export function allAgents(s: DemoState): Agent[] {
  return [...AGENTS, ...s.newAgents].map((a) => ({ ...a, ...s.agentEdits[a.id] }));
}

export function agentById(s: DemoState, id: string): Agent | undefined {
  return allAgents(s).find((a) => a.id === id || a.slug === id);
}

export function ledgerFor(s: DemoState, identityId: string): LedgerEntry[] {
  return [...LEDGER, ...s.ledger]
    .filter((r) => r.identityId === identityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allLedger(s: DemoState): LedgerEntry[] {
  return [...LEDGER, ...s.ledger];
}

export function balanceOf(s: DemoState, identityId: string): number {
  return allLedger(s)
    .filter((r) => r.identityId === identityId)
    .reduce((sum, r) => sum + r.amountCents, 0);
}

export function allConversations(s: DemoState): Conversation[] {
  return [...CONVERSATIONS, ...s.conversations].map((c) => ({ ...c, ...s.conversationEdits[c.id] }));
}

/** Applies the messageFeedback overlay (CHAT-08): an explicit overlay entry — including null — wins. */
function withFeedbackOverlay(s: DemoState, m: Message): Message {
  return Object.hasOwn(s.messageFeedback ?? {}, m.id) ? { ...m, feedback: (s.messageFeedback ?? {})[m.id] ?? null } : m;
}

export function messagesFor(s: DemoState, conversationId: string): Message[] {
  return [...MESSAGES, ...s.messages]
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => withFeedbackOverlay(s, m));
}

/** Finds a seeded or new message by id and applies the same messageFeedback overlay as messagesFor. */
export function messageById(s: DemoState, messageId: string): Message | undefined {
  const found = [...MESSAGES, ...s.messages].find((m) => m.id === messageId);
  return found ? withFeedbackOverlay(s, found) : undefined;
}

export function allReviews(s: DemoState): Review[] {
  return [...REVIEWS, ...(s.reviews ?? [])];
}

export function reviewsFor(s: DemoState, agentId: string): Review[] {
  return allReviews(s)
    .filter((r) => r.agentId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allFlags(s: DemoState): Flag[] {
  return [...FLAGS, ...(s.flags ?? [])].map((f) => ({ ...f, ...s.flagEdits?.[f.id] }));
}

export function allPayouts(s: DemoState): Payout[] {
  return s.payouts ?? [];
}

export function payoutsFor(s: DemoState, identityId: string): Payout[] {
  return allPayouts(s)
    .filter((p) => p.identityId === identityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allModerationActions(s: DemoState): ModerationAction[] {
  return s.moderationActions ?? [];
}

export function moderationActionsFor(s: DemoState, agentId: string): ModerationAction[] {
  return allModerationActions(s)
    .filter((m) => m.agentId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function conversationStats(s: DemoState, conversationId: string) {
  const msgs = messagesFor(s, conversationId);
  return {
    messageCount: msgs.length,
    spentCents: msgs.reduce((sum, m) => sum + (m.role === "assistant" ? (m.costCents ?? 0) : 0), 0),
    lastMessageAt: msgs.at(-1)?.createdAt ?? null,
  };
}

export function interviewTurnsFor(s: DemoState, agentId: string): InterviewTurn[] {
  return [...INTERVIEW_TURNS, ...s.interviewTurns]
    .filter((t) => t.agentId === agentId)
    .map((t) => (t.answer === null && s.answeredTurns[t.id] ? { ...t, answer: s.answeredTurns[t.id] } : t))
    .sort((a, b) => a.position - b.position);
}

/** The question waiting for an answer: a seeded open turn, or the next canned follow-up. */
export function pendingInterviewQuestion(s: DemoState, agentId: string): { turnId: string | null; question: string } {
  const turns = interviewTurnsFor(s, agentId);
  const open = turns.find((t) => t.answer === null);
  if (open) return { turnId: open.id, question: open.question };
  if (turns.length === 0) return { turnId: null, question: "Let's start with who you are. What do you do, who comes to you, and what do they usually ask first?" };
  return { turnId: null, question: nextInterviewQuestion(turns.length) };
}

/**
 * Interview answers as retrievable chunks (Phase 3 D-02). Seeded answers that
 * already exist in CHUNKS are skipped so they are not cited twice.
 */
export function interviewChunks(s: DemoState, agentId: string): Chunk[] {
  const seeded = new Set(CHUNKS.filter((c) => c.agentId === agentId).map((c) => c.content.trim()));
  return interviewTurnsFor(s, agentId)
    .filter((t) => t.answer && !seeded.has(t.answer.trim()))
    .map((t) => ({ id: `ic-${t.id}`, agentId, sourceId: `interview:${agentId}`, page: null, headingPath: null, question: t.question, content: t.answer! }));
}

export type KnowledgeStats = { answers: number; docChunks: number; total: number; lastUpdatedAt: string };

/** Knowledge counts for the listing, the drawer and the publish gate: seeded counts plus anything answered in this browser. */
export function knowledgeStats(s: DemoState, agentId: string): KnowledgeStats {
  const seededShown = interviewTurnsFor({ ...s, interviewTurns: [], answeredTurns: {} }, agentId).filter((t) => t.answer).length;
  const now = interviewTurnsFor(s, agentId).filter((t) => t.answer).length;
  // Seeded agents without a transcript still report their interview source's chunk count.
  const seededAnswers =
    INTERVIEW_ANSWER_COUNTS[agentId] ?? SOURCES.find((x) => x.agentId === agentId && x.kind === "interview" && x.status === "ready")?.chunkCount ?? seededShown;
  const answers = seededAnswers + (now - seededShown);
  const docChunks = SOURCES.filter((x) => x.agentId === agentId && x.kind !== "interview" && x.status === "ready").reduce((n, x) => n + x.chunkCount, 0);
  const stamps = [
    ...SOURCES.filter((x) => x.agentId === agentId && x.status === "ready").map((x) => x.createdAt),
    ...s.interviewTurns.filter((t) => t.agentId === agentId).map((t) => t.createdAt),
    s.knowledgeTouchedAt[agentId] ?? "",
    agentById(s, agentId)?.createdAt ?? "",
  ].filter(Boolean);
  return { answers, docChunks, total: answers + docChunks, lastUpdatedAt: stamps.sort().at(-1) ?? nowIso() };
}

// ------------------------------------------------------------------ actions

export type Refusal = { ok: false; reason: "insufficient_credits"; neededCents: number; availableCents: number };

export function switchIdentity(identityId: string): Identity | null {
  const target = IDENTITIES.find((i) => i.id === identityId && i.isSwitchable);
  if (!target) return null;
  setState((s) => ({ ...s, identityId: target.id }));
  return target;
}

export function addCredits(kind: "subscription" | "pack"): { grantedCents: number; balanceCents: number } {
  const amount = kind === "subscription" ? SUBSCRIPTION_GRANT_CENTS : PACK_GRANT_CENTS;
  let balance = 0;
  setState((s) => {
    const id = currentIdentity(s).id;
    balance = balanceOf(s, id) + amount;
    const row: LedgerEntry = {
      id: uid("l"),
      identityId: id,
      kind,
      amountCents: amount,
      balanceAfter: balance,
      purpose: null,
      refType: null,
      refId: null,
      note: kind === "subscription" ? "Mock monthly plan · no payment taken" : "Mock credit pack · no payment taken",
      createdAt: nowIso(),
    };
    return { ...s, ledger: [...s.ledger, row] };
  });
  return { grantedCents: amount, balanceCents: balance };
}

/** Reserve-then-settle for one metered call on the current state. */
function precheck(s: DemoState, identityId: string, purpose: MeteredPurpose, multiplier = 1): Refusal | null {
  const needed = estimateCents(purpose, multiplier);
  const available = balanceOf(s, identityId);
  return available < needed ? { ok: false, reason: "insufficient_credits", neededCents: needed, availableCents: available } : null;
}

function debitRow(s: DemoState, identityId: string, amountCents: number, purpose: MeteredPurpose, refType: LedgerEntry["refType"], refId: string, note: string): LedgerEntry {
  const balance = balanceOf(s, identityId);
  const debit = Math.min(amountCents, balance);
  return { id: uid("l"), identityId, kind: "debit", amountCents: -debit, balanceAfter: balance - debit, purpose, refType, refId, note, createdAt: nowIso() };
}

/** Canned model usage per call (placeholder until the real model runs in Phase 2). Exported so ledger reconciliation can compute expected raw charges (D-14). */
export const CANNED_USAGE: Record<MeteredPurpose, Parameters<typeof costCentsFromUsage>[0]> = {
  interview_turn: { model: "claude-sonnet-5", tokensIn: 5000, tokensOut: 400 },
  embedding: { model: "voyage-4-lite", tokensIn: 400, tokensOut: 0 },
  sandbox_message: { model: "claude-sonnet-5", tokensIn: 6000, tokensOut: 250 },
  chat_message: { model: "claude-sonnet-5", tokensIn: 6000, tokensOut: 250 },
};

export function startConversation(agentId: string, title: string): string {
  const id = uid("c");
  setState((s) => ({
    ...s,
    conversations: [
      ...s.conversations,
      { id, agentId, hirerId: currentIdentity(s).id, title: title.slice(0, 60) || "New conversation", shareTranscript: false, createdAt: nowIso() },
    ],
  }));
  return id;
}

/** One hirer file per conversation (CHAT-04). Text arrives from /api/extract; it is context, never instructions. */
export function attachConversationFile(conversationId: string, file: { name: string; text: string; chars: number }) {
  setState((s) => ({
    ...s,
    conversationEdits: { ...s.conversationEdits, [conversationId]: { ...s.conversationEdits[conversationId], fileName: file.name, fileText: file.text, fileChars: file.chars } },
  }));
}

export function removeConversationFile(conversationId: string) {
  setState((s) => ({
    ...s,
    conversationEdits: { ...s.conversationEdits, [conversationId]: { ...s.conversationEdits[conversationId], fileName: null, fileText: null, fileChars: null } },
  }));
}

export type ChatResult = { ok: true; chargedCents: number; grounded: boolean; messageId: string } | Refusal;

/** Replies created in this browser session, so the chat page can stream them in once (CHAT-01). Not persisted. */
const freshMessages = new Set<string>();
export const isFreshMessage = (messageId: string) => freshMessages.has(messageId);
export const markStreamed = (messageId: string) => {
  freshMessages.delete(messageId);
};

/**
 * Hirer message (CHAT-01..05, CHAT-12, CRED-04). Weak retrieval returns the fixed
 * refusal at no charge (D-03); otherwise the canned grounded answer is charged
 * at raw cost × multiplier and split across hirer, platform and expert.
 */
export async function sendChatMessage(conversationId: string, text: string): Promise<ChatResult> {
  const s0 = getSnapshot();
  const conversation = allConversations(s0).find((c) => c.id === conversationId);
  const agent = conversation && agentById(s0, conversation.agentId);
  if (!conversation || !agent) throw new Error("Conversation not found");

  const expertName = displayName(s0, agent.ownerId);
  const chunks = await searchKnowledge(agent, text, 4, interviewChunks(s0, agent.id));
  /* First reply of the conversation, refusal or not: carries the disclaimer (CHAT-05) and counts as one use (D-13). */
  const isFirstTurn = messagesFor(s0, conversationId).length === 0;
  const bumpUsage = (edits: DemoState["agentEdits"]) =>
    isFirstTurn ? { ...edits, [agent.id]: { ...edits[agent.id], usageCount: agent.usageCount + 1 } } : edits;

  if (isWeakRetrieval(chunks)) {
    const reply = refusalReply(expertName, profileFor(s0, agent.ownerId).contactUrl || null, isFirstTurn ? disclaimerFor(agent.persona.category) : null);
    const messageId = uid("m");
    freshMessages.add(messageId);
    setState((s) => {
      const createdAt = nowIso();
      return {
        ...s,
        messages: [
          ...s.messages,
          { id: uid("m"), conversationId, role: "user", content: text, citations: [], feedback: null, costCents: null, createdAt },
          { id: messageId, conversationId, role: "assistant", content: reply, citations: [], feedback: null, costCents: 0, refusal: true, createdAt: new Date(Date.now() + 1).toISOString() },
        ],
        agentEdits: bumpUsage(s.agentEdits),
      };
    });
    return { ok: true, chargedCents: 0, grounded: false, messageId };
  }

  const refusal = precheck(s0, conversation.hirerId, "chat_message", agent.rateMultiplier);
  if (refusal) return refusal;

  const answer = cannedAnswer(agent, expertName, chunks, isFirstTurn, { fileName: conversation.fileName ?? null });
  const split = splitUsageCharge({ rawCents: costCentsFromUsage(CANNED_USAGE.chat_message), multiplier: agent.rateMultiplier });

  let charged = 0;
  const messageId = uid("m");
  freshMessages.add(messageId);
  setState((s) => {
    const hirerRow = debitRow(s, conversation.hirerId, split.hirerDebitCents, "chat_message", "conversation", conversationId, `${agent.persona.name} · 1 message`);
    charged = -hirerRow.amountCents;
    const rows: LedgerEntry[] = [hirerRow];
    const createdAt = nowIso();
    if (split.expertCreditCents > 0 && agent.ownerId !== conversation.hirerId) {
      const expertBalance = balanceOf(s, agent.ownerId) + split.expertCreditCents;
      rows.push({ id: uid("l"), identityId: agent.ownerId, kind: "earnings", amountCents: split.expertCreditCents, balanceAfter: expertBalance, purpose: null, refType: "conversation", refId: conversationId, note: `${conversation.title} · net`, createdAt });
    }
    rows.push({ id: uid("l"), identityId: null, kind: "platform_cost", amountCents: split.platformCostCents, balanceAfter: null, purpose: "chat_message", refType: "conversation", refId: conversationId, note: "Raw LLM cost", createdAt });
    if (split.platformMarginCents > 0) {
      rows.push({ id: uid("l"), identityId: null, kind: "platform_margin", amountCents: split.platformMarginCents, balanceAfter: null, purpose: "chat_message", refType: "conversation", refId: conversationId, note: "15% of margin", createdAt });
    }
    const userMsg: Message = { id: uid("m"), conversationId, role: "user", content: text, citations: [], feedback: null, costCents: null, createdAt };
    const botMsg: Message = {
      id: messageId, conversationId, role: "assistant", content: answer.content, citations: answer.citations, feedback: null,
      costCents: charged, createdAt: new Date(Date.now() + 1).toISOString(),
    };
    return { ...s, ledger: [...s.ledger, ...rows], messages: [...s.messages, userMsg, botMsg], agentEdits: bumpUsage(s.agentEdits) };
  });
  return { ok: true, chargedCents: charged, grounded: true, messageId };
}

export const sandboxConversationId = (agentId: string) => `sandbox:${agentId}`;

/** Test chat: same pipeline, charged to the builder at raw cost (SBOX-01). */
export async function sendSandboxMessage(agentId: string, text: string): Promise<{ ok: true; chargedCents: number } | Refusal> {
  const s0 = getSnapshot();
  const agent = agentById(s0, agentId);
  if (!agent) throw new Error("Agent not found");
  const builder = currentIdentity(s0).id;
  const refusal = precheck(s0, builder, "sandbox_message");
  if (refusal) return refusal;

  const conversationId = sandboxConversationId(agentId);
  const chunks = await searchKnowledge(agent, text, 4, interviewChunks(s0, agent.id));
  const answer = cannedAnswer(agent, displayName(s0, agent.ownerId), chunks, messagesFor(s0, conversationId).length === 0);
  const cost = toChargeCents(costCentsFromUsage(CANNED_USAGE.sandbox_message));

  let charged = 0;
  setState((s) => {
    const row = debitRow(s, builder, cost, "sandbox_message", "agent", agentId, `Sandbox · ${agent.persona.name}`);
    charged = -row.amountCents;
    const createdAt = nowIso();
    return {
      ...s,
      ledger: [...s.ledger, row],
      messages: [
        ...s.messages,
        { id: uid("m"), conversationId, role: "user", content: text, citations: [], feedback: null, costCents: null, createdAt },
        {
          id: uid("m"), conversationId, role: "assistant", content: answer.content, citations: answer.citations, feedback: null, costCents: charged,
          retrieved: chunks.map((c) => ({ sourceName: c.sourceName, score: c.score, page: c.page, question: c.question })),
          createdAt: new Date(Date.now() + 1).toISOString(),
        },
      ],
    };
  });
  return { ok: true, chargedCents: charged };
}

/** Interview answer: stored as a turn, charged at raw cost to the builder (INTV-06 mechanics). */
export function answerInterview(agentId: string, answer: string): { ok: true; chargedCents: number } | Refusal {
  const s0 = getSnapshot();
  const agent = agentById(s0, agentId);
  if (!agent) throw new Error("Agent not found");
  const builder = currentIdentity(s0).id;
  const refusal = precheck(s0, builder, "interview_turn");
  if (refusal) return refusal;
  const cost = toChargeCents(costCentsFromUsage(CANNED_USAGE.interview_turn));

  let charged = 0;
  setState((s) => {
    const pending = pendingInterviewQuestion(s, agentId);
    const turns = interviewTurnsFor(s, agentId);
    const row = debitRow(s, builder, cost, "interview_turn", "interview", agentId, `${agent.persona.name} · answer ${turns.filter((t) => t.answer).length + 1}`);
    charged = -row.amountCents;
    const knowledgeTouchedAt = { ...s.knowledgeTouchedAt, [agentId]: nowIso() };
    if (pending.turnId) {
      return { ...s, ledger: [...s.ledger, row], answeredTurns: { ...s.answeredTurns, [pending.turnId]: answer }, knowledgeTouchedAt };
    }
    const turn: InterviewTurn = { id: uid("t"), agentId, position: (turns.at(-1)?.position ?? 0) + 1, question: pending.question, answer, createdAt: nowIso() };
    return { ...s, ledger: [...s.ledger, row], interviewTurns: [...s.interviewTurns, turn], knowledgeTouchedAt };
  });
  return { ok: true, chargedCents: charged };
}

export function saveProfile(identityId: string, profile: Partial<Profile>) {
  setState((s) => ({ ...s, profileEdits: { ...s.profileEdits, [identityId]: { ...s.profileEdits[identityId], ...profile } } }));
}

export function updateAgent(agentId: string, patch: Partial<Agent>) {
  setState((s) => ({ ...s, agentEdits: { ...s.agentEdits, [agentId]: { ...s.agentEdits[agentId], ...patch, updatedAt: nowIso() } } }));
}

export function savePersona(agentId: string, persona: PersonaForm) {
  updateAgent(agentId, { persona });
}

// ------------------------------------------------------------------ publish (PUB-01..03)

export type PublishResult = { ok: true; status: AgentStatus } | { ok: false; blockers: string[] };

export function setRateMultiplier(agentId: string, multiplier: number) {
  updateAgent(agentId, { rateMultiplier: clampRate(multiplier) });
}

/** Instant publish once the gate passes and consent is accepted (Phase 3 D-05, D-07). */
export function publishAgent(agentId: string, opts: { acceptConsent?: boolean } = {}): PublishResult {
  const s0 = getSnapshot();
  const agent = agentById(s0, agentId);
  if (!agent) throw new Error("Agent not found");
  if (agent.ownerId !== currentIdentity(s0).id) return { ok: false, blockers: ["Only the owner can publish"] };
  const blockers = publishBlockers(agent.persona, knowledgeStats(s0, agentId).total);
  if (!agent.consentAcceptedAt && !opts.acceptConsent) blockers.push("Accept the content consent");
  if (blockers.length) return { ok: false, blockers };
  updateAgent(agentId, { status: "published", consentAcceptedAt: agent.consentAcceptedAt ?? nowIso() });
  return { ok: true, status: "published" };
}

/** Instant unpublish; open chats keep working (Phase 3 D-08). */
export function unpublishAgent(agentId: string): PublishResult {
  const s0 = getSnapshot();
  const agent = agentById(s0, agentId);
  if (!agent) throw new Error("Agent not found");
  if (agent.ownerId !== currentIdentity(s0).id) return { ok: false, blockers: ["Only the owner can unpublish"] };
  updateAgent(agentId, { status: "unpublished" });
  return { ok: true, status: "unpublished" };
}

export function createAgent(input: { name: string; category: Category }): string {
  const base = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "agent";
  const id = `${base}-${crypto.randomUUID().slice(0, 4)}`;
  setState((s) => {
    const owner = currentIdentity(s).id;
    const agent: Agent = {
      id, slug: id, ownerId: owner, icon: "bot",
      persona: { name: input.name, category: input.category, headline: "", description: "", howIWork: "", always: [], never: [], exampleQuestions: [], greeting: "" },
      systemPromptOverride: null, status: "draft", rateMultiplier: 1, consentAcceptedAt: null,
      ratingAvg: 0, ratingCount: 0, usageCount: 0, createdAt: nowIso(), updatedAt: nowIso(),
    };
    return { ...s, newAgents: [...s.newAgents, agent] };
  });
  return id;
}

export function resetDemo() {
  setState(() => ({ ...initialState(), identityId: getSnapshot().identityId }));
}
