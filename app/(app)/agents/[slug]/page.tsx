"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, CircleCheck, EyeOff, SearchX, X } from "lucide-react";
import { Breadcrumbs, Card, EmptyState, PageBody, Pill, buttonClass } from "@/components/app/ui";
import { IdentityLogo, companyFor } from "@/components/app/identity-logo";
import { agentById, currentIdentity, displayName, knowledgeStats, profileFor, purchasesFor, useDemo } from "@/lib/demo-store";
import { CheckoutDialog } from "@/components/app/checkout-dialog";
import { agentPriceCredits, buyerCount, compactNumber, ratingTotal } from "@/lib/config/purchase";
import { categoryLabel, disclaimerFor } from "@/lib/config/categories";
import { formatCredits, formatRelative } from "@/lib/format";
import { AgentListingExtras } from "@/components/trust/listing-extras";
import { api } from "@/lib/api-client";
import { EXPERT_MEDIA } from "@/lib/demo-backend/media";

/* Listing page (PUB-04, MKT-03, MKT-04): generated from persona + profile, Fleet template-detail pattern (UI-SPEC). */
export default function ListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const s = useDemo();
  const agent = agentById(s, slug);
  const agentId = agent?.id;
  const [checkout, setCheckout] = useState(false);
  const [publicStats, setPublicStats] = useState<{ answers: number; documents: number; activeChunks: number; lastUpdatedAt: string } | null>(null);
  useEffect(() => {
    if (!agentId || s.status !== "ready") return;
    let active = true;
    void api.publicStats(agentId).then(value => { if (active) setPublicStats(value); }, () => undefined);
    return () => { active = false; };
  }, [agentId, s.status, s.identityId]);

  if (!agent) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: "Not found" }]} />
        <EmptyState icon={SearchX} heading="Agent not found" body="It may have been unpublished." action={{ label: "Browse marketplace", href: "/marketplace" }} />
      </>
    );
  }

  const me = currentIdentity(s);
  const isOwner = agent.ownerId === me.id;
  const bought = purchasesFor(s).find((p) => p.agentId === agent.id);

  if (agent.status !== "published" && !isOwner) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: agent.persona.name }]} />
        <EmptyState icon={EyeOff} heading="This agent isn't published" body="The expert has taken it off the marketplace. Existing chats keep working." action={{ label: "Browse marketplace", href: "/marketplace" }} />
      </>
    );
  }

  const profile = profileFor(s, agent.ownerId);
  const company = companyFor(agent.ownerId);
  const disclaimer = disclaimerFor(agent.persona.category);
  const knowledge = knowledgeStats(s, agent.id);
  const docs = publicStats?.documents ?? (s.snapshot?.sources ?? []).filter((x) => x.agentId === agent.id && x.kind !== "interview").length;
  const publications = EXPERT_MEDIA.filter((item) => item.agentId === agent.id).length;
  const answers = publicStats?.answers ?? knowledge.answers;
  const builtFrom = ([
    [answers, answers === 1 ? "interview answer" : "interview answers"],
    [docs, docs === 1 ? "document" : "documents"],
    [publications, publications === 1 ? "publication" : "publications"],
  ] as [number, string][]).filter(([value], i) => i === 0 || value > 0);
  const rules = [
    { label: "Always", items: agent.persona.always.filter((x) => x.trim()).slice(0, 3), Icon: Check },
    { label: "Never", items: agent.persona.never.filter((x) => x.trim()).slice(0, 3), Icon: X },
  ];

  const price = agentPriceCredits(agent.rateMultiplier);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Marketplace", href: "/marketplace" }, { label: agent.persona.name }]}
        actions={
          <>
            {isOwner && agent.status !== "published" && <Pill>Preview · {agent.status}</Pill>}
            {/* One-time price: founders hire the agent, then every chat with it is included. */}
            {isOwner
              ? <Link href={`/build/${agent.id}/test`} data-testid="start-chat" className={buttonClass("primary", "lg")}>Test agent</Link>
              : bought
                ? <Link href={`/chat/${bought.conversationId}`} data-testid="open-bought" className={buttonClass("primary", "lg")}><CircleCheck /> In My agents · Open chat</Link>
                : <button type="button" data-testid="buy-agent" onClick={() => setCheckout(true)} className={buttonClass("primary", "lg")}>Hire · {formatCredits(price)}</button>}
            {!isOwner && <CheckoutDialog agent={agent} open={checkout} onOpenChange={setCheckout} />}
          </>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-[1080px]">
          <div className="mt-4 mb-6 grid overflow-hidden rounded-xl border border-line-subtle bg-surface-1 lg:grid-cols-2">
            <div className="p-8">
              <h1 data-testid="page-title" className="mb-3 text-[28px] leading-[1.2] font-medium">{agent.persona.name}</h1>
              <p className="mb-5 leading-normal text-fg-tertiary">{agent.persona.description || agent.persona.headline}</p>
              <div className="flex items-center gap-3">
                <IdentityLogo identityId={agent.ownerId} size={40} />
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                    {displayName(s, agent.ownerId)}
                    {company && <span className="font-normal text-fg-muted">· {company}</span>}
                    <Pill>Self-reported</Pill>
                  </div>
                  <div className="text-xs text-fg-muted">
                    {[profile.credentials, profile.yearsExperience ? `${profile.yearsExperience} years` : null, profile.location].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-[13px] text-fg-muted">
                <Pill>{categoryLabel(agent.persona.category)}</Pill>
                <span>{agent.ratingCount ? `★ ${agent.ratingAvg.toFixed(1)} (${compactNumber(ratingTotal(agent))}) · ${compactNumber(buyerCount(agent, !!bought))} hired` : "No ratings yet"}</span>
                <span data-testid="listing-cost">{formatCredits(price)} once · unlimited chats</span>
                <span data-testid="knowledge-updated">Knowledge updated {formatRelative(publicStats?.lastUpdatedAt ?? knowledge.lastUpdatedAt)}</span>
              </div>
              {disclaimer && <p data-testid="listing-disclaimer" className="mt-5 text-[13px] text-fg-muted">{disclaimer}</p>}
            </div>
            <div data-testid="listing-inside" className="border-t border-line-subtle p-8 lg:border-t-0 lg:border-l">
              {agent.persona.howIWork.trim() && (
                <>
                  <h2 className="text-xs font-medium text-fg-muted">How it works</h2>
                  <p className="mt-2 text-[15px] leading-normal text-foreground">{agent.persona.howIWork}</p>
                </>
              )}
              <div className={`grid grid-cols-3 gap-4 border-b border-line-subtle pb-5 ${agent.persona.howIWork.trim() ? "mt-5 border-t pt-5" : ""}`}>
                {builtFrom.map(([value, label]) => (
                  <div key={label}>
                    <div className="text-xl font-semibold tabular-nums">{value}</div>
                    <div className="mt-0.5 text-xs text-fg-muted">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {rules.map(({ label, items, Icon }) => items.length > 0 && (
                  <div key={label}>
                    <h2 className="text-xs font-medium text-fg-muted">{label}</h2>
                    <ul className="mt-2 space-y-2 text-sm text-fg-secondary">
                      {items.map((item) => <li key={item} className="flex gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-fg-muted" />{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Card className="mb-4 p-6">
            <h3 className="mb-3 text-base font-semibold">About the expert</h3>
            <p className="text-fg-tertiary">
              {profile.bio}{" "}
              {profile.contactUrl && (
                <Link href={profile.contactUrl} target="_blank" className="text-foreground underline decoration-line-outline underline-offset-2 hover:decoration-current">
                  Contact {displayName(s, agent.ownerId).split(" ")[0]}
                </Link>
              )}
            </p>
          </Card>
          <AgentListingExtras agent={agent} />
        </div>
      </PageBody>
    </>
  );
}
