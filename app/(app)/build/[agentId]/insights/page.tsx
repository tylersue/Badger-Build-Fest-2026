"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { useBuilderAgent } from "@/components/app/builder";
import { DataTable, EmptyState, Num, NumberPill, PageBody, PageHeader, PlaceholderNote, StatTile } from "@/components/app/ui";
import { allConversations, conversationStats, displayName, messagesFor } from "@/lib/demo-store";
import { formatNumber, formatRelative } from "@/lib/format";

/* Expert insights: aggregates for everyone, transcripts only when the hirer opted in (EXPT-01/02, Phase 4). */
export default function InsightsPage() {
  const { s, agent } = useBuilderAgent();
  if (!agent) return null;
  const convs = allConversations(s).filter((c) => c.agentId === agent.id);
  const msgs = convs.flatMap((c) => messagesFor(s, c.id));
  const questions = msgs.filter((m) => m.role === "user");
  const thumbsDown = msgs.filter((m) => m.feedback === "down").length;
  const shared = convs.filter((c) => c.shareTranscript);

  return (
    <PageBody>
      <PageHeader title="Insights" />
      {convs.length === 0 ? (
        <EmptyState icon={BarChart3} heading="No conversations yet" body="Publish the agent and hirers' questions show up here." action={{ label: "Publish agent", href: `/build/${agent.id}/publish` }} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Conversations" value={formatNumber(convs.length)} />
            <StatTile label="Messages" value={formatNumber(msgs.length)} />
            <StatTile label="Thumbs-down" value={formatNumber(thumbsDown)} />
            <StatTile label="Shared transcripts" value={formatNumber(shared.length)} />
          </div>
          <h3 className="mb-2 text-sm font-semibold">Top questions</h3>
          <DataTable head={[{ label: "Question" }, { label: "Asked" }]}>
            {questions.slice(-8).reverse().map((q) => (
              <tr key={q.id}>
                <td>{q.content}</td>
                <td className="text-fg-muted">{formatRelative(q.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
          <h3 className="mt-6 mb-2 text-sm font-semibold">Shared transcripts</h3>
          <DataTable head={[{ label: "Conversation" }, { label: "Hirer" }, { label: "Messages", numeric: true }]}>
            {shared.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/chat/${c.id}`} className="hover:underline hover:underline-offset-2">
                    {c.title}
                  </Link>
                </td>
                <td className="text-fg-tertiary">{displayName(s, c.hirerId)}</td>
                <Num>
                  <NumberPill value={conversationStats(s, c.id).messageCount} />
                </Num>
              </tr>
            ))}
          </DataTable>
        </>
      )}
      <PlaceholderNote feature="insights" phase={4} />
    </PageBody>
  );
}
