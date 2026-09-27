"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { BuilderSplit } from "@/components/app/builder";
import { AssistantMessage, Composer, NotEnoughCredits, RetrievedSources, StreamCostCaption, UserMessage } from "@/components/app/chat";
import { ToolSteps } from "@/components/app/tool-steps";
import { EmptyState, PageHeader } from "@/components/app/ui";
import { api, apiRequest, ApiClientError, streamSandbox } from "@/lib/api-client";
import { clearDraft, getDraft, refreshDemo, saveDraft, useDemo } from "@/lib/demo-store";
import type { Agent } from "@/lib/types";
import type { EvidenceCitation, Operation, RetrievedChunk, ToolStep } from "@/lib/contracts/phase2";
import { formatCreditUnits } from "@/lib/format";
import { emptyAnswer, reduceAnswer, replayAnswer, type AnswerState } from "./chat-state";

type StoredMessage = { id: string; role: "user" | "assistant"; content: string; operationId: string | null;
  citations: EvidenceCitation[]; sources: RetrievedChunk[]; gap: string | null; steps: ToolStep[];
  chargedUnits: string | null; createdAt: string };

function parseMessage(value: unknown): StoredMessage | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || (row.role !== "user" && row.role !== "assistant")) return null;
  const retrieved = row.retrieved && typeof row.retrieved === "object" && !Array.isArray(row.retrieved)
    ? row.retrieved as Record<string, unknown> : {};
  return { id: row.id, role: row.role, content: typeof row.content === "string" ? row.content : "",
    operationId: typeof row.operation_id === "string" ? row.operation_id : null,
    citations: Array.isArray(row.citations) ? row.citations as EvidenceCitation[] : [],
    sources: Array.isArray(retrieved.chunks) ? retrieved.chunks as RetrievedChunk[] : [],
    gap: typeof retrieved.gap === "string" ? retrieved.gap : null,
    steps: Array.isArray(row.tool_steps) ? row.tool_steps as ToolStep[] : [],
    chargedUnits: typeof row.charged_units === "string" ? row.charged_units : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "" };
}

type OperationPoll = { operation: Operation };
const terminal = new Set(["settled", "failed", "cancelled", "completed"]);
const errorText = (error: unknown) => error instanceof Error ? error.message : "The reply stopped before finishing. Your message is still here.";

export function SandboxView({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const demo = useDemo();
  const [rows, setRows] = useState<StoredMessage[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [draft, setDraft] = useState(() => getDraft("sandbox", agent.id)?.value ?? "");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<{ needed: number; available: number } | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const identityId = demo.identityId;

  const loadTranscript = useCallback(async (ticket = generation.current) => {
    const response = await api.sandboxTranscript(agent.id);
    const parsed = response.messages.map(parseMessage).filter((row): row is StoredMessage => row !== null);
    if (ticket === generation.current) setRows(parsed.slice(-100));
    return parsed;
  }, [agent.id]);

  const replay = useCallback(async (id: string) => {
    const { events } = await api.sandboxReplay(agent.id, id);
    setAnswers(previous => ({ ...previous, [id]: replayAnswer(events, previous[id] ?? emptyAnswer()) }));
    return replayAnswer(events);
  }, [agent.id]);

  const checkOperation = useCallback(async (id: string) => {
    const result = await apiRequest<OperationPoll>(`/api/operations/${encodeURIComponent(id)}`);
    if (result.operation.agentId !== agent.id || result.operation.identityId !== identityId)
      throw new Error("Operation is unavailable for this sandbox.");
    await replay(id);
    if (terminal.has(result.operation.state)) {
      await loadTranscript();
      setRecovering(false);
      setPendingText(null);
      return true;
    }
    setRecovering(true);
    return false;
  }, [agent.id, identityId, loadTranscript, replay]);

  useEffect(() => {
    const generationRef = generation;
    const ticket = ++generationRef.current;
    queueMicrotask(() => { if (ticket === generation.current) {
      setRows([]); setAnswers({}); setPendingText(null); setOperationId(null); setError(null);
      setDraft(getDraft("sandbox", agent.id)?.value ?? "");
    } });
    if (!isOwner || demo.status !== "ready") return;
    void loadTranscript().then(async transcript => {
      if (ticket !== generation.current) return;
      const saved = getDraft("sandbox", agent.id);
      if (!saved) return;
      const matching = [...transcript].reverse().find(row => row.role === "user" && row.content === saved.value && row.operationId);
      if (matching?.operationId) {
        setOperationId(matching.operationId);
        await checkOperation(matching.operationId);
      } else setError("Your previous request has an unknown outcome. Check the saved draft and retry explicitly with the same request key.");
    }).catch(cause => { if (ticket === generation.current) setError(errorText(cause)); });
    return () => { if (generationRef.current === ticket) generationRef.current++; };
  }, [agent.id, identityId, isOwner, demo.status, loadTranscript, checkOperation]);

  useEffect(() => {
    if (!recovering || !operationId) return;
    const timer = window.setInterval(() => void checkOperation(operationId).catch(cause => setError(errorText(cause))), 2500);
    return () => window.clearInterval(timer);
  }, [recovering, operationId, checkOperation]);

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [rows, answers, pendingText, atBottom]);

  const updateDraft = (value: string) => {
    setDraft(value);
    if (value) saveDraft("sandbox", agent.id, value);
    else clearDraft("sandbox", agent.id);
  };

  const send = async (text: string): Promise<boolean> => {
    if (busy || recovering || demo.status !== "ready" || !isOwner) return false;
    setBusy(true); setError(null); setRefusal(null); setResetAt(null); setPendingText(text);
    const saved = saveDraft("sandbox", agent.id, text);
    let id: string | null = null; let finished = false;
    try {
      for await (const event of streamSandbox(agent.id, text, saved.requestKey)) {
        id = event.operationId;
        setOperationId(id);
        setAnswers(previous => ({ ...previous, [event.operationId]: reduceAnswer(previous[event.operationId] ?? emptyAnswer(), event) }));
        if (event.type === "done") finished = true;
      }
      if (!finished) throw new Error("The reply stopped before finishing. Your message is still here.");
      await loadTranscript();
      await refreshDemo().catch(() => undefined);
      setPendingText(null); setOperationId(null);
      clearDraft("sandbox", agent.id, saved);
      return true;
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        if (cause.detail.code === "insufficient_credits") setRefusal({ needed: Number(BigInt(cause.detail.neededUnits ?? "0")) / 10_000_000,
          available: Number(BigInt(cause.detail.availableUnits ?? "0")) / 10_000_000 });
        if (cause.detail.code === "daily_cap") setResetAt(cause.detail.resetAt ?? null);
      }
      setError(errorText(cause));
      if (id) { setRecovering(true); await checkOperation(id).catch(() => undefined); }
      else {
        const transcript = await loadTranscript().catch(() => [] as StoredMessage[]);
        const matching = [...transcript].reverse().find(row => row.role === "user" && row.content === text && row.operationId);
        if (matching?.operationId) { setOperationId(matching.operationId); setRecovering(true); await checkOperation(matching.operationId).catch(() => undefined); }
        else setPendingText(null);
      }
      return false;
    } finally { setBusy(false); }
  };

  const liveIdInRows = operationId && rows.some(row => row.operationId === operationId);
  return <BuilderSplit agent={agent} thread="· Test" composer={isOwner ?
    <Composer key={agent.id} placeholder="Write your message…" sendLabel="Send message"
      disabled={busy || recovering || demo.status !== "ready"} draft={{ value: draft, onChange: updateDraft }}
      onSend={send} onError={cause => setError(errorText(cause))} /> : null}>
    <div ref={scrollRef} onScroll={event => {
      const element = event.currentTarget;
      setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 80);
    }} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto w-full max-w-[752px]">
        <PageHeader title="Test" subtitle="Ask what a hirer would ask. Inspect the answer and its sources." />
        {demo.status !== "ready" && <p role="status" className="mb-4 text-sm text-warning">{demo.error ?? "Connecting to live services…"}</p>}
        {rows.length === 0 && !pendingText && <EmptyState icon={FlaskConical} heading="Test your agent" body="Ask a question to inspect its answer and sources." />}
        {rows.map(row => row.role === "user" ? <UserMessage key={row.id} content={row.content} /> :
          <div key={row.id}>
            <ToolSteps steps={answers[row.operationId ?? ""]?.steps ?? row.steps} />
            <RetrievedSources items={answers[row.operationId ?? ""]?.sources ?? row.sources} />
            <AssistantMessage content={answers[row.operationId ?? ""]?.text ?? row.content}
              citations={answers[row.operationId ?? ""]?.citations ?? row.citations}
              gap={answers[row.operationId ?? ""]?.gap ?? row.gap}
              caption={answers[row.operationId ?? ""]?.cost ? <StreamCostCaption cost={answers[row.operationId ?? ""].cost} /> :
                row.chargedUnits !== null ? `Charged ${formatCreditUnits(row.chargedUnits)}` : "Charge pending"} />
          </div>)}
        {pendingText && !liveIdInRows && <>
          <UserMessage content={pendingText} />
          {operationId && <div>
            <ToolSteps steps={answers[operationId]?.steps ?? []} />
            {answers[operationId]?.sources && <RetrievedSources items={answers[operationId].sources} />}
            <AssistantMessage content={answers[operationId]?.text ?? ""} citations={answers[operationId]?.citations ?? []}
              gap={answers[operationId]?.gap} caption={<StreamCostCaption cost={answers[operationId]?.cost}
                estimateUnits={answers[operationId]?.cost?.estimateUnits ?? null} />} />
          </div>}
        </>}
        {recovering && <p role="status" className="mb-4 text-sm text-fg-muted">Checking the previous operation before another send. Any charge remains visible when confirmed.</p>}
        {error && <div role="alert" className="mb-4 rounded-lg border border-danger/40 p-3 text-sm">
          <p>{error}</p>
          {!recovering && draft && <button type="button" onClick={() => void send(draft)} className="mt-2 min-h-11 text-selected-fg underline">Retry message with saved request</button>}
        </div>}
        {resetAt && <p className="mb-4 text-sm">The platform&apos;s daily AI budget is used up. Try again after {new Date(resetAt).toLocaleString(undefined, { timeZone: "UTC", timeZoneName: "short" })}. Your draft is saved.</p>}
        {refusal && <NotEnoughCredits needed={refusal.needed} available={refusal.available} onDismiss={() => setRefusal(null)} />}
        <div ref={bottomRef} />
      </div>
    </div>
    {!atBottom && <button type="button" onClick={() => { bottomRef.current?.scrollIntoView({ block: "end", behavior: "instant" }); setAtBottom(true); }}
      className="self-center rounded bg-surface-2 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand">Jump to latest</button>}
  </BuilderSplit>;
}
