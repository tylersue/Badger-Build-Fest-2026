"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantMessage, ChatColumn, Composer, NotEnoughCredits, SavedChip, UserMessage } from "@/components/app/chat";
import { BuilderSplit, NotOwnerNote, answerCount, useBuilderAgent } from "@/components/app/builder";
import { VoiceStage, useVoice, type Utterance } from "@/components/app/voice";
import { answerInterview, displayName, interviewTurnsFor, pendingInterviewQuestion, type Refusal } from "@/lib/demo-store";
import { TYPICAL_CALL_CENTS } from "@/lib/config/credits";

/* Interview (Fleet onboarding pattern). The interviewer asks each question from the orb; the adaptive
   interviewer lands in Phase 2, answers and metering are real. */
export default function InterviewPage() {
  const { s, agent, isOwner } = useBuilderAgent();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const turns = agent ? interviewTurnsFor(s, agent.id) : [];
  const answered = turns.filter((t) => t.answer);
  const pending = agent ? pendingInterviewQuestion(s, agent.id) : null;
  // The first question is asked promptly; follow-ups pause as if the interviewer were reading the answer.
  const [openedWith] = useState(() => answered.length);
  const utterance: Utterance | null = pending
    ? { id: pending.turnId ?? `next-${answered.length}`, text: pending.question, speak: true, leadMs: answered.length === openedWith ? 500 : 1000 }
    : null;
  const voice = useVoice(utterance, { busy, focused });

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [answered.length, refusal]);

  if (!agent) return null;
  const shownCount = answerCount(s, agent.id);

  const send = async (text: string) => {
    setRefusal(null);
    setBusy(true);
    try {
      const r = answerInterview(agent.id, text);
      if (!r.ok) setRefusal(r);
      return r.ok;
    } finally {
      setBusy(false);
    }
  };

  return (
    <BuilderSplit
      agent={agent}
      thread="Interview"
      composer={
        isOwner ? (
          <Composer placeholder="Type your answer…" onSend={send} hint={`${shownCount} answers saved`} onFocusChange={setFocused} />
        ) : (
          <NotOwnerNote ownerName={displayName(s, agent.ownerId)} />
        )
      }
    >
      <VoiceStage
        status={voice.status}
        caption={voice.caption}
        name={agent.persona.name}
        icon={agent.icon}
        labels={{ idle: "Your turn. Type your answer below", thinking: "Thinking about your answer…", speaking: "Asking…" }}
        onSkip={voice.skip}
      />
      <ChatColumn>
        <p className="pt-2 pb-4 text-center text-xs text-fg-muted">
          Every answer becomes knowledge.
          {shownCount > answered.length && ` Showing the latest ${answered.length} of ${shownCount} answers.`}
        </p>
        {turns.map((t) =>
          t.answer ? (
            <div key={t.id}>
              <AssistantMessage content={t.question} />
              <UserMessage content={t.answer} />
              <SavedChip credits={TYPICAL_CALL_CENTS.interview_turn} />
            </div>
          ) : null,
        )}
        {refusal && <NotEnoughCredits needed={refusal.neededCents} available={refusal.availableCents} onDismiss={() => setRefusal(null)} />}
        <div ref={bottom} />
      </ChatColumn>
    </BuilderSplit>
  );
}
