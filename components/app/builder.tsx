"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronRight, Ellipsis, Eye, FileText, Menu, Mic, Plus, Rocket, Settings2, UserRound, X } from "lucide-react";
import { AgentTile, PlaceholderNote, StatusPill, buttonClass } from "@/components/app/ui";
import { agentById, currentIdentity, displayName, interviewTurnsFor, useDemo, type DemoState } from "@/lib/demo-store";
import { INTERVIEW_ANSWER_COUNTS, SOURCES } from "@/lib/data/seed";
import { categoryLabel } from "@/lib/config/categories";
import { typicalMessageCents } from "@/features/billing/pricing";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export function useBuilderAgent(): { s: DemoState; agent: Agent | undefined; isOwner: boolean } {
  const { agentId } = useParams<{ agentId: string }>();
  const s = useDemo();
  const agent = agentById(s, agentId);
  return { s, agent, isOwner: !!agent && agent.ownerId === currentIdentity(s).id };
}

export function sourcesFor(agentId: string) {
  return SOURCES.filter((x) => x.agentId === agentId);
}

/** Answers captured so far: the seeded count plus anything answered in this session. */
export function answerCount(s: DemoState, agentId: string) {
  const seededShown = interviewTurnsFor({ ...s, interviewTurns: [], answeredTurns: {} }, agentId).filter((t) => t.answer).length;
  const now = interviewTurnsFor(s, agentId).filter((t) => t.answer).length;
  return (INTERVIEW_ANSWER_COUNTS[agentId] ?? seededShown) + (now - seededShown);
}

/* Fleet builder split: chat column + 480px Configure drawer (D-05). */
export function BuilderSplit({ agent, thread, children, composer }: { agent: Agent; thread: string; children: ReactNode; composer: ReactNode }) {
  const [drawer, setDrawer] = useState(true);
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-3 px-4 text-sm font-medium">
          <Menu className="size-4 text-fg-muted" />
          <span className="truncate">
            {agent.persona.name} <span className="text-xs font-normal text-fg-muted">{thread}</span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button onClick={() => setDrawer(!drawer)} className={buttonClass("secondary")}>
              <Settings2 />
              Configure
            </button>
          </span>
        </div>
        {children}
        {composer}
      </div>
      {drawer && <ConfigureDrawer agent={agent} onClose={() => setDrawer(false)} />}
    </div>
  );
}

function ConfigureDrawer({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { s } = useBuilderAgent();
  const base = `/build/${agent.id}`;
  const sources = sourcesFor(agent.id);
  const answers = answerCount(s, agent.id);
  return (
    <aside className="hidden w-[480px] shrink-0 flex-col overflow-y-auto border-l border-line-faint bg-surface-1 lg:flex">
      <div className="flex items-center gap-3 border-b border-line-muted px-4 py-3">
        <AgentTile icon={agent.icon} />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{agent.persona.name}</div>
          <div className="truncate text-xs text-fg-tertiary">{agent.persona.headline || "No headline yet"}</div>
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <Link href={`/agents/${agent.slug}`} className={buttonClass("secondary")}>
            <Eye />
            View
          </Link>
          <button onClick={onClose} aria-label="Close" className="text-fg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </span>
      </div>

      <DrawerSection icon={UserRound} title="Persona">
        <DrawerRow href={`${base}/persona`} title="Headline" sub={agent.persona.headline || "Not set"} />
        <DrawerRow href={`${base}/persona`} title="Category" sub={categoryLabel(agent.persona.category)} />
        <DrawerRow href={`${base}/persona`} title="How I work" sub={agent.persona.howIWork || "Not set"} />
        <DrawerRow href={`${base}/persona`} title="Always / Never" sub={[agent.persona.always[0], agent.persona.never[0]].filter(Boolean).join(" · ") || "Not set"} />
        <DrawerRow href={`${base}/persona`} title="Advanced: system prompt" sub={agent.systemPromptOverride ? "Edited by hand" : "Generated from the form · editable"} />
      </DrawerSection>

      <DrawerSection icon={BookOpen} title="Knowledge" count={answers + sources.filter((x) => x.kind !== "interview").reduce((n, x) => n + x.chunkCount, 0)}>
        <DrawerRow href={`${base}/interview`} icon={Mic} title="Interview answers" sub={`${answers} answers · re-embedded on edit`} />
        {sources
          .filter((x) => x.kind !== "interview")
          .map((x) => (
            <DrawerRow key={x.id} href={`${base}/knowledge`} icon={FileText} title={x.name} sub={x.status === "ready" ? `Ready · ${x.chunkCount} chunks${x.pageCount ? ` · ${x.pageCount} pages` : ""}` : "Processing…"} menu />
          ))}
        <Link href={`${base}/knowledge`} className="mx-3 mt-2 mb-3 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-default text-[13px] text-selected-fg">
          <Plus className="size-3.5" />
          Add document
        </Link>
      </DrawerSection>

      <DrawerSection icon={Rocket} title="Publishing">
        <DrawerRow href={`${base}/publish`} title="Rate multiplier" sub={`${agent.rateMultiplier}× · about ${typicalMessageCents(agent.rateMultiplier)} credits per message`} />
        <DrawerRow href={`${base}/publish`} title="Content consent" sub={agent.consentAcceptedAt ? `Accepted ${agent.consentAcceptedAt.slice(0, 10)}` : "Not accepted yet"} />
        <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
          <StatusPill status={agent.status} />
          <Link href={`${base}/publish`} className={cn(buttonClass(agent.status === "published" ? "destructive" : "primary", "lg"), "w-full")}>
            {agent.status === "published" ? "Unpublish" : "Publish agent"}
          </Link>
        </div>
      </DrawerSection>
      <div className="mx-4 mb-4">
        <PlaceholderNote feature="interview and persona drafting" phase={2} />
        <p className="mt-1 text-xs text-fg-muted">Owner: {displayName(s, agent.ownerId)}</p>
      </div>
    </aside>
  );
}

function DrawerSection({ icon: Icon, title, count, children }: { icon: typeof BookOpen; title: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mx-4 mt-3 shrink-0 overflow-hidden rounded-xl border border-line-muted bg-surface-2">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 p-3 text-sm font-semibold">
        <Icon className="size-[18px] text-fg-tertiary" />
        {title}
        {count !== undefined && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-fg-tertiary">{count}</span>}
        <ChevronDown className={cn("ml-auto size-3.5 text-fg-muted transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}

function DrawerRow({ href, title, sub, icon: Icon, menu }: { href: string; title: string; sub: string; icon?: typeof BookOpen; menu?: boolean }) {
  return (
    <Link href={href} className="flex h-[60px] items-center gap-3 border-t border-line-muted p-3 hover:bg-surface-3">
      {Icon && (
        <span className="grid size-6 place-items-center rounded-md bg-surface-3">
          <Icon className="size-[13px] text-fg-tertiary" />
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">{title}</div>
        <div className="truncate text-xs text-fg-muted">{sub}</div>
      </div>
      {menu ? <Ellipsis className="ml-auto size-3.5 text-fg-muted" /> : <ChevronRight className="ml-auto size-3.5 text-fg-muted" />}
    </Link>
  );
}

export function NotOwnerNote({ ownerName }: { ownerName: string }) {
  return (
    <div className="mx-auto mb-3 max-w-[752px] px-4 text-center text-[13px] text-fg-muted">
      You&apos;re viewing {ownerName}&apos;s agent. Switch to them in the sidebar to make changes.
    </div>
  );
}
