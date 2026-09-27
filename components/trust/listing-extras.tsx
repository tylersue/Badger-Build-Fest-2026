"use client";

import { useState } from "react";
import { AgentReviews } from "@/components/trust/agent-reviews";
import { AgentBenchmarkPanel } from "@/components/benchmark/agent-benchmark-panel";
import { FlagButton } from "@/components/trust/flag-dialog";
import { currentIdentity, moderationActionsFor, useDemo } from "@/lib/demo-store";
import { formatRelative } from "@/lib/format";
import type { Agent } from "@/lib/types";

export function AgentListingExtras({ agent }: { agent: Agent }) {
  const [tab, setTab] = useState<"reviews" | "benchmark">("reviews");
  const state = useDemo();
  const me = currentIdentity(state);
  const action = agent.status === "unpublished" && agent.ownerId === me.id ? moderationActionsFor(state, agent.id)[0] : undefined;

  return <div className="mb-4 rounded-xl border border-line-subtle bg-surface-1 p-6" data-testid="listing-extras">
    {action && <div className="mb-4 rounded-lg border border-warning/40 bg-warning-surface/40 p-3 text-[13px] text-warning">Unpublished by an admin · {formatRelative(action.createdAt)}. Note: {action.note}</div>}
    <div className="mb-5 flex flex-wrap items-center gap-4 border-b border-line-subtle">
      <div role="tablist" aria-label="Listing information" className="flex gap-5">
        <button type="button" role="tab" aria-selected={tab === "reviews"} data-testid="tab-reviews" onClick={() => setTab("reviews")} className={`border-b-2 px-1 pb-2 text-sm ${tab === "reviews" ? "border-brand text-foreground" : "border-transparent text-fg-muted hover:text-foreground"}`}>Reviews</button>
        <button type="button" role="tab" aria-selected={tab === "benchmark"} data-testid="tab-benchmark" onClick={() => setTab("benchmark")} className={`border-b-2 px-1 pb-2 text-sm ${tab === "benchmark" ? "border-brand text-foreground" : "border-transparent text-fg-muted hover:text-foreground"}`}>Benchmark</button>
      </div>
      <div className="ml-auto pb-2"><FlagButton target={{ type: "agent", agentId: agent.id }} variant="label" /></div>
    </div>
    {tab === "reviews" ? <AgentReviews agent={agent} /> : <AgentBenchmarkPanel agent={agent} />}
  </div>;
}
