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

  const thumbClass = (pressed: boolean, tone: "up" | "down") => cn(
    "grid size-7 place-items-center rounded-md text-fg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring",
    allowed && "hover:bg-surface-2 hover:text-foreground",
    "disabled:cursor-default",
    pressed && (tone === "up" ? "bg-success-surface text-success hover:bg-success-surface hover:text-success" : "bg-danger-surface text-danger hover:bg-danger-surface hover:text-danger"),
  );

  return (
    <span className="inline-flex items-center gap-0.5 border-l border-line-subtle pl-1.5" data-testid="answer-feedback">
      <button
        type="button"
        data-testid="feedback-up"
        aria-label="Helpful"
        aria-pressed={message.feedback === "up"}
        disabled={!allowed || saving}
        title={allowed ? "Helpful" : "Only the hirer can rate answers"}
        onClick={() => void click("up")}
        className={thumbClass(message.feedback === "up", "up")}
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        data-testid="feedback-down"
        aria-label="Not helpful"
        aria-pressed={message.feedback === "down"}
        disabled={!allowed || saving}
        title={allowed ? "Not helpful" : "Only the hirer can rate answers"}
        onClick={() => void click("down")}
        className={thumbClass(message.feedback === "down", "down")}
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </span>
  );
}
