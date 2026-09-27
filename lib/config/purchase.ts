/** One-time price to buy an agent into your workspace, in credits (1 credit = 1 cent). Chats with it are then included. */
export const agentPriceCredits = (rateMultiplier: number) => 1000 + Math.round(rateMultiplier) * 500;
/** The expert keeps this share of a purchase; the platform keeps the rest. */
export const PURCHASE_EXPERT_SHARE = 0.85;
/** Founders who bought an agent: a stable figure from its ratings and use, plus the viewer's own purchase. */
export const buyerCount = (agent: { ratingCount: number; usageCount: number }, boughtByViewer: boolean) =>
  Math.round(agent.ratingCount * 2 + agent.usageCount * 0.5) + (boughtByViewer ? 1 : 0);
