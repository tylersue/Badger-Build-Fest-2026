"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Breadcrumbs, EmptyState, PageBody, PageHeader, PlaceholderNote, SearchField, Toolbar } from "@/components/app/ui";
import { FLAGS } from "@/lib/data/seed";
import { cn } from "@/lib/utils";

/* Admin is open in the MVP (D-04). Flag queue and unpublish-with-note land in Phase 4 (ADMN-01). */
export default function AdminPage() {
  const [tab, setTab] = useState<"agent" | "conversation">("agent");
  const flags = FLAGS.filter((f) => f.targetType === tab);
  return (
    <>
      <Breadcrumbs items={[{ label: "Admin" }]} />
      <PageBody>
        <PageHeader title="Admin" subtitle="Flags from listings and chats. Unpublishing needs a note for the expert." />
        <Toolbar>
          <div className="inline-flex overflow-hidden rounded border border-line-muted">
            {(["agent", "conversation"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("h-[22px] px-2 text-[13px]", tab === t ? "bg-surface-3 text-foreground" : "text-fg-tertiary")}>
                {t === "agent" ? "Agents" : "Conversations"}
              </button>
            ))}
          </div>
          <SearchField placeholder="Search flags…" />
        </Toolbar>
        {flags.length === 0 && <EmptyState icon={Flag} heading="No flags" body="Flagged agents and conversations show up here." />}
        <PlaceholderNote feature="moderation" phase={4} />
      </PageBody>
    </>
  );
}
