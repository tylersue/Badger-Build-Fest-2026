"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import { BuilderSplit, NotOwnerNote, useBuilderAgent } from "@/components/app/builder";
import { AnswerEditor } from "@/components/app/answer-editor";
import { InterviewView } from "@/components/app/interview-view";
import { PersonaView } from "@/components/app/persona-view";
import { KnowledgeView } from "@/components/app/knowledge-view";
import { SandboxView } from "@/components/app/sandbox-view";
import { Breadcrumbs, EmptyState, PageBody, PageHeader, PlaceholderNote, StatusPill, buttonClass } from "@/components/app/ui";
import { displayName, refreshDemo } from "@/lib/demo-store";
import type { Agent } from "@/lib/types";

const SECTIONS = ["interview", "persona", "knowledge", "test", "publish"] as const;
type Section = (typeof SECTIONS)[number];
const LABELS: Record<Section, string> = {
  interview: "Interview", persona: "Persona", knowledge: "Knowledge", test: "Test", publish: "Publish",
};

export function BuilderSectionView() {
  const { section } = useParams<{ agentId: string; section: string }>();
  const { s, agent, isOwner } = useBuilderAgent();
  if (s.status === "error") return <PageBody><div role="alert" className="grid gap-3 text-sm text-danger"><p>{s.error ?? "Builder unavailable."}</p><button type="button" className={buttonClass("secondary", "lg") + " w-fit"} onClick={() => void refreshDemo(true).catch(() => undefined)}>Retry loading</button></div></PageBody>;
  if (s.status === "loading" || !s.snapshot || s.snapshot.identityId !== s.identityId)
    return <PageBody><p role="status" className="text-sm text-fg-muted">Loading selected identity…</p></PageBody>;
  if (!agent) return <PageBody><EmptyState icon={BookOpen} heading="Agent not found" body="Choose an agent from the list." action={{ label: "My agents", href: "/build" }} /></PageBody>;
  if (!SECTIONS.includes(section as Section)) return <PageBody><EmptyState icon={BookOpen} heading="Section not found" body="Open the agent's interview to continue." action={{ label: "Interview", href: `/build/${agent.id}/interview` }} /></PageBody>;

  const active = section as Section;
  return <>
    <Breadcrumbs items={[{ label: "My agents", href: "/build" }, { label: agent.persona.name, href: `/build/${agent.id}/interview` }, { label: LABELS[active] }]} />
    <nav aria-label="Builder sections" className="flex flex-wrap gap-1 border-b border-line-faint px-4 pb-2 sm:px-6">
      {SECTIONS.map(item => <Link key={item} href={`/build/${agent.id}/${item}`} aria-current={item === active ? "page" : undefined} className={`flex min-h-11 items-center rounded px-3 text-[13px] ${item === active ? "bg-selected text-selected-fg" : "text-fg-muted hover:bg-surface-2"}`}>{LABELS[item]}</Link>)}
    </nav>
    {!isOwner && <div className="pt-3"><NotOwnerNote ownerName={displayName(s, agent.ownerId)} /></div>}
    {active === "interview" ? <InterviewView key={`${s.identityId}:${agent.id}`} agent={agent} isOwner={isOwner} /> :
      active === "persona" ? <PersonaView key={`${s.identityId}:${agent.id}`} agent={agent} isOwner={isOwner} /> :
      active === "knowledge" ? <KnowledgeView key={`${s.identityId}:${agent.id}`} agent={agent} isOwner={isOwner}
        renderAnswerActions={(answer, onChange) => <AnswerEditor agentId={agent.id} answer={answer} isOwner={isOwner} onChange={onChange} />} /> :
      active === "test" ? <SandboxView key={`${s.identityId}:${agent.id}`} agent={agent} isOwner={isOwner} /> :
      <PublishSection agent={agent} />}
  </>;
}

function PublishSection({ agent }: { agent: Agent }) {
  return <BuilderSplit agent={agent} thread="· Publish" composer={null}>
    <PageBody>
      <PageHeader title="Publish" subtitle="Review your agent before sharing it in the marketplace." />
      <div className="grid max-w-[720px] gap-4 rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm">
        <div>Rate multiplier: {agent.rateMultiplier}×</div>
        <div>Content consent: {agent.consentAcceptedAt ? "Accepted" : "Not accepted yet"}</div>
        <StatusPill status={agent.status} />
        <div><Link href={`/agents/${agent.slug}`} className={buttonClass("secondary", "lg")}>Preview listing</Link></div>
        <PlaceholderNote feature="publishing controls" phase={3} />
      </div>
    </PageBody>
  </BuilderSplit>;
}
