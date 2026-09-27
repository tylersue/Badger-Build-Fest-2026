import { AgentReviews } from "@/components/trust/agent-reviews";
import type { Agent } from "@/lib/types";

export function AgentListingExtras({ agent }: { agent: Agent }) {
  return <div className="mb-4 rounded-xl border border-line-subtle bg-surface-1 p-6" data-testid="listing-extras">
    <h3 className="mb-4 text-base font-semibold">Ratings &amp; reviews</h3>
    <AgentReviews agent={agent} />
  </div>;
}
