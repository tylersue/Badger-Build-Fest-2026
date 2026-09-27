"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { NotEnoughCredits } from "@/components/app/chat";
import { BuilderSplit, NotOwnerNote, answerCount, useBuilderAgent } from "@/components/app/builder";
import { FlowWords } from "@/components/app/flow";
import { Orb, type OrbMood } from "@/components/app/orb";
import { useOrbDesign, useVoice, type Utterance, type VoiceStatus } from "@/components/app/voice";
import { answerInterview, displayName, interviewTurnsFor, pendingInterviewQuestion, type Refusal } from "@/lib/demo-store";

/* The orb's mood for each state (components/app/orb.tsx): a slow, deep breath while it waits and
   listens to you type, quick and lively while it asks. There is no visible status label; the orb's
   breathing is the status, and screen readers hear the label. */
const ORB: Record<VoiceStatus, { mood: OrbMood; label: string }> = {
  idle: { mood: "listening", label: "Your turn" },
  listening: { mood: "listening", label: "Listening" },
  thinking: { mood: "thinking", label: "Thinking" },
  speaking: { mood: "talking", label: "Asking" },
};

/* Interview: only the orb, the question and your answer. The orb (the viewer's design, useOrbDesign) breathes
   quickly while the question flows in, slowly while you answer, and in between while it thinks. Past answers live in
   the Configure drawer (Knowledge); the adaptive interviewer lands in Phase 2, answers and metering
   are real. */
export default function InterviewPage() {
  const { s, agent, isOwner } = useBuilderAgent();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  /** The question and answer just sent, held on screen while the next question is on its way. */
  const [sent, setSent] = useState<{ question: string; answer: string; answered: number } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const turns = agent ? interviewTurnsFor(s, agent.id) : [];
  const answered = turns.filter((t) => t.answer).length;
  const pending = agent ? pendingInterviewQuestion(s, agent.id) : null;
  // The first question is asked promptly; follow-ups pause as if the interviewer were reading the answer.
  const [openedWith] = useState(() => answered);
  const utterance: Utterance | null = pending
    ? { id: pending.turnId ?? `next-${answered}`, text: pending.question, speak: true, leadMs: answered === openedWith ? 500 : 1100 }
    : null;
  const utteranceId = utterance?.id ?? null;
  const voice = useVoice(utterance, { busy, focused: focused || draft.length > 0 });
  const design = useOrbDesign();
  const holding = sent !== null && sent.answered === answered && voice.status === "thinking";

  // Hand the cursor back as soon as the question has finished arriving.
  useEffect(() => {
    if (voice.done && utteranceId) field.current?.focus();
  }, [voice.done, utteranceId]);

  if (!agent || !pending) return null;

  const send = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setRefusal(null);
    setBusy(true);
    try {
      const r = answerInterview(agent.id, text);
      if (!r.ok) {
        setRefusal(r);
        return;
      }
      setSent({ question: pending.question, answer: text, answered: answered + 1 });
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BuilderSplit agent={agent} thread="Interview" composer={null}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-12">
        <button
          type="button"
          onClick={voice.skip}
          disabled={!voice.speaking}
          aria-label={voice.speaking ? "Show the whole question now" : undefined}
          className="rounded-full disabled:cursor-default"
        >
          <Orb state={design} mood={ORB[voice.status].mood} size={220} label={`${agent.persona.name}: ${ORB[voice.status].label}`} />
        </button>

        <p className="sr-only" aria-live="polite">
          {holding ? "" : pending.question}
        </p>
        <h2 aria-hidden data-testid="interview-question" className="mt-8 min-h-[2lh] max-w-[640px] text-center text-[22px] leading-[1.45] font-medium text-balance">
          {holding ? sent.question : <FlowWords key={utteranceId} text={pending.question} flowing upTo={voice.spoken.length} />}
        </h2>

        <div className="mt-6 w-full max-w-[640px]">
          {holding ? (
            // Same height as the answer field it replaces, so nothing above it moves when you send.
            <p data-testid="interview-sent-answer" className="min-h-[46px] border-b border-transparent py-1 pb-2 text-center text-[17px] leading-[1.6] whitespace-pre-line text-fg-tertiary">
              <FlowWords text={sent.answer} flowing />
            </p>
          ) : isOwner ? (
            <div className="flex items-end gap-3 border-b border-line-subtle pb-2 focus-within:border-brand-border">
              <textarea
                ref={field}
                data-testid="composer-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Type your answer…"
                aria-label="Your answer"
                className="max-h-48 min-h-9 flex-1 resize-none bg-transparent py-1 text-center text-[17px] leading-[1.6] outline-none [field-sizing:content] placeholder:text-fg-muted"
              />
              <button
                type="button"
                data-testid="composer-send"
                onClick={send}
                disabled={busy || !draft.trim()}
                aria-label="Send answer"
                className="mb-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white transition-opacity disabled:opacity-0"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          ) : (
            <NotOwnerNote ownerName={displayName(s, agent.ownerId)} />
          )}
          {refusal && (
            <div className="mt-4">
              <NotEnoughCredits needed={refusal.neededCents} available={refusal.availableCents} onDismiss={() => setRefusal(null)} />
            </div>
          )}
          <p className="mt-3 text-center text-xs text-fg-muted">{answerCount(s, agent.id)} answers saved</p>
        </div>
      </div>
    </BuilderSplit>
  );
}
