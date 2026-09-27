"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentIdentity, useDemo } from "@/lib/demo-store";
import { feedbackPermission, toggleAnswerFeedback } from "@/features/trust/conversation";
import type { Message } from "@/lib/types";

/* Thumbs toggle for one assistant answer (CHAT-08). Inert for anyone who is not the conversation's hirer. */
export function AnswerFeedback({ message }: { message: Message }) {
  const s = useDemo();
  const [saving, setSaving] = useState(false);
  const me = currentIdentity(s);
  const allowed = feedbackPermission(s, message.id, me.id).ok;

  const click = async (thumb: "up" | "down") => {
    if (!allowed || saving) return;
    setSaving(true);
    try {
      const result = await toggleAnswerFeedback(message.id, thumb);
      if (!result.ok) toast.error("Could not save feedback.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save feedback.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <button
        type="button"
        data-testid="feedback-up"
        aria-label="Helpful"
        aria-pressed={message.feedback === "up"}
        disabled={!allowed || saving}
        title={allowed ? undefined : "Only the hirer can rate answers"}
        onClick={() => void click("up")}
        className="disabled:cursor-default"
      >
        <ThumbsUp className={cn("size-3", message.feedback === "up" && "text-success")} />
      </button>
      <button
        type="button"
        data-testid="feedback-down"
        aria-label="Not helpful"
        aria-pressed={message.feedback === "down"}
        disabled={!allowed || saving}
        title={allowed ? undefined : "Only the hirer can rate answers"}
        onClick={() => void click("down")}
        className="disabled:cursor-default"
      >
        <ThumbsDown className={cn("size-3", message.feedback === "down" && "text-danger")} />
      </button>
    </>
  );
}
