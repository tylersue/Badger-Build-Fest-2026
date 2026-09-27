/** One-time price to buy an agent into your workspace, in credits (1 credit = 1 cent). Chats with it are then included. */
export const agentPriceCredits = (rateMultiplier: number) => 1000 + Math.round(rateMultiplier) * 500;
/** The expert keeps this share of a purchase; the platform keeps the rest. */
export const PURCHASE_EXPERT_SHARE = 0.85;
/** Founders who bought an agent: a stable figure from its ratings and use, plus the viewer's own purchase. */
export const buyerCount = (agent: { ratingCount: number; usageCount: number }, boughtByViewer: boolean) =>
  agent.ratingCount * 14_000 + agent.usageCount * 800 + (boughtByViewer ? 1 : 0);
/** Marketplace-scale rating count (the seed's written reviews are a sample of these). */
export const ratingTotal = (agent: { ratingCount: number; usageCount: number }) =>
  agent.ratingCount ? agent.ratingCount * 400 + agent.usageCount * 7 : 0;
/** 480000 → "480K", 12400 → "12.4K". */
export const compactNumber = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: value >= 100_000 ? 0 : 1 }).format(value);
