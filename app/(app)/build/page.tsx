"use client";

import Link from "next/link";
import { Bot, Plus } from "lucide-react";
import { Breadcrumbs, DataTable, EmptyState, PageBody, PageHeader, StatusPill, AgentTile, buttonClass } from "@/components/app/ui";
import { allAgents, currentIdentity, useDemo } from "@/lib/demo-store";
import { categoryLabel } from "@/lib/config/categories";

export default function MyAgentsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const agents = allAgents(s).filter((agent) => agent.ownerId === me.id);

  return (
    <>
      <Breadcrumbs items={[{ label: "My agents" }]} actions={<Link href="/build/new" className={buttonClass("primary", "lg")}><Plus />New agent</Link>} />
      <PageBody>
        <PageHeader title="My agents" subtitle="Build, test and publish agents from what you know." />
        {agents.length === 0 ? (
          <EmptyState icon={Bot} heading="No agents yet" body="Start an interview and your first agent takes shape from your answers." action={{ label: "New agent", href: "/build/new" }} />
        ) : (
          <DataTable head={[{ label: "Agent" }, { label: "Category" }, { label: "Status" }, { label: "Build" }]}>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td><Link href={`/build/${agent.id}/interview`} className="flex items-center gap-2 font-medium hover:text-selected-fg"><AgentTile icon={agent.icon} size="sm" />{agent.persona.name}</Link></td>
                <td className="text-fg-muted">{categoryLabel(agent.persona.category)}</td>
                <td><StatusPill status={agent.status} /></td>
                <td><Link href={`/build/${agent.id}/interview`} className="text-selected-fg hover:underline">Open builder</Link></td>
              </tr>
            ))}
          </DataTable>
        )}
      </PageBody>
    </>
  );
}
