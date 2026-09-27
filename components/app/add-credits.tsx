"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buttonClass } from "@/components/app/ui";
import { addCredits } from "@/lib/demo-store";
import { UNIT_LABEL, formatCredits } from "@/lib/format";

/* Mock funding (D-11, CRED-06): instant, repeatable, a ledger row per click, no payment taken. */
export function AddCreditsButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"subscription" | "pack" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const grant = async (kind: "subscription" | "pack") => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(kind); setError(null);
    try {
      const r = await addCredits(kind);
      toast(`Credits added · +${formatCredits(r.grantedCents)} (mock)`);
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Funding unavailable."; setError(message); toast.error(message); }
    finally { inFlight.current = false; setBusy(null); }
  };
  return (
    <>
      <button data-testid="add-credits" onClick={() => setOpen(true)} className={buttonClass("primary", size)}>
        <Plus />
        {UNIT_LABEL === "tokens" ? "Buy tokens" : "Add credits"}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[min(100vw,480px)] border-line-faint bg-surface-1 sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>{UNIT_LABEL === "tokens" ? "Buy tokens" : "Add credits"}</SheetTitle>
            <SheetDescription>Mock funding for the MVP. No payment is taken; each click adds {UNIT_LABEL} and a ledger row.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            <div className="rounded-xl border border-line-muted bg-surface-2 p-4">
              <div className="text-sm font-semibold">Subscribe</div>
              <p className="mt-1 text-[13px] text-fg-muted">Mock monthly plan. Each click requests a separate grant; the credited amount appears after the server confirms it.</p>
              <button type="button" data-testid="subscribe" disabled={!!busy} onClick={() => void grant("subscription")} className={buttonClass("primary", "lg") + " mt-3 w-full"}>
                {busy === "subscription" ? `Adding ${UNIT_LABEL}…` : "Subscribe (mock)"}
              </button>
            </div>
            <div className="rounded-xl border border-line-muted bg-surface-2 p-4">
              <div className="text-sm font-semibold">Buy pack</div>
              <p className="mt-1 text-[13px] text-fg-muted">Mock one-off pack. The server records a separate ledger entry for each confirmed click.</p>
              <button type="button" data-testid="buy-pack" disabled={!!busy} onClick={() => void grant("pack")} className={buttonClass("primary", "lg") + " mt-3 w-full"}>
                {busy === "pack" ? `Adding ${UNIT_LABEL}…` : "Buy pack (mock)"}
              </button>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error} No new credit confirmation was received. Check your wallet before retrying.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
