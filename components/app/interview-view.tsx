"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { AnswerEditor } from "@/components/app/answer-editor";
import { BuilderSplit } from "@/components/app/builder";
import { EmptyState, PageHeader, buttonClass } from "@/components/app/ui";
import { answerInterview, controlInterview, getDraft, readDemoState, readInterview, saveDraft, useDemo } from "@/lib/demo-store";
import type { Agent } from "@/lib/types";
import type { InterviewView as InterviewSnapshot } from "@/features/builder/interview";

export function InterviewView({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const state = useDemo();
  const [view, setView] = useState<InterviewSnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [creditRefusal, setCreditRefusal] = useState<{ needed: number; available: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    const identity = state.identityId;
    queueMicrotask(() => {
      if (!active) return;
      setView(null); setError(""); setDraft(getDraft("interview", agent.id)?.value ?? "");
    });
    if (state.status === "ready") void readInterview(agent.id).then(next => {
      if (active && readDemoState().identityId === identity) setView(next);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Interview unavailable."); });
    return () => { active = false; };
  }, [agent.id, state.identityId, state.status]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try { setView(await readInterview(agent.id)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Interview unavailable."); }
    finally { setRefreshing(false); }
  }

  async function control(action: "start" | "pause" | "resume" | "skip" | "continue" | "dismiss-ready") {
    if (!isOwner || busy) return;
    setBusy(true); setError(""); setCreditRefusal(null);
    setStatus(action === "skip" ? "Skipping question" : `${action[0].toUpperCase()}${action.slice(1)} interview`);
    try {
      setView(await controlInterview(agent.id, action));
      setStatus(action === "pause" ? "Interview paused" : action === "dismiss-ready" ? "Suggestion dismissed" : "Interview ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Interview unavailable. Try again."); setStatus(""); }
    finally { setBusy(false); }
  }

  async function submit() {
    const text = draft.trim();
    if (!isOwner || busy || !text || !view?.pendingQuestion || view.state !== "active") return;
    setBusy(true); setError(""); setCreditRefusal(null); setStatus("Saving answer");
    const submitted = saveDraft("interview", agent.id, draft);
    try {
      const result = await answerInterview(agent.id, text);
      if (!result.ok) {
        setCreditRefusal({ needed: result.neededCents, available: result.availableCents });
        setStatus(""); return;
      }
      const currentDraft = getDraft("interview", agent.id);
      if (!currentDraft || currentDraft === submitted || currentDraft.value === text) setDraft("");
      setView(await readInterview(agent.id));
      setStatus("Answer saved. Updating knowledge");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save your answer. Your draft is still here. Try again.");
      setStatus("");
    } finally { setBusy(false); }
  }

  const hasAnswers = !!view?.answers.length;
  const canSend = isOwner && state.status === "ready" && view?.state === "active" && !!view.pendingQuestion;
  const base = `/build/${agent.id}`;
  return <BuilderSplit agent={agent} thread="· Interview" composer={<div className="shrink-0 border-t border-line-faint bg-surface-1 px-4 py-3">
    <div className="mx-auto max-w-[752px] rounded-xl border border-line-subtle bg-surface-2 p-4">
      <label htmlFor={`interview-answer-${agent.id}`} className="sr-only">Your answer</label>
      <textarea id={`interview-answer-${agent.id}`} aria-label="Your answer" rows={3} value={draft} onChange={event => {
        setDraft(event.target.value); saveDraft("interview", agent.id, event.target.value);
      }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }}
      placeholder="Write your answer…" disabled={!canSend || busy} className="min-h-24 w-full resize-y bg-transparent text-sm outline-none placeholder:text-fg-muted disabled:opacity-60" />
      <div className="flex items-center justify-between gap-3 text-xs text-fg-muted"><span>Enter to send · Shift+Enter for a new line</span>
        <button type="button" aria-label="Send answer" className={buttonClass("primary", "lg")} disabled={!canSend || busy || !draft.trim()} onClick={() => void submit()}>{busy && status === "Saving answer" ? "Saving answer" : "Send answer"}</button>
      </div>
    </div>
  </div>}>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6"><div className="mx-auto max-w-[752px] space-y-5">
      <PageHeader title="Interview" subtitle="Answer one question at a time. You can skip a question or add detail later." />
      {state.status !== "ready" && <p role="alert" className="rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm">{state.error ?? "Loading interview…"}</p>}
      {state.status === "ready" && !view && !error && <p className="text-sm text-fg-muted">Loading interview…</p>}
      {view?.readiness.suggested && <div className="rounded-xl border border-success/40 bg-surface-1 p-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Ready for a first test</h2><p className="mt-1 text-sm text-fg-muted">You have examples and working principles to try. Review the draft persona or keep adding detail.</p></div>
          {isOwner && <button type="button" className={buttonClass()} disabled={busy} onClick={() => void control("dismiss-ready")}>Dismiss</button>}</div>
        <div className="mt-3 flex flex-wrap gap-2"><Link className={buttonClass("primary", "lg")} href={`${base}/persona`}>Review persona</Link><Link className={buttonClass("secondary", "lg")} href={`${base}/test`}>Test agent</Link>{isOwner && <button type="button" className={buttonClass("secondary", "lg")} disabled={busy} onClick={() => void control("continue")}>Continue interview</button>}</div>
      </div>}
      {view?.state === "paused" && <div className="rounded-xl border border-line-subtle bg-surface-1 p-4"><h2 className="font-semibold">Interview paused</h2><p className="mt-1 text-sm text-fg-muted">Your saved answers are here. Continue when you&apos;re ready.</p>{isOwner && <button type="button" className={`${buttonClass("primary", "lg")} mt-3`} disabled={busy} onClick={() => void control("resume")}>Resume interview</button>}</div>}
      {view && view.state !== "paused" && !view.pendingQuestion && isOwner && <div className="rounded-xl border border-line-subtle bg-surface-1 p-4"><h2 className="font-semibold">{hasAnswers ? "Continue your interview" : "Build your agent from your experience"}</h2><p className="mt-1 text-sm text-fg-muted">Answer one question at a time. You can skip a question or add detail later.</p><button type="button" className={`${buttonClass("primary", "lg")} mt-3`} disabled={busy} onClick={() => void control(hasAnswers ? "continue" : "start")}>{hasAnswers ? "Continue interview" : "Start interview"}</button></div>}
      {view?.pendingQuestion && <div className="rounded-xl border border-line-subtle bg-surface-1 p-4"><p className="text-xs font-semibold text-fg-muted">Current question</p><h2 className="mt-2 whitespace-pre-wrap text-base font-semibold">{view.pendingQuestion.text}</h2>{isOwner && view.state === "active" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={buttonClass()} disabled={busy} onClick={() => void control("skip")}>Skip question</button><button type="button" className={buttonClass()} disabled={busy} onClick={() => void control("pause")}>Pause interview</button></div>}</div>}
      {!hasAnswers && !view?.pendingQuestion && !isOwner && <EmptyState icon={Mic} heading="No interview answers yet" body="Your saved answers and their questions will appear here." />}
      {hasAnswers && <section aria-label="Saved answers" className="space-y-3"><h2 className="text-base font-semibold">Saved answers</h2>{view?.answers.map(answer => <AnswerEditor key={answer.id} agentId={agent.id} answer={answer} isOwner={isOwner} onChange={refresh} />)}</section>}
      {creditRefusal && <div role="alert" className="rounded-xl border border-warning/40 bg-warning-surface p-4 text-sm"><h2 className="font-semibold">Not enough credits</h2><p className="mt-1">This needs about {creditRefusal.needed} credits; you have {creditRefusal.available}. Add credits to continue. Your draft is saved.</p><div className="mt-3 flex gap-2"><AddCreditsButton size="sm" /><button type="button" className={buttonClass()} onClick={() => setCreditRefusal(null)}>Keep draft</button></div></div>}
      {error && <div role="alert" className="rounded-xl border border-danger/40 bg-danger-surface p-4 text-sm">{error}<button type="button" className={`${buttonClass()} ml-3`} disabled={refreshing} onClick={() => void refresh()}>Refresh interview</button></div>}
      <p className="sr-only" aria-live="polite">{status}</p>
    </div></div>
  </BuilderSplit>;
}
