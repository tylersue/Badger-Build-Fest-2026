"use client";

/**
 * Client-side demo state for the presentation MVP (no backend).
 * Seed data is read-only; everything the viewer does (switching identity,
 * adding credits, chatting, interviewing, editing) is stored as a delta in
 * localStorage so it survives reloads. The mechanics are real: a metered call
 * checks the wallet first and refuses when it doesn't fit (hard stop at zero,
 * D-10), and every balance change writes a ledger row.
 */
import { useSyncExternalStore } from "react";
import { AGENTS, CONVERSATIONS, IDENTITIES, INTERVIEW_TURNS, LEDGER, MARIA, MESSAGES, PROFILES } from "@/lib/data/seed";
import { PACK_GRANT_CENTS, SUBSCRIPTION_GRANT_CENTS, type MeteredPurpose } from "@/lib/config/credits";
import type { Category } from "@/lib/config/categories";
import { costCentsFromUsage, estimateCents, splitUsageCharge, toChargeCents } from "@/features/billing/pricing";
import { searchKnowledge } from "@/features/knowledge/legacy-search";
import { cannedAnswer, nextInterviewQuestion } from "@/features/runtime/agent";
import type { Agent, Conversation, Identity, InterviewTurn, LedgerEntry, Message, PersonaForm, Profile } from "@/lib/types";

const STORAGE_KEY = "bx-demo-v1";

export type DemoState = {
  v: 1;
  identityId: string;
  ledger: LedgerEntry[];
  profileEdits: Record<string, Partial<Profile>>;
  agentEdits: Record<string, Partial<Agent>>;
  newAgents: Agent[];
  conversations: Conversation[];
  messages: Message[];
  interviewTurns: InterviewTurn[];
  answeredTurns: Record<string, string>;
};

const initialState = (): DemoState => ({
  v: 1,
  identityId: MARIA,
  ledger: [],
  profileEdits: {},
  agentEdits: {},
  newAgents: [],
  conversations: [],
  messages: [],
  interviewTurns: [],
  answeredTurns: {},
});

let state: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed?.v === 1) return { ...initialState(), ...parsed };
    }
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
  return [...CONVERSATIONS, ...s.conversations];
}

export function messagesFor(s: DemoState, conversationId: string): Message[] {
  return [...MESSAGES, ...s.messages]
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

/** Canned model usage per call (placeholder until the real model runs in Phase 2). */
const CANNED_USAGE: Record<MeteredPurpose, Parameters<typeof costCentsFromUsage>[0]> = {
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

export async function sendChatMessage(conversationId: string, text: string): Promise<{ ok: true; chargedCents: number } | Refusal> {
  const s0 = getSnapshot();
  const conversation = allConversations(s0).find((c) => c.id === conversationId);
  const agent = conversation && agentById(s0, conversation.agentId);
  if (!conversation || !agent) throw new Error("Conversation not found");

  const refusal = precheck(s0, conversation.hirerId, "chat_message", agent.rateMultiplier);
  if (refusal) return refusal;

  const isFirstTurn = messagesFor(s0, conversationId).length === 0;
  const chunks = await searchKnowledge(agent, text);
  const answer = cannedAnswer(agent, displayName(s0, agent.ownerId), chunks, isFirstTurn);
  const split = splitUsageCharge({ rawCents: costCentsFromUsage(CANNED_USAGE.chat_message), multiplier: agent.rateMultiplier });

  let charged = 0;
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
      id: uid("m"), conversationId, role: "assistant", content: answer.content, citations: answer.citations, feedback: null,
      costCents: charged, createdAt: new Date(Date.now() + 1).toISOString(),
    };
    return { ...s, ledger: [...s.ledger, ...rows], messages: [...s.messages, userMsg, botMsg] };
  });
  return { ok: true, chargedCents: charged };
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
  const chunks = await searchKnowledge(agent, text);
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
    if (pending.turnId) {
      return { ...s, ledger: [...s.ledger, row], answeredTurns: { ...s.answeredTurns, [pending.turnId]: answer } };
    }
    const turn: InterviewTurn = { id: uid("t"), agentId, position: (turns.at(-1)?.position ?? 0) + 1, question: pending.question, answer, createdAt: nowIso() };
    return { ...s, ledger: [...s.ledger, row], interviewTurns: [...s.interviewTurns, turn] };
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
