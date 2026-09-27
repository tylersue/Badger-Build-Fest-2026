"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CircleCheck, Flag as FlagIcon, MessagesSquare, SearchX, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { InlineEmpty, Metric, MetricRow, SectionHeader, Segmented } from "@/components/app/dashboard-kit";
import { Breadcrumbs, PageBody, PageHeader, Pill, SearchField, StatusPill, buttonClass } from "@/components/app/ui";
import { UnpublishDialog } from "@/components/trust/unpublish-dialog";
import { flagQueue, resolveFlag, type FlagQueueRow } from "@/features/trust/moderation";
import { allAgents, allModerationActions, useDemo } from "@/lib/demo-store";
import { formatRelative } from "@/lib/format";
import type { Flag } from "@/lib/types";

/** Reasons are stored as "Category: detail"; split them so the category can lead. */
function splitReason(reason: string): { category: string | null; detail: string } {
  const at = reason.indexOf(": ");
  if (at <= 0 || at > 48) return { category: null, detail: reason };
  return { category: reason.slice(0, at), detail: reason.slice(at + 2) };
}

/* Admin is open in the MVP (Phase 1 D-01). Flag queue, resolve and unpublish-with-note (ADMN-01). */
export default function AdminPage() {
  const s = useDemo();
  const [tab, setTab] = useState<Flag["targetType"]>("agent");
  const [status, setStatus] = useState<Flag["status"]>("open");
  const [query, setQuery] = useState("");
  const [unpublishTarget, setUnpublishTarget] = useState<{ id: string; name: string } | null>(null);

  const rows = useMemo(() => flagQueue(s, { targetType: tab, status, query }), [s, tab, status, query]);
  const openAgentFlags = useMemo(() => flagQueue(s, { targetType: "agent", status: "open" }), [s]);
  const openConversationFlags = useMemo(() => flagQueue(s, { targetType: "conversation", status: "open" }), [s]);
  const openFlagsCount = openAgentFlags.length + openConversationFlags.length;
  const agentsWithOpenFlags = new Set([...openAgentFlags, ...openConversationFlags].map((r) => r.flag.agentId)).size;
  const agents = allAgents(s);
  const unpublishedCount = agents.filter((a) => a.status === "unpublished").length;
  const actions = allModerationActions(s);

  const resolve = (flagId: string) => {
    const result = resolveFlag(flagId);
    if (result.ok) toast("Flag resolved");
  };

  return (
    <>
      <Breadcrumbs items={[{ label: "Admin" }]} />
      <PageBody>
        <div className="max-w-[960px]">
          <PageHeader title="Admin" />

          <section aria-label="Moderation summary" className="rounded-xl border border-line-subtle bg-surface-1 px-6 py-4">
            <MetricRow>
              <Metric icon={FlagIcon} label="Open flags" value={String(openFlagsCount)} testId="stat-open-flags" caption={openFlagsCount ? "Waiting for review" : "Queue is clear"} />
              <Metric icon={Bot} label="Agents with open flags" value={String(agentsWithOpenFlags)} testId="stat-agents-flagged" caption={`Of ${agents.length} agents`} />
              <Metric icon={ShieldCheck} label="Unpublished agents" value={String(unpublishedCount)} testId="stat-unpublished" caption="Hidden from the marketplace" />
            </MetricRow>
          </section>

          <section className="mt-8">
            <SectionHeader title="Flag queue" />
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Segmented<Flag["targetType"]>
                label="Flag target"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "agent", label: "Agents", count: openAgentFlags.length },
                  { value: "conversation", label: "Conversations", count: openConversationFlags.length },
                ]}
              />
              <Segmented<Flag["status"]>
                label="Flag status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "open", label: "Open" },
                  { value: "resolved", label: "Resolved" },
                ]}
              />
              <div className="ml-auto">
                <SearchField placeholder="Search flags…" value={query} onChange={setQuery} />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
              {rows.length === 0 ? (
                query ? (
                  <InlineEmpty icon={SearchX} heading="No flags match" body="Try a different search." />
                ) : status === "open" ? (
                  <InlineEmpty icon={CircleCheck} heading="No open flags" body={`Nothing to review for ${tab === "agent" ? "agents" : "conversations"}. Flagged items show up here.`} />
                ) : (
                  <InlineEmpty icon={FlagIcon} heading="No resolved flags" body="Flags you resolve are kept here for reference." />
                )
              ) : (
                <ul className="divide-y divide-line-subtle">
                  {rows.map((row) => (
                    <FlagItem key={row.flag.id} row={row} onResolve={resolve} onUnpublish={() => setUnpublishTarget({ id: row.flag.agentId, name: row.agentName })} />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Recent actions" count={actions.length} />
            <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
              {actions.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-fg-muted">No moderation actions yet.</p>
              ) : (
                <ul className="divide-y divide-line-subtle">
                  {actions.map((a) => {
                    const agentName = agents.find((ag) => ag.id === a.agentId)?.persona.name ?? a.agentId;
                    return (
                      <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-2 text-[13px]">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{agentName}</div>
                          <div className="truncate text-fg-muted">{a.note}</div>
                        </div>
                        <span className="shrink-0 pt-px text-xs text-fg-muted">{formatRelative(a.createdAt)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </PageBody>

      {unpublishTarget && (
        <UnpublishDialog
          agentId={unpublishTarget.id}
          agentName={unpublishTarget.name}
          open={!!unpublishTarget}
          onOpenChange={(open) => {
            if (!open) setUnpublishTarget(null);
          }}
        />
      )}
    </>
  );
}

function FlagItem({ row, onResolve, onUnpublish }: { row: FlagQueueRow; onResolve: (flagId: string) => void; onUnpublish: () => void }) {
  const { category, detail } = splitReason(row.flag.reason);
  const isOpen = row.flag.status === "open";
  const TargetIcon = row.flag.targetType === "conversation" ? MessagesSquare : Bot;
  return (
    <li data-testid="flag-row" className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Pill className={isOpen ? "bg-warning-surface text-warning" : "bg-success-surface text-success"}>{isOpen ? "Open" : "Resolved"}</Pill>
          {category && <span className="text-[13px] font-semibold text-foreground">{category}</span>}
        </div>
        <p className="mt-1 text-sm text-fg-secondary">{detail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
          <span className="flex min-w-0 items-center gap-1.5">
            <TargetIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
            {row.agentSlug ? (
              <Link href={`/agents/${row.agentSlug}`} className="truncate font-medium text-fg-tertiary hover:text-foreground">{row.agentName}</Link>
            ) : (
              <span className="truncate font-medium text-fg-tertiary">{row.agentName}</span>
            )}
            {row.flag.targetType === "conversation" && <span className="max-w-[220px] truncate">· {row.conversationTitle ?? "—"}</span>}
          </span>
          <span>Reported by {row.reporterName ?? "Unknown"} · {formatRelative(row.flag.createdAt)}</span>
        </div>
        {!isOpen && row.flag.resolutionNote && (
          <p className="mt-2 text-xs text-fg-muted">
            Resolved{row.flag.resolvedAt ? ` ${formatRelative(row.flag.resolvedAt)}` : ""}: {row.flag.resolutionNote}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
        {row.agentStatus === "unpublished" && <StatusPill status="unpublished" />}
        {isOpen && (
          <button type="button" className={buttonClass("secondary")} onClick={() => onResolve(row.flag.id)}>
            Resolve
          </button>
        )}
        {row.agentStatus === "published" && (
          <button type="button" className={buttonClass("destructive")} onClick={onUnpublish}>
            Unpublish agent
          </button>
        )}
      </div>
    </li>
  );
}
