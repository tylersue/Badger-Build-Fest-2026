"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageSquareOff } from "lucide-react";
import { toast } from "sonner";
import { AssistantMessage, ChatColumn, Composer, CostCaption, NotEnoughCredits, UserMessage } from "@/components/app/chat";
import { AgentTile, Breadcrumbs, EmptyState, Pill } from "@/components/app/ui";
import { AgentTurn, turnPhase, useVoice, type Utterance } from "@/components/app/voice";
import { AnswerFeedback } from "@/components/trust/answer-feedback";
import { ConversationControls } from "@/components/trust/conversation-controls";
import {
  agentById, allConversations, attachConversationFile, balanceOf, currentIdentity, displayName, isFreshMessage, markStreamed, messagesFor, profileFor,
  removeConversationFile, sendChatMessage, useDemo, type Refusal,
} from "@/lib/demo-store";
import { disclaimerFor } from "@/lib/config/categories";
import { formatCredits, formatNumber } from "@/lib/format";

type ExtractResponse = { name: string; text: string; chars: number; pages: number | null; truncated: boolean } | { error: string };

/* Hirer chat (runtime lane). Each reply types out under a small orb that freezes when it is done (Phase 3 D-01);
   answers are canned, the wallet math is real, and one hirer file per conversation rides along as untrusted context (CHAT-04). */
export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const s = useDemo();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [busy, setBusy] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const conversation = allConversations(s).find((c) => c.id === conversationId);
  const agent = conversation && agentById(s, conversation.agentId);
  const messages = conversation ? messagesFor(s, conversation.id) : [];
  const latest = messages.findLast((m) => m.role === "assistant") ?? null;
  const latestId = latest?.id ?? null;
  // Only a reply created in this session and not shown yet types out; older replies render at once.
  const utterance: Utterance | null = !agent
    ? null
    : latest
      ? { id: latest.id, text: latest.content, speak: isFreshMessage(latest.id), leadMs: 900 }
      : { id: "greeting", text: agent.persona.greeting || `Hi, I'm ${agent.persona.name}. Ask me anything.`, speak: true, leadMs: 400 };
  const voice = useVoice(utterance, { busy });
  const phase = turnPhase(voice);

  useEffect(() => {
    if (latestId && voice.done && isFreshMessage(latestId)) markStreamed(latestId);
  }, [latestId, voice.done]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, refusal, voice.spoken]);

  if (!conversation || !agent) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Chats", href: "/chat" }, { label: "Not found" }]} />
        <EmptyState icon={MessageSquareOff} heading="Conversation not found" body="It may belong to a different browser session." action={{ label: "Back to chats", href: "/chat" }} />
      </>
    );
  }

  const me = currentIdentity(s);
  const isHirer = me.id === conversation.hirerId;
  const expert = profileFor(s, agent.ownerId);
  const expertFirst = displayName(s, agent.ownerId).split(" ")[0];
  const disclaimer = disclaimerFor(agent.persona.category);
  const turnLabel = phase === "thinking" ? `Searching ${expertFirst}'s answers…` : "Typing…";

  const send = async (text: string) => {
    setRefusal(null);
    setBusy(true);
    try {
      const r = await sendChatMessage(conversation.id, text);
      if (!r.ok) setRefusal(r);
      return r.ok;
    } finally {
      setBusy(false);
    }
  };

  const attach = async (file: File) => {
    setAttaching(true);
    setAttachError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body });
      if (!res.headers.get("content-type")?.includes("application/json")) {
        setAttachError(`Upload failed (${res.status}). Try a smaller file.`);
        return;
      }
      const data = (await res.json()) as ExtractResponse;
      if (!res.ok || "error" in data) {
        setAttachError("error" in data ? data.error : "Could not read that file.");
        return;
      }
      attachConversationFile(conversation.id, { name: data.name, text: data.text, chars: data.chars });
      toast(`Attached ${data.name} · ${formatNumber(data.chars)} characters${data.truncated ? " (truncated)" : ""}`);
    } catch {
      setAttachError("Could not reach the file reader. Is the dev server running?");
    } finally {
      setAttaching(false);
    }
  };

  const captionFor = (m: (typeof messages)[number]) =>
    m.refusal ? (
      <>
        <span data-testid="no-charge">No charge · not in {expertFirst}&apos;s knowledge</span>
        <AnswerFeedback message={m} />
      </>
    ) : (
      <CostCaption message={m} />
    );

  return (
    <div className="flex h-svh flex-col">
      <Breadcrumbs items={[{ label: "Chats", href: "/chat" }, { label: conversation.title }]} />
      <div className="flex h-10 shrink-0 items-center gap-3 px-4 text-sm font-medium">
        <AgentTile icon={agent.icon} size="sm" />
        <span className="truncate">{agent.persona.name}</span>
        <span className="hidden text-xs font-normal text-fg-muted sm:inline">
          by {displayName(s, agent.ownerId)} ·{" "}
          {expert.contactUrl ? (
            <Link href={expert.contactUrl} target="_blank" data-testid="contact-expert" className="text-selected-fg">
              Contact the expert
            </Link>
          ) : (
            "Contact the expert"
          )}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <ConversationControls conversation={conversation} agent={agent} />
          <Pill className="bg-selected text-selected-fg">
            <span data-testid="chat-balance">{formatCredits(balanceOf(s, conversation.hirerId))}</span>
          </Pill>
        </span>
      </div>

      <ChatColumn>
        {messages.length === 0 && (
          <>
            <AgentTurn name={agent.persona.name} phase={phase} label={turnLabel} onSkip={voice.skip}>
              {voice.spoken ? <AssistantMessage content={voice.spoken} /> : null}
            </AgentTurn>
            {disclaimer && <p className="mb-5 text-xs text-fg-muted">{disclaimer}</p>}
          </>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} content={m.content} />
          ) : m.id === latest?.id && !voice.done ? (
            <AgentTurn key={m.id} name={agent.persona.name} phase={phase} label={turnLabel} onSkip={voice.skip}>
              {voice.spoken ? <AssistantMessage content={voice.spoken} citations={m.citations} /> : null}
            </AgentTurn>
          ) : (
            <AgentTurn key={m.id} name={agent.persona.name} phase="done">
              <AssistantMessage content={m.content} citations={m.citations} caption={captionFor(m)} />
            </AgentTurn>
          ),
        )}
        {refusal && <NotEnoughCredits needed={refusal.neededCents} available={refusal.availableCents} onDismiss={() => setRefusal(null)} />}
        <div ref={bottom} />
      </ChatColumn>

      {isHirer ? (
        <Composer
          placeholder="Write your message…"
          onSend={send}
          attachment={conversation.fileName ? { name: conversation.fileName, chars: conversation.fileChars ?? conversation.fileText?.length ?? 0 } : null}
          onAttach={attach}
          onRemoveAttachment={() => removeConversationFile(conversation.id)}
          attaching={attaching}
          attachError={attachError}
        />
      ) : (
        <div className="px-4 pb-4 text-center text-[13px] text-fg-muted">
          This is {displayName(s, conversation.hirerId)}&apos;s conversation. Switch to them in the sidebar to reply.
        </div>
      )}
    </div>
  );
}
