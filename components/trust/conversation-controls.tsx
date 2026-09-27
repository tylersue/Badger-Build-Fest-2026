"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { buttonClass } from "@/components/app/ui";
import { FlagButton } from "@/components/trust/flag-dialog";
import { currentIdentity, displayName, useDemo } from "@/lib/demo-store";
import { setShareTranscript } from "@/features/trust/conversation";
import type { Agent, Conversation } from "@/lib/types";

/* Chat header slot: share toggle (CHAT-09) and flag button (MKT-06). */
export function ConversationControls({ conversation, agent }: { conversation: Conversation; agent: Agent }) {
  const s = useDemo();
  const me = currentIdentity(s);
  const isHirer = me.id === conversation.hirerId;
  const hirerName = displayName(s, conversation.hirerId);
  const expertFirst = displayName(s, agent.ownerId).split(" ")[0];

  const toggleShare = () => {
    if (!isHirer) return;
    const result = setShareTranscript(conversation.id, !conversation.shareTranscript);
    if (result.ok) {
      toast(result.conversation.shareTranscript ? `Transcript shared with ${expertFirst}` : "Transcript is private again");
    }
  };

  return (
    <>
      <button
        type="button"
        className={buttonClass("secondary")}
        data-testid="share-toggle"
        aria-pressed={conversation.shareTranscript}
        disabled={!isHirer}
        title={isHirer ? undefined : `Only ${hirerName} can change this`}
        onClick={toggleShare}
      >
        <Share2 />
        Share transcript: {conversation.shareTranscript ? "on" : "off"}
      </button>
      <FlagButton target={{ type: "conversation", agentId: agent.id, conversationId: conversation.id }} />
    </>
  );
}
