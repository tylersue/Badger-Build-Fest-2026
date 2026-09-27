"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { buttonClass } from "@/components/app/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cashoutSummary, requestCashout } from "@/features/billing/cashout";
import { currentIdentity, useDemo } from "@/lib/demo-store";
import { formatCredits, formatUsd } from "@/lib/format";

const ERROR_COPY = {
  invalid_amount: "Enter a positive whole number of credits.",
  nothing_available: "Nothing is available to cash out yet.",
  exceeds_available: "That is more than your available balance.",
} as const;

export function CashoutButton() {
  const s = useDemo();
  const me = currentIdentity(s);
  const summary = cashoutSummary(s, me.id);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  function submit() {
    const credits = Number(amount);
    const result = requestCashout(credits);
    if (!result.ok) {
      setError(ERROR_COPY[result.error]);
      return;
    }
    toast(`Cash-out requested · ${formatCredits(credits)} (${formatUsd(result.payout.amountUsdCents)})`);
    changeOpen(false);
    setAmount("");
  }

  return (
    <>
      <button
        type="button"
        data-testid="request-cashout"
        title={summary.availableCents === 0 ? "Nothing to cash out yet" : undefined}
        disabled={summary.availableCents === 0}
        onClick={() => { setAmount(String(summary.availableCents)); setError(null); setOpen(true); }}
        className={buttonClass("primary", "lg")}
      >
        <Banknote />
        Request cash-out
      </button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request cash-out</DialogTitle>
            <DialogDescription>Mock payout at 1¢ per credit. Credits leave your wallet now and the payout is recorded as requested. No money moves in this demo.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            Credits
            <input
              data-testid="cashout-amount"
              type="number"
              min={1}
              max={summary.availableCents}
              step={1}
              value={amount}
              onChange={(event) => { setAmount(event.target.value); setError(null); }}
              className="h-9 rounded-md border border-input bg-background px-3 font-normal"
            />
          </label>
          <p className="text-sm text-fg-muted">= {formatUsd(Number(amount) * 1)}</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <button type="button" className={buttonClass("secondary")} onClick={() => changeOpen(false)}>Cancel</button>
            <button type="button" className={buttonClass("primary")} onClick={submit} disabled={!amount || Number(amount) <= 0}>Request cash-out</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
