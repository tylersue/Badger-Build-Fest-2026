"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, FlaskConical, Rocket, UserRound } from "lucide-react";
import { toast } from "sonner";
import { BuilderSplit, NotOwnerNote, sourcesFor, useBuilderAgent } from "@/components/app/builder";
import { AssistantMessage, Composer, NotEnoughCredits, RetrievedSources, UserMessage } from "@/components/app/chat";
import { Breadcrumbs, EmptyState, PageBody, PageHeader, PlaceholderNote, StatusPill, buttonClass } from "@/components/app/ui";
import { answerInterview, displayName, interviewTurnsFor, messagesFor, pendingInterviewQuestion, sandboxConversationId, sendSandboxMessage } from "@/lib/demo-store";
import { categoryLabel } from "@/lib/config/categories";
import { formatCredits } from "@/lib/format";
import { useState } from "react";
import type { Agent } from "@/lib/types";

const SECTIONS = ["interview", "persona", "knowledge", "test", "publish"] as const;
type Section = (typeof SECTIONS)[number];

const LABELS: Record<Section, string> = {
  interview: "Interview", persona: "Persona", knowledge: "Knowledge", test: "Test", publish: "Publish",
};

export function BuilderSectionView() {
  const { section } = useParams<{ agentId: string; section: string }>();
  const { s, agent, isOwner } = useBuilderAgent();
  if (!agent) return <PageBody><EmptyState icon={BookOpen} heading="Agent not found" body="Choose an agent from the list." action={{ label: "My agents", href: "/build" }} /></PageBody>;
  if (!SECTIONS.includes(section as Section)) return <PageBody><EmptyState icon={BookOpen} heading="Section not found" body="Open the agent's interview to continue." action={{ label: "Interview", href: `/build/${agent.id}/interview` }} /></PageBody>;

  const active = section as Section;
  return (
    <>
      <Breadcrumbs items={[{ label: "My agents", href: "/build" }, { label: agent.persona.name, href: `/build/${agent.id}/interview` }, { label: LABELS[active] }]} />
      <nav aria-label="Builder sections" className="flex flex-wrap gap-1 border-b border-line-faint px-6 pb-2">
        {SECTIONS.map((item) => <Link key={item} href={`/build/${agent.id}/${item}`} aria-current={item === active ? "page" : undefined} className={`rounded px-3 py-1.5 text-[13px] ${item === active ? "bg-selected text-selected-fg" : "text-fg-muted hover:bg-surface-2"}`}>{LABELS[item]}</Link>)}
      </nav>
      {!isOwner && <div className="pt-3"><NotOwnerNote ownerName={displayName(s, agent.ownerId)} /></div>}
      {active === "interview" ? <InterviewSection agent={agent} isOwner={isOwner} /> :
        active === "test" ? <TestSection agent={agent} isOwner={isOwner} /> :
        <DetailsSection agent={agent} section={active} />}
    </>
  );
}

function InterviewSection({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const { s } = useBuilderAgent();
  const [refusal, setRefusal] = useState<{ needed: number; available: number } | null>(null);
  const turns = interviewTurnsFor(s, agent.id);
  const pending = pendingInterviewQuestion(s, agent.id);
  return (
    <BuilderSplit agent={agent} thread="· Interview" composer={<Composer placeholder="Write your answer…" disabled={!isOwner} onSend={async (text) => {
      try {
        const result = await answerInterview(agent.id, text);
        if (!result.ok) { setRefusal({ needed: result.neededCents, available: result.availableCents }); return false; }
        setRefusal(null);
        toast("Answer saved");
        return true;
      } catch (error) { toast.error(error instanceof Error ? error.message : "Interview unavailable."); return false; }
    }} />}>
      <div className="mx-auto w-full max-w-[752px] flex-1 overflow-y-auto px-4 py-6">
        <PageHeader title="Interview" subtitle="You'll be asked about what you know and how you work. Every answer becomes knowledge." />
        {turns.map((turn) => <div key={turn.id} className="mb-6"><AssistantMessage content={turn.question} />{turn.answer && <UserMessage content={turn.answer} />}</div>)}
        {!turns.some((turn) => turn.id === pending.turnId) && <AssistantMessage content={pending.question} />}
        {refusal && <NotEnoughCredits needed={refusal.needed} available={refusal.available} onDismiss={() => setRefusal(null)} />}
        <PlaceholderNote feature="adaptive interview questions and embedded answers" phase={2} />
      </div>
    </BuilderSplit>
  );
}

function TestSection({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const { s } = useBuilderAgent();
  const [refusal, setRefusal] = useState<{ needed: number; available: number } | null>(null);
  const messages = messagesFor(s, sandboxConversationId(agent.id));
  return (
    <BuilderSplit agent={agent} thread="· Test" composer={<Composer placeholder="Write your message…" disabled={!isOwner} onSend={async (text) => {
      try {
        const result = await sendSandboxMessage(agent.id, text);
        if (!result.ok) { setRefusal({ needed: result.neededCents, available: result.availableCents }); return false; }
        setRefusal(null);
        return true;
      } catch (error) { toast.error(error instanceof Error ? error.message : "Sandbox unavailable."); return false; }
    }} />}>
      <div className="mx-auto w-full max-w-[752px] flex-1 overflow-y-auto px-4 py-6">
        <PageHeader title="Test" subtitle="Ask what a hirer would ask. Retrieved sources show under each answer." />
        {messages.length === 0 && <EmptyState icon={FlaskConical} heading="No test messages yet" body="Ask a question to see how your agent responds." />}
        {messages.map((message) => message.role === "user" ? <UserMessage key={message.id} content={message.content} /> : <div key={message.id}>{message.retrieved && <RetrievedSources items={message.retrieved} />}<AssistantMessage content={message.content} citations={message.citations} caption={formatCredits(message.costCents ?? 0)} /></div>)}
        {refusal && <NotEnoughCredits needed={refusal.needed} available={refusal.available} onDismiss={() => setRefusal(null)} />}
        <PlaceholderNote feature="grounded test answers" phase={2} />
      </div>
    </BuilderSplit>
  );
}

function DetailsSection({ agent, section }: { agent: Agent; section: "persona" | "knowledge" | "publish" }) {
  const { s } = useBuilderAgent();
  const base = `/build/${agent.id}`;
  const sources = sourcesFor(s, agent.id);
  const icon = section === "persona" ? UserRound : section === "knowledge" ? BookOpen : Rocket;
  return (
    <PageBody>
      <PageHeader title={LABELS[section]} subtitle={section === "persona" ? "Shape how your agent introduces itself and responds." : section === "knowledge" ? "Interview answers and documents that support your agent's replies." : "Review your agent before sharing it in the marketplace."} />
      {section === "persona" && <div className="grid max-w-[720px] gap-3 rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm">
        <Detail label="Name" value={agent.persona.name} /><Detail label="Category" value={categoryLabel(agent.persona.category)} /><Detail label="Headline" value={agent.persona.headline} /><Detail label="How I work" value={agent.persona.howIWork} />
        <PlaceholderNote feature="interview-drafted persona editing" phase={2} />
      </div>}
      {section === "knowledge" && (sources.length ? <div className="grid max-w-[720px] gap-2">{sources.map((source) => <div key={source.id} className="rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm"><div className="font-medium">{source.name}</div><div className="mt-1 text-xs text-fg-muted">{source.status} · {source.chunkCount} chunks</div></div>)}<PlaceholderNote feature="document upload and retrieval" phase={2} /></div> : <><EmptyState icon={icon} heading="No sources yet" body="Interview answers land here automatically. Add documents any time." action={{ label: "Start interview", href: `${base}/interview` }} /><PlaceholderNote feature="document upload and retrieval" phase={2} /></>)}
      {section === "publish" && <div className="grid max-w-[720px] gap-4 rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm">
        <Detail label="Rate multiplier" value={`${agent.rateMultiplier}×`} /><Detail label="Content consent" value={agent.consentAcceptedAt ? "Accepted" : "Not accepted yet"} /><div><span className="mr-2 text-fg-muted">Status</span><StatusPill status={agent.status} /></div>
        <div><Link href={`/agents/${agent.slug}`} className={buttonClass("secondary", "lg")}>Preview listing</Link></div>
        <PlaceholderNote feature="publishing controls" phase={3} />
      </div>}
    </PageBody>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-line-faint pb-2 last:border-0"><span className="text-xs text-fg-muted">{label}</span><span>{value || "Not set"}</span></div>;
}
