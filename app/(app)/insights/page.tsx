"use client";

import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { Breadcrumbs, EmptyState, PageBody, PageHeader, Pill, StatTile, StatusPill } from "@/components/app/ui";
import { SharedTranscripts } from "@/components/insights/shared-transcripts";
import { agentInsights, sharedTranscriptsFor } from "@/features/insights/insights";
import { allAgents, currentIdentity, moderationActionsFor, useDemo } from "@/lib/demo-store";
import { formatRelative } from "@/lib/format";

export default function InsightsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const agents = allAgents(s).filter((agent) => agent.ownerId === me.id);
  const transcripts = sharedTranscriptsFor(s, me.id);

  return (
    <>
      <Breadcrumbs items={[{ label: "Insights" }]} />
      <PageBody>
        <PageHeader title="Insights" subtitle="See how people use your agents." />
        {agents.length === 0 ? (
          <EmptyState icon={ChartNoAxesCombined} heading="No agent insights yet" body="Create an agent to see its activity here." action={{ label: "New agent", href: "/build/new" }} />
        ) : (
          <>
            <div className="grid max-w-[720px] gap-4">
              {agents.map((agent) => {
                const insights = agentInsights(s, agent.id);
                const latestAction = moderationActionsFor(s, agent.id)[0];
                return (
                  <article key={agent.id} className="rounded-xl border border-line-subtle bg-surface-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link href={`/build/${agent.id}/interview`} className="text-sm font-semibold hover:text-selected-fg">{agent.persona.name}</Link>
                      <StatusPill status={agent.status} />
                    </div>
                    {latestAction && agent.status === "unpublished" && (
                      <div className="mt-3 rounded-xl border border-warning/40 bg-warning-surface/40 p-3 text-[13px] text-warning">
                        Unpublished by an admin · {formatRelative(latestAction.createdAt)}. Note: {latestAction.note}
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <StatTile label="Conversations" value={String(insights.conversations)} />
                      <StatTile label="Messages" value={String(insights.messages)} />
                      <StatTile label="Thumbs down" value={String(insights.thumbsDown)} />
                      <StatTile label="Rating" value={agent.ratingCount ? `${agent.ratingAvg.toFixed(1)} / 5` : "—"} />
                    </div>
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold">Top questions</h3>
                      {insights.topQuestions.length === 0 ? (
                        <p className="text-[13px] text-fg-muted">No questions yet</p>
                      ) : (
                        <ul className="space-y-2">
                          {insights.topQuestions.map((question, index) => (
                            <li key={`${question.text}-${question.lastAskedAt}-${index}`} className="flex items-start justify-between gap-3 text-[13px]">
                              <span className="min-w-0 whitespace-pre-line">{question.text}</span>
                              <Pill className="shrink-0">{question.count}</Pill>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <SharedTranscripts items={transcripts} />
          </>
        )}
      </PageBody>
    </>
  );
}
