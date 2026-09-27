import type { MeteredPurpose } from "@/lib/config/credits";
import type { Usage } from "@/lib/data/demo-pricing";
/** Usage fixtures for local-demo reconciliation, never live settlement. */
export const CANNED_USAGE: Record<MeteredPurpose, Usage> = {
  interview_turn: { model: "claude-sonnet-5", tokensIn: 5000, tokensOut: 400 },
  embedding: { model: "voyage-4-lite", tokensIn: 400, tokensOut: 0 },
  sandbox_message: { model: "claude-sonnet-5", tokensIn: 6000, tokensOut: 250 },
  chat_message: { model: "claude-sonnet-5", tokensIn: 6000, tokensOut: 250 },
};
