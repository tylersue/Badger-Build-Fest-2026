"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Flag, MessageSquareOff, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AssistantMessage, ChatColumn, Composer, CostCaption, NotEnoughCredits, UserMessage } from "@/components/app/chat";
import { AgentTile, Breadcrumbs, EmptyState, Pill, buttonClass } from "@/components/app/ui";
import {
  agentById, allConversations, balanceOf, currentIdentity, displayName, messagesFor, profileFor, sendChatMessage, useDemo, type Refusal,
} from "@/lib/demo-store";
import { disclaimerFor } from "@/lib/config/categories";
import { formatCredits } from "@/lib/format";

/* Hirer chat (runtime lane). Answers are canned in Phase 1; the wallet math is real. */
export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const s = useDemo();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const conversation = allConversations(s).find((c) => c.id === conversationId);
  const agent = conversation && agentById(s, conversation.agentId);
  const messages = conversation ? messagesFor(s, conversation.id) : [];

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, refusal]);

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
  const disclaimer = disclaimerFor(agent.persona.category);

  const send = async (text: string) => {
    setRefusal(null);
    try {
      const r = await sendChatMessage(conversation.id, text);
      if (!r.ok) setRefusal(r);
      return r.ok;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Chat unavailable."); return false; }
  };

  return (
    <div className="flex h-svh flex-col">
      <Breadcrumbs items={[{ label: "Chats", href: "/chat" }, { label: conversation.title }]} />
      <div className="flex h-10 shrink-0 items-center gap-3 px-4 text-sm font-medium">
        <AgentTile icon={agent.icon} size="sm" />
        <span className="truncate">{agent.persona.name}</span>
        <span className="hidden text-xs font-normal text-fg-muted sm:inline">
          by {displayName(s, agent.ownerId)} ·{" "}
          {expert.contactUrl ? (
            <Link href={expert.contactUrl} target="_blank" className="text-selected-fg">
              Contact the expert
            </Link>
          ) : (
            "Contact the expert"
          )}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <button className={buttonClass("secondary")} onClick={() => toast("Transcript sharing lands in Phase 4.")}>
            <Share2 />
            Share transcript: {conversation.shareTranscript ? "on" : "off"}
          </button>
          <button className={buttonClass("secondary")} aria-label="Flag this agent" onClick={() => toast("Flagging lands in Phase 4.")}>
            <Flag />
          </button>
          <Pill className="bg-selected text-selected-fg" >
            <span data-testid="chat-balance">{formatCredits(balanceOf(s, conversation.hirerId))}</span>
          </Pill>
        </span>
      </div>

      <ChatColumn>
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-base font-semibold">{agent.persona.name}</div>
            <p className="mt-2 text-[13px] text-fg-muted">{agent.persona.greeting}</p>
            {disclaimer && <p className="mt-2 text-xs text-fg-muted">{disclaimer}</p>}
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} content={m.content} />
          ) : (
            <AssistantMessage key={m.id} content={m.content} citations={m.citations} caption={<CostCaption message={m} />} />
          ),
        )}
        {refusal && <NotEnoughCredits needed={refusal.neededCents} available={refusal.availableCents} onDismiss={() => setRefusal(null)} />}
        <div ref={bottom} />
      </ChatColumn>

      {isHirer ? (
        <Composer placeholder="Write your message…" onSend={send} attach />
      ) : (
        <div className="px-4 pb-4 text-center text-[13px] text-fg-muted">
          This is {displayName(s, conversation.hirerId)}&apos;s conversation. Switch to them in the sidebar to reply.
        </div>
      )}
    </div>
  );
}
