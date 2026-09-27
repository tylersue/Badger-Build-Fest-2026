"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, EyeOff, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs, Card, EmptyState, PageBody, Pill, buttonClass } from "@/components/app/ui";
import { IdentityLogo, companyFor } from "@/components/app/identity-logo";
import { agentById, currentIdentity, displayName, knowledgeStats, profileFor, purchasesFor, sendChatMessage, startConversation, useDemo } from "@/lib/demo-store";
import { CheckoutDialog } from "@/components/app/checkout-dialog";
import { agentPriceCredits } from "@/lib/config/purchase";
import { categoryLabel, disclaimerFor } from "@/lib/config/categories";
import { typicalMessageCents } from "@/features/billing/pricing";
import { formatCredits, formatRelative } from "@/lib/format";
import { AgentListingExtras } from "@/components/trust/listing-extras";
import { api } from "@/lib/api-client";

/* Listing page (PUB-04, MKT-03, MKT-04): generated from persona + profile, Fleet template-detail pattern (UI-SPEC). */
export default function ListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
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
  /* A double-click on an example question must not start two conversations and two debits. */
  const starting = useRef(false);

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

  const start = async (question?: string) => {
    if (isOwner) {
      router.push(`/build/${agent.id}/test`);
      return;
    }
    if (starting.current) return;
    starting.current = true;
    try {
      const id = await startConversation(agent.id, question ?? "New conversation");
      if (question) {
        const r = await sendChatMessage(id, question);
        if (!r.ok) toast("Not enough credits. Add credits to continue.");
      }
      router.push(`/chat/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the conversation.");
    } finally {
      starting.current = false;
    }
  };

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Marketplace", href: "/marketplace" }, { label: agent.persona.name }]}
        actions={
          <>
            {isOwner && agent.status !== "published" && <Pill>Preview · {agent.status}</Pill>}
            {!isOwner && (bought
              ? <Link href={`/chat/${bought.conversationId}`} data-testid="open-bought" className={buttonClass("secondary", "lg")}><CircleCheck className="text-success" /> In My agents · Open chat</Link>
              : <button type="button" data-testid="buy-agent" onClick={() => setCheckout(true)} className={buttonClass("secondary", "lg")}>Buy · {formatCredits(agentPriceCredits(agent.rateMultiplier))}</button>)}
            <button data-testid="start-chat" onClick={() => void start()} className={buttonClass("primary", "lg")}>
              {isOwner ? "Test agent" : "Start chat"}
            </button>
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
                  <div className="flex items-center gap-2 font-semibold">
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
                <span>{agent.ratingCount ? `★ ${agent.ratingAvg.toFixed(1)} (${agent.ratingCount})` : "No ratings yet"}</span>
                <span data-testid="listing-cost">About {typicalMessageCents(agent.rateMultiplier)} credits per message</span>
                <span data-testid="knowledge-updated">Knowledge updated {formatRelative(publicStats?.lastUpdatedAt ?? knowledge.lastUpdatedAt)}</span>
              </div>
              {disclaimer && <p data-testid="listing-disclaimer" className="mt-5 text-[13px] text-fg-muted">{disclaimer}</p>}
            </div>
            <div className="m-4 grid min-h-[260px] place-items-center rounded-xl bg-surface-2">
              <div className="w-[70%] rounded-lg border border-line-subtle bg-surface-1 p-3 text-[11px] text-fg-muted">
                <span className="mb-1.5 flex items-center gap-1.5">
                  <IdentityLogo identityId={agent.ownerId} size={20} />
                  <b className="text-xs text-foreground">{displayName(s, agent.ownerId)}</b>
                </span>
                Persona · {publicStats?.answers ?? knowledge.answers} interview answers · {docs} {docs === 1 ? "document" : "documents"}
                <br />
                <br />
                <b className="block text-xs text-foreground">Always</b>
                {agent.persona.always[0] ?? "Cite the source"}
                <b className="mt-1 block text-xs text-foreground">Never</b>
                {agent.persona.never[0] ?? "Guess"}
              </div>
            </div>
          </div>

          <Card className="mb-4 p-6">
            <h3 className="mb-3 text-base font-semibold">Example questions</h3>
            {agent.persona.exampleQuestions.filter((q) => q.trim()).length === 0 && <p className="text-[13px] text-fg-muted">No example questions yet.</p>}
            {agent.persona.exampleQuestions.filter((q) => q.trim()).map((q) => (
              <button key={q} data-testid="example-question" onClick={() => void start(q)} className="flex w-full items-center gap-2.5 py-2 text-left text-sm hover:underline hover:underline-offset-2">
                <CircleCheck className="size-4 text-fg-muted" />
                {q}
              </button>
            ))}
          </Card>

          <Card className="mb-4 p-6">
            <h3 className="mb-3 text-base font-semibold">About the expert</h3>
            <p className="text-fg-tertiary">
              {profile.bio} Credentials are self-reported.{" "}
              {profile.contactUrl && (
                <Link href={profile.contactUrl} target="_blank" className="text-foreground underline decoration-line-outline underline-offset-2 hover:decoration-current">
                  Contact {displayName(s, agent.ownerId).split(" ")[0]}
                </Link>
              )}
            </p>
            {(publicStats?.activeChunks ?? knowledge.total) > 0 && (
              <p className="mt-3 text-xs text-fg-muted">
                Answers cite the expert&apos;s {publicStats?.answers ?? knowledge.answers} interview answers{docs ? ` and ${docs} documents` : ""}. When expert knowledge is incomplete, the agent labels its online sources separately.
              </p>
            )}
          </Card>
          <AgentListingExtras agent={agent} />
        </div>
      </PageBody>
    </>
  );
}
