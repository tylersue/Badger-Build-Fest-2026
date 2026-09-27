"use client";

import { NotOwnerNote, useBuilderAgent } from "@/components/app/builder";
import { PublishSection } from "@/components/app/publish-section";
import { displayName } from "@/lib/demo-store";

/* Publish tab: the Phase 3 checklist gate, rate slider, consent, and instant publish or unpublish (PUB-01..04). */
export default function PublishPage() {
  const { s, agent, isOwner } = useBuilderAgent();
  if (!agent) return null;
  return (
    <>
      {!isOwner && (
        <div className="pt-3">
          <NotOwnerNote ownerName={displayName(s, agent.ownerId)} />
        </div>
      )}
      <PublishSection agent={agent} isOwner={isOwner} />
    </>
  );
}
