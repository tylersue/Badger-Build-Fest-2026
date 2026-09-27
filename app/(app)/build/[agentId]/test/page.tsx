"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantMessage, ChatColumn, Composer, CostCaption, NotEnoughCredits, RetrievedSources, UserMessage } from "@/components/app/chat";
import { BuilderSplit, NotOwnerNote, useBuilderAgent } from "@/components/app/builder";
import { AgentTile } from "@/components/app/ui";
import { AgentTurn, turnPhase, useVoice, type Utterance } from "@/components/app/voice";
import { displayName, messagesFor, sandboxConversationId, sendSandboxMessage, type Refusal } from "@/lib/demo-store";

/* Test chat (sandbox): same pipeline and typing treatment as hirer chat, raw cost, retrieved sources under each answer (SBOX-01/02). */
export default function TestPage() {
  const { s, agent, isOwner } = useBuilderAgent();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = agent ? messagesFor(s, sandboxConversationId(agent.id)) : [];
  const latest = messages.findLast((m) => m.role === "assistant") ?? null;
  const [openedWith] = useState(() => latest?.id ?? null);
  const utterance: Utterance | null = !agent
    ? null
    : latest
      ? { id: latest.id, text: latest.content, speak: latest.id !== openedWith, leadMs: 900 }
      : { id: "greeting", text: agent.persona.greeting || `Hi, I'm ${agent.persona.name}. Ask me what a hirer would ask.`, speak: true, leadMs: 400 };
  const voice = useVoice(utterance, { busy });
  const phase = turnPhase(voice);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, refusal, voice.spoken]);

  if (!agent) return null;
  const expertFirst = displayName(s, agent.ownerId).split(" ")[0];
  const turnLabel = phase === "thinking" ? `Searching ${expertFirst}'s knowledge…` : "Typing…";

  const send = async (text: string) => {
    setRefusal(null);
    setBusy(true);
    try {
      const r = await sendSandboxMessage(agent.id, text);
      if (!r.ok) setRefusal(r);
      return r.ok;
    } finally {
      setBusy(false);
    }
  };

  return (
    <BuilderSplit
      agent={agent}
      thread="Test"
      composer={isOwner ? <Composer placeholder="Write your message…" onSend={send} /> : <NotOwnerNote ownerName={displayName(s, agent.ownerId)} />}
    >
      <ChatColumn>
        <div className="pt-12 pb-6 text-center">
          <div className="inline-flex items-center gap-2.5 text-base font-semibold">
            Test
            <span className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-3 pr-3 pl-1.5 text-[13px] font-medium">
              <AgentTile icon={agent.icon} size="xs" />
              {agent.persona.name}
            </span>
          </div>
          <p className="mt-2 text-[13px] text-fg-muted">Ask what a hirer would ask. Retrieved sources show under each answer.</p>
          {messages.length === 0 && agent.persona.exampleQuestions.length > 0 && isOwner && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {agent.persona.exampleQuestions.map((q) => (
                <button key={q} onClick={() => void send(q)} className="rounded-full border border-line-subtle px-3 py-1 text-xs text-fg-tertiary hover:text-foreground">
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
        {messages.length === 0 && (
          <AgentTurn name={agent.persona.name} phase={phase} label={turnLabel} onSkip={voice.skip}>
            {voice.spoken ? <AssistantMessage content={voice.spoken} /> : null}
          </AgentTurn>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} content={m.content} />
          ) : m.id === latest?.id && !voice.done ? (
            <AgentTurn key={m.id} name={agent.persona.name} phase={phase} label={turnLabel} onSkip={voice.skip}>
              {m.retrieved && <RetrievedSources items={m.retrieved} />}
              {voice.spoken ? <AssistantMessage content={voice.spoken} citations={m.citations} /> : null}
            </AgentTurn>
          ) : (
            <AgentTurn key={m.id} name={agent.persona.name} phase="done">
              {m.retrieved && <RetrievedSources items={m.retrieved} />}
              <AssistantMessage content={m.content} citations={m.citations} caption={<CostCaption message={m} />} />
            </AgentTurn>
          ),
        )}
        {refusal && <NotEnoughCredits needed={refusal.neededCents} available={refusal.availableCents} onDismiss={() => setRefusal(null)} />}
        <div ref={bottom} />
      </ChatColumn>
    </BuilderSplit>
  );
}
