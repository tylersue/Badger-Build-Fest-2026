"use client";

import Link from "next/link";
import { ChartNoAxesCombined, MessageCircleQuestion, MessagesSquare, ShieldAlert, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { InlineEmpty, Metric, MetricRow, SectionHeader } from "@/components/app/dashboard-kit";
import { Breadcrumbs, PageBody, PageHeader, StatusPill, buttonClass } from "@/components/app/ui";
import { SharedTranscripts } from "@/components/insights/shared-transcripts";
import { agentInsights, sharedTranscriptsFor } from "@/features/insights/insights";
import { allAgents, currentIdentity, moderationActionsFor, useDemo } from "@/lib/demo-store";
import { formatRelative } from "@/lib/format";

export default function InsightsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const agents = allAgents(s).filter((agent) => agent.ownerId === me.id);
  const transcripts = sharedTranscriptsFor(s, me.id);
  const perAgent = agents.map((agent) => ({ agent, insights: agentInsights(s, agent.id), latestAction: moderationActionsFor(s, agent.id)[0] }));
  const sum = (pick: (i: (typeof perAgent)[number]["insights"]) => number) => perAgent.reduce((n, row) => n + pick(row.insights), 0);
  const totalUp = sum((i) => i.thumbsUp);
  const totalDown = sum((i) => i.thumbsDown);
  const rated = totalUp + totalDown;

  return (
    <>
      <Breadcrumbs items={[{ label: "Insights" }]} />
      <PageBody>
        <div className="max-w-[960px]">
          <PageHeader title="Insights" />
          {agents.length === 0 ? (
            <div className="rounded-xl border border-line-subtle bg-surface-1">
              <InlineEmpty
                icon={ChartNoAxesCombined}
                heading="No agent insights yet"
                body="Create an agent to see its activity here."
                action={<Link href="/build/new" className={buttonClass("primary")}>New agent</Link>}
              />
            </div>
          ) : (
            <>
              <section aria-label="Across your agents" className="rounded-xl border border-line-subtle bg-surface-1 px-6 py-4">
                <MetricRow>
                  <Metric icon={MessagesSquare} label="Conversations" value={String(sum((i) => i.conversations))} caption={`${sum((i) => i.messages)} messages`} />
                  <Metric icon={MessageCircleQuestion} label="Questions asked" value={String(sum((i) => i.questionsAsked))} caption={`Across ${agents.length} ${agents.length === 1 ? "agent" : "agents"}`} />
                  <Metric icon={ThumbsUp} label="Helpful answers" value={rated ? `${Math.round((totalUp / rated) * 100)}%` : "—"} caption={rated ? `${totalUp} up · ${totalDown} down` : "No ratings yet"} />
                  <Metric icon={ThumbsDown} label="Thumbs down" value={String(totalDown)} caption={totalDown ? "Worth reading the transcript" : "None so far"} />
                </MetricRow>
              </section>

              <section className="mt-8">
                <SectionHeader title="Your agents" count={agents.length} />
                <div className="grid gap-4">
                  {perAgent.map(({ agent, insights, latestAction }) => {
                    const topCount = insights.topQuestions[0]?.count ?? 1;
                    return (
                      <article key={agent.id} className="rounded-xl border border-line-subtle bg-surface-1">
                        <header className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6">
                          <div className="min-w-0">
                            <Link href={`/build/${agent.id}/interview`} className="text-base font-semibold hover:text-selected-fg">{agent.persona.name}</Link>
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
                              <Star className="size-3" strokeWidth={2} />
                              {agent.ratingCount ? `${agent.ratingAvg.toFixed(1)} / 5 from ${agent.ratingCount} ${agent.ratingCount === 1 ? "review" : "reviews"}` : "No reviews yet"}
                            </div>
                          </div>
                          <StatusPill status={agent.status} />
                        </header>

                        {latestAction && agent.status === "unpublished" && (
                          <div role="status" className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-warning-surface px-4 py-2 text-[13px] text-warning">
                            <ShieldAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                            <span>Unpublished by an admin · {formatRelative(latestAction.createdAt)}. Note: {latestAction.note}</span>
                          </div>
                        )}

                        <div className="mt-4 border-y border-line-subtle px-6 py-4">
                          <MetricRow>
                            <Metric label="Conversations" value={String(insights.conversations)} />
                            <Metric label="Messages" value={String(insights.messages)} />
                            <Metric label="Thumbs up" value={String(insights.thumbsUp)} />
                            <Metric label="Thumbs down" value={String(insights.thumbsDown)} />
                          </MetricRow>
                        </div>

                        <div className="px-6 py-4">
                          <h3 className="mb-2 text-xs font-medium text-fg-tertiary">Top questions</h3>
                          {insights.topQuestions.length === 0 ? (
                            <p className="py-2 text-[13px] text-fg-muted">No questions yet. They show up here once hirers start chatting.</p>
                          ) : (
                            <ol className="divide-y divide-line-subtle">
                              {insights.topQuestions.map((question, index) => (
                                <li key={`${question.text}-${question.lastAskedAt}-${index}`} className="flex items-start gap-4 py-2 text-[13px]">
                                  <span className="w-4 shrink-0 pt-px text-right text-xs text-fg-muted tabular-nums">{index + 1}</span>
                                  <span className="min-w-0 flex-1 whitespace-pre-line text-fg-secondary">{question.text}</span>
                                  <span className="flex shrink-0 items-center gap-2 pt-0.5">
                                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                                      <span className="block h-full rounded-full bg-fg-muted/60" style={{ width: `${(question.count / topCount) * 100}%` }} />
                                    </span>
                                    <span className="w-8 text-right text-xs text-fg-tertiary tabular-nums">×{question.count}</span>
                                  </span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <SharedTranscripts items={transcripts} />
            </>
          )}
        </div>
      </PageBody>
    </>
  );
}
