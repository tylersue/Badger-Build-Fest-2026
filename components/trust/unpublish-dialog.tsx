"use client";

import { useState } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/app/ui";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MODERATION_NOTE_MAX, unpublishAgentWithNote } from "@/features/trust/moderation";

const ERROR_COPY: Record<"note_required" | "note_too_long" | "unknown_agent" | "not_published", string> = {
  note_required: "A note for the expert is required.",
  note_too_long: `Keep the note under ${MODERATION_NOTE_MAX} characters.`,
  unknown_agent: "That agent could not be found.",
  not_published: "This agent is already unpublished.",
};

/* Admin destructive confirmation with a required note (ADMN-01, 01-UI-SPEC "Admin unpublish"). */
export function UnpublishDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const trimmed = note.trim();

  const reset = () => {
    setNote("");
    setError(null);
  };

  const confirm = () => {
    const result = unpublishAgentWithNote(agentId, note);
    if (!result.ok) {
      setError(ERROR_COPY[result.error]);
      return;
    }
    reset();
    onOpenChange(false);
    toast(`${agentName} unpublished`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unpublish agent</DialogTitle>
          <DialogDescription>{agentName} leaves the marketplace now. Open chats keep working.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unpublish-note" className="text-[13px] font-medium">
            Note for the expert
          </label>
          <Textarea
            id="unpublish-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MODERATION_NOTE_MAX))}
            maxLength={MODERATION_NOTE_MAX}
            placeholder="Explain why this agent is being unpublished…"
            rows={4}
          />
          <div className="text-xs text-fg-muted">
            {note.length}/{MODERATION_NOTE_MAX}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className={buttonClass("secondary", "lg")}>
              Cancel
            </button>
          </DialogClose>
          <button type="button" className={buttonClass("destructive", "lg")} disabled={!trimmed} onClick={confirm}>
            Unpublish
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
