"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CircleCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AddCreditsButton } from "@/components/app/add-credits";
import { IdentityLogo, companyFor } from "@/components/app/identity-logo";
import { buttonClass } from "@/components/app/ui";
import { agentPriceCredits } from "@/lib/config/purchase";
import { balanceOf, currentIdentity, displayName, purchaseAgent, useDemo } from "@/lib/demo-store";
import { formatCredits } from "@/lib/format";
import type { Agent } from "@/lib/types";

/* Checkout for one agent: review, then a single Buy now adds it to My agents with a chat ready. */
export function CheckoutDialog({ agent, open, onOpenChange }: { agent: Agent; open: boolean; onOpenChange: (open: boolean) => void }) {
  const s = useDemo();
  const me = currentIdentity(s);
  const [state, setState] = useState<"review" | "buying" | "done">("review");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const price = agentPriceCredits(agent.rateMultiplier);
  const balance = balanceOf(s, me.id);
  const expert = displayName(s, agent.ownerId);
  const company = companyFor(agent.ownerId);
  const short = agent.persona.name.includes("·") ? agent.persona.name.split("·").slice(1).join("·").trim() : agent.persona.name;

  const buy = async () => {
    setState("buying"); setError(null);
    try {
      const result = await purchaseAgent(agent.id);
      if (!result.ok) { setError(`You need ${formatCredits(result.neededCents)} and have ${formatCredits(result.availableCents)}.`); setState("review"); return; }
      setConversationId(result.conversationId); setState("done");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout failed. Try again."); setState("review"); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (state !== "buying") onOpenChange(next); }}>
      <DialogContent className="max-w-[440px] border border-line-subtle bg-surface-1 p-0">
        {state === "done" ? (
          <div className="p-6 text-center" data-testid="checkout-done">
            <CircleCheck className="mx-auto size-10 text-success" aria-hidden />
            <DialogTitle className="mt-3 text-lg">Added to My agents</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-fg-muted">{short} by {expert} is ready. Chats with it are included.</DialogDescription>
            <div className="mt-5 flex justify-center gap-2">
              {conversationId && <Link href={`/chat/${conversationId}`} className={buttonClass("primary", "lg")} onClick={() => onOpenChange(false)}>Start using it</Link>}
              <button type="button" className={buttonClass("secondary", "lg")} onClick={() => onOpenChange(false)}>Keep browsing</button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-line-subtle p-5">
              <DialogTitle className="text-base">Checkout</DialogTitle>
              <div className="mt-4 flex items-center gap-3">
                <IdentityLogo identityId={agent.ownerId} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{short}</p>
                  <p className="truncate text-sm text-fg-muted">{expert}{company ? ` · ${company}` : ""}</p>
                </div>
              </div>
              <DialogDescription asChild>
                <ul className="mt-4 space-y-2 text-sm text-fg-secondary">
                  {[`Added to My agents, ready to use`, `Answers from ${expert.split(" ")[0]}'s own knowledge, with citations`, "Unlimited chats included"].map((line) => (
                    <li key={line} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{line}</li>
                  ))}
                </ul>
              </DialogDescription>
            </div>
            <dl className="space-y-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-fg-muted">Price</dt><dd className="tabular-nums">{formatCredits(price)} <span className="text-fg-muted">(${(price / 100).toFixed(2)})</span></dd></div>
              <div className="flex justify-between"><dt className="text-fg-muted">Your balance</dt><dd className="tabular-nums">{formatCredits(balance)}</dd></div>
              <div className="flex justify-between border-t border-line-subtle pt-2 font-medium"><dt>After purchase</dt><dd className="tabular-nums">{formatCredits(Math.max(0, balance - price))}</dd></div>
            </dl>
            {error && <div role="alert" className="mx-5 mb-3 rounded-lg bg-danger-surface p-3 text-sm">{error} <AddCreditsButton size="sm" /></div>}
            <div className="flex gap-2 p-5 pt-0">
              <button type="button" data-testid="buy-now" className={`${buttonClass("primary", "lg")} flex-1 justify-center`} disabled={state === "buying"} onClick={() => void buy()}>
                {state === "buying" ? "Buying…" : `Buy now · ${formatCredits(price)}`}
              </button>
              <button type="button" className={buttonClass("secondary", "lg")} disabled={state === "buying"} onClick={() => onOpenChange(false)}>Cancel</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
