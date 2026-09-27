"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flag as FlagIcon } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs, Card, DataTable, EmptyState, PageBody, PageHeader, Pill, SearchField, StatTile, Toolbar, buttonClass } from "@/components/app/ui";
import { UnpublishDialog } from "@/components/trust/unpublish-dialog";
import { flagQueue, resolveFlag } from "@/features/trust/moderation";
import { allAgents, allModerationActions, useDemo } from "@/lib/demo-store";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Flag } from "@/lib/types";

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
        <PageHeader title="Admin" subtitle="Flags from listings and chats. Unpublishing needs a note for the expert." />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Open flags" value={String(openFlagsCount)} testId="stat-open-flags" />
          <StatTile label="Agents with open flags" value={String(agentsWithOpenFlags)} testId="stat-agents-flagged" />
          <StatTile label="Unpublished agents" value={String(unpublishedCount)} testId="stat-unpublished" />
        </div>

        <Toolbar>
          <div className="inline-flex overflow-hidden rounded border border-line-muted">
            {(["agent", "conversation"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("h-[22px] px-2 text-[13px]", tab === t ? "bg-surface-3 text-foreground" : "text-fg-tertiary")}>
                {t === "agent" ? "Agents" : "Conversations"}
              </button>
            ))}
          </div>
          <div className="inline-flex overflow-hidden rounded border border-line-muted">
            {(["open", "resolved"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={cn("h-[22px] px-2 text-[13px] capitalize", status === st ? "bg-surface-3 text-foreground" : "text-fg-tertiary")}
              >
                {st}
              </button>
            ))}
          </div>
          <SearchField placeholder="Search flags…" value={query} onChange={setQuery} />
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState icon={FlagIcon} heading="No flags" body="Flagged agents and conversations show up here." />
        ) : (
          <DataTable
            head={[
              { label: "Reported" },
              { label: "Agent" },
              ...(tab === "conversation" ? [{ label: "Conversation" }] : []),
              { label: "Reason" },
              { label: "Reported by" },
              { label: "Status" },
              { label: "Actions" },
            ]}
          >
            {rows.map((row) => (
              <tr key={row.flag.id} data-testid="flag-row">
                <td className="text-fg-tertiary">{formatRelative(row.flag.createdAt)}</td>
                <td>
                  <Link href={`/agents/${row.agentSlug}`} className="hover:text-selected-fg">
                    {row.agentName}
                  </Link>
                </td>
                {tab === "conversation" && <td className="max-w-[220px] truncate text-fg-tertiary">{row.conversationTitle ?? "—"}</td>}
                <td className="max-w-[280px] truncate text-fg-tertiary">{row.flag.reason}</td>
                <td className="text-fg-tertiary">{row.reporterName ?? "Unknown"}</td>
                <td>
                  <Pill className={row.flag.status === "open" ? "bg-warning-surface text-warning" : "bg-success-surface text-success"}>
                    {row.flag.status === "open" ? "Open" : "Resolved"}
                  </Pill>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {row.flag.status === "open" && (
                      <button className={buttonClass("secondary")} onClick={() => resolve(row.flag.id)}>
                        Resolve
                      </button>
                    )}
                    {row.agentStatus === "published" && (
                      <button
                        className={buttonClass("destructive")}
                        onClick={() => setUnpublishTarget({ id: row.flag.agentId, name: row.agentName })}
                      >
                        Unpublish agent
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        <Card className="mt-6 p-4">
          <h3 className="text-sm font-semibold">Recent actions</h3>
          {actions.length === 0 ? (
            <p className="mt-1.5 text-xs text-fg-muted">No moderation actions yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {actions.map((a) => {
                const agentName = agents.find((ag) => ag.id === a.agentId)?.persona.name ?? a.agentId;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate">
                      <span className="font-medium">{agentName}</span> · {a.note}
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">{formatRelative(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
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
