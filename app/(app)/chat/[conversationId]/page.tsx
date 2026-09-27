"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageSquareOff } from "lucide-react";
import { toast } from "sonner";
import { AssistantMessage, ChatColumn, Composer, CostCaption, NotEnoughCredits, RetrievedSources, StreamCostCaption, UserMessage } from "@/components/app/chat";
import { ToolSteps } from "@/components/app/tool-steps";
import { emptyAnswer, reduceAnswer, type AnswerState } from "@/components/app/chat-state";
import { Breadcrumbs, EmptyState, Pill, buttonClass } from "@/components/app/ui";
import { IdentityLogo, companyFor } from "@/components/app/identity-logo";
import { AgentTurn, turnPhase, useVoice, type Utterance } from "@/components/app/voice";
import { AnswerFeedback } from "@/components/trust/answer-feedback";
import { ConversationControls } from "@/components/trust/conversation-controls";
import {
  agentById, allConversations, balanceOf, currentIdentity, displayName, getDraft, isFreshMessage, markStreamed, messagesFor, profileFor,
  sendChatMessage, useDemo, type Refusal,
} from "@/lib/demo-store";
import { api } from "@/lib/api-client";
import { disclaimerFor } from "@/lib/config/categories";
import { formatCredits, formatNumber, formatRelative } from "@/lib/format";

/* Hirer chat keeps Phase 3's voice presentation over Phase 2's durable answer path. */
export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const s = useDemo();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [busy, setBusy] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; chars: number } | null>(null);
  const [liveAnswer, setLiveAnswer] = useState<AnswerState | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(() => getDraft("chat", conversationId)?.value ?? null);
  const [sendError, setSendError] = useState<string | null>(null);
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
    let active = true;
    if (conversation?.hirerId !== s.identityId) return () => { active = false; };
    void api.attachment(conversationId).then(value => { if (active) setAttachment(value); },
      error => { if (active) setAttachError(error instanceof Error ? error.message : "Attachment unavailable."); });
    return () => { active = false; };
  }, [conversationId, conversation?.hirerId, s.identityId]);

  useEffect(() => {
    if (latestId && voice.done && isFreshMessage(latestId)) markStreamed(latestId);
  }, [latestId, voice.done]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, refusal, voice.spoken]);

  if (!conversation || !agent) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Agents", href: "/chat" }, { label: "Not found" }]} />
        <EmptyState icon={MessageSquareOff} heading="Conversation not found" body="It may belong to a different browser session." action={{ label: "Back to agents", href: "/chat" }} />
      </>
    );
  }

  const me = currentIdentity(s);
  const isHirer = me.id === conversation.hirerId;
  const expert = profileFor(s, agent.ownerId);
  const expertName = displayName(s, agent.ownerId);
  const company = companyFor(agent.ownerId);
  const expertFirst = expertName.split(" ")[0];
  const disclaimer = disclaimerFor(agent.persona.category);
  const turnLabel = phase === "thinking" ? `Searching ${expertFirst}'s answers…` : "Typing…";

  const send = async (text: string) => {
    setRefusal(null); setSendError(null); setLiveAnswer(emptyAnswer()); setPendingText(text);
    setBusy(true);
    try {
      const r = await sendChatMessage(conversation.id, text, event =>
        setLiveAnswer(previous => reduceAnswer(previous ?? emptyAnswer(), event)));
      if (!r.ok) setRefusal(r);
      setPendingText(null); setLiveAnswer(null);
      return r.ok;
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not finish the answer. Your message is saved for retry.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const attach = async (file: File) => {
    setAttaching(true);
    setAttachError(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}/attachment`,
        { method: "POST", body, credentials: "same-origin" });
      const result = await response.json() as { ok: true; data: { name: string; chars: number } } | { ok: false; error: { message: string } };
      if (!result.ok) throw new Error(result.error.message);
      setAttachment(result.data);
      toast(`Attached ${result.data.name} · ${formatNumber(result.data.chars)} characters`);
    } catch (error) {
      setAttachError(error instanceof Error ? error.message : "Could not attach that file.");
    } finally {
      setAttaching(false);
    }
  };
  const removeAttachment = async () => {
    try { await api.removeAttachment(conversation.id); setAttachment(null); }
    catch (error) { setAttachError(error instanceof Error ? error.message : "Could not remove attachment."); }
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
      <Breadcrumbs items={[{ label: "Agents", href: "/chat" }, { label: conversation.title }]} />
      <div className="flex shrink-0 items-center gap-3 border-b border-line-subtle px-4 py-2.5" data-testid="chat-header">
        <IdentityLogo identityId={agent.ownerId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{agent.persona.name}</div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
            <span className="truncate">by {expertName}{company ? ` · ${company}` : ""}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="hidden shrink-0 sm:inline">
              {expert.contactUrl ? (
                <Link href={expert.contactUrl} target="_blank" data-testid="contact-expert" className="text-fg-secondary underline decoration-line-outline underline-offset-2 hover:text-foreground hover:decoration-current">
                  Contact the expert
                </Link>
              ) : (
                "Contact the expert"
              )}
            </span>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <ConversationControls conversation={conversation} agent={agent} />
          <Pill className="bg-selected text-selected-fg">
            <span data-testid="chat-balance" className="tabular-nums">{formatCredits(balanceOf(s, conversation.hirerId))}</span>
          </Pill>
        </span>
      </div>

      <ChatColumn>
        {messages.length === 0 && (
          <>
            <AgentTurn name={agent.persona.name} phase={phase} label={turnLabel} listening onSkip={voice.skip}>
              {voice.spoken ? <AssistantMessage content={voice.spoken} flow /> : null}
            </AgentTurn>
            {disclaimer && <p className="-mt-4 mb-8 text-xs text-fg-muted sm:pl-[42px]">{disclaimer}</p>}
          </>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} content={m.content} />
          ) : m.id === latest?.id && !voice.done ? (
            <AgentTurn key={m.id} name={agent.persona.name} phase={phase} label={turnLabel} onSkip={voice.skip}>
              {!!m.steps?.length && <ToolSteps steps={m.steps} />}
              {!!m.retrieved?.length && <RetrievedSources items={m.retrieved} />}
              {voice.spoken ? <AssistantMessage content={voice.spoken} citations={m.citations} gap={m.gap} flow /> : null}
            </AgentTurn>
          ) : (
            <AgentTurn key={m.id} name={agent.persona.name} phase="done" listening={m.id === latest?.id} detail={formatRelative(m.createdAt)}>
              {!!m.steps?.length && <ToolSteps steps={m.steps} />}
              {!!m.retrieved?.length && <RetrievedSources items={m.retrieved} />}
              <AssistantMessage content={m.content} citations={m.citations} gap={m.gap} caption={captionFor(m)} />
            </AgentTurn>
          ),
        )}
        {pendingText && <UserMessage content={pendingText} />}
        {pendingText && <AgentTurn name={agent.persona.name} phase={liveAnswer?.text ? "typing" : "thinking"}
          label={liveAnswer?.text ? "Typing…" : turnLabel}>
          {!!liveAnswer?.steps.length && <ToolSteps steps={liveAnswer.steps} />}
          {!!liveAnswer?.sources.length && <RetrievedSources items={liveAnswer.sources} />}
          {liveAnswer?.text && <AssistantMessage content={liveAnswer.text} citations={liveAnswer.citations}
            gap={liveAnswer.gap} flow caption={<StreamCostCaption cost={liveAnswer.cost} />} />}
        </AgentTurn>}
        {sendError && <div role="alert" className="mb-8 rounded-lg border border-danger/25 bg-danger-surface px-3.5 py-3 text-sm text-danger">
          <p>{sendError}</p>
          {pendingText && !busy && <button className={`${buttonClass("secondary")} mt-2`} onClick={() => void send(pendingText)}>
            Retry saved message
          </button>}
        </div>}
        {refusal && <NotEnoughCredits needed={refusal.neededCents} available={refusal.availableCents} onDismiss={() => setRefusal(null)} />}
        <div ref={bottom} />
      </ChatColumn>

      {isHirer ? (
        <Composer
          placeholder="Write your message…"
          onSend={send}
          attachment={attachment}
          onAttach={attach}
          onRemoveAttachment={() => void removeAttachment()}
          attaching={attaching}
          attachError={attachError}
          onError={error => setSendError(error instanceof Error ? error.message : "Could not send message.")}
        />
      ) : (
        <div className="px-4 pb-4 text-center text-[13px] text-fg-muted">
          This is {displayName(s, conversation.hirerId)}&apos;s conversation. Switch to them in the sidebar to reply.
        </div>
      )}
    </div>
  );
}
