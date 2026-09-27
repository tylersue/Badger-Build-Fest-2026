"use client";

import { DEMO_MODE } from "@/lib/config/demo";
import { formatAmount, unitFor } from "@/lib/format";
import type { ReactNode } from "react";
import {
  ArrowUpRight, Banknote, Coins, CreditCard, FileText, FlaskConical, Gift, MessageSquare, Mic, Plus, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { PURPOSE_LABELS } from "@/lib/config/credits";
import type { LedgerEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Page-local building blocks for the Wallet, Earnings, Insights, Admin and Settings pages.
 * Kept out of components/app/ui.tsx so the shared primitives stay untouched.
 */

const twoDecimals = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const smallAmount = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 2 });

/** Display rounding for credits: whole numbers stay whole, fractions show up to 2 decimals, sub-credit amounts 2 significant digits. */
export function displayCredits(n: number): string {
  if (DEMO_MODE) return formatAmount(n);
  const abs = Math.abs(n);
  const body = abs > 0 && abs < 1 ? smallAmount.format(abs) : twoDecimals.format(abs);
  return n < 0 ? `−${body}` : body;
}

/** Signed display: "+12", "−0.034", "0" (U+2212 minus). */
export function signedCredits(n: number): string {
  if (n > 0) return `+${displayCredits(n)}`;
  if (n < 0) return displayCredits(n);
  return "0";
}

export const creditUnit = (n: number) => unitFor(n);

/* Section heading: 14px/600 title, 13px muted description, 16px below. */
export function SectionHeader({ title, description, count, actions }: { title: string; description?: string; count?: number; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {title}
          {count !== undefined && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-fg-tertiary tabular-nums">{count}</span>}
        </h2>
        {description && <p className="mt-1 text-[13px] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Secondary metrics in one row with hairline dividers: de-emphasised next to a hero number. */
export function MetricRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 divide-y divide-line-subtle sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0", className)}>
      {children}
    </div>
  );
}

export function Metric({ label, value, unit, caption, testId, tone = "default", icon: Icon }: {
  label: string;
  value: string;
  unit?: string;
  caption?: ReactNode;
  testId?: string;
  tone?: "default" | "success";
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0 py-4 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        {Icon && <Icon className="size-3.5" strokeWidth={1.75} />}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span data-testid={testId} className={cn("text-lg leading-7 font-medium tabular-nums", tone === "success" ? "text-success" : "text-foreground")}>{value}</span>
        {unit && <span className="text-xs text-fg-muted">{unit}</span>}
      </div>
      {caption && <div className="mt-0.5 truncate text-xs text-fg-muted">{caption}</div>}
    </div>
  );
}

/* Segmented control: outlined group, selected segment on the `selected` gray (never blue). */
export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-7 items-center gap-0.5 rounded-md border border-line-default bg-surface-1 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded px-2 text-[13px] transition-colors",
              active ? "bg-selected font-medium text-foreground" : "text-fg-tertiary hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && <span className={cn("tabular-nums text-xs", active ? "text-fg-secondary" : "text-fg-muted")}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* Compact empty state that sits inside a list card. */
export function InlineEmpty({ icon: Icon, heading, body, action }: { icon: LucideIcon; heading: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
      <div className="mb-2 grid size-10 place-items-center rounded-full bg-surface-3 text-fg-tertiary">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold">{heading}</h3>
      <p className="max-w-[360px] text-[13px] text-fg-muted">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ---------- Ledger activity: grouped by day, typed rows, signed amounts ---------- */

export const LEDGER_KIND_TITLES: Record<LedgerEntry["kind"], string> = {
  seed: "Starting balance",
  subscription: "Monthly plan",
  pack: "Credit pack",
  debit: "Charge",
  earnings: "Earnings",
  cashout: "Cash-out",
  platform_cost: "Platform cost",
  platform_margin: "Platform margin",
};

export type ActivityType = "topup" | "earning" | "spend" | "cashout";

export function activityType(row: LedgerEntry): ActivityType {
  if (row.kind === "earnings") return "earning";
  if (row.kind === "cashout") return "cashout";
  if (row.kind === "seed" || row.kind === "subscription" || row.kind === "pack") return "topup";
  return row.amountCents >= 0 ? "topup" : "spend";
}

const PURPOSE_ICONS: Record<NonNullable<LedgerEntry["purpose"]>, LucideIcon> = {
  chat_message: MessageSquare,
  interview_turn: Mic,
  embedding: FileText,
  sandbox_message: FlaskConical,
};

const KIND_ICONS: Record<LedgerEntry["kind"], LucideIcon> = {
  seed: Gift,
  subscription: CreditCard,
  pack: Plus,
  debit: ArrowUpRight,
  earnings: TrendingUp,
  cashout: Banknote,
  platform_cost: Coins,
  platform_margin: Coins,
};

export function ledgerTitle(row: LedgerEntry): string {
  return row.purpose ? PURPOSE_LABELS[row.purpose] : LEDGER_KIND_TITLES[row.kind];
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000).toISOString());
  const key = dayKey(iso);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function LedgerActivity({ rows, rowTestId }: { rows: LedgerEntry[]; rowTestId: string }) {
  const groups: { key: string; label: string; rows: LedgerEntry[]; net: number }[] = [];
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(row.createdAt), rows: [], net: 0 };
      groups.push(group);
    }
    group.rows.push(row);
    group.net += row.amountCents;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="border-t border-line-subtle first:border-t-0">
          <div className="flex h-8 items-center justify-between border-b border-line-subtle bg-surface-2 px-4 text-xs text-fg-muted">
            <span className="font-medium text-fg-tertiary">{group.label}</span>
            <span className="tabular-nums">Net {signedCredits(group.net)}</span>
          </div>
          <ul className="divide-y divide-line-subtle">
            {group.rows.map((row) => <ActivityRow key={row.id} row={row} testId={rowTestId} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ActivityRow({ row, testId }: { row: LedgerEntry; testId: string }) {
  const type = activityType(row);
  const incoming = row.amountCents > 0;
  const Icon = row.purpose ? PURPOSE_ICONS[row.purpose] : KIND_ICONS[row.kind];
  return (
    <li data-testid={testId} className="flex min-h-14 items-center gap-4 px-4 py-2 transition-colors hover:bg-surface-2">
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border",
          incoming ? "border-transparent bg-success-surface text-success" : "border-line-subtle bg-surface-3 text-fg-tertiary",
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{ledgerTitle(row)}</span>
          <span className="sr-only">{type === "spend" ? "money out" : type === "cashout" ? "cash-out" : "money in"}</span>
        </div>
        <div className="truncate text-xs text-fg-muted">
          {row.note}
          <span className="px-1.5 text-fg-muted/60">·</span>
          {timeOf(row.createdAt)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-sm font-medium tabular-nums", incoming ? "text-success" : "text-fg-secondary")}>{signedCredits(row.amountCents)}</div>
        <div className="text-xs text-fg-muted tabular-nums">{row.balanceAfter === null ? "—" : `Balance ${displayCredits(row.balanceAfter)}`}</div>
      </div>
    </li>
  );
}
