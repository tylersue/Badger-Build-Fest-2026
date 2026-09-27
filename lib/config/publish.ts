/** Publish gate and hirer-file limits (Phase 3, D-04..D-07). Change here only. */

/** Minimum knowledge chunks (interview answers + ready document chunks) before an agent can publish (PUB-03). */
export const MIN_PUBLISH_CHUNKS = 5;

/** Rate multiplier on raw LLM cost (PUB-01). */
export const RATE_MIN = 1;
export const RATE_MAX = 5;
export const RATE_STEP = 0.5;

/** Shown next to the consent checkbox at first publish (PUB-02). */
export const CONSENT_TEXT =
  "I own this content. The platform gets a limited license to serve it through this agent only, and will not train on it.";

/** One hirer file per conversation (CHAT-04). */
export const ACCEPTED_FILE_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_CHARS = 50_000;

export function clampRate(value: number): number {
  const stepped = Math.round(value / RATE_STEP) * RATE_STEP;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, stepped));
}
