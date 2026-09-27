"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { ApiClientError } from "@/lib/api-client";
import { formatCredits } from "@/lib/format";
import { AnswerEditor } from "@/components/app/answer-editor";
import { BuilderSplit } from "@/components/app/builder";
import { BuildSequence } from "@/components/app/build-sequence";
import { DEMO_MODE } from "@/lib/config/demo";
import { buttonClass } from "@/components/app/ui";
import { FlowWords } from "@/components/app/flow";
import { Orb, type OrbMood } from "@/components/app/orb";
import { useOrbDesign, useVoice, type VoiceStatus } from "@/components/app/voice";
import { answerInterview, controlInterview, getDraft, readDemoState, readInterview, saveDraft, useDemo } from "@/lib/demo-store";
import type { Agent } from "@/lib/types";
import type { InterviewView as InterviewSnapshot } from "@/features/builder/interview";

const ORB: Record<VoiceStatus, { mood: OrbMood; label: string }> = {
  idle: { mood: "listening", label: "Your turn" },
  listening: { mood: "listening", label: "Listening" },
  thinking: { mood: "thinking", label: "Thinking" },
  speaking: { mood: "talking", label: "Asking" },
};

export function InterviewView({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const state = useDemo();
  const [view, setView] = useState<InterviewSnapshot | null>(null);
  const [loadedFor, setLoadedFor] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [creditRefusal, setCreditRefusal] = useState<{ needed: number; available: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [focused, setFocused] = useState(false);
  /** Which saved answer is on screen while looking back (index into the answers); null is the current question. */
  const [review, setReview] = useState<number | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const speakingQuestion = loadedFor === `${state.identityId}:${agent.id}` ? view?.pendingQuestion : null;
  const voice = useVoice(speakingQuestion ? { id: speakingQuestion.id, text: speakingQuestion.text, speak: true, leadMs: 500 } : null,
    { busy, focused });
  const design = useOrbDesign();
  // Previous / Next step through saved answers (each opens in the answer editor); the orb holds still while you look back.
  const reviewAnswers = loadedFor === `${state.identityId}:${agent.id}` ? view?.answers ?? [] : [];
  const reviewing = review !== null && review < reviewAnswers.length ? reviewAnswers[review] : null;
  const position = reviewing && review !== null ? review : reviewAnswers.length;
  const back = () => setReview(Math.max(0, position - 1));
  const forward = () => setReview(position + 1 >= reviewAnswers.length ? null : position + 1);

  useEffect(() => {
    if (voice.done && speakingQuestion?.id && !reviewing) field.current?.focus();
  }, [voice.done, speakingQuestion?.id, reviewing]);

  // While looking back: arrow keys step between questions and Escape returns to the current one.
  useEffect(() => {
    if (!reviewing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft" && position > 0) setReview(position - 1);
      else if (e.key === "ArrowRight") setReview(position + 1 >= reviewAnswers.length ? null : position + 1);
      else if (e.key === "Escape") setReview(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reviewing, position, reviewAnswers.length]);

  useEffect(() => {
    let active = true;
    const identity = state.identityId;
    if (state.status === "ready" && isOwner) void readInterview(agent.id).then(next => {
      if (active && readDemoState().identityId === identity) { setView(next); setLoadedFor(`${identity}:${agent.id}`); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Interview unavailable."); });
    return () => { active = false; };
  }, [agent.id, isOwner, state.identityId, state.status]);

  useEffect(() => {
    queueMicrotask(() => { setError(""); setDraft(getDraft("interview", agent.id)?.value ?? ""); });
  }, [agent.id, state.identityId]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try { setView(await readInterview(agent.id)); setLoadedFor(`${state.identityId}:${agent.id}`); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Interview unavailable."); }
    finally { setRefreshing(false); }
  }

  async function control(action: "start" | "pause" | "resume" | "skip" | "continue" | "dismiss-ready") {
    if (!isOwner || busy) return;
    setBusy(true); setError(""); setCreditRefusal(null);
    setStatus(action === "skip" ? "Skipping question" : `${action[0].toUpperCase()}${action.slice(1)} interview`);
    try {
      setView(await controlInterview(agent.id, action)); setLoadedFor(`${state.identityId}:${agent.id}`);
      setStatus(action === "pause" ? "Interview paused" : action === "dismiss-ready" ? "Suggestion dismissed" : "Interview ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Interview unavailable. Try again.");
      if (cause instanceof ApiClientError && cause.detail.code === "insufficient_credits")
        setCreditRefusal({ needed: Number(BigInt(cause.detail.neededUnits ?? "0")) / 10_000_000, available: Number(BigInt(cause.detail.availableUnits ?? "0")) / 10_000_000 });
      setStatus(""); }
    finally { setBusy(false); }
  }

  async function submit() {
    const text = draft.trim();
    if (!isOwner || busy || !text || !visibleView?.pendingQuestion || visibleView.state !== "active") return;
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
      setView(await readInterview(agent.id)); setLoadedFor(`${state.identityId}:${agent.id}`);
      setStatus("Answer saved. Updating knowledge");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save your answer. Your draft is still here. Try again.");
      setStatus("");
    } finally { setBusy(false); }
  }

  const visibleView = loadedFor === `${state.identityId}:${agent.id}` ? view : null;
  const hasAnswers = !!visibleView?.answers.length;
  const canSend = isOwner && state.status === "ready" && visibleView?.state === "active" && !!visibleView.pendingQuestion;
  const base = `/build/${agent.id}`;
  return <BuilderSplit agent={agent} thread="Interview" composer={null}>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6"><div className="mx-auto max-w-[752px] space-y-5">
      <h1 className="sr-only">Interview</h1>
      {state.status !== "ready" && <p role="alert" className="rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm">{state.error ?? "Loading interview…"}</p>}
      {!isOwner && <p className="rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm text-fg-muted">Interview answers are available to the agent owner.</p>}
      {state.status === "ready" && !visibleView && !error && isOwner && <p className="text-sm text-fg-muted">Loading interview…</p>}
      {visibleView?.pendingQuestion && <section className="flex min-h-[55vh] flex-col items-center justify-center pb-8 text-center">
        <button type="button" onClick={voice.skip} disabled={!voice.speaking}
          aria-label={voice.speaking ? "Show the whole question now" : undefined}
          className="rounded-full disabled:cursor-default">
          <Orb state={design} mood={reviewing ? "still" : ORB[voice.status].mood} size={220}
            label={`${agent.persona.name}: ${reviewing ? "Looking back" : ORB[voice.status].label}`} />
        </button>
        <p className="sr-only" aria-live="polite">{reviewing ? `Question ${position + 1}: ${reviewing.question}` : visibleView.pendingQuestion.text}</p>
        {reviewing ? <div data-testid="interview-review" className="mt-8 w-full max-w-[640px] text-left">
          <AnswerEditor key={reviewing.id} agentId={agent.id} answer={reviewing} isOwner={isOwner} onChange={refresh} />
        </div> : <h2 aria-hidden data-testid="interview-question"
          className="mt-8 min-h-[2lh] max-w-[640px] text-[22px] leading-[1.45] font-medium text-balance">
          <FlowWords key={visibleView.pendingQuestion.id} text={visibleView.pendingQuestion.text}
            flowing upTo={voice.spoken.length} />
        </h2>}
        {canSend && !reviewing && <div className="mt-6 w-full max-w-[640px]">
          <div className="flex items-end gap-3 border-b border-line-subtle pb-2 focus-within:border-brand-border">
            <textarea ref={field} data-testid="composer-input" aria-label="Your answer" rows={1}
              value={draft} onChange={event => { setDraft(event.target.value); saveDraft("interview", agent.id, event.target.value); }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
                else if (event.key === "ArrowUp" && !draft && reviewAnswers.length > 0) { event.preventDefault(); back(); }
              }}
              placeholder="Type your answer…" disabled={busy}
              className="max-h-48 min-h-9 flex-1 resize-none bg-transparent py-1 text-center text-[17px] leading-[1.6] outline-none [field-sizing:content] placeholder:text-fg-muted disabled:opacity-60" />
            <button type="button" data-testid="composer-send" aria-label="Send answer" onClick={() => void submit()}
              disabled={busy || !draft.trim()}
              className="mb-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground transition-opacity disabled:opacity-0">
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>}
        {isOwner && (canSend || reviewAnswers.length > 0) && <div className="mt-3 flex w-full max-w-[640px] items-center justify-between gap-3 text-xs text-fg-muted">
          <button type="button" data-testid="interview-prev" onClick={back} disabled={position === 0} className={buttonClass("ghost")}>
            <ChevronLeft />
            Previous
          </button>
          <span data-testid="interview-position" className="tabular-nums">
            {reviewing ? `Question ${position + 1} of ${reviewAnswers.length + 1}` : canSend ? "Enter to send · Shift+Enter for a new line" : ""}
          </span>
          <button type="button" data-testid="interview-next" onClick={forward} disabled={!reviewing} className={buttonClass("ghost")}>
            Next
            <ChevronRight />
          </button>
        </div>}
        {isOwner && visibleView.state === "active" && !reviewing && <div className="mt-5 flex gap-2">
          <button type="button" className={buttonClass()} disabled={busy} onClick={() => void control("skip")}>Skip question</button>
          <button type="button" className={buttonClass()} disabled={busy} onClick={() => void control("pause")}>Pause interview</button>
        </div>}
      </section>}
      {visibleView?.readiness.suggested && <div className="rounded-xl border border-success/40 bg-surface-1 p-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Ready for a first test</h2><p className="mt-1 text-sm text-fg-muted">You have examples and working principles to try. Review the draft persona or keep adding detail.</p></div>
          {isOwner && <button type="button" className={buttonClass()} disabled={busy} onClick={() => void control("dismiss-ready")}>Dismiss</button>}</div>
        <div className="mt-3 flex flex-wrap gap-2"><Link className={buttonClass("primary", "lg")} href={`${base}/persona`}>Review persona</Link><Link className={buttonClass("secondary", "lg")} href={`${base}/test`}>Test agent</Link>{isOwner && <button type="button" className={buttonClass("secondary", "lg")} disabled={busy} onClick={() => void control("continue")}>Continue interview</button>}</div>
      </div>}
      {visibleView?.state === "paused" && <div className="rounded-xl border border-line-subtle bg-surface-1 p-4"><h2 className="font-semibold">Interview paused</h2><p className="mt-1 text-sm text-fg-muted">Your saved answers are here. Continue when you&apos;re ready.</p>{isOwner && <button type="button" className={`${buttonClass("primary", "lg")} mt-3`} disabled={busy} onClick={() => void control("resume")}>Resume interview</button>}</div>}
      {DEMO_MODE && visibleView?.state === "completed" && !visibleView.pendingQuestion && isOwner && <BuildSequence agent={agent}
        answers={visibleView.answers.length} chunks={visibleView.answers.reduce((sum, answer) => sum + (answer.progress?.indexedChunks || 2), 0)} />}
      {visibleView && visibleView.state !== "paused" && !visibleView.pendingQuestion && isOwner && !(DEMO_MODE && visibleView.state === "completed") && <div className="rounded-xl border border-line-subtle bg-surface-1 p-4"><h2 className="font-semibold">{hasAnswers ? "Continue your interview" : "Build your agent from your experience"}</h2><p className="mt-1 text-sm text-fg-muted">Answer one question at a time. You can skip a question or add detail later.</p><button type="button" className={`${buttonClass("primary", "lg")} mt-3`} disabled={busy} onClick={() => void control(hasAnswers ? "continue" : "start")}>{hasAnswers ? "Continue interview" : "Start interview"}</button></div>}
      {hasAnswers && <details className="rounded-xl border border-line-subtle bg-surface-1 p-4"><summary className="cursor-pointer text-sm font-semibold">Saved answers · {visibleView.answers.length}</summary><section aria-label="Saved answers" className="mt-4 space-y-3">{visibleView.answers.map(answer => <AnswerEditor key={answer.id} agentId={agent.id} answer={answer} isOwner={isOwner} onChange={refresh} />)}</section></details>}
      {creditRefusal && <div role="alert" className="rounded-xl border border-warning/40 bg-warning-surface p-4 text-sm"><h2 className="font-semibold">Not enough credits</h2><p className="mt-1">This needs about {formatCredits(creditRefusal.needed)}; you have {formatCredits(creditRefusal.available)}. Add credits to continue. Your draft is saved.</p><div className="mt-3 flex gap-2"><AddCreditsButton size="sm" /><button type="button" className={buttonClass()} onClick={() => setCreditRefusal(null)}>Keep draft</button></div></div>}
      {error && <div role="alert" className="rounded-xl border border-danger/40 bg-danger-surface p-4 text-sm">{error}<button type="button" className={`${buttonClass()} ml-3`} disabled={refreshing} onClick={() => void refresh()}>Refresh interview</button></div>}
      <p className="sr-only" aria-live="polite">{status}</p>
    </div></div>
  </BuilderSplit>;
}
