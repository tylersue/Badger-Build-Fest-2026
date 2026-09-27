"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Circle, CircleCheck, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, PageBody, PageHeader, StatusPill, buttonClass } from "@/components/app/ui";
import { knowledgeStats, publishAgent, setRateMultiplier, unpublishAgent, useDemo } from "@/lib/demo-store";
import { publishChecklist } from "@/features/marketplace/publish";
import { PURCHASE_EXPERT_SHARE, agentPriceCredits } from "@/lib/config/purchase";
import { CONSENT_TEXT, RATE_MAX, RATE_MIN, RATE_STEP } from "@/lib/config/publish";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";
import { api } from "@/lib/api-client";

/* Publish tab (PUB-01..04): checklist gate, price slider, consent, instant publish and unpublish. */
export function PublishSection({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const s = useDemo();
  const stats = knowledgeStats(s, agent.id);
  const [activeChunks, setActiveChunks] = useState<number | null>(null);
  const [rateOverride, setRateOverride] = useState<number | null>(null);
  const rate = rateOverride ?? agent.rateMultiplier;
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isOwner || s.status !== "ready") return;
    let active = true;
    void api.publishStatus(agent.id).then(value => { if (active) setActiveChunks(value.activeChunks); },
      error => { if (active) toast.error(error instanceof Error ? error.message : "Publish checklist unavailable."); });
    return () => { active = false; };
  }, [agent.id, isOwner, s.status, s.snapshot]);
  const checklist = publishChecklist(agent.persona, activeChunks ?? 0);
  const ready = checklist.every((item) => item.ok);
  const accepted = !!agent.consentAcceptedAt;
  const [consent, setConsent] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const published = agent.status === "published";
  const canPublishNow = isOwner && activeChunks !== null && ready && (accepted || consent) && !busy;
  const price = agentPriceCredits(rate);
  const expertShare = Math.round(price * PURCHASE_EXPERT_SHARE * 100) / 100;
  const base = `/build/${agent.id}`;

  const publish = async () => {
    setBusy(true);
    try { await publishAgent(agent.id, { acceptConsent: consent }); toast("Agent published · it's live in the marketplace"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not publish agent."); }
    finally { setBusy(false); }
  };

  const unpublish = async () => {
    setBusy(true);
    try { await unpublishAgent(agent.id); setConfirmUnpublish(false); toast("Agent unpublished"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not unpublish agent."); }
    finally { setBusy(false); }
  };
  const changeRate = async (next: number) => {
    setRateOverride(next); setBusy(true);
    try { await setRateMultiplier(agent.id, next); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save price."); }
    finally { setRateOverride(null); setBusy(false); }
  };

  return (
    <PageBody>
      <PageHeader title="Publish" />
      <div className="grid max-w-[720px] gap-4">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Ready to publish?</h3>
          <ul className="grid gap-2 text-sm">
            {checklist.map((item) => (
              <li key={item.id} data-testid={`check-${item.id}`} data-ok={item.ok} className="flex items-start gap-2">
                {item.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-fg-muted" />}
                <span className="min-w-0 flex-1">
                  <span className={cn(!item.ok && "text-fg-tertiary")}>{item.label}</span>
                  <span className="ml-2 text-xs text-fg-muted">{item.detail}</span>
                </span>
                {!item.ok && isOwner && (
                  <Link href={`${base}/${item.fix}`} className="shrink-0 text-xs text-foreground underline decoration-line-outline underline-offset-2 hover:decoration-current">
                    {item.fix === "persona" ? "Edit persona" : "Add answers"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold">Price</h3>
            <span data-testid="rate-value" className="text-sm tabular-nums">
              {formatCredits(price)} · one-time
            </span>
          </div>
          <input
            data-testid="rate-slider"
            type="range"
            min={RATE_MIN}
            max={RATE_MAX}
            step={RATE_STEP}
            value={rate}
            disabled={!isOwner || busy}
            onChange={(e) => void changeRate(Number(e.target.value))}
            aria-label="Price"
            className="mt-3 w-full accent-brand"
          />
          <div className="mt-1 flex justify-between text-[11px] text-fg-muted">
            <span>{formatCredits(agentPriceCredits(RATE_MIN))}</span>
            <span>{formatCredits(agentPriceCredits(RATE_MAX))}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <ShareTile label="Hirer pays" value={price} />
            <ShareTile label="Platform keeps" value={price - expertShare} caption="15% of each hire" />
            <ShareTile label="You earn" value={expertShare} caption="85% of each hire" tone="success" />
          </div>
          <p className="mt-3 text-xs text-fg-muted">Founders pay once and get unlimited chats with your agent.</p>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">Content consent</h3>
          {accepted ? (
            <p data-testid="consent-accepted" className="text-[13px] text-fg-tertiary">
              Accepted {agent.consentAcceptedAt!.slice(0, 10)}. {CONSENT_TEXT}
            </p>
          ) : (
            <label className="flex items-start gap-2.5 text-[13px]">
              <input data-testid="consent-checkbox" type="checkbox" checked={consent} disabled={!isOwner} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
              <span className="text-fg-tertiary">{CONSENT_TEXT}</span>
            </label>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={agent.status} />
            <span className="text-[13px] text-fg-muted">
              {published ? "Live in the marketplace." : `${stats.answers} interview answers · ${stats.docChunks} document chunks`}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <Link href={`/agents/${agent.slug}`} className={buttonClass("secondary", "lg")}>
                {published ? "View listing" : "Preview listing"}
              </Link>
              {published ? (
                <button data-testid="unpublish" onClick={() => setConfirmUnpublish(true)} disabled={!isOwner || busy} className={buttonClass("destructive", "lg")}>
                  Unpublish
                </button>
              ) : (
                <button data-testid="publish" onClick={() => void publish()} disabled={!canPublishNow} className={buttonClass("primary", "lg")}>
                  <Rocket />
                  Publish agent
                </button>
              )}
            </span>
          </div>
          {!published && isOwner && !canPublishNow && (
            <p className="mt-3 text-xs text-fg-muted">{ready ? "Accept the content consent to publish." : "Finish the checklist above to publish."}</p>
          )}
          {confirmUnpublish && (
            <div data-testid="unpublish-confirm" className="mt-4 rounded-xl border border-warning/40 bg-warning-surface/40 p-4 text-[13px]">
              <div className="font-semibold">Unpublish agent</div>
              <p className="mt-1 text-fg-tertiary">{agent.persona.name} leaves the marketplace now. Open chats keep working.</p>
              <div className="mt-3 flex gap-2">
                <button data-testid="unpublish-confirm-button" onClick={() => void unpublish()} disabled={busy} className={buttonClass("destructive")}>
                  Unpublish
                </button>
                <button onClick={() => setConfirmUnpublish(false)} className={buttonClass("secondary")}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageBody>
  );
}

function ShareTile({ label, value, caption, tone = "default" }: { label: string; value: number; caption?: string; tone?: "default" | "success" }) {
  return (
    <div className="rounded-lg border border-line-muted bg-surface-2 p-3 text-center">
      <div className="text-[11px] text-fg-muted">{label}</div>
      <div className={cn("mt-0.5 text-base font-medium tabular-nums", tone === "success" && "text-success")}>{formatCredits(value)}</div>
      {caption && <div className="mt-0.5 text-[11px] text-fg-muted">{caption}</div>}
    </div>
  );
}
