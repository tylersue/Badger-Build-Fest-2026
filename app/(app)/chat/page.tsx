"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquare, Share2 } from "lucide-react";
import { Breadcrumbs, EmptyState, PageBody, PageHeader, SearchField, Toolbar } from "@/components/app/ui";
import { IdentityLogo } from "@/components/app/identity-logo";
import { agentById, allConversations, conversationStats, currentIdentity, displayName, messagesFor, useDemo } from "@/lib/demo-store";
import { formatCredits, formatRelative } from "@/lib/format";

/** One line of the last message, without citation markers or line breaks. */
function previewOf(content: string) {
  return content.replace(/\[(?:\d+|(?:expert|web):[^\]\s]+)\]/g, "").replace(/\s+/g, " ").replace(/\s+([.,:;!?])/g, "$1").trim();
}

export default function ChatsPage() {
  const s = useDemo();
  const [query, setQuery] = useState("");
  const me = currentIdentity(s);
  const mine = allConversations(s).filter((c) => c.hirerId === me.id);
  const rows = mine
    .map((c) => ({ c, agent: agentById(s, c.agentId), stats: conversationStats(s, c.id), last: messagesFor(s, c.id).at(-1) ?? null }))
    .filter(({ c, agent }) => !query || `${c.title} ${agent?.persona.name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.stats.lastMessageAt ?? b.c.createdAt).localeCompare(a.stats.lastMessageAt ?? a.c.createdAt));

  return (
    <>
      <Breadcrumbs items={[{ label: "Agents" }]} />
      <PageBody>
        <PageHeader title="Agents" />
        <Toolbar>
          <SearchField placeholder="Search agents…" value={query} onChange={setQuery} />
        </Toolbar>
        {mine.length === 0 ? (
          <EmptyState icon={MessageSquare} heading="No agents yet" body="Buy or hire an agent from the Marketplace to start." action={{ label: "Browse marketplace", href: "/marketplace" }} />
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-line-subtle bg-surface-1 px-4 py-8 text-center text-sm text-fg-muted">
            No agents match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-line-subtle overflow-hidden rounded-xl border border-line-subtle bg-surface-1" data-testid="conversation-list">
            {rows.map(({ c, agent, stats, last }) => {
              const expertName = agent ? displayName(s, agent.ownerId) : "";
              const preview = last ? previewOf(last.content) : "No messages yet";
              return (
                <li key={c.id}>
                  <Link
                    href={`/chat/${c.id}`}
                    data-testid="conversation-row"
                    className="group flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-surface-3"
                  >
                    {agent ? (
                      <IdentityLogo identityId={agent.ownerId} size={40} className="mt-0.5" />
                    ) : (
                      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg border border-tile bg-tile-surface text-fg-muted">
                        <MessageSquare className="size-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {agent?.persona.name ?? "Agent unavailable"}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-fg-muted">{formatRelative(stats.lastMessageAt ?? c.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-3">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg-secondary">{c.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-fg-tertiary" title="Credits spent in this chat">
                          {formatCredits(stats.spentCents)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <p className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">
                          {last?.role === "user" && <span className="text-fg-tertiary">You: </span>}
                          {preview}
                        </p>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                          {c.shareTranscript && (
                            <span className="inline-flex items-center gap-1" title={expertName ? `Transcript shared with ${expertName}` : "Transcript shared"}>
                              <Share2 className="size-3" aria-hidden />
                              Shared
                            </span>
                          )}
                          <span className="tabular-nums">{stats.messageCount} {stats.messageCount === 1 ? "message" : "messages"}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>
    </>
  );
}
