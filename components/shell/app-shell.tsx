"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bot, ChartNoAxesCombined, Check, ChevronDown, ChevronsUpDown, MessageSquare, Search, Settings, Shield, Sparkles, Store, TrendingUp, Trophy, Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { AgentTile } from "@/components/app/ui";
import { IdentityLogo, companyFor } from "@/components/app/identity-logo";
import { APP_NAME } from "@/lib/config/app";
import { allAgents, balanceOf, currentIdentity, displayName, switchableIdentities, switchIdentity, useDemo, useDemoSnapshot } from "@/lib/demo-store";
import { allConversations } from "@/lib/demo-store";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IdentityKind } from "@/lib/types";

type Side = IdentityKind | "both";
type NavItem = { label: string; href: string; icon: LucideIcon; side: Side; match: (p: string) => boolean; testId: string };

const NAV = {
  marketplace: { label: "Marketplace", href: "/marketplace", icon: Store, side: "hirer", match: (p: string) => p === "/" || p.startsWith("/marketplace") || p.startsWith("/agents"), testId: "nav-marketplace" },
  chats: { label: "Chats", href: "/chat", icon: MessageSquare, side: "hirer", match: (p: string) => p.startsWith("/chat"), testId: "nav-chats" },
  benchmarks: { label: "Benchmarks", href: "/benchmarks", icon: Trophy, side: "both", match: (p: string) => p.startsWith("/benchmarks"), testId: "nav-benchmarks" },
  myAgents: { label: "My agents", href: "/build", icon: Bot, side: "expert", match: (p: string) => p === "/build", testId: "nav-my-agents" },
  wallet: { label: "Wallet", href: "/wallet", icon: Wallet, side: "both", match: (p: string) => p.startsWith("/wallet"), testId: "nav-wallet" },
  earnings: { label: "Earnings", href: "/earnings", icon: TrendingUp, side: "expert", match: (p: string) => p.startsWith("/earnings"), testId: "nav-earnings" },
  insights: { label: "Insights", href: "/insights", icon: ChartNoAxesCombined, side: "expert", match: (p: string) => p.startsWith("/insights"), testId: "nav-insights" },
  admin: { label: "Admin", href: "/admin", icon: Shield, side: "both", match: (p: string) => p.startsWith("/admin"), testId: "nav-admin" },
  settings: { label: "Settings", href: "/settings", icon: Settings, side: "both", match: (p: string) => p.startsWith("/settings"), testId: "nav-settings" },
} satisfies Record<string, NavItem>;

/* The shell renders only after the browser demo state loads, so the identity never flashes. */
export function AppShell({ children, defaultOpen }: { children: ReactNode; defaultOpen: boolean }) {
  const snapshot = useDemoSnapshot();
  if (!snapshot) {
    return (
      <div className="flex min-h-svh">
        <div className="hidden w-[244px] shrink-0 border-r border-line-faint bg-sidebar md:block" />
        <div className="flex-1 bg-background" />
      </div>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider defaultOpen={defaultOpen} style={{ "--sidebar-width": "244px", "--sidebar-width-icon": "48px" } as React.CSSProperties}>
        <AppSidebar />
        <SidebarInset className="min-w-0">{children}</SidebarInset>
        <Toaster
          position="bottom-center"
          toastOptions={{ style: { background: "var(--bg-brand)", color: "var(--primary-foreground)", border: "none", fontSize: 13, borderRadius: 8 } }}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function AppSidebar() {
  const s = useDemo();
  const pathname = usePathname();
  const me = currentIdentity(s);
  const myAgents = allAgents(s).filter((a) => a.ownerId === me.id);
  const chatCount = allConversations(s).filter((c) => c.hirerId === me.id).length;

  const row = (item: NavItem, extra?: ReactNode) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton asChild isActive={item.match(pathname)} tooltip={item.label} className={navRowClass(item.side, me.kind)}>
        <Link href={item.href} data-testid={item.testId} data-side={item.side === "both" || item.side === me.kind ? "own" : "other"}>
          <item.icon strokeWidth={1.75} />
          <span>{item.label}</span>
          {extra}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-line-faint">
      <SidebarHeader className="gap-0 p-0">
        <div className="flex h-12 items-center justify-between pr-2 pl-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link href="/" className="text-[15px] font-semibold group-data-[collapsible=icon]:hidden">
            {APP_NAME}
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="text-fg-muted" />
            </TooltipTrigger>
            <TooltipContent side="right">Collapse (⌘B)</TooltipContent>
          </Tooltip>
        </div>
        <Link href="/marketplace" className="mx-2 mb-2.5 flex h-6 items-center gap-1.5 rounded bg-surface-3 px-2 text-[13px] text-fg-muted group-data-[collapsible=icon]:hidden">
          <Search className="size-3.5" />
          Search…
          <span className="ml-auto flex gap-0.5">
            <kbd className="rounded-[3px] bg-pill px-1 text-[11px] text-fg-tertiary">⌘</kbd>
            <kbd className="rounded-[3px] bg-pill px-1 text-[11px] text-fg-tertiary">K</kbd>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2">
        <SidebarMenu className="gap-1.5">
          {row(NAV.marketplace)}
          {row(NAV.chats, chatCount > 0 ? <span className="ml-auto text-[13px] font-normal text-fg-muted">{chatCount}</span> : null)}
          {row(NAV.benchmarks)}
        </SidebarMenu>

        <Group label="Build">
          {row(NAV.myAgents)}
          {myAgents.length > 0 && (
            <SidebarMenuItem>
              {/* The expert's own agents sit under "My agents", indented on a guide line. */}
              <SidebarMenuSub className="mr-0 gap-0.5 border-line-subtle pr-0">
                {myAgents.map((a) => (
                  <SidebarMenuSubItem key={a.id}>
                    <SidebarMenuSubButton asChild isActive={pathname.startsWith(`/build/${a.id}`)} className={cn("h-7", navRowClass("expert", me.kind))}>
                      <Link href={`/build/${a.id}/interview`} title={a.persona.name}>
                        <AgentTile icon={a.icon} size="xs" />
                        <span className="truncate">{a.persona.name.includes("·") ? a.persona.name.split("·").slice(1).join("·").trim() : a.persona.name}</span>
                        {a.status !== "published" && <span className="ml-auto shrink-0 text-[11px] text-fg-muted">Draft</span>}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="New agent" isActive={pathname === "/build/new"} className={cn("h-8 bg-surface-2", navRowClass("expert", me.kind))}>
              <Link href="/build/new" data-testid="nav-new-agent" data-side={me.kind === "expert" ? "own" : "other"}>
                <span className="grid size-[18px] place-items-center rounded bg-pill">
                  <Sparkles className="size-[11px]! text-selected-fg" />
                </span>
                <span>New agent</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </Group>

        <Group label="Credits">
          {row(NAV.wallet)}
          {row(NAV.earnings)}
          {row(NAV.insights)}
        </Group>

        <SidebarMenu className="mt-auto gap-1.5 pt-4 pb-2">
          {row(NAV.admin)}
          {row(NAV.settings)}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <IdentitySwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/* LangSmith nav row: 28px, 13px/500; active = selected blue; rows for the other side stay reachable but muted (D-02). */
function navRowClass(side: Side, kind: IdentityKind) {
  const other = side !== "both" && side !== kind;
  return cn(
    "h-7 rounded px-2.5 text-[13px] font-medium hover:bg-surface-2 [&_svg]:text-fg-muted",
    "data-active:bg-selected data-active:text-selected-fg data-active:[&_svg]:text-selected-fg",
    other && "text-fg-muted",
  );
}

function Group({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-2 border-t border-line-subtle pt-2">
      <div className="flex items-center gap-1.5 px-2 pt-2 pb-1.5 text-xs font-semibold text-fg-secondary group-data-[collapsible=icon]:hidden">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 hover:text-foreground" aria-expanded={open}>
          <ChevronDown className={cn("size-3.5 text-fg-muted transition-transform", !open && "-rotate-90")} />
          {label}
        </button>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {open && <SidebarMenu className="gap-1.5">{children}</SidebarMenu>}
    </div>
  );
}

/* Footer identity card + "Viewing as" popover (SHEL-02). The balance is always visible (CRED-01). */
function IdentitySwitcher() {
  const s = useDemo();
  const router = useRouter();
  const { state: sidebarState } = useSidebar();
  const [open, setOpen] = useState(false);
  const me = currentIdentity(s);
  const balance = balanceOf(s, me.id);
  const roleLine = s.status === "error" ? (s.error ?? "Live service unavailable") :
    `${me.kind === "expert" ? "Expert" : "Hirer"} · ${s.status === "ready" ? formatCredits(balance) : "Loading wallet…"}`;

  const choose = (id: string) => {
    setOpen(false);
    if (id === me.id) return;
    const next = switchIdentity(id);
    if (next) {
      toast(`Switched to ${next.displayName}`);
      router.refresh();
    }
  };

  const card = (
    <button
      data-testid="identity-card"
      className="flex h-16 w-full items-center gap-2.5 rounded-md p-3 text-left hover:bg-surface-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
    >
      <IdentityLogo identityId={me.id} size={sidebarState === "collapsed" ? 32 : 40} />
      <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="flex min-w-0 items-baseline gap-1 text-[13px]">
          <span data-testid="identity-name" className="truncate font-semibold">{displayName(s, me.id)}</span>
          {companyFor(me.id) && <span className="min-w-0 truncate text-fg-muted">· {companyFor(me.id)}</span>}
        </span>
        <span data-testid="sidebar-balance" className="block truncate text-xs text-fg-muted tabular-nums">{roleLine}</span>
      </span>
      <ChevronsUpDown className="size-4 text-fg-muted group-data-[collapsible=icon]:hidden" />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {sidebarState === "collapsed" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{card}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{[displayName(s, me.id), companyFor(me.id), roleLine].filter(Boolean).join(" · ")}</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{card}</PopoverTrigger>
      )}
      <PopoverContent side="top" align="start" className="w-[228px] rounded-lg border-line-subtle bg-surface-2 p-2">
        <div className="px-2 pt-1 pb-2 text-xs text-fg-muted">Viewing as</div>
        {switchableIdentities().map((i) => (
          <button
            key={i.id}
            data-testid={`identity-option-${i.kind}`}
            onClick={() => choose(i.id)}
            className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] hover:bg-surface-3"
          >
            <IdentityLogo identityId={i.id} size={28} />
            <span className="min-w-0">
              <span className="block truncate">{displayName(s, i.id)} — {i.kind === "expert" ? "Expert" : "Hirer"}</span>
              {companyFor(i.id) && <span className="block truncate text-xs text-fg-muted">{companyFor(i.id)}</span>}
            </span>
            {i.id === me.id && <Check className="ml-auto size-4 text-selected-fg" />}
          </button>
        ))}
        <div className="mt-1.5 border-t border-line-muted px-2 pt-2 pb-0.5 text-xs text-fg-muted">Switch to see the other side of the loop.</div>
      </PopoverContent>
    </Popover>
  );
}
