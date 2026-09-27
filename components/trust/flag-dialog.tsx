"use client";

import { useState } from "react";
import { Flag as FlagIcon } from "lucide-react";
import { toast } from "sonner";
import { buttonClass } from "@/components/app/ui";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FLAG_DETAIL_MAX, FLAG_REASONS, createFlag, type FlagReasonId, type FlagTarget } from "@/features/trust/flags";

const ERROR_COPY: Record<"reason_required" | "detail_required" | "detail_too_long" | "unknown_target" | "already_flagged", string> = {
  reason_required: "Choose a reason.",
  detail_required: "Add details for \"Something else\".",
  detail_too_long: `Keep the details under ${FLAG_DETAIL_MAX} characters.`,
  unknown_target: "That could not be found.",
  already_flagged: "You already flagged this. The admin will review it.",
};

/* Reusable flag control: a FlagButton that opens a reason dialog (MKT-06). Consumed by chat here and by Plan 04-05 on the listing. */
export function FlagButton({ target, variant = "icon" }: { target: FlagTarget; variant?: "icon" | "label" }) {
  const [open, setOpen] = useState(false);
  const [reasonId, setReasonId] = useState<FlagReasonId | "">("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noun = target.type === "conversation" ? "conversation" : "agent";

  const reset = () => {
    setReasonId("");
    setDetail("");
    setError(null);
  };

  const submit = () => {
    const result = createFlag(target, reasonId, detail);
    if (!result.ok) {
      setError(ERROR_COPY[result.error]);
      return;
    }
    reset();
    setOpen(false);
    toast("Flag sent to the admin queue");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <button
        type="button"
        data-testid="flag-button"
        aria-label={`Flag this ${noun}`}
        onClick={() => setOpen(true)}
        className={buttonClass("secondary", "sm")}
      >
        <FlagIcon />
        {variant === "label" && "Flag agent"}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{noun === "agent" ? "Flag this agent" : "Flag this conversation"}</DialogTitle>
          <DialogDescription>Flags go to the admin queue. The expert doesn&apos;t see who flagged.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            {FLAG_REASONS.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="flag-reason"
                  value={r.id}
                  checked={reasonId === r.id}
                  onChange={() => setReasonId(r.id)}
                />
                {r.label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="flag-detail" className="text-[13px] font-medium">
              Details{reasonId === "other" ? "" : " (optional)"}
            </label>
            <Textarea
              id="flag-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, FLAG_DETAIL_MAX))}
              maxLength={FLAG_DETAIL_MAX}
              placeholder="What happened?"
              rows={3}
            />
            <div className="text-xs text-fg-muted">
              {detail.length}/{FLAG_DETAIL_MAX}
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className={buttonClass("secondary", "lg")}>
              Cancel
            </button>
          </DialogClose>
          <button type="button" className={buttonClass("primary", "lg")} disabled={!reasonId} onClick={submit}>
            Send flag
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
