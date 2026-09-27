"use client";

import Link from "next/link";
import { BookOpen, FileText, Mic, Plus } from "lucide-react";
import { toast } from "sonner";
import { answerCount, sourcesFor, useBuilderAgent } from "@/components/app/builder";
import { DataTable, EmptyState, Num, NumberPill, PageBody, PageHeader, PlaceholderNote, SearchField, StatusPill, Toolbar, buttonClass } from "@/components/app/ui";
import { formatRelative } from "@/lib/format";

export default function KnowledgePage() {
  const { s, agent, isOwner } = useBuilderAgent();
  if (!agent) return null;
  const sources = sourcesFor(agent.id);
  const answers = answerCount(s, agent.id);
  const rows = [
    ...(answers > 0 || sources.some((x) => x.kind === "interview")
      ? [{ id: "interview", icon: Mic, name: "Interview answers", kind: "Interview", status: "ready" as const, chunks: answers, pages: null as number | null, createdAt: sources.find((x) => x.kind === "interview")?.createdAt ?? agent.createdAt }]
      : []),
    ...sources
      .filter((x) => x.kind !== "interview")
      .map((x) => ({ id: x.id, icon: FileText, name: x.name, kind: x.kind.toUpperCase(), status: x.status, chunks: x.chunkCount, pages: x.pageCount, createdAt: x.createdAt })),
  ];

  return (
    <PageBody>
      <PageHeader title="Knowledge" subtitle="Interview answers land here automatically. Add documents any time." />
      <Toolbar>
        <button disabled={!isOwner} onClick={() => toast("Document upload lands in Phase 2.")} className={buttonClass("primary")}>
          <Plus />
          Add document
        </button>
        <SearchField placeholder="Search sources…" />
      </Toolbar>
      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} heading="No sources yet" body="Interview answers land here automatically. Add documents any time." action={{ label: "Start the interview", href: `/build/${agent.id}/interview` }} />
      ) : (
        <DataTable head={[{ label: "Source" }, { label: "Type" }, { label: "Status" }, { label: "Chunks", numeric: true }, { label: "Pages", numeric: true }, { label: "Added" }]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="flex items-center gap-2">
                  <r.icon className="size-4 text-fg-muted" />
                  {r.id === "interview" ? <Link href={`/build/${agent.id}/interview`} className="hover:text-selected-fg">{r.name}</Link> : r.name}
                </span>
              </td>
              <td className="text-fg-tertiary">{r.kind}</td>
              <td>
                <StatusPill status={r.status} />
              </td>
              <Num>
                <NumberPill value={r.chunks} />
              </Num>
              <Num className="text-fg-muted">{r.pages ?? "—"}</Num>
              <td className="text-fg-muted">{formatRelative(r.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <PlaceholderNote feature="document ingestion and retrieval" phase={2} />
    </PageBody>
  );
}
