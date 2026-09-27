/** 1 credit = 1 cent = 10,000,000 nanodollars. Cents below are display metadata. */

export type MeteredPurpose = "interview_turn" | "embedding" | "sandbox_message" | "chat_message";

/** Each seeded identity starts with $50 (D-09). */
export const SEED_BALANCE_CENTS = 5000;

/** Mock funding (D-11): instant and repeatable, no payment taken. */
export const SUBSCRIPTION_GRANT_CENTS = 2000;
export const PACK_GRANT_CENTS = 1000;

/** Reservation estimate before a metered call (D-10). Chat is multiplied by the agent's rate. */
export const TYPICAL_CALL_CENTS: Record<MeteredPurpose, number> = {
  interview_turn: 2,
  embedding: 1,
  sandbox_message: 3,
  chat_message: 3,
};

/** Platform share of the usage margin (D-13). */
export const PLATFORM_MARGIN_SHARE = 0.15;

export const PURPOSE_LABELS: Record<MeteredPurpose, string> = {
  interview_turn: "Interview turn",
  embedding: "Embedding",
  sandbox_message: "Sandbox",
  chat_message: "Chat",
};
