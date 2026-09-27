"use client";

import { useSyncExternalStore } from "react";
import { IDENTITIES, INTERVIEW_TURNS, MARIA, PROFILES } from "@/lib/data/seed";
import type { Category } from "@/lib/config/categories";
import type { Agent, Conversation, Identity, InterviewTurn, LedgerEntry, Message, PersonaForm, Profile } from "@/lib/types";
import type { DemoSnapshot } from "@/lib/server/demo";
import type { InterviewView } from "@/features/builder/interview";
import { api, ApiClientError, newRequestKey, streamChat, streamSandbox } from "./api-client";
import type { ChatStreamEvent } from "@/features/runtime/events";

const STORAGE_KEY = "bx-demo-bridge-v2";
const LEGACY_KEY = "bx-demo-v1";
type DraftKind = "interview" | "interview-control" | "grant" | "persona" | "source" | "sandbox" | "profile" | "chat";
type Draft = { value: string; requestKey: string; dirty: true; operationId?: string };
type Drafts = Record<string, Draft>;
export type DemoState = { v: 2; identityId: string; snapshot: DemoSnapshot | null;
  drafts: Drafts; interviews: Record<string, InterviewView>; status: "loading" | "ready" | "error";
  error: string | null };
const initialState = (): DemoState => ({ v: 2, identityId: MARIA, snapshot: null, drafts: {},
  interviews: {}, status: "loading", error: null });
const serverFallback = initialState();
let state: DemoState | null = null;
let started = false;
let generation = 0;
let identityQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const draftKey = (kind: DraftKind, ownerId: string) => `${kind}:${ownerId}`;
function selectServerIdentity(identityId: string): Promise<void> {
  identityQueue = identityQueue.catch(() => undefined).then(async () => { await api.identity(identityId); });
  return identityQueue;
}

function load(): DemoState {
  if (typeof window === "undefined") return serverFallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      if (parsed.v === 2) return { ...initialState(), identityId: parsed.identityId === "sam" ? "sam" : MARIA,
        drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {} };
    }
  } catch { /* In-memory drafts still work when storage is unavailable. */ }
  return initialState();
}
function getSnapshot(): DemoState {
  if (typeof window === "undefined") return serverFallback;
  if (!state) state = load();
  return state;
}
export const readDemoState = (): DemoState => getSnapshot();
function setState(update: (current: DemoState) => DemoState) {
  state = update(getSnapshot());
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, identityId: state.identityId, drafts: state.drafts })); }
  catch { /* Keep in memory. */ }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started && typeof window !== "undefined") {
    started = true;
    queueMicrotask(() => void refreshDemo(true).catch(() => undefined));
  }
  return () => listeners.delete(listener);
}
export function useDemoSnapshot(): DemoState | null { return useSyncExternalStore(subscribe, getSnapshot, () => null); }
export function useDemo(): DemoState { return useSyncExternalStore(subscribe, getSnapshot, () => serverFallback); }

/** An earlier identity response cannot replace the currently selected wallet. */
export async function refreshDemo(syncIdentity = false): Promise<DemoSnapshot> {
  const expected = getSnapshot().identityId;
  const ticket = ++generation;
  try {
    if (syncIdentity) await selectServerIdentity(expected);
    if (ticket !== generation) throw new Error("Identity selection changed.");
    const snapshot = await api.snapshot();
    if (ticket === generation && snapshot.identityId === expected)
      setState(s => ({ ...s, snapshot, status: "ready", error: null }));
    return snapshot;
  } catch (error) {
    if (ticket === generation) setState(s => ({ ...s, status: "error", error: error instanceof Error ? error.message : "Server unavailable." }));
    throw error;
  }
}
const live = (s: DemoState) => s.snapshot?.identityId === s.identityId ? s.snapshot : null;
function requireLive(): DemoSnapshot {
  const snapshot = live(getSnapshot());
  if (!snapshot) throw new ApiClientError({ code: "configuration", message: getSnapshot().error ?? "Live services are unavailable. Check server configuration and retry.", retryable: true }, 503);
  return snapshot;
}
const cents = (units: string) => Number(BigInt(units)) / 10_000_000;
export const availableWalletUnits = (s: DemoState) => {
  const wallet = live(s)?.wallet;
  return wallet ? (BigInt(wallet.balanceUnits) - BigInt(wallet.heldUnits)).toString() : "0";
};
export const heldWalletUnits = (s: DemoState) => live(s)?.wallet.heldUnits ?? "0";
export const walletStatus = (s: DemoState) => ({ balanceUnits: live(s)?.wallet.balanceUnits ?? "0",
  heldUnits: heldWalletUnits(s), availableUnits: availableWalletUnits(s) });

export function getDraft(kind: DraftKind, ownerId: string): Draft | null { return getSnapshot().drafts[draftKey(kind, ownerId)] ?? null; }
export function saveDraft(kind: DraftKind, ownerId: string, value: string, requestKey?: string): Draft {
  const key = draftKey(kind, ownerId);
  const prior = getSnapshot().drafts[key];
  const sameValue = prior?.value === value;
  const draft = { value, requestKey: requestKey ?? (sameValue ? prior.requestKey : newRequestKey()),
    dirty: true as const, operationId: sameValue ? prior.operationId : undefined };
  setState(s => ({ ...s, drafts: { ...s.drafts, [key]: draft } }));
  return draft;
}
export function clearDraft(kind: DraftKind, ownerId: string, acknowledged?: Draft) {
  const key = draftKey(kind, ownerId);
  setState(s => {
    if (acknowledged && s.drafts[key] !== acknowledged) return s;
    const drafts = { ...s.drafts }; delete drafts[key]; return { ...s, drafts };
  });
}
function recordDraftOperation(conversationId: string, draft: Draft, operationId: string): Draft {
  const updated = { ...draft, operationId };
  const key = draftKey("chat", conversationId);
  setState(s => s.drafts[key]?.requestKey === draft.requestKey
    ? { ...s, drafts: { ...s.drafts, [key]: updated } } : s);
  return updated;
}

export const switchableIdentities = (): Identity[] => IDENTITIES.filter(i => i.isSwitchable);
export function identityById(id: string): Identity { return IDENTITIES.find(i => i.id === id) ?? IDENTITIES[0]; }
export function currentIdentity(s: DemoState): Identity { return (live(s)?.identities ?? IDENTITIES).find(i => i.id === s.identityId && i.isSwitchable) ?? IDENTITIES[0]; }
export function profileFor(s: DemoState, identityId: string): Profile {
  return live(s)?.profiles.find(p => p.identityId === identityId) ?? PROFILES.find(p => p.identityId === identityId) ??
    { identityId, displayName: identityById(identityId).displayName, field: "", credentials: "", yearsExperience: null,
      contactUrl: "", bio: "", location: "" };
}
export function displayName(s: DemoState, identityId: string): string { return profileFor(s, identityId).displayName || identityById(identityId).displayName; }
export function allAgents(s: DemoState): Agent[] { return live(s)?.agents ?? []; }
export function agentById(s: DemoState, id: string): Agent | undefined { return allAgents(s).find(a => a.id === id || a.slug === id); }
export function ledgerFor(s: DemoState, identityId: string): LedgerEntry[] { return live(s)?.ledger.filter(r => r.identityId === identityId) ?? []; }
export function allLedger(s: DemoState): LedgerEntry[] { return live(s)?.ledger ?? []; }
export function balanceOf(s: DemoState, identityId: string): number {
  const snapshot = live(s);
  return identityId === s.identityId && snapshot ? cents(snapshot.wallet.balanceUnits) : 0;
}
export function allConversations(s: DemoState): Conversation[] { return live(s)?.conversations ?? []; }
export function messagesFor(s: DemoState, conversationId: string): Message[] {
  return (live(s)?.messages ?? []).filter(m => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function conversationStats(s: DemoState, conversationId: string) {
  const messages = messagesFor(s, conversationId);
  return { messageCount: messages.length, spentCents: messages.reduce((sum, m) => sum + (m.role === "assistant" ? m.costCents ?? 0 : 0), 0),
    lastMessageAt: messages.at(-1)?.createdAt ?? null };
}
export function interviewTurnsFor(s: DemoState, agentId: string): InterviewTurn[] {
  return (live(s)?.interviewTurns ?? []).filter(t => t.agentId === agentId).sort((a, b) => a.position - b.position);
}
export type KnowledgeStats = { answers: number; docChunks: number; total: number; lastUpdatedAt: string };
export function knowledgeStats(s: DemoState, agentId: string): KnowledgeStats {
  const answers = interviewTurnsFor(s, agentId).filter(turn => turn.answer !== null).length;
  const sources = (live(s)?.sources ?? []).filter(source => source.agentId === agentId && source.status === "ready" && source.kind !== "interview");
  const docChunks = sources.reduce((sum, source) => sum + source.chunkCount, 0);
  return { answers, docChunks, total: answers + docChunks,
    lastUpdatedAt: sources.map(source => source.createdAt).sort().at(-1) ?? agentById(s, agentId)?.updatedAt ?? new Date(0).toISOString() };
}
export function pendingInterviewQuestion(s: DemoState, agentId: string): { turnId: string | null; question: string } {
  const pending = s.interviews[agentId]?.pendingQuestion;
  if (pending) return { turnId: pending.id, question: pending.text };
  const open = interviewTurnsFor(s, agentId).find(t => t.answer === null);
  return open ? { turnId: open.id, question: open.question } : { turnId: null, question: "Start the interview to get your next question." };
}
export type Refusal = { ok: false; reason: "insufficient_credits"; neededCents: number; availableCents: number };
function creditRefusal(error: unknown): Refusal | null {
  if (!(error instanceof ApiClientError) || error.detail.code !== "insufficient_credits") return null;
  return { ok: false, reason: "insufficient_credits", neededCents: cents(error.detail.neededUnits ?? "0"),
    availableCents: cents(error.detail.availableUnits ?? "0") };
}

export function switchIdentity(identityId: string): Identity | null {
  const target = switchableIdentities().find(i => i.id === identityId);
  if (!target) return null;
  generation++;
  setState(s => ({ ...s, identityId, snapshot: null, interviews: {}, status: "loading", error: null }));
  void refreshDemo(true).catch(error => {
    setState(s => s.identityId === identityId ? { ...s, status: "error", error: error instanceof Error ? error.message : "Identity switch failed." } : s);
  });
  return target;
}
export async function addCredits(kind: "subscription" | "pack"): Promise<{ grantedCents: number; balanceCents: number }> {
  const snapshot = requireLive();
  const draft = saveDraft("grant", snapshot.identityId, kind);
  const result = await api.grant(kind, draft.requestKey);
  clearDraft("grant", snapshot.identityId, draft);
  await refreshDemo();
  return { grantedCents: cents(result.grantUnits), balanceCents: cents(result.balanceUnits) };
}
export const sandboxConversationId = (agentId: string) => `sandbox:${agentId}`;
export async function sendSandboxMessage(agentId: string, text: string): Promise<{ ok: true; chargedCents: number } | Refusal> {
  requireLive();
  const draft = saveDraft("sandbox", agentId, text);
  let chargedUnits: string | null = null; let done = false;
  try {
    for await (const event of streamSandbox(agentId, text, draft.requestKey)) {
      if (event.type === "cost") chargedUnits = event.chargedUnits;
      if (event.type === "done") done = true;
    }
    if (!done) throw new ApiClientError({ code: "provider", message: "Answer is still running. Replay the operation before sending again.", retryable: true }, 0);
    await refreshDemo(); clearDraft("sandbox", agentId, draft);
    return { ok: true, chargedCents: chargedUnits ? cents(chargedUnits) : 0 };
  } catch (error) { const refusal = creditRefusal(error); if (refusal) return refusal; throw error; }
}
export async function readInterview(agentId: string): Promise<InterviewView> {
  requireLive();
  const view = await api.interview(agentId);
  setState(s => ({ ...s, interviews: { ...s.interviews, [agentId]: view } }));
  return view;
}
export async function controlInterview(agentId: string, action: "start" | "pause" | "resume" | "skip" | "continue" | "dismiss-ready", requestKey?: string): Promise<InterviewView> {
  requireLive();
  const draft = saveDraft("interview-control", agentId, action, requestKey);
  const view = await api.interviewControl(agentId, action, draft.requestKey);
  clearDraft("interview-control", agentId, draft);
  setState(s => ({ ...s, interviews: { ...s.interviews, [agentId]: view } }));
  await refreshDemo(); return view;
}
export async function answerInterview(agentId: string, answer: string): Promise<{ ok: true; chargedCents: number } | Refusal> {
  requireLive();
  const draft = saveDraft("interview", agentId, answer);
  try {
    let view = getSnapshot().interviews[agentId] ?? await readInterview(agentId);
    if (!view.pendingQuestion) {
      if (view.answers.length === 0) view = await controlInterview(agentId, "start");
      else {
        if (view.state === "paused") view = await controlInterview(agentId, "resume");
        if (!view.pendingQuestion) view = await controlInterview(agentId, "continue");
      }
    }
    if (!view.pendingQuestion) throw new ApiClientError({ code: "conflict", message: "No interview question is open.", retryable: true }, 409);
    const result = await api.interviewSubmit(agentId, { questionId: view.pendingQuestion.id, text: answer,
      expectedVersion: view.version }, draft.requestKey);
    setState(s => ({ ...s, interviews: { ...s.interviews, [agentId]: result } }));
    await refreshDemo(); clearDraft("interview", agentId, draft);
    return { ok: true, chargedCents: 0 };
  } catch (error) { const refusal = creditRefusal(error); if (refusal) return refusal; throw error; }
}
export async function saveProfile(identityId: string, profile: Partial<Profile>): Promise<void> {
  const snapshot = requireLive();
  if (snapshot.identityId !== identityId) throw new Error("Profile is unavailable.");
  const draft = saveDraft("profile", identityId, JSON.stringify(profile));
  const { identityId: _id, origin: _origin, ...patch } = profile;
  void _id; void _origin;
  await api.saveProfile(patch, snapshot.backend.profileVersion);
  await refreshDemo(); clearDraft("profile", identityId, draft);
}
export async function savePersona(agentId: string, persona: PersonaForm): Promise<void> {
  const snapshot = requireLive();
  const current = snapshot.backend.personaStates[agentId];
  if (!current) throw new Error("Persona is unavailable.");
  const draft = saveDraft("persona", agentId, JSON.stringify(persona));
  const expectedVersions = Object.fromEntries(Object.entries(persona).map(([name]) => [name, current.fields[name as keyof PersonaForm]?.version ?? 0]));
  await api.savePersona(agentId, persona, expectedVersions);
  await refreshDemo(); clearDraft("persona", agentId, draft);
}
export async function createAgent(input: { name: string; category: Category }): Promise<string> {
  requireLive();
  const agent = await api.createAgent(input.name, input.category);
  await refreshDemo(); return agent.id;
}
export async function resetDemo(): Promise<void> {
  requireLive();
  const snapshot = await api.reset();
  setState(s => ({ ...s, snapshot, drafts: {}, interviews: {}, status: "ready", error: null }));
}

/** Legacy money rows are excluded. Original v1 data stays until every record is acknowledged. */
export async function importLegacyDrafts(): Promise<{ imported: number; remaining: number }> {
  requireLive();
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return { imported: 0, remaining: 0 };
  const legacy = JSON.parse(raw) as { profileEdits?: Record<string, Partial<Profile>>;
    agentEdits?: Record<string, Partial<Agent>>; answeredTurns?: Record<string, string>;
    newAgents?: Agent[]; messages?: Message[] };
  const records: unknown[] = [];
  const identityId = getSnapshot().identityId;
  if (legacy.profileEdits?.[identityId]) {
    const { identityId: _id, origin: _origin, ...patch } = legacy.profileEdits[identityId];
    void _id; void _origin;
    records.push({ key: `profile:${identityId}`, kind: "profile", patch });
  }
  for (const [agentId, edit] of Object.entries(legacy.agentEdits ?? {})) if (edit.persona)
    records.push({ key: `persona:${agentId}`, kind: "persona", agentId, patch: edit.persona });
  for (const [turnId, answer] of Object.entries(legacy.answeredTurns ?? {})) {
    const turn = INTERVIEW_TURNS.find(t => t.id === turnId);
    if (turn && answer.trim()) records.push({ key: `answer:${turnId}`, kind: "answer", agentId: turn.agentId, question: turn.question, text: answer });
  }
  const unhandled = (legacy.newAgents?.length ?? 0) + (legacy.messages?.length ?? 0) +
    Object.keys(legacy.profileEdits ?? {}).filter(id => id !== identityId).length +
    Object.values(legacy.agentEdits ?? {}).filter(edit => edit.systemPromptOverride !== undefined).length;
  if (!records.length) return { imported: 0, remaining: unhandled };
  const result = await api.importLegacy(records);
  const imported = result.results.filter(item => item.ok).length;
  if (imported === records.length && unhandled === 0) window.localStorage.removeItem(LEGACY_KEY);
  if (imported) await refreshDemo();
  return { imported, remaining: records.length - imported + unhandled };
}

const freshMessages = new Set<string>();
export const isFreshMessage = (messageId: string) => freshMessages.has(messageId);
export const markStreamed = (messageId: string) => { freshMessages.delete(messageId); };

export async function startConversation(agentId: string, title: string): Promise<string> {
  requireLive();
  const conversation = await api.createConversation(agentId, title);
  await refreshDemo();
  return conversation.id;
}

export async function sendChatMessage(conversationId: string, text: string, onEvent?: (event: ChatStreamEvent) => void): Promise<{ ok: true; chargedCents: number; messageId: string } | Refusal> {
  const snapshot = requireLive();
  const conversation = snapshot.conversations.find(item => item.id === conversationId && item.hirerId === snapshot.identityId);
  if (!conversation) throw new ApiClientError({ code: "not_owner", message: "Conversation is unavailable.", retryable: false }, 404);
  let draft = saveDraft("chat", conversationId, text);
  let chargedUnits: string | null = null;
  let messageId: string | null = null;
  let operationId: string | null = draft.operationId ?? null;
  try {
    if (!operationId) {
      for await (const event of streamChat(conversationId, text, draft.requestKey)) {
        onEvent?.(event);
        operationId = event.operationId;
        if (draft.operationId !== operationId) draft = recordDraftOperation(conversationId, draft, operationId);
        if (event.type === "cost") chargedUnits = event.chargedUnits;
        if (event.type === "done") messageId = event.messageId;
      }
    }
    if (!messageId && operationId) {
      const replay = await api.chatReplay(conversationId, operationId);
      replay.events.forEach(event => onEvent?.(event));
      const cost = replay.events.findLast(event => event.type === "cost");
      const done = replay.events.findLast(event => event.type === "done");
      if (cost?.type === "cost") chargedUnits = cost.chargedUnits;
      if (done?.type === "done") messageId = done.messageId;
    }
    if (!messageId) throw new ApiClientError({ code: "provider", message: "Answer is still running. Retry the saved message to replay it.", retryable: true, operationId: operationId ?? undefined }, 0);
    await refreshDemo(); clearDraft("chat", conversationId, draft);
    freshMessages.add(messageId);
    return { ok: true, chargedCents: chargedUnits ? cents(chargedUnits) : 0, messageId };
  } catch (error) { const refusal = creditRefusal(error); if (refusal) return refusal; throw error; }
}

export async function setRateMultiplier(agentId: string, multiplier: number): Promise<void> {
  requireLive();
  await api.rate(agentId, multiplier);
  await refreshDemo();
}
export async function publishAgent(agentId: string, opts: { acceptConsent?: boolean } = {}): Promise<void> {
  requireLive();
  await api.publish(agentId, true, opts.acceptConsent ?? false);
  await refreshDemo();
}
export async function unpublishAgent(agentId: string): Promise<void> {
  requireLive();
  await api.publish(agentId, false);
  await refreshDemo();
}
