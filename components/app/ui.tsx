import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity, Bot, Briefcase, Calculator, ChevronRight, Footprints, GraduationCap, HeartPulse, PiggyBank, Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Breadcrumb bar: 40px, muted parents, primary current item, actions right (UI-SPEC). */
export function Breadcrumbs({ items, actions }: { items: { label: string; href?: string }[]; actions?: ReactNode }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 px-6 text-[13px]">
      {items.map((item, i) => (
        <span key={i} className="flex min-w-0 items-center gap-2">
          {i > 0 && <ChevronRight className="size-3.5 text-fg-muted" />}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="truncate text-fg-muted hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className={cn("truncate", i === items.length - 1 ? "font-medium text-foreground" : "text-fg-muted")}>{item.label}</span>
          )}
        </span>
      ))}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Page title 24px/500 + 13px muted subtitle. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 data-testid="page-title" className="mt-2 text-2xl leading-[1.33] font-medium">
        {title}
      </h1>
      {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 pb-8", className)}>{children}</div>;
}

/* Empty state: 48px icon circle, heading, body, next step (UI-SPEC copy table). */
export function EmptyState({ icon: Icon, heading, body, action }: { icon: LucideIcon; heading: string; body: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-24 text-center">
      <div className="mb-2 grid size-12 place-items-center rounded-full bg-selected text-selected-fg">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold">{heading}</h3>
      <p className="mb-2.5 text-[13px] text-fg-tertiary">{body}</p>
      {action && (
        <Link href={action.href} className={buttonClass("primary")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatTile({ label, value, caption, tone = "default", testId }: { label: string; value: string; caption?: string; tone?: "default" | "success"; testId?: string }) {
  return (
    <div className="rounded-xl border border-line-subtle bg-surface-1 p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div data-testid={testId} className={cn("mt-1 text-2xl leading-[1.33] font-medium tabular-nums", tone === "success" && "text-success")}>
        {value}
      </div>
      {caption && <div className="mt-0.5 text-xs text-fg-muted">{caption}</div>}
    </div>
  );
}

/* Phase 1 stub caption: never a modal (UI-SPEC error states). */
export function PlaceholderNote({ feature, phase }: { feature: string; phase: 2 | 3 | 4 }) {
  return (
    <p className="mt-3 text-xs text-fg-muted">
      Placeholder data — real {feature} lands in Phase {phase}.
    </p>
  );
}

const PILL_STYLES = {
  published: "text-success bg-success-surface",
  ready: "text-success bg-success-surface",
  on: "text-success bg-success-surface",
  draft: "text-warning bg-warning-surface",
  processing: "text-warning bg-warning-surface",
  queued: "text-warning bg-warning-surface",
  unpublished: "text-danger bg-danger-surface",
  failed: "text-danger bg-danger-surface",
  off: "text-fg-muted bg-surface-3",
} as const;

const PILL_LABELS: Record<keyof typeof PILL_STYLES, string> = {
  published: "Published",
  ready: "Ready",
  on: "On",
  draft: "Draft",
  processing: "Processing…",
  queued: "Queued",
  unpublished: "Unpublished",
  failed: "Failed",
  off: "Off",
};

export function StatusPill({ status }: { status: keyof typeof PILL_STYLES }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PILL_STYLES[status])}>{PILL_LABELS[status]}</span>;
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-fg-tertiary", className)}>{children}</span>;
}

export function NumberPill({ value }: { value: number | string }) {
  return <span className="rounded bg-pill px-1.5 py-0.5 text-xs tabular-nums">{value}</span>;
}

export const AGENT_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  calculator: Calculator,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  "piggy-bank": PiggyBank,
  briefcase: Briefcase,
  footprints: Footprints,
  bot: Bot,
};

/* Purple tile for agent identity only (never for actions). */
export function AgentTile({ icon, size = "md" }: { icon: string; size?: "xs" | "sm" | "md" }) {
  const Icon = AGENT_ICONS[icon] ?? Bot;
  const box = { xs: "size-[22px] rounded-md", sm: "size-6 rounded-md", md: "size-8 rounded-lg" }[size];
  const glyph = { xs: "size-3", sm: "size-3", md: "size-4" }[size];
  return (
    <span className={cn("grid shrink-0 place-items-center border border-tile bg-tile-surface text-[#c5b4f0]", box)}>
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}

export function IdentityAvatar({ initial, color, size = 40, photoUrl }: { initial: string; color: string; size?: number; photoUrl?: string }) {
  const photo = photoUrl && /^https?:\/\//i.test(photoUrl) ? photoUrl : undefined;
  return (
    <span
      className="grid shrink-0 place-items-center font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color, backgroundImage: photo ? `url("${photo.replace(/["\\]/g, "")}")` : undefined, backgroundSize: "cover", backgroundPosition: "center", borderRadius: size >= 40 ? 8 : 6, fontSize: size >= 40 ? 14 : 12 }}
    >
      {photo ? null : initial}
    </span>
  );
}

export function SearchField({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <label className="flex h-6 w-[218px] items-center gap-1.5 rounded bg-surface-3 px-2 text-[13px] text-fg-muted">
      <Search className="size-3.5" />
      <input
        className="w-full bg-transparent text-foreground outline-none placeholder:text-fg-muted"
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange}
      />
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

/* LangSmith buttons: small (24px) toolbar buttons and 32px page CTAs. */
export function buttonClass(variant: "primary" | "secondary" | "destructive" | "ghost" = "secondary", size: "sm" | "lg" = "sm") {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded border text-[13px] whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5",
    size === "sm" ? "h-6 px-2" : "h-8 px-3 font-medium",
    variant === "primary" && "border-brand-border bg-brand text-white hover:bg-[#0062c7]",
    variant === "secondary" && "border-line-muted bg-surface-1 text-fg-secondary hover:bg-surface-2",
    variant === "destructive" && "border-destructive bg-destructive text-white hover:bg-[#d93a2f]",
    variant === "ghost" && "border-transparent bg-transparent text-selected-fg hover:bg-surface-2",
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-line-subtle bg-surface-1", className)}>{children}</div>;
}

/* Dense LangSmith table: 40px rows, no borders, hover surface. */
export function DataTable({ head, children }: { head: { label: string; numeric?: boolean }[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h.label} className={cn("h-10 bg-background pl-2 text-left text-[13px] font-semibold whitespace-nowrap text-fg-tertiary", h.numeric && "pr-4 text-right")}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:h-10 [&_td]:pl-2 [&_tr:hover_td]:bg-surface-2">{children}</tbody>
      </table>
    </div>
  );
}

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("pr-4 text-right tabular-nums whitespace-nowrap", className)}>{children}</td>;
}
