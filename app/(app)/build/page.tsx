"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Plus } from "lucide-react";
import { answerCount } from "@/components/app/builder";
import { AgentTile, Breadcrumbs, DataTable, EmptyState, Num, NumberPill, PageBody, PageHeader, SearchField, StatusPill, Toolbar, buttonClass } from "@/components/app/ui";
import { allAgents, allConversations, currentIdentity, useDemo } from "@/lib/demo-store";
import { categoryLabel } from "@/lib/config/categories";
import { formatRelative, isoDaysAgo } from "@/lib/format";

export default function MyAgentsPage() {
  const s = useDemo();
  const router = useRouter();
  const me = currentIdentity(s);
  const agents = allAgents(s).filter((a) => a.ownerId === me.id);
  const weekAgo = isoDaysAgo(7);

  return (
    <>
      <Breadcrumbs items={[{ label: "My agents" }]} />
      <PageBody>
        <PageHeader title="My agents" subtitle="Everything you've built. Publish when the persona is done and the interview has enough answers." />
        <Toolbar>
          <Link href="/build/new" className={buttonClass("primary")}>
            <Plus />
            New agent
          </Link>
          <SearchField placeholder="Search by name…" />
        </Toolbar>
        {agents.length === 0 ? (
          <EmptyState icon={Bot} heading="No agents yet" body="Start an interview and your first agent takes shape from your answers." action={{ label: "New agent", href: "/build/new" }} />
        ) : (
          <DataTable head={[{ label: "Name" }, { label: "Status" }, { label: "Category" }, { label: "Answers", numeric: true }, { label: "Chats (7d)", numeric: true }, { label: "Rating", numeric: true }, { label: "Updated" }]}>
            {agents.map((a) => {
              const chats = allConversations(s).filter((c) => c.agentId === a.id && c.createdAt > weekAgo).length;
              return (
                <tr key={a.id} data-testid="agent-row" className="cursor-pointer" onClick={() => router.push(`/build/${a.id}/interview`)}>
                  <td>
                    <span className="flex items-center gap-2">
                      <AgentTile icon={a.icon} size="sm" />
                      {a.persona.name}
                    </span>
                  </td>
                  <td>
                    <StatusPill status={a.status} />
                  </td>
                  <td className="text-fg-tertiary">{categoryLabel(a.persona.category)}</td>
                  <Num>
                    <NumberPill value={answerCount(s, a.id)} />
                  </Num>
                  <Num>
                    <NumberPill value={chats} />
                  </Num>
                  <Num className={a.ratingCount ? "text-success" : "text-fg-muted"}>{a.ratingCount ? a.ratingAvg.toFixed(1) : "—"}</Num>
                  <td className="text-fg-muted">{formatRelative(a.updatedAt)}</td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </PageBody>
    </>
  );
}
