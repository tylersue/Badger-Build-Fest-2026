"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buttonClass } from "@/components/app/ui";
import { addCredits } from "@/lib/demo-store";
import { PACK_GRANT_CENTS, SUBSCRIPTION_GRANT_CENTS } from "@/lib/config/credits";
import { formatCredits, formatNumber, formatUsd } from "@/lib/format";

/* Mock funding (D-11, CRED-06): instant, repeatable, a ledger row per click, no payment taken. */
export function AddCreditsButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  const [open, setOpen] = useState(false);
  const grant = async (kind: "subscription" | "pack") => {
    try {
      const r = await addCredits(kind);
      toast(`Credits added · +${formatNumber(r.grantedCents)} (mock)`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Funding unavailable."); }
  };
  return (
    <>
      <button data-testid="add-credits" onClick={() => setOpen(true)} className={buttonClass("primary", size)}>
        <Plus />
        Add credits
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[480px] border-line-faint bg-surface-1 sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Add credits</SheetTitle>
            <SheetDescription>Mock funding for the MVP. No payment is taken; each click adds credits and a ledger row.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            <div className="rounded-xl border border-line-muted bg-surface-2 p-4">
              <div className="text-sm font-semibold">Subscribe</div>
              <p className="mt-1 text-[13px] text-fg-muted">Monthly platform plan. {formatCredits(SUBSCRIPTION_GRANT_CENTS)} ({formatUsd(SUBSCRIPTION_GRANT_CENTS)}) each time.</p>
              <button data-testid="subscribe" onClick={() => grant("subscription")} className={buttonClass("primary", "lg") + " mt-3 w-full"}>
                Subscribe — +{formatNumber(SUBSCRIPTION_GRANT_CENTS)} credits/mo
              </button>
            </div>
            <div className="rounded-xl border border-line-muted bg-surface-2 p-4">
              <div className="text-sm font-semibold">Buy pack</div>
              <p className="mt-1 text-[13px] text-fg-muted">One-off credit pack. {formatCredits(PACK_GRANT_CENTS)} ({formatUsd(PACK_GRANT_CENTS)}).</p>
              <button data-testid="buy-pack" onClick={() => grant("pack")} className={buttonClass("primary", "lg") + " mt-3 w-full"}>
                Buy pack — +{formatNumber(PACK_GRANT_CENTS)} credits
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
