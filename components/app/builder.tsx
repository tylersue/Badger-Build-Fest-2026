"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronRight, Ellipsis, Eye, FileText, Menu, Mic, Plus, Rocket, Settings2, UserRound, X } from "lucide-react";
import { AgentTile, StatusPill, buttonClass } from "@/components/app/ui";
import { agentById, currentIdentity, displayName, knowledgeStats, useDemo, type DemoState } from "@/lib/demo-store";
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

export function sourcesFor(s: DemoState, agentId: string) {
  return (s.snapshot?.sources ?? []).filter((x) => x.agentId === agentId);
}

/** Answers captured in the selected identity's server snapshot. */
export function answerCount(s: DemoState, agentId: string) {
  return knowledgeStats(s, agentId).answers;
}

/* Fleet builder split: chat column + Configure drawer (D-05), 480px by default and resizable from its left edge. */
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
  const sources = sourcesFor(s, agent.id);
  const answers = answerCount(s, agent.id);
  const drawerWidth = useDrawerWidth();
  return (
    <div className="relative hidden shrink-0 lg:flex" style={{ width: drawerWidth }}>
      <DrawerResizeHandle width={drawerWidth} />
      <aside className="flex w-full flex-col overflow-y-auto border-l border-line-faint bg-surface-1">
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
          <p className="text-xs text-fg-muted">Owner: {displayName(s, agent.ownerId)}</p>
        </div>
      </aside>
    </div>
  );
}

/* Drawer width, remembered per browser. A tiny external store so the server render and the first
   client render agree on the default, then the saved width takes over without a hydration mismatch. */
const DRAWER_DEFAULT = 480;
const DRAWER_MIN = 320;
const DRAWER_MAX = 720;
const DRAWER_STEP = 16;
const DRAWER_KEY = "builder-drawer-width";
let drawerMemory = DRAWER_DEFAULT;
const drawerListeners = new Set<() => void>();

function clampDrawer(w: number) {
  // Never squeeze the conversation column below ~480px on narrower screens.
  const room = typeof window === "undefined" ? DRAWER_MAX : window.innerWidth - 480 - 240;
  return Math.round(Math.min(Math.max(DRAWER_MIN, room), DRAWER_MAX, Math.max(DRAWER_MIN, w)));
}

function readDrawerWidth() {
  try {
    const saved = Number(window.localStorage.getItem(DRAWER_KEY));
    return saved ? clampDrawer(saved) : drawerMemory;
  } catch {
    return drawerMemory;
  }
}

function setDrawerWidth(w: number) {
  drawerMemory = clampDrawer(w);
  try {
    window.localStorage.setItem(DRAWER_KEY, String(drawerMemory));
  } catch {
    // Private windows and blocked storage keep the width for this page view only.
  }
  drawerListeners.forEach((l) => l());
}

function subscribeDrawer(listener: () => void) {
  drawerListeners.add(listener);
  return () => {
    drawerListeners.delete(listener);
  };
}

function useDrawerWidth() {
  return useSyncExternalStore(subscribeDrawer, readDrawerWidth, () => DRAWER_DEFAULT);
}

/* The drawer's left edge: drag to resize, arrow keys to nudge, double-click to reset. */
function DrawerResizeHandle({ width }: { width: number }) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, width };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) setDrawerWidth(drag.current.width + (drag.current.x - e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next =
      e.key === "ArrowLeft" ? width + DRAWER_STEP : e.key === "ArrowRight" ? width - DRAWER_STEP : e.key === "Home" ? DRAWER_MIN : e.key === "End" ? DRAWER_MAX : null;
    if (next === null) return;
    e.preventDefault();
    setDrawerWidth(next);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the Configure panel"
      aria-valuenow={width}
      aria-valuemin={DRAWER_MIN}
      aria-valuemax={DRAWER_MAX}
      tabIndex={0}
      data-testid="drawer-resize"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onDoubleClick={() => setDrawerWidth(DRAWER_DEFAULT)}
      className="group absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize touch-none outline-none"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors group-hover:bg-brand-border group-focus-visible:bg-brand-border group-active:bg-brand-border" />
      <span className="absolute top-1/2 left-1/2 h-9 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-default transition-colors group-hover:bg-brand-border group-focus-visible:bg-brand-border group-active:bg-brand-border" />
    </div>
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
