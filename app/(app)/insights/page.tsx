"use client";

import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { Breadcrumbs, EmptyState, PageBody, PageHeader, PlaceholderNote, StatTile } from "@/components/app/ui";
import { allAgents, currentIdentity, useDemo } from "@/lib/demo-store";

export default function InsightsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const agents = allAgents(s).filter((agent) => agent.ownerId === me.id);
  return (
    <>
      <Breadcrumbs items={[{ label: "Insights" }]} />
      <PageBody>
        <PageHeader title="Insights" subtitle="See how people use your agents." />
        {agents.length === 0 ? (
          <EmptyState icon={ChartNoAxesCombined} heading="No agent insights yet" body="Create an agent to see its activity here." action={{ label: "New agent", href: "/build/new" }} />
        ) : (
          <div className="grid max-w-[720px] gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-line-subtle bg-surface-1 p-4">
                <Link href={`/build/${agent.id}/interview`} className="text-sm font-semibold hover:text-selected-fg">{agent.persona.name}</Link>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <StatTile label="Uses" value={agent.usageCount.toLocaleString()} />
                  <StatTile label="Rating" value={agent.ratingCount ? `${agent.ratingAvg.toFixed(1)} / 5` : "—"} />
                </div>
              </div>
            ))}
            <PlaceholderNote feature="detailed insights and shared transcripts" phase={4} />
          </div>
        )}
      </PageBody>
    </>
  );
}
