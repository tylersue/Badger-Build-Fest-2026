"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Breadcrumbs, DataTable, EmptyState, Num, NumberPill, PageBody, PageHeader, SearchField, Toolbar } from "@/components/app/ui";
import { agentById, allConversations, conversationStats, currentIdentity, useDemo } from "@/lib/demo-store";
import { formatCredits, formatRelative } from "@/lib/format";

export default function ChatsPage() {
  const s = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const me = currentIdentity(s);
  const rows = allConversations(s)
    .filter((c) => c.hirerId === me.id)
    .map((c) => ({ c, agent: agentById(s, c.agentId), stats: conversationStats(s, c.id) }))
    .filter(({ c, agent }) => !query || `${c.title} ${agent?.persona.name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.stats.lastMessageAt ?? b.c.createdAt).localeCompare(a.stats.lastMessageAt ?? a.c.createdAt));

  return (
    <>
      <Breadcrumbs items={[{ label: "Chats" }]} />
      <PageBody>
        <PageHeader title="Chats" subtitle="Every conversation you've had with an expert's agent." />
        <Toolbar>
          <SearchField placeholder="Search by name…" value={query} onChange={setQuery} />
        </Toolbar>
        {rows.length === 0 ? (
          <EmptyState icon={MessageSquare} heading="No conversations yet" body="Hire an agent from the Marketplace to start one." action={{ label: "Browse marketplace", href: "/marketplace" }} />
        ) : (
          <DataTable head={[{ label: "Conversation" }, { label: "Agent" }, { label: "Messages", numeric: true }, { label: "Spent", numeric: true }, { label: "Shared with expert" }, { label: "Last message" }]}>
            {rows.map(({ c, agent, stats }) => (
              <tr key={c.id} data-testid="conversation-row" onClick={() => router.push(`/chat/${c.id}`)} className="cursor-pointer">
                <td>{c.title}</td>
                <td className="text-fg-tertiary">{agent?.persona.name}</td>
                <Num>
                  <NumberPill value={stats.messageCount} />
                </Num>
                <Num>{formatCredits(stats.spentCents)}</Num>
                <td className={c.shareTranscript ? "text-success" : "text-fg-muted"}>{c.shareTranscript ? "On" : "Off"}</td>
                <td className="text-fg-muted">{formatRelative(stats.lastMessageAt ?? c.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </PageBody>
    </>
  );
}
