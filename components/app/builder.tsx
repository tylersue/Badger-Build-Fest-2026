"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronRight, Eye, FileText, Plus, Rocket, Settings2, UserRound, X } from "lucide-react";
import { AgentTile, StatusPill, buttonClass } from "@/components/app/ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { agentById, currentIdentity, displayName, useDemo, type DemoState } from "@/lib/demo-store";
import { categoryLabel } from "@/lib/config/categories";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export function useBuilderAgent(): { s: DemoState; agent: Agent | undefined; isOwner: boolean } {
  const { agentId } = useParams<{ agentId: string }>();
  const s = useDemo();
  const agent = agentById(s, agentId);
  return { s, agent, isOwner: !!agent && agent.ownerId === currentIdentity(s).id };
}

export function sourcesFor(s: DemoState, agentId: string) {
  return (s.snapshot?.identityId === s.identityId ? s.snapshot.sources : []).filter(x => x.agentId === agentId);
}

export function answerCount(s: DemoState, agentId: string) {
  if (!s.snapshot || s.snapshot.identityId !== s.identityId) return 0;
  return s.snapshot.interviewTurns.filter(t => t.agentId === agentId && t.answer && t.origin === "live").length;
}

/* Fleet builder split: chat column + 480px Configure drawer (D-05). */
export function BuilderSplit({ agent, thread, children, composer }: { agent: Agent; thread: string; children: ReactNode; composer: ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 px-4 py-1 text-sm font-medium">
          <span className="min-w-0 flex-1 break-words">
            {agent.persona.name} <span className="text-xs font-normal text-fg-muted">{thread}</span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setDesktopOpen(!desktopOpen)} aria-expanded={desktopOpen} aria-controls="builder-config-desktop" className={cn(buttonClass("secondary", "lg"), "hidden lg:inline-flex")}>
              <Settings2 />
              Configure
            </button>
            <button type="button" onClick={() => setMobileOpen(true)} aria-haspopup="dialog" className={cn(buttonClass("secondary", "lg"), "lg:hidden")}><Settings2 /> Configure</button>
          </span>
        </div>
        {children}
        {composer}
      </div>
      {desktopOpen && <aside id="builder-config-desktop" className="hidden w-[480px] shrink-0 flex-col overflow-y-auto border-l border-line-faint bg-surface-1 lg:flex"><ConfigureDrawer agent={agent} onClose={() => setDesktopOpen(false)} /></aside>}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" showCloseButton={false} className="w-[min(100vw,480px)] max-w-none gap-0 overflow-y-auto border-line-faint bg-surface-1 p-0 lg:hidden">
          <SheetHeader className="sr-only"><SheetTitle>Configure {agent.persona.name}</SheetTitle><SheetDescription>Agent settings and knowledge summary</SheetDescription></SheetHeader>
          <ConfigureDrawer agent={agent} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ConfigureDrawer({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { s } = useBuilderAgent();
  const base = `/build/${agent.id}`;
  const sources = sourcesFor(s, agent.id).filter(source => source.kind !== "interview" && source.origin === "live");
  const answers = answerCount(s, agent.id);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line-muted px-4 py-3">
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
          <button type="button" onClick={onClose} aria-label="Close configuration" className="grid size-11 place-items-center rounded text-fg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-border">
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

      <DrawerSection icon={BookOpen} title="Knowledge" count={answers + sources.length}>
        <DrawerRow href={`${base}/knowledge`} icon={BookOpen} title="Interview answers" sub={`${answers} saved answers`} />
        {sources
          .map((x) => (
            <DrawerRow key={x.id} href={`${base}/knowledge`} icon={FileText} title={x.name} sub={`${x.status === "ready" ? "Ready" : x.status === "failed" ? "Failed" : x.status === "queued" ? "Queued" : "Processing"} · ${x.chunkCount} chunks${x.pageCount != null ? ` · ${x.pageCount} pages` : ""}`} />
          ))}
        <Link href={`${base}/knowledge`} className="mx-3 mt-2 mb-3 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-default text-[13px] text-selected-fg">
          <Plus className="size-3.5" />
          Add document
        </Link>
      </DrawerSection>

      <DrawerSection icon={Rocket} title="Publishing">
        <DrawerRow href={`${base}/publish`} title="Rate multiplier" sub={`${agent.rateMultiplier}×`} />
        <DrawerRow href={`${base}/publish`} title="Content consent" sub={agent.consentAcceptedAt ? `Accepted ${agent.consentAcceptedAt.slice(0, 10)}` : "Not accepted yet"} />
        <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
          <StatusPill status={agent.status} />
          <Link href={`${base}/publish`} className={cn(buttonClass(agent.status === "published" ? "destructive" : "primary", "lg"), "w-full")}>
            {agent.status === "published" ? "Unpublish" : "Publish agent"}
          </Link>
        </div>
      </DrawerSection>
      <div className="mx-4 mb-4">
        <p className="mt-1 text-xs text-fg-muted">Owner: {displayName(s, agent.ownerId)}</p>
      </div>
    </div>
  );
}

function DrawerSection({ icon: Icon, title, count, children }: { icon: typeof BookOpen; title: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mx-4 mt-3 shrink-0 overflow-hidden rounded-xl border border-line-muted bg-surface-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 p-3 text-sm font-semibold">
        <Icon className="size-[18px] text-fg-tertiary" />
        {title}
        {count !== undefined && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-fg-tertiary">{count}</span>}
        <ChevronDown className={cn("ml-auto size-3.5 text-fg-muted transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}

function DrawerRow({ href, title, sub, icon: Icon }: { href: string; title: string; sub: string; icon?: typeof BookOpen }) {
  return (
    <Link href={href} className="flex min-h-[60px] min-w-0 items-center gap-3 border-t border-line-muted p-3 hover:bg-surface-3">
      {Icon && (
        <span className="grid size-6 place-items-center rounded-md bg-surface-3">
          <Icon className="size-[13px] text-fg-tertiary" />
        </span>
      )}
      <div className="min-w-0">
        <div className="break-words text-[13px] font-medium">{title}</div>
        <div className="break-words text-xs text-fg-muted">{sub}</div>
      </div>
      <ChevronRight className="ml-auto size-3.5 shrink-0 text-fg-muted" />
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
