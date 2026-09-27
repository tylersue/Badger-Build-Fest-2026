"use client";

import { useState } from "react";
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
  const [saving, setSaving] = useState(false);
  const me = currentIdentity(s);
  const isHirer = me.id === conversation.hirerId;
  const hirerName = displayName(s, conversation.hirerId);
  const expertFirst = displayName(s, agent.ownerId).split(" ")[0];

  const toggleShare = async () => {
    if (!isHirer || saving) return;
    setSaving(true);
    try {
      const result = await setShareTranscript(conversation.id, !conversation.shareTranscript);
      if (result.ok) toast(result.conversation.shareTranscript ? `Transcript shared with ${expertFirst}` : "Transcript is private again");
      else toast.error("Could not change transcript sharing.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change transcript sharing.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <button
        type="button"
        className={buttonClass("secondary")}
        aria-label={`Share transcript with ${expertFirst}`}
        data-testid="share-toggle"
        aria-pressed={conversation.shareTranscript}
        disabled={!isHirer || saving}
        title={isHirer ? undefined : `Only ${hirerName} can change this`}
        onClick={() => void toggleShare()}
      >
        {conversation.shareTranscript
          ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-success" />
          : <Share2 />}
        {conversation.shareTranscript ? `Shared with ${expertFirst}` : "Share transcript"}
      </button>
      <FlagButton target={{ type: "conversation", agentId: agent.id, conversationId: conversation.id }} />
    </>
  );
}
