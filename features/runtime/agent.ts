import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { EvidenceCitation, Operation, RetrievedChunk, RunAnswerInput, ServiceError, ServiceResult, ToolStep } from "@/lib/contracts/phase2";
import type { ChatStreamEvent } from "./events";
import type { PersonaForm } from "@/lib/types";
import type { Category } from "@/lib/config/categories";
import { PRICE_VERSION } from "@/features/billing/pricing";
import { reserveOperation, settleOperation } from "@/features/billing/service";
import { searchKnowledge, toCitations } from "@/features/knowledge/search";
import { assessSufficiency } from "./sufficiency";
import { researchWeb, type WebEvidence } from "./web";
import { meteredStructured } from "@/lib/llm/gateway";
import { modelForCategory } from "@/lib/config/models";
import { buildPrompt, validateCitations } from "./policy";
import { reviewGrounding } from "./grounding";
import { createPersonaService, createSqlPersonaStore } from "@/features/builder/persona";
import { requireServiceDb } from "@/lib/server/db";

type EventData = ChatStreamEvent extends infer E ? E extends { type: string } ? Omit<E, "eventId" | "operationId" | "sequence"> : never : never;
export type AnswerContext = { category: Category; persona: PersonaForm; customPrompt: string | null; firstTurn: boolean;
  attachment?: { name: string; content: string } | null;
  history?: { role: "user" | "assistant"; content: string }[] };
export interface AnswerStore {
  context(input: RunAnswerInput): Promise<ServiceResult<AnswerContext>>;
  replay(operationId: string): Promise<ChatStreamEvent[]>;
  recover(operationId: string): Promise<boolean>;
  begin(input: RunAnswerInput, operationId: string): Promise<ServiceResult<string>>;
  append(agentId: string, messageId: string, event: ChatStreamEvent): Promise<void>;
  finish(messageId: string, value: { text: string; citations: EvidenceCitation[]; retrieved: RetrievedChunk[];
    gap: string | null; steps: ToolStep[]; chargedUnits: string | null }): Promise<void>;
  wallet(actorId: string): Promise<{ balanceUnits: string; heldUnits: string }>;
}
export type AnswerDependencies = { store: AnswerStore; reserve: typeof reserveOperation; settle: typeof settleOperation;
  search: typeof searchKnowledge; assess: typeof assessSufficiency; web: typeof researchWeb; synthesize: typeof meteredStructured;
  review: typeof reviewGrounding };
export class AnswerFailure extends Error {
  constructor(readonly detail: ServiceError) { super(detail.message); this.name = "AnswerFailure"; }
}
const fail = (code: ServiceError["code"], message: string, operationId?: string): ServiceError =>
  ({ code, message, retryable: code === "provider" || code === "unknown_usage", operationId });
const unwrap = <T>(value: { data: T; error: unknown }): T => { if (value.error) throw new Error("Database request failed"); return value.data; };
const money = (value: unknown): string => {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new Error("Invalid stored money");
};

export function createSqlAnswerStore(): AnswerStore {
  const db = () => requireServiceDb();
  const rpc = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const client = db();
    const call = client.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    return unwrap(await call.call(client, name, args));
  };
  return {
    async context(input) {
      const [conversation, agent, prior, attachment, history] = await Promise.all([
        db().from("conversations").select("id,agent_id,hirer_id,mode").eq("id", input.conversationId).maybeSingle(),
        db().from("agents").select("id,owner_id,category,status").eq("id", input.agentId).is("deleted_at", null).maybeSingle(),
        db().from("messages").select("id").eq("conversation_id", input.conversationId).eq("role", "assistant").limit(1),
        db().from("conversation_attachments").select("name,content").eq("conversation_id", input.conversationId).maybeSingle(),
        db().from("messages").select("role,content").eq("conversation_id", input.conversationId)
          .order("created_at", { ascending: false }).limit(10),
      ]);
      if (conversation.error || agent.error || prior.error || attachment.error || history.error) throw new Error("Context lookup failed");
      const c = conversation.data, a = agent.data;
      if (!c || !a || c.agent_id !== input.agentId || c.hirer_id !== input.actorId || c.mode !== input.mode ||
        (input.mode === "sandbox" ? a.owner_id !== input.actorId || input.conversationId !== `sandbox:${input.agentId}` : false))
        return { ok: false, error: fail("not_owner", "Conversation is unavailable.") };
      const state = await createPersonaService(createSqlPersonaStore()).read(input.agentId);
      if (!state) return { ok: false, error: fail("not_owner", "Agent is unavailable.") };
      const persona = Object.fromEntries(Object.entries(state.fields).map(([key, field]) => [key, field.value])) as PersonaForm;
      return { ok: true, data: { category: a.category as Category, persona,
        customPrompt: state.promptMode === "custom" ? state.customPrompt : null, firstTurn: !(prior.data?.length),
        attachment: input.mode === "chat" ? attachment.data : null,
        history: input.mode === "chat" ? (history.data ?? []).reverse().map(item => ({
          role: item.role as "user" | "assistant", content: item.content.slice(0, 1000) })) : [] } };
    },
    async replay(operationId) {
      const rows = unwrap(await db().from("message_events").select("payload").eq("operation_id", operationId).order("sequence"));
      return (rows ?? []).map(row => row.payload as ChatStreamEvent);
    },
    async recover(operationId) {
      return (await rpc("recover_answer_operation", { p_operation_id: operationId })) === true;
    },
    async begin(input, operationId) {
      const answerId = `msg_${crypto.randomUUID()}`;
      const rows = [
        { id: `msg_${crypto.randomUUID()}`, agent_id: input.agentId, conversation_id: input.conversationId,
          operation_id: operationId, role: "user", content: input.text, origin: "live" },
        { id: answerId, agent_id: input.agentId, conversation_id: input.conversationId,
          operation_id: operationId, role: "assistant", content: "", origin: "live" },
      ];
      const result = await db().from("messages").insert(rows);
      if (result.error) return { ok: false, error: fail(result.error.code === "23505" ? "conflict" : "provider", "Answer could not be started.", operationId) };
      return { ok: true, data: answerId };
    },
    async append(agentId, messageId, event) {
      await rpc("append_answer_event", { p_agent_id: agentId, p_message_id: messageId, p_event: event });
    },
    async finish(messageId, value) {
      await rpc("finish_answer_message", { p_message_id: messageId, p_value: value });
    },
    async wallet(actorId) {
      const row = unwrap(await db().from("wallets").select("balance_units,held_units").eq("identity_id", actorId).single());
      if (!row) throw new Error("Wallet unavailable");
      return { balanceUnits: money(row.balance_units), heldUnits: money(row.held_units) };
    },
  };
}

const answerSchema = z.object({ text: z.string().min(1).max(12000), citationIds: z.array(z.string()).max(20) });
export const UNKNOWN_ANSWER = "I don't have enough verified information to answer that yet.";
const defaultDeps = (): AnswerDependencies => ({ store: createSqlAnswerStore(), reserve: reserveOperation,
  settle: settleOperation, search: searchKnowledge, assess: assessSufficiency, web: researchWeb, synthesize: meteredStructured,
  review: reviewGrounding });

/** Persist-before-emit producer continues settlement even if the client disconnects. */
export async function* runAnswer(input: RunAnswerInput, supplied?: Partial<AnswerDependencies>): AsyncIterable<ChatStreamEvent> {
  const deps = { ...defaultDeps(), ...supplied };
  const queue: ChatStreamEvent[] = [];
  let wake: (() => void) | undefined;
  let finished = false;
  let terminalError: AnswerFailure | null = null;
  const push = (event: ChatStreamEvent) => { queue.push(event); wake?.(); wake = undefined; };
  const run = async () => {
    if (!input.agentId || !input.actorId || !input.conversationId || !input.requestKey || input.requestKey.length > 200 ||
      !input.text?.trim() || input.text.length > 4000 || !["sandbox", "chat"].includes(input.mode))
      throw new AnswerFailure(fail("invalid_input", "Invalid answer request."));
    let operation: Operation | null = null, messageId: string | null = null;
    let seq = 0, text = "", gap: string | null = null;
    let citations: EvidenceCitation[] = [], retrieved: RetrievedChunk[] = [];
    const steps = new Map<string, ToolStep>();
    const emit = async (data: EventData) => {
      if (!operation || !messageId) return;
      const event = { ...data, operationId: operation.id, eventId: `evt_${crypto.randomUUID()}`, sequence: seq++ } as ChatStreamEvent;
      await deps.store.append(input.agentId, messageId, event);
      push(event);
    };
    try {
      const context = await deps.store.context(input);
      if (!context.ok) throw new AnswerFailure(context.error);
      const payloadHash = createHash("sha256").update(JSON.stringify([input.agentId, input.actorId, input.conversationId, input.text, input.mode])).digest("hex");
      const reserved = await deps.reserve({ identityId: input.actorId, agentId: input.agentId, purpose: input.mode,
        requestKey: input.requestKey, payloadHash, estimateUnits: BigInt("20000000"),
        maxUnits: BigInt("1000000000"), priceVersion: PRICE_VERSION });
      if (!reserved.ok) throw new AnswerFailure(reserved.error);
      operation = reserved.data;
      let replay = await deps.store.replay(operation.id);
      if (replay.length || (Number.isFinite(Date.parse(operation.createdAt)) &&
        Date.now() - Date.parse(operation.createdAt) >= 300_000)) {
        if (!replay.some(event => event.type === "done")) {
          await deps.store.recover(operation.id);
          replay = await deps.store.replay(operation.id);
        }
        if (replay.length) { replay.forEach(push); return; }
      }
      const begun = await deps.store.begin(input, operation.id);
      if (!begun.ok) throw new AnswerFailure(begun.error);
      messageId = begun.data;
      await emit({ type: "operation-start", operation });
      const found = await deps.search({ agentId: input.agentId, query: input.text, operation });
      if (!found.ok) throw found.error;
      retrieved = found.data;
      await emit({ type: "sources", chunks: retrieved });
      const assessed = await deps.assess({ question: input.text, chunks: retrieved, operation });
      if (!assessed.ok) throw assessed.error;
      const expert = retrieved.filter(c => assessed.data.supportedIds.includes(c.id));
      const missing = assessed.data.missingParts;
      if (missing.length) { gap = `Expert material does not cover: ${missing.join("; ")}.`; await emit({ type: "knowledge-gap", message: gap }); }
      let web: WebEvidence[] = [];
      if (missing.length) {
        const researched = await deps.web({ operation, missingParts: missing }, async (kind, step) => {
          steps.set(step.id, step); await emit({ type: kind, step });
        });
        if (researched.ok) web = researched.data.evidence;
        else if (researched.error.code === "unknown_usage") throw researched.error;
      }
      const allowed = [...toCitations(expert), ...web.map(item => item.citation)];
      if (!allowed.length) text = UNKNOWN_ANSWER;
      else {
        const prompt = buildPrompt({ question: input.text, persona: context.data.persona,
          customPrompt: context.data.customPrompt, category: context.data.category,
          expert, web, gap, firstTurn: context.data.firstTurn, attachment: context.data.attachment,
          history: context.data.history });
        const result = await deps.synthesize({ operation, stageKey: "answer:synthesis", model: modelForCategory(context.data.category),
          instructions: prompt.instructions, input: prompt.prompt, schema: answerSchema,
          limits: { maxInputChars: 100000, maxHistoryMessages: 10, maxOutputTokens: 1600,
            timeoutMs: 30000, maxContextTokens: 120000, maxContinuations: 0 } }, { settle: false });
        if (!result.ok) throw result.error;
        const output = result.data.value;
        const valid = validateCitations(output.citationIds, allowed);
        const inlineIds = [...output.text.matchAll(/\[(?:expert|web):[^\]\s]+\]/g)].map(match => match[0].slice(1, -1));
        if (!valid?.length || output.citationIds.some(id => !output.text.includes(`[${id}]`)) ||
          inlineIds.some(id => !valid.some(citation => citation.evidenceId === id))) text = UNKNOWN_ANSWER;
        else {
          const review = await deps.review({ operation, question: input.text, answer: output.text, citations: valid,
            expert, web, attachment: context.data.attachment });
          if (!review.ok) throw review.error;
          if (review.data.supported) { text = output.text; citations = valid; }
          else text = UNKNOWN_ANSWER;
        }
      }
      if (text) await emit({ type: "text-delta", delta: text });
      if (citations.length) await emit({ type: "citations", citations });
    } catch (error) {
      const detail = error instanceof AnswerFailure ? error.detail : error && typeof error === "object" && "code" in error ? error as ServiceError
        : fail("provider", "Answer could not be completed.", operation?.id);
      if (messageId) await emit({ type: "error", error: detail });
      else throw new AnswerFailure(detail);
    } finally {
      if (operation && messageId) {
        try {
          const settled = await deps.settle(operation.id);
          const wallet = await deps.store.wallet(input.actorId);
          const charged = settled.ok && settled.data.state === "settled" ? settled.data.actualUnits : null;
          await deps.store.finish(messageId, { text, citations, retrieved, gap, steps: [...steps.values()], chargedUnits: charged });
          await emit({ type: "cost", status: charged === null ? "pending" : "settled", estimateUnits: operation.estimateUnits,
            chargedUnits: charged, balanceUnits: wallet.balanceUnits, heldUnits: wallet.heldUnits });
          await emit({ type: "done", messageId });
        } catch { /* Durable partial events and unknown holds remain for reconciliation. */ }
      }
    }
  };
  void run().catch(error => { terminalError = error instanceof AnswerFailure ? error :
    new AnswerFailure(fail("provider", "Answer could not be completed.")); }).finally(() => { finished = true; wake?.(); });
  try { while (!finished || queue.length) {
    if (queue.length) yield queue.shift()!;
    else await new Promise<void>(resolve => { wake = resolve; });
  }
  if (terminalError) throw terminalError;
  } finally { /* A disconnect does not cancel a dispatched provider operation. */ }
}
